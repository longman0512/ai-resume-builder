import { GoogleGenAI, Type } from "@google/genai";

// Fallback model list in priority order
const MODELS = [
  "gemini-3-flash-preview",
  "gemini-2.0-flash-exp",
  "gemini-1.5-flash",
  "gemini-1.5-pro"
];

async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      const isLastAttempt = i === maxRetries - 1;
      const is503Error = error?.message?.includes('503') || error?.message?.includes('UNAVAILABLE') || error?.message?.includes('high demand');
      
      if (isLastAttempt || !is503Error) {
        throw error;
      }
      
      // Exponential backoff: 2s, 4s, 8s
      const delay = Math.pow(2, i + 1) * 1000;
      console.log(`Retry attempt ${i + 1}/${maxRetries} after ${delay}ms...`);
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

export async function generateTailoredResume(currentResume: string, jobDescription: string) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const prompt = `
    You are an expert career coach and professional resume writer. 
    Your task is to tailor the provided resume to match the given job description.
    
    Current Resume:
    ${currentResume}
    
    Job Description:
    ${jobDescription}
    
    Instructions:
    1. SOURCE DATA: From the "Current Resume", ONLY extract the following:
       - Personal Information (Name, Email, Phone, Location, LinkedIn).
       - Education history (Degrees, Schools, Periods, Majors).
       - Experience skeleton (Company Names and Employment Periods ONLY).
    2. IGNORE: Completely ignore all existing professional summaries, job descriptions, bullet points, and skills from the "Current Resume". Do NOT use them as a reference.
    3. GENERATE (TAILORED CONTENT):
       - TARGET LENGTH: **STRICTLY LIMIT the resume to EXACTLY 2 A4 pages.** Do not exceed this.
       - Based ONLY on the "Job Description", generate a "Target Job Title" and an expanded "Profile" summary (approx. 100-150 words).
       - IDENTIFY: Find the main product, core service, or business domain mentioned in the "Job Description".
       - For each company in the "Experience skeleton", generate a "Role" and **6-8 detailed "bullets"** (achievements/responsibilities) that are perfectly tailored to the "Job Description". 
       - These bullets should be substantial, describing what a professional in that role *would* have done to be a perfect fit for the target job, using the technologies and methodologies requested in the JD (e.g., C#, .NET, Agile).
       - IMPORTANT: Integrate mentions of the identified main product or domain into the experience bullet points to show direct relevance.
       - Generate an extensive "skills" section that lists the core technologies from the "Job Description", categorized logically.
       - Generate a "coverLetter" (approx. 300-400 words) that is highly professional, persuasive, and specifically addresses the hiring manager. It should fit comfortably on one A4 page.
    4. ACCURACY: Ensure the generated content is professional, impactful, and plausible within the provided timeline.
    5. STRUCTURE: Output the result in the strict JSON format below.
    
    Output the result in a strict JSON format with the following structure:
    {
      "personalInfo": {
        "name": "Full Name",
        "title": "Target Job Title",
        "email": "Email",
        "phone": "Phone Number",
        "location": "City, Country",
        "linkedin": "linkedin.com/in/username"
      },
      "profile": "A strong professional summary tailored to the job.",
      "experience": [
        {
          "company": "Company Name",
          "role": "Job Title",
          "period": "MM/YYYY – MM/YYYY or Present",
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
        "Category Name (e.g. Languages)": "Skill 1, Skill 2",
        "Category Name (e.g. Frameworks)": "Skill 1, Skill 2"
      },
      "coverLetter": "A complete, professional cover letter text."
    }
  `;

  return await generateWithFallback(ai, prompt);
}

export async function extractJobMetadata(jobDescription: string) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const prompt = `
    Extract the company name and the main technology stack/skills from this job description.
    Focus on identifying the primary programming languages, frameworks, and tools mentioned.
    
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
