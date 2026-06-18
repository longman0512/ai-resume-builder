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
import type { ResumeData, ResumeTemplateKey } from '../types';
import { RESUME_CONTENT_WIDTH_MM, RESUME_PAGE, SKILL_CATEGORIES } from '../constants';
import { formatContactLine, isBlankContact } from './contactUtils';
import { sortExperienceNewestFirst } from './resumeUtils';

const BODY = 22; // 11pt
const NAME = 48; // 24pt
const TITLE = 28; // 14pt
const HEADING = 24; // 12pt
/** Right-aligned tab at end of content area (matches web px-[10mm] horizontal padding). */
const RIGHT_TAB_POSITION = convertMillimetersToTwip(RESUME_CONTENT_WIDTH_MM);

function getTemplateStyle(templateKey: ResumeTemplateKey = 'classic') {
  if (templateKey === 'modern') {
    return { font: 'Aptos', headingColor: '4F46E5', bodySize: BODY, compact: false };
  }
  if (templateKey === 'compact') {
    return { font: 'Times New Roman', headingColor: '000000', bodySize: 20, compact: true };
  }
  return { font: 'Times New Roman', headingColor: '000000', bodySize: BODY, compact: false };
}

function a4SectionProperties(templateKey: ResumeTemplateKey = 'classic') {
  const compact = templateKey === 'compact';
  return {
    page: {
      size: {
        orientation: PageOrientation.PORTRAIT,
        width: convertMillimetersToTwip(RESUME_PAGE.WIDTH_MM),
        height: convertMillimetersToTwip(RESUME_PAGE.HEIGHT_MM),
      },
      margin: {
        top: convertMillimetersToTwip(compact ? 14 : RESUME_PAGE.MARGIN_TOP_MM),
        right: convertMillimetersToTwip(RESUME_PAGE.MARGIN_RIGHT_MM),
        bottom: convertMillimetersToTwip(compact ? 14 : RESUME_PAGE.MARGIN_BOTTOM_MM),
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

function run(text: string, opts: RunOpts = {}, templateKey: ResumeTemplateKey = 'classic'): TextRun {
  const style = getTemplateStyle(templateKey);
  return new TextRun({ text, font: style.font, size: style.bodySize, ...opts });
}

function experienceHeaderParagraph(company: string, role: string, period: string, templateKey: ResumeTemplateKey): Paragraph {
  const style = getTemplateStyle(templateKey);
  const children: (TextRun | Tab)[] = [
    run(company, { bold: true }, templateKey),
    run(` - ${role}`, {}, templateKey),
  ];
  if (period.trim()) {
    children.push(new TextRun({ children: [new Tab()] }));
    children.push(run(period, { italics: true }, templateKey));
  }
  return new Paragraph({
    spacing: { before: style.compact ? 100 : 160, after: style.compact ? 50 : 80 },
    tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB_POSITION }],
    children,
  });
}

function sectionHeading(text: string, templateKey: ResumeTemplateKey): Paragraph {
  const style = getTemplateStyle(templateKey);
  return new Paragraph({
    spacing: { before: style.compact ? 160 : 240, after: style.compact ? 80 : 120 },
    border: {
      bottom: { color: style.headingColor, space: 1, style: BorderStyle.SINGLE, size: 6 },
    },
    children: [run(text.toUpperCase(), { bold: true, size: style.compact ? 22 : HEADING, color: style.headingColor }, templateKey)],
  });
}

export function buildResumeDocument(data: ResumeData, templateKey: ResumeTemplateKey = 'classic'): Document {
  const style = getTemplateStyle(templateKey);
  const { personalInfo, profile, education, skills } = data;
  const experience = sortExperienceNewestFirst(data.experience);
  const children: Paragraph[] = [];
  const skillEntries = SKILL_CATEGORIES.map((category) => ({
    category,
    value: skills[category]?.trim() ?? '',
  })).filter(({ value }) => value);
  const appendSkillsSection = () => {
    if (skillEntries.length === 0) return;
    const skillsHeading = templateKey === 'classic'
      ? 'Core Skills'
      : templateKey === 'modern'
        ? 'Core Technologies'
        : 'Technical Skills';
    children.push(sectionHeading(skillsHeading, templateKey));
    for (const { category, value } of skillEntries) {
      children.push(
        new Paragraph({
          spacing: { before: style.compact ? 50 : 80, after: style.compact ? 50 : 80 },
          children: [
            run(`${category}: `, { bold: true }, templateKey),
            run(value, {}, templateKey),
          ],
        })
      );
    }
  };

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: style.compact ? 40 : 80 },
      children: [run(personalInfo.name, { bold: true, size: style.compact ? 40 : NAME, color: style.headingColor }, templateKey)],
    })
  );

  if (personalInfo.title?.trim()) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: style.compact ? 80 : 120 },
        children: [run(personalInfo.title, { italics: true, size: style.compact ? 24 : TITLE }, templateKey)],
      })
    );
  }

  const contactLine = formatContactLine(personalInfo);
  if (contactLine) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: style.compact ? 180 : 280 },
        children: [run(contactLine, {}, templateKey)],
      })
    );
  }

  if (profile?.trim()) {
    children.push(sectionHeading('Profile', templateKey));
    children.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: style.compact ? 120 : 200 },
        children: [run(profile, {}, templateKey)],
      })
    );
  }

  if (templateKey === 'classic') {
    appendSkillsSection();
  }

  if (experience.length > 0) {
    children.push(sectionHeading('Professional Experience', templateKey));
    for (const exp of experience) {
      children.push(experienceHeaderParagraph(exp.company, exp.role, exp.period ?? '', templateKey));
      for (const bullet of exp.bullets) {
        if (!bullet?.trim()) continue;
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: style.compact ? 35 : 60 },
            children: [run(bullet, {}, templateKey)],
          })
        );
      }
    }
  }

  if (education.length > 0) {
    children.push(sectionHeading('Education', templateKey));
    for (const edu of education) {
      children.push(
        new Paragraph({
          spacing: { before: style.compact ? 80 : 120, after: 40 },
          children: [
            run(edu.degree, { bold: true }, templateKey),
            run(` - ${edu.school}`, {}, templateKey),
          ],
        })
      );
      const details = [edu.major, edu.period].filter((s) => s?.trim()).join(' | ');
      if (details) {
        children.push(
          new Paragraph({
            spacing: { after: style.compact ? 80 : 120 },
            children: [run(details, { italics: true }, templateKey)],
          })
        );
      }
    }
  }

  if (templateKey !== 'classic') {
    appendSkillsSection();
  }

  return new Document({
    sections: [{ properties: a4SectionProperties(templateKey), children }],
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

export async function resumeToDocxBuffer(data: ResumeData, templateKey: ResumeTemplateKey = 'classic'): Promise<ArrayBuffer> {
  const blob = await Packer.toBlob(buildResumeDocument(data, templateKey));
  return blob.arrayBuffer();
}

export async function coverLetterToDocxBuffer(data: ResumeData): Promise<ArrayBuffer> {
  const blob = await Packer.toBlob(buildCoverLetterDocument(data));
  return blob.arrayBuffer();
}
