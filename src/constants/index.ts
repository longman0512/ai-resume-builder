export const STORAGE_KEYS = {
  BASE_RESUME: 'ai_base_resume',
} as const;

export const PDF_CONFIG = {
  PAGE_WIDTH_MM: 210,
  PAGE_HEIGHT_MM: 297,
  PADDING_X_MM: 10,
  PADDING_Y_MM: 20,
  SCALE: 2,
  CANVAS_WAIT_MS: 500,
  TAB_SWITCH_WAIT_MS: 300,
} as const;

export const PERSONAL_INFO_FIELDS = ['email', 'phone', 'location', 'linkedin'] as const;
