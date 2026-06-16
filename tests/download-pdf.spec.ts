import { test, expect, type Page } from '@playwright/test';
import path from 'path';

// ── Helpers ──────────────────────────────────────────────────────

const TEST_USER = {
  email: 'azzipcirolac@gmail.com',
  password: 'Longman12!#',
};

const SAMPLE_RESUME = `John Doe
Software Engineer | john.doe@example.com | +1 555 0100 | San Francisco, CA | linkedin.com/in/johndoe

EXPERIENCE
Senior Software Engineer — Acme Corp (2021–Present)
- Built scalable REST APIs serving 10M+ requests/day
- Led migration from monolith to microservices, reducing latency by 40%
- Mentored 4 junior engineers

Software Engineer — StartupXYZ (2019–2021)
- Developed React frontend used by 50k+ users
- Integrated Stripe payments processing $2M/month

EDUCATION
B.Sc. Computer Science — MIT (2015–2019)

SKILLS
Languages: TypeScript, Python, Go
Frameworks: React, Node.js, FastAPI
Cloud: AWS, GCP, Docker, Kubernetes`;

const SAMPLE_JOB_DESC = `We are looking for a Senior Software Engineer to join our team.
Requirements:
- 5+ years of experience in software development
- Strong proficiency in TypeScript and React
- Experience with cloud platforms (AWS/GCP)
- Experience with Node.js and REST APIs
- Strong communication and mentorship skills`;

/** Log in via the login page */
async function loginUser(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(TEST_USER.email);
  await page.getByLabel('Password').fill(TEST_USER.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  // Wait for redirect to the editor
  await page.waitForURL('/', { timeout: 15_000 });
}

/** Fill in the resume + JD inputs and click Generate */
async function generateResume(page: Page) {
  // Fill base resume textarea
  await page.getByPlaceholder(/paste your current resume/i).fill(SAMPLE_RESUME);
  // Fill job description textarea
  await page.getByPlaceholder(/paste the job description/i).fill(SAMPLE_JOB_DESC);
  // Click Generate
  await page.getByRole('button', { name: /Generate Tailored Resume/i }).click();
  // Wait for the resume preview to appear (generation can take a while)
  await expect(page.getByRole('button', { name: /download/i })).toBeVisible({
    timeout: 60_000,
  });
}

// ── Tests ─────────────────────────────────────────────────────────

test.describe('Download PDF button', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
  });

  test('Download button is visible after resume generation', async ({ page }) => {
    await generateResume(page);

    const downloadBtn = page.getByRole('button', { name: /download/i });
    await expect(downloadBtn).toBeVisible();
    await expect(downloadBtn).toBeEnabled();
  });

  test('Download button shows loading spinner while downloading', async ({ page }) => {
    await generateResume(page);

    const downloadBtn = page.getByRole('button', { name: /download/i });

    // Click the button
    await downloadBtn.click();

    // While downloading, it should show "Downloading..." and be disabled
    await expect(page.getByRole('button', { name: /downloading/i })).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByRole('button', { name: /downloading/i })).toBeDisabled();
  });

  test('Download button triggers a file download', async ({ page }) => {
    await generateResume(page);

    const downloadBtn = page.getByRole('button', { name: /download/i });

    // Set up download listener BEFORE clicking
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 60_000 }),
      downloadBtn.click(),
    ]);

    // A file should be downloaded
    expect(download).toBeTruthy();

    // The filename should end with .zip (resume + cover letter bundled)
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/\.(zip|pdf)$/i);
  });

  test('Downloaded file is saved to disk and is not empty', async ({ page }) => {
    await generateResume(page);

    const downloadBtn = page.getByRole('button', { name: /download/i });

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 60_000 }),
      downloadBtn.click(),
    ]);

    // Save to temp path and check it has content
    const savePath = path.join('test-results', download.suggestedFilename());
    await download.saveAs(savePath);

    const { promises: fs } = await import('fs');
    const stats = await fs.stat(savePath);
    expect(stats.size).toBeGreaterThan(1000); // PDF/zip must be > 1 KB
  });

  test('Download button returns to normal state after download completes', async ({ page }) => {
    await generateResume(page);

    const downloadBtn = page.getByRole('button', { name: /download/i });

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 60_000 }),
      downloadBtn.click(),
    ]);

    // Consume the download to let it finish
    await download.path();

    // Button should return to "Download" state
    await expect(page.getByRole('button', { name: /^download$/i })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole('button', { name: /^download$/i })).toBeEnabled();
  });

  test('Download button is not visible before resume is generated', async ({ page }) => {
    // On fresh load (no resume generated), there should be no Download button
    await expect(page.getByRole('button', { name: /^download$/i })).not.toBeVisible();
  });

  test('Resume tab downloads correctly', async ({ page }) => {
    await generateResume(page);

    // Ensure we are on the Resume tab (default)
    const resumeTab = page.getByRole('button', { name: /^resume$/i });
    if (await resumeTab.isVisible()) {
      await resumeTab.click();
    }

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 60_000 }),
      page.getByRole('button', { name: /^download$/i }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/\.(zip|pdf)$/i);
  });

  test('Cover Letter tab downloads correctly', async ({ page }) => {
    await generateResume(page);

    // Switch to Cover Letter tab
    const coverLetterTab = page.getByRole('button', { name: /cover letter/i });
    if (await coverLetterTab.isVisible()) {
      await coverLetterTab.click();
      await page.waitForTimeout(300); // wait for tab switch animation
    }

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 60_000 }),
      page.getByRole('button', { name: /^download$/i }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/\.(zip|pdf)$/i);
  });
});
