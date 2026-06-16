import { GoogleGenAI, Type } from "@google/genai";
import { getGeminiApiKey } from "../lib/geminiApiKey";

function createGeminiClient(apiKeyOverride?: string): GoogleGenAI {
  const apiKey = (apiKeyOverride ?? getGeminiApiKey()).trim();
  if (!apiKey) {
    throw new Error("API Key missing — add your Gemini API key in Settings.");
  }
  return new GoogleGenAI({ apiKey });
}

// Fallback model list in priority order (verified available via ListModels API)
const MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
];

async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      const isLastAttempt = i === maxRetries - 1;
      const msg = error?.message || '';
      const isRetryable = msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('high demand') || msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Too Many Requests');

      if (isLastAttempt || !isRetryable) {
        throw error;
      }
      
      // Exponential backoff: 3s, 9s, 27s
      const delay = Math.pow(3, i + 1) * 1000;
      console.log(`Retry attempt ${i + 1}/${maxRetries} after ${delay / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

async function generateWithFallback(ai: GoogleGenAI, prompt: string): Promise<string> {
  let lastError: Error | null = null;
  
  for (const model of MODELS) {
    try {
      console.log(`Trying model: ${model}`);
      const response = await retryWithBackoff(() => 
        ai.models.generateContent({
          model,
          contents: [{ parts: [{ text: prompt }] }],
          config: {
            responseMimeType: "application/json"
          }
        })
      );
      console.log(`Success with model: ${model}`);
      return response.text;
    } catch (error: any) {
      console.warn(`Model ${model} failed:`, error?.message);
      lastError = error;
      // Continue to next model
    }
  }
  
  throw lastError || new Error('All models failed');
}

export async function testGeminiApiKey(apiKey?: string): Promise<void> {
  const ai = createGeminiClient(apiKey);
  await retryWithBackoff(() =>
    ai.models.generateContent({
      model: MODELS[0],
      contents: [{ parts: [{ text: 'Reply with exactly: OK' }] }],
    })
  );
}

export async function generateTailoredResume(currentResume: string, jobDescription: string) {
  const ai = createGeminiClient();
  
  const prompt = `
    You are an expert career coach and professional resume writer. 
    Your task is to tailor the provided resume to match the given job description.
    Use CEFR English level B1 or B2 for ALL generated content.
    Write in clear, simple, professional English that is easy for an international recruiter to understand.
    Avoid difficult vocabulary, idioms, corporate buzzwords, complex grammar, and very long sentences.
    Prefer short sentences, common business words, and direct action verbs.
    Keep the tone professional but plain.
    Current Resume:
    ${currentResume}
    
    Job Description:
    ${jobDescription}
    
    Instructions:
    1. SOURCE DATA: From the "Current Resume", ONLY extract the following:
       - Personal Information (Name, Email, Phone if present in source, Location, LinkedIn).
       - If a field is missing in the source resume (especially phone), use an empty string "". Never use "N/A", "NA", or placeholders.
       - Education history (Degrees, Schools, Periods, Majors).
       - Experience skeleton (Company Names and Employment Periods ONLY) for every role in the career history.
    2. IGNORE: Completely ignore all existing professional summaries, job descriptions, bullet points, and skills from the "Current Resume". Do NOT use them as a reference.
    3. GENERATE (TAILORED CONTENT):
       - TARGET LENGTH: **STRICTLY LIMIT the resume to EXACTLY 2 A4 pages.** Do not exceed this.
       - Based ONLY on the "Job Description", generate a "Target Job Title" and an expanded "Profile" summary (approx. 100-150 words).
       - **PROFILE EXPERIENCE YEARS (CRITICAL):** From the experience skeleton dates, calculate total professional years. In the "profile" field only, when stating how many years of experience the candidate has, use a **maximum of 10 years**. If real tenure is longer than 10 years, write phrases like **"over 10 years"** or **"10+ years"** — never write 11, 12, 15, 20, or any number above 10. Example opening: "I have over 10 years of experience in..."
       - **PROFILE — AI CODING ASSISTANTS (REQUIRED):** In the "profile" summary, include **1–2 short sentences** stating that the candidate uses modern **AI agentic coding assistants** — specifically **Cursor** (the most-used AI code editor globally, by developer downloads and active users) and **Claude Code** (Anthropic's top-ranked agentic coding assistant) — as part of their daily workflow, and that this enables delivery **more than 10x faster** than without such tools. Keep it factual and professional. Example: "I work daily with Cursor and Claude Code — the world's most widely adopted AI coding assistants — which lets me ship production-quality features more than ten times faster than traditional workflows." One clear mention is sufficient; do not repeat.
       - IDENTIFY: Find the main product, core service, or business domain mentioned in the "Job Description".
       - **EXPERIENCE ORDER (CRITICAL):** Output the "experience" array in **reverse chronological order** — **most recent / current company FIRST**, oldest company LAST. This is standard for resumes.
       - **CAREER PROGRESSION (CRITICAL):** The experience section must show how the candidate grows over time. For each role:
         a) Parse each role's start/end dates and compute **cumulative years of professional experience at the END of that role** (sum durations of that role and all chronologically earlier jobs).
         b) Match the **job title seniority** and **bullet depth** to that cumulative experience level:
            - **~0–4 years total:** Junior to mid-level — feature implementation, bug fixing, learning codebase, pair work, small scoped delivery, following technical guidance. Titles like Junior Developer, Developer, Software Engineer.
            - **~4–8 years total:** Mid to senior — module/service ownership, code reviews, mentoring juniors, API design, performance work, leading small tasks. Titles like Mid-level Developer, Senior Developer, Software Engineer II.
            - **~8–12 years total:** Senior — system design, technical decisions, cross-team collaboration, production reliability, mentoring, leading features end-to-end. Titles like Senior Developer, Senior Software Engineer, Tech Lead.
            - **12+ years total:** Staff/principal/senior leadership — architecture, platform strategy, org-wide standards, stakeholder alignment, high-impact initiatives. Titles like Lead Developer, Principal Engineer, Senior Software Engineer.
         c) **Example:** Career path: startup 5y → medium 3y → current senior company 3y. In the JSON array order this MUST be: **[current senior company, medium company, startup]** (newest first). Bullets for startup (last in array) = ~4–5 years level; medium = ~8 years; current role (first in array) = **10+ years** level.
         d) Each chronologically later job must show **clear progression** from the previous (broader scope, more ownership, more leadership). Never give senior/architect bullets to the earliest role or junior bullets to the most recent role.
         e) Infer reasonable company context (startup vs medium vs enterprise) from company name or tenure length when possible, and align scope of impact accordingly.
       - For each company in the "Experience skeleton", generate a "Role" and **6-8 detailed "bullets"** tailored to the Job Description AND the seniority level for that career stage.
       - Bullets should use technologies from the JD where appropriate, but responsibilities and impact must fit the years of experience at that point in the career.
       - IMPORTANT: Integrate mentions of the identified main product or domain into the experience bullet points to show direct relevance.
       - **SKILLS SECTION (CRITICAL):** Build the "skills" object using **exactly these 6 keys** (same spelling and capitalization). Each value is a **comma-separated list** of technologies/tools.
         1. "Core Backend Skills"
         2. "Core Front End Skills"
         3. "Database"
         4. "Cloud & DevOps"
         5. "Testing & Task Queues"
         6. "Security & Permissions"
       - **DEFAULT SKILLS (ALWAYS REQUIRED — include in every category below, then add JD-specific skills):**
         - Core Backend Skills: PHP, Python
         - Core Front End Skills: React, JavaScript, TypeScript, HTML, CSS
         - Database: PostgreSQL, MySQL
         - Cloud & DevOps: AWS (S3, RDS, Lambda, EC2, ECS), Docker, CI/CD Tools, Nginx, Apache, Ubuntu Linux, GitHub Actions
         - Testing & Task Queues: Celery, Redis, RabbitMQ, Pytest, Django TestCase, Kafka
         - Security & Permissions: OAuth2, JWT, RBAC, Rate Limiting / Token Authentication, GDPR, Secure file access and expirable token links
       - **Skills sources:** For each category, **always include the default skills listed above**, then add technologies from the **Job Description** plus **closely related programming languages, frameworks, runtimes, and tools** for that stack (e.g. JD mentions .NET → also add C#, ASP.NET Core; JD mentions React → also add TypeScript). Do not invent unrelated stacks.
       - **Do NOT include human/spoken language skills** (e.g. English, Spanish, French). Only technical/software skills.
       - **Do NOT use any other category names** (no "Languages", "Soft Skills", etc.). Only the 6 keys above.
       - Generate a "coverLetter" (approx. 300-400 words) that is highly professional, persuasive, and specifically addresses the hiring manager. It should fit comfortably on one A4 page.
       - **COVER LETTER — AI TOOLS (REQUIRED):** Dedicate a short paragraph in the cover letter to how the candidate uses **Cursor** and **Claude Code** as daily AI agentic coding tools. Explain that Cursor is the world's leading AI-powered code editor (by active developer usage and downloads) and that Claude Code by Anthropic is one of the top agentic coding assistants globally. State clearly that using these tools enables shipping work **more than 10x faster** compared to traditional workflows — while maintaining code quality through strong fundamentals, reviews, and testing.
       - **COVER LETTER — AI FOUNDATION QUOTE (REQUIRED):** Somewhere in the same AI paragraph, include this exact sentence verbatim (do NOT change a single word): "AI is a powerful accelerator. But without a strong foundation, it becomes a very confident generator of hard-to-debug mistakes."
    4. ACCURACY: Ensure the generated content is professional, impactful, and plausible within the provided timeline.
    5. STRUCTURE: Output the result in the strict JSON format below.
     6. LANGUAGE RULES:
       - Keep the resume and cover letter at CEFR B1/B2 level.
       - Use plain and natural wording.
       - Avoid rare words, jargon overload, and exaggerated claims.
       - Each bullet should be easy to read in one quick pass.
       - Do not use fancy adjectives like "visionary", "dynamic", "exceptional", or "world-class" unless they are truly necessary.
       - Make achievements specific, but write them in simple English.
    
    Output the result in a strict JSON format with the following structure:
    {
      "personalInfo": {
        "name": "Full Name",
        "title": "Target Job Title",
        "email": "Email",
        "phone": "Phone number or empty string if not in source resume",
        "location": "City, Country",
        "linkedin": "linkedin.com/in/username"
      },
      "profile": "A strong professional summary tailored to the job.",
      "experience": [
        {
          "company": "Most Recent Company",
          "role": "Job Title",
          "period": "MM/YYYY – Present",
          "bullets": ["Bullet point 1", "Bullet point 2"]
        },
        {
          "company": "Older Company",
          "role": "Job Title",
          "period": "MM/YYYY – MM/YYYY",
          "bullets": ["Bullet point 1", "Bullet point 2"]
        }
      ],
      "education": [
        {
          "degree": "Degree Name",
          "school": "University Name",
          "period": "MM/YYYY – MM/YYYY",
          "major": "Field of Study"
        }
      ],
      "skills": {
        "Core Backend Skills": "PHP, Python, C#, .NET, REST APIs",
        "Core Front End Skills": "React, JavaScript, TypeScript, HTML, CSS",
        "Database": "PostgreSQL, MySQL, Redis",
        "Cloud & DevOps": "AWS (S3, RDS, Lambda, EC2, ECS), Docker, CI/CD Tools, Nginx, Apache, Ubuntu Linux, GitHub Actions, Azure",
        "Testing & Task Queues": "Celery, Redis, RabbitMQ, Pytest, Django TestCase, Kafka, xUnit",
        "Security & Permissions": "OAuth2, JWT, RBAC, Rate Limiting / Token Authentication, GDPR, Secure file access and expirable token links"
      },
      "coverLetter": "A complete, professional cover letter text."
    }
  `;

  return await generateWithFallback(ai, prompt);
}

export async function extractJobMetadata(jobDescription: string) {
  const ai = createGeminiClient();

  const prompt = `
    Extract the company name and the main technology stack from this job description.
    Include primary technologies from the JD plus closely related programming languages and frameworks (e.g. TypeScript with React, .NET with C#). Exclude human/spoken languages (English, Spanish, etc.).
    
    Job Description:
    ${jobDescription}
    
    Output in JSON format:
    {
      "company": "Company Name",
      "stack": "Main Stack/Skills (e.g. React, Node.js, TypeScript, AWS)"
    }
  `;

  return await generateWithFallback(ai, prompt);
}

export async function generateApplicationAnswers(
  questions: string[],
  jobDescription: string,
  resumeJson: string
) {
  const ai = createGeminiClient();

  const prompt = `
    You are an expert job application consultant.
    You have a candidate's tailored resume and the job description they are applying for.
    Answer the following application questions on behalf of the candidate.

    Job Description:
    ${jobDescription}

    Candidate's Resume (JSON):
    ${resumeJson}

    Application Questions:
    ${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

    Instructions:
    - Answer each question professionally, concisely, and persuasively (2-5 sentences each).
    - Use specific details from the resume (skills, experience, achievements) to support each answer.
    - Align answers with the job description requirements.
    - Sound natural and human — not generic or robotic.
    - If the question asks about salary expectations, give a diplomatic open answer.
    - If the question asks about availability/start date, say "available to start immediately" or "with 2 weeks notice".

    Output as a JSON array of objects:
    [
      { "question": "The original question", "answer": "Your professional answer" }
    ]
  `;

  return await generateWithFallback(ai, prompt);
}
