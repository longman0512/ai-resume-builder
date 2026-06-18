export const STORAGE_KEYS = {
  BASE_RESUME: 'ai_base_resume',
  GEMINI_API_KEY: 'gemini_api_key',
  RESUME_TEMPLATE: 'ai_resume_template',
} as const;

export const RESUME_TEMPLATE_KEYS = ['classic', 'modern', 'compact'] as const;

/** A4 resume layout — shared by web preview and DOCX export */
export const RESUME_PAGE = {
  WIDTH_MM: 210,
  HEIGHT_MM: 297,
  MARGIN_LEFT_MM: 10,
  MARGIN_RIGHT_MM: 10,
  MARGIN_TOP_MM: 20,
  MARGIN_BOTTOM_MM: 20,
} as const;

export const RESUME_CONTENT_WIDTH_MM =
  RESUME_PAGE.WIDTH_MM - RESUME_PAGE.MARGIN_LEFT_MM - RESUME_PAGE.MARGIN_RIGHT_MM;

export const PDF_CONFIG = {
  PAGE_WIDTH_MM: RESUME_PAGE.WIDTH_MM,
  PAGE_HEIGHT_MM: RESUME_PAGE.HEIGHT_MM,
  PADDING_X_MM: RESUME_PAGE.MARGIN_LEFT_MM,
  PADDING_Y_MM: RESUME_PAGE.MARGIN_TOP_MM,
  SCALE: 2,
  CANVAS_WAIT_MS: 500,
  TAB_SWITCH_WAIT_MS: 300,
} as const;

export const PERSONAL_INFO_FIELDS = ['email', 'phone', 'location', 'linkedin'] as const;

/** Fixed skill categories for tailored resumes (exact keys in JSON). */
export const SKILL_CATEGORIES = [
  'Core Backend Skills',
  'Core Front End Skills',
  'Database',
  'Cloud & DevOps',
  'Testing & Task Queues',
  'Security & Permissions',
] as const;

export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

/** Always merged into every resume (app enforces even if AI omits them). */
export const DEFAULT_SKILLS: Record<SkillCategory, string> = {
  'Core Backend Skills': 'PHP, Python',
  'Core Front End Skills': 'React, JavaScript, TypeScript, HTML, CSS',
  Database: 'PostgreSQL, MySQL',
  'Cloud & DevOps':
    'AWS (S3, RDS, Lambda, EC2, ECS), Docker, CI/CD Tools, Nginx, Apache, Ubuntu Linux, GitHub Actions',
  'Testing & Task Queues': 'Celery, Redis, RabbitMQ, Pytest, Django TestCase, Kafka',
  'Security & Permissions':
    'OAuth2, JWT, RBAC, Rate Limiting / Token Authentication, GDPR, Secure file access and expirable token links',
};
