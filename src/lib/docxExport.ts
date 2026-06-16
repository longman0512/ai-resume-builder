import {
  AlignmentType,
  BorderStyle,
  convertMillimetersToTwip,
  Document,
  Packer,
  PageOrientation,
  Paragraph,
  Tab,
  TabStopType,
  TextRun,
} from 'docx';
import type { ResumeData } from '../types';
import { RESUME_CONTENT_WIDTH_MM, RESUME_PAGE, SKILL_CATEGORIES } from '../constants';
import { formatContactLine, isBlankContact } from './contactUtils';
import { sortExperienceNewestFirst } from './resumeUtils';

const FONT = 'Times New Roman';
const BODY = 22; // 11pt
const NAME = 48; // 24pt
const TITLE = 28; // 14pt
const HEADING = 24; // 12pt
/** Right-aligned tab at end of content area (matches web px-[10mm] horizontal padding). */
const RIGHT_TAB_POSITION = convertMillimetersToTwip(RESUME_CONTENT_WIDTH_MM);

function a4SectionProperties() {
  return {
    page: {
      size: {
        orientation: PageOrientation.PORTRAIT,
        width: convertMillimetersToTwip(RESUME_PAGE.WIDTH_MM),
        height: convertMillimetersToTwip(RESUME_PAGE.HEIGHT_MM),
      },
      margin: {
        top: convertMillimetersToTwip(RESUME_PAGE.MARGIN_TOP_MM),
        right: convertMillimetersToTwip(RESUME_PAGE.MARGIN_RIGHT_MM),
        bottom: convertMillimetersToTwip(RESUME_PAGE.MARGIN_BOTTOM_MM),
        left: convertMillimetersToTwip(RESUME_PAGE.MARGIN_LEFT_MM),
      },
    },
  };
}

type RunOpts = {
  bold?: boolean;
  italics?: boolean;
  size?: number;
  color?: string;
};

function run(text: string, opts: RunOpts = {}): TextRun {
  return new TextRun({ text, font: FONT, size: BODY, ...opts });
}

function experienceHeaderParagraph(company: string, role: string, period: string): Paragraph {
  const children: (TextRun | Tab)[] = [
    run(company, { bold: true }),
    run(` — ${role}`),
  ];
  if (period.trim()) {
    children.push(new TextRun({ children: [new Tab()] }));
    children.push(run(period, { italics: true }));
  }
  return new Paragraph({
    spacing: { before: 160, after: 80 },
    tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB_POSITION }],
    children,
  });
}

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 240, after: 120 },
    border: {
      bottom: { color: '000000', space: 1, style: BorderStyle.SINGLE, size: 6 },
    },
    children: [run(text.toUpperCase(), { bold: true, size: HEADING })],
  });
}

export function buildResumeDocument(data: ResumeData): Document {
  const { personalInfo, profile, education, skills } = data;
  const experience = sortExperienceNewestFirst(data.experience);
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [run(personalInfo.name, { bold: true, size: NAME })],
    })
  );

  if (personalInfo.title?.trim()) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [run(personalInfo.title, { italics: true, size: TITLE })],
      })
    );
  }

  const contactLine = formatContactLine(personalInfo);
  if (contactLine) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 280 },
        children: [run(contactLine)],
      })
    );
  }

  if (profile?.trim()) {
    children.push(sectionHeading('Profile'));
    children.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 200 },
        children: [run(profile)],
      })
    );
  }

  if (experience.length > 0) {
    children.push(sectionHeading('Professional Experience'));
    for (const exp of experience) {
      children.push(experienceHeaderParagraph(exp.company, exp.role, exp.period ?? ''));
      for (const bullet of exp.bullets) {
        if (!bullet?.trim()) continue;
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 60 },
            children: [run(bullet)],
          })
        );
      }
    }
  }

  if (education.length > 0) {
    children.push(sectionHeading('Education'));
    for (const edu of education) {
      children.push(
        new Paragraph({
          spacing: { before: 120, after: 40 },
          children: [
            run(edu.degree, { bold: true }),
            run(` — ${edu.school}`),
          ],
        })
      );
      const details = [edu.major, edu.period].filter((s) => s?.trim()).join(' | ');
      if (details) {
        children.push(
          new Paragraph({
            spacing: { after: 120 },
            children: [run(details, { italics: true })],
          })
        );
      }
    }
  }

  const skillEntries = SKILL_CATEGORIES.map((category) => ({
    category,
    value: skills[category]?.trim() ?? '',
  })).filter(({ value }) => value);
  if (skillEntries.length > 0) {
    children.push(sectionHeading('Technical Skills'));
    for (const { category, value } of skillEntries) {
      children.push(
        new Paragraph({
          spacing: { before: 80, after: 80 },
          children: [
            run(`${category}: `, { bold: true }),
            run(value),
          ],
        })
      );
    }
  }

  return new Document({
    sections: [{ properties: a4SectionProperties(), children }],
  });
}

export function buildCoverLetterDocument(data: ResumeData): Document {
  const { personalInfo, coverLetter = '' } = data;
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      spacing: { after: 40 },
      children: [run(personalInfo.name, { bold: true })],
    })
  );

  if (!isBlankContact(personalInfo.location)) {
    children.push(new Paragraph({ children: [run(personalInfo.location)] }));
  }

  const emailPhone = [personalInfo.email, personalInfo.phone]
    .filter((v) => !isBlankContact(v))
    .join(' | ');
  if (emailPhone) {
    children.push(new Paragraph({ spacing: { after: 320 }, children: [run(emailPhone)] }));
  }

  const dateStr = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  children.push(
    new Paragraph({
      spacing: { after: 320 },
      children: [run(dateStr)],
    })
  );

  const paragraphs = coverLetter.split(/\n\n+/).filter((p) => p.trim());
  for (const para of paragraphs) {
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        alignment: AlignmentType.JUSTIFIED,
        children: [run(para.trim())],
      })
    );
  }

  return new Document({
    sections: [{ properties: a4SectionProperties(), children }],
  });
}

export async function resumeToDocxBuffer(data: ResumeData): Promise<ArrayBuffer> {
  const blob = await Packer.toBlob(buildResumeDocument(data));
  return blob.arrayBuffer();
}

export async function coverLetterToDocxBuffer(data: ResumeData): Promise<ArrayBuffer> {
  const blob = await Packer.toBlob(buildCoverLetterDocument(data));
  return blob.arrayBuffer();
}
