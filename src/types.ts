export interface ResumeData {
  personalInfo: {
    name: string;
    title: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
  };
  profile: string;
  experience: {
    company: string;
    role: string;
    period: string;
    bullets: string[];
  }[];
  education: {
    degree: string;
    school: string;
    period: string;
    major: string;
  }[];
  skills: {
    [key: string]: string;
  };
}

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}
