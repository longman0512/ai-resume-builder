import React from 'react';
import { ResumeData } from '../../types';

interface ResumeHeaderProps {
  personalInfo: ResumeData['personalInfo'];
  isEditing: boolean;
  onUpdateField: (field: keyof ResumeData['personalInfo'], value: string) => void;
}

export default function ResumeHeader({ personalInfo, isEditing, onUpdateField }: ResumeHeaderProps) {
  const contactFields = ['email', 'phone', 'location', 'linkedin'] as const;

  return (
    <div className="text-center mb-6">
      {isEditing ? (
        <input
          className="text-4xl font-bold w-full text-center border-b border-transparent hover:border-slate-200 focus:border-indigo-500 outline-none mb-1"
          value={personalInfo.name}
          onChange={(e) => onUpdateField('name', e.target.value)}
        />
      ) : (
        <h1 className="text-4xl font-bold mb-1">{personalInfo.name}</h1>
      )}

      {isEditing ? (
        <input
          className="text-xl italic text-indigo-900 w-full text-center border-b border-transparent hover:border-slate-200 focus:border-indigo-500 outline-none mb-3"
          value={personalInfo.title}
          onChange={(e) => onUpdateField('title', e.target.value)}
        />
      ) : (
        <p className="text-xl italic text-indigo-900 mb-3">{personalInfo.title}</p>
      )}

      <div className="text-sm flex flex-wrap justify-center gap-2 text-slate-600">
        {contactFields.map((field) => (
          <React.Fragment key={field}>
            {isEditing ? (
              <input
                className="border-b border-transparent hover:border-slate-200 focus:border-indigo-500 outline-none px-1"
                value={personalInfo[field]}
                onChange={(e) => onUpdateField(field, e.target.value)}
              />
            ) : (
              <span>{personalInfo[field]}</span>
            )}
            {field !== 'linkedin' && <span className="text-slate-300">|</span>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
