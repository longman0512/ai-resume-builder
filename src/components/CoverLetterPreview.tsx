import React from 'react';
import { ResumeData } from '../types';
import { isBlankContact } from '../lib/contactUtils';

interface CoverLetterPreviewProps {
  personalInfo: ResumeData['personalInfo'];
  coverLetter: string;
  isEditing: boolean;
  onUpdate: (value: string) => void;
}

export default function CoverLetterPreview({
  personalInfo,
  coverLetter,
  isEditing,
  onUpdate,
}: CoverLetterPreviewProps) {
  const emailPhone = [personalInfo.email, personalInfo.phone]
    .filter((v) => !isBlankContact(v))
    .join(' | ');

  return (
    <div className="flex flex-col h-full">
      <div className="mb-8">
        <p className="text-sm font-bold">{personalInfo.name}</p>
        {!isBlankContact(personalInfo.location) && (
          <p className="text-xs text-slate-600">{personalInfo.location}</p>
        )}
        {emailPhone && <p className="text-xs text-slate-600">{emailPhone}</p>}

        <div className="mt-8">
          <p className="text-sm">
            {new Date().toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>
      </div>

      <div className="flex-grow">
        {isEditing ? (
          <textarea
            className="w-full min-h-[200mm] p-4 border border-slate-200 rounded focus:border-indigo-500 outline-none text-sm leading-relaxed font-serif"
            value={coverLetter}
            onChange={(e) => onUpdate(e.target.value)}
          />
        ) : (
          <div className="text-sm whitespace-pre-wrap leading-relaxed text-justify font-serif">
            {coverLetter}
          </div>
        )}
      </div>
    </div>
  );
}
