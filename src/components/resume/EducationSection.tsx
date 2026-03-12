import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { ResumeData } from '../../types';

interface EducationSectionProps {
  education: ResumeData['education'];
  isEditing: boolean;
  onUpdate: (idx: number, field: string, value: string) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
}

export default function EducationSection({
  education,
  isEditing,
  onUpdate,
  onAdd,
  onRemove,
}: EducationSectionProps) {
  return (
    <section className="mb-6">
      <div className="flex items-center justify-between border-b-2 border-slate-900 mb-3">
        <h2 className="text-lg font-bold uppercase tracking-wide">Education</h2>
        {isEditing && (
          <button onClick={onAdd} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded flex items-center gap-1 text-xs font-bold">
            <Plus className="w-3 h-3" /> ADD EDUCATION
          </button>
        )}
      </div>

      {education.map((edu, idx) => (
        <div key={idx} className="mb-2 relative group">
          {isEditing && (
            <button
              onClick={() => onRemove(idx)}
              className="absolute -left-8 top-0 p-1 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Remove Education"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <div className="flex justify-between items-baseline">
            <div className="flex items-baseline gap-2">
              {isEditing ? (
                <input
                  className="font-bold border-b border-transparent hover:border-slate-200 focus:border-indigo-500 outline-none"
                  value={edu.degree}
                  onChange={(e) => onUpdate(idx, 'degree', e.target.value)}
                />
              ) : (
                <span className="font-bold">{edu.degree}</span>
              )}
              <span className="text-slate-400 text-xs">,</span>
              {isEditing ? (
                <input
                  className="italic text-sm border-b border-transparent hover:border-slate-200 focus:border-indigo-500 outline-none"
                  value={edu.school}
                  onChange={(e) => onUpdate(idx, 'school', e.target.value)}
                />
              ) : (
                <span className="italic text-sm">{edu.school}</span>
              )}
            </div>
            {isEditing ? (
              <input
                className="text-sm text-right border-b border-transparent hover:border-slate-200 focus:border-indigo-500 outline-none"
                value={edu.period}
                onChange={(e) => onUpdate(idx, 'period', e.target.value)}
              />
            ) : (
              <span className="text-sm">{edu.period}</span>
            )}
          </div>
          {isEditing ? (
            <input
              className="text-sm block w-full border-b border-transparent hover:border-slate-200 focus:border-indigo-500 outline-none"
              value={edu.major}
              onChange={(e) => onUpdate(idx, 'major', e.target.value)}
            />
          ) : (
            <p className="text-sm">{edu.major}</p>
          )}
        </div>
      ))}
    </section>
  );
}
