import { useState, useCallback } from 'react';
import { generateApplicationAnswers } from '../services/ai';

interface QAAnswer {
  question: string;
  answer: string;
}

interface UseApplicationQAReturn {
  appQuestions: string[];
  setAppQuestions: React.Dispatch<React.SetStateAction<string[]>>;
  appAnswers: QAAnswer[];
  setAppAnswers: React.Dispatch<React.SetStateAction<QAAnswer[]>>;
  isGeneratingAnswers: boolean;
  showQA: boolean;
  setShowQA: React.Dispatch<React.SetStateAction<boolean>>;
  handleGenerateAnswers: (params: {
    jobDesc: string;
    resumeJson: string;
    notify: (opts: { title: string; body: string; type: 'success' | 'error' | 'info' }) => void;
  }) => Promise<void>;
}

export function useApplicationQA(): UseApplicationQAReturn {
  const [appQuestions, setAppQuestions] = useState<string[]>(['']);
  const [appAnswers, setAppAnswers] = useState<QAAnswer[]>([]);
  const [isGeneratingAnswers, setIsGeneratingAnswers] = useState(false);
  const [showQA, setShowQA] = useState(false);

  const handleGenerateAnswers = useCallback(
    async (params: {
      jobDesc: string;
      resumeJson: string;
      notify: (opts: { title: string; body: string; type: 'success' | 'error' | 'info' }) => void;
    }) => {
      const { jobDesc, resumeJson, notify } = params;
      const validQuestions = appQuestions.filter((q) => q.trim());
      if (validQuestions.length === 0) {
        notify({ title: 'No Questions', body: 'Please add at least one question.', type: 'error' });
        return;
      }

      setIsGeneratingAnswers(true);
      setAppAnswers([]);
      try {
        const result = await generateApplicationAnswers(validQuestions, jobDesc, resumeJson);
        if (result) {
          const parsed = JSON.parse(result);
          setAppAnswers(Array.isArray(parsed) ? parsed : []);
          notify({
            title: 'Answers Ready',
            body: `Generated answers for ${validQuestions.length} question(s).`,
            type: 'success',
          });
        }
      } catch (err) {
        console.error('Q&A error:', err);
        notify({
          title: 'Answer Generation Failed',
          body: err instanceof Error ? err.message : 'Unknown error',
          type: 'error',
        });
      } finally {
        setIsGeneratingAnswers(false);
      }
    },
    [appQuestions]
  );

  return {
    appQuestions,
    setAppQuestions,
    appAnswers,
    setAppAnswers,
    isGeneratingAnswers,
    showQA,
    setShowQA,
    handleGenerateAnswers,
  };
}
