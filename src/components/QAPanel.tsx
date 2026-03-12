import React from 'react';
import { Plus, Trash2, Loader2, Send, CheckCircle2, Copy, MessageSquare } from 'lucide-react';
import { cn } from '../lib/utils';

interface QAAnswer {
  question: string;
  answer: string;
}

interface QAPanelProps {
  appQuestions: string[];
  setAppQuestions: React.Dispatch<React.SetStateAction<string[]>>;
  appAnswers: QAAnswer[];
  setAppAnswers: React.Dispatch<React.SetStateAction<QAAnswer[]>>;
  isGeneratingAnswers: boolean;
  onGenerateAnswers: () => void;
  onCopyAnswer: (answer: string, idx: number) => void;
}

export default function QAPanel({
  appQuestions,
  setAppQuestions,
  appAnswers,
  setAppAnswers,
  isGeneratingAnswers,
  onGenerateAnswers,
  onCopyAnswer,
}: QAPanelProps) {
  return (
    <div className="w-full max-w-[210mm] mt-8 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-slate-700 font-semibold">
          <MessageSquare className="w-5 h-5 text-violet-500" />
          <h3>Application Questions</h3>
        </div>
        <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded uppercase tracking-wider border border-violet-100">
          AI-Powered
        </span>
      </div>

      <p className="text-xs text-slate-500">
        Add questions from the job application form. AI will generate answers based on your resume and the job description.
      </p>

      <div className="space-y-3">
        {appQuestions.map((q, idx) => (
          <div key={idx} className="flex gap-2 items-start">
            <span className="mt-2.5 text-xs font-bold text-slate-400 w-5 shrink-0">{idx + 1}.</span>
            <textarea
              className="flex-1 p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all resize-none bg-slate-50 text-sm"
              rows={2}
              placeholder="Paste an application question here..."
              value={q}
              onChange={(e) => {
                const updated = [...appQuestions];
                updated[idx] = e.target.value;
                setAppQuestions(updated);
              }}
            />
            {appQuestions.length > 1 && (
              <button
                onClick={() => {
                  setAppQuestions(appQuestions.filter((_, i) => i !== idx));
                  setAppAnswers([]);
                }}
                className="mt-2 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setAppQuestions([...appQuestions, ''])}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-violet-600 hover:bg-violet-50 rounded-lg transition-colors border border-violet-200"
        >
          <Plus className="w-3.5 h-3.5" /> Add Question
        </button>
        <button
          onClick={onGenerateAnswers}
          disabled={isGeneratingAnswers}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-lg transition-all shadow-sm',
            isGeneratingAnswers ? 'bg-slate-400 cursor-wait' : 'bg-violet-600 hover:bg-violet-700'
          )}
        >
          {isGeneratingAnswers ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" /> Generate Answers
            </>
          )}
        </button>
      </div>

      {/* Generated Answers */}
      {appAnswers.length > 0 && (
        <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
          <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Generated Answers
          </h4>
          {appAnswers.map((qa, idx) => (
            <div key={idx} className="bg-slate-50 rounded-xl p-4 space-y-2 border border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Q{idx + 1}: {qa.question}</p>
              <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{qa.answer}</p>
              <button
                onClick={() => onCopyAnswer(qa.answer, idx)}
                className="flex items-center gap-1 text-[10px] font-bold text-indigo-500 hover:text-indigo-700 uppercase tracking-wider mt-1"
              >
                <Copy className="w-3 h-3" /> Copy Answer
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
