import React from 'react';
import { Plus, Trash2, MinusCircle, PlusCircle } from 'lucide-react';
import { ResumeData } from '../../types';

interface ExperienceSectionProps {
  experience: ResumeData['experience'];
  isEditing: boolean;
  onUpdate: (idx: number, field: string, value: any) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
  onAddBullet: (expIdx: number) => void;
  onRemoveBullet: (expIdx: number, bulletIdx: number) => void;
}

export default function ExperienceSection({
  experience,
  isEditing,
  onUpdate,
  onAdd,
  onRemove,
  onAddBullet,
  onRemoveBullet,
}: ExperienceSectionProps) {
  return (
    <section className="mb-6">
      <div className="flex items-center justify-between border-b-2 border-slate-900 mb-3">
        <h2 className="text-lg font-bold uppercase tracking-wide">Professional Experience</h2>
        {isEditing && (
          <button onClick={onAdd} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded flex items-center gap-1 text-xs font-bold">
            <Plus className="w-3 h-3" /> ADD EXPERIENCE
          </button>
        )}
      </div>

      <div className="space-y-4">
        {experience.map((exp, idx) => (
          <div key={idx} className="relative group">
            {isEditing && (
              <button
                onClick={() => onRemove(idx)}
                className="absolute -left-8 top-0 p-1 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove Experience"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <div className="flex justify-between items-baseline mb-1">
              <div className="flex items-baseline gap-2 flex-1">
                {isEditing ? (
                  <input
                    className="font-bold border-b border-transparent hover:border-slate-200 focus:border-indigo-500 outline-none"
                    value={exp.company}
                    onChange={(e) => onUpdate(idx, 'company', e.target.value)}
                  />
                ) : (
                  <span className="font-bold">{exp.company}</span>
                )}
                <span className="text-slate-400 text-xs">,</span>
                {isEditing ? (
                  <input
                    className="italic text-sm border-b border-transparent hover:border-slate-200 focus:border-indigo-500 outline-none flex-1"
                    value={exp.role}
                    onChange={(e) => onUpdate(idx, 'role', e.target.value)}
                  />
                ) : (
                  <span className="italic text-sm">{exp.role}</span>
                )}
              </div>
              {isEditing ? (
                <input
                  className="text-sm text-right border-b border-transparent hover:border-slate-200 focus:border-indigo-500 outline-none"
                  value={exp.period}
                  onChange={(e) => onUpdate(idx, 'period', e.target.value)}
                />
              ) : (
                <span className="text-sm">{exp.period}</span>
              )}
            </div>
            {(exp.bullets.length > 0 || isEditing) && (
              <div className="ml-1 text-sm">
                {exp.bullets.map((bullet, bIdx) => (
                  <div key={bIdx} className="relative group/bullet mb-1">
                    <div className="flex items-start gap-2">
                      {isEditing ? (
                        <>
                          <span className="mt-1 select-none">•</span>
                          <textarea
                            className="w-full p-1 border border-transparent hover:border-slate-100 focus:border-indigo-500 outline-none resize-none"
                            rows={1}
                            value={bullet}
                            onChange={(e) => {
                              const newBullets = [...exp.bullets];
                              newBullets[bIdx] = e.target.value;
                              onUpdate(idx, 'bullets', newBullets);
                            }}
                          />
                          <button
                            onClick={() => onRemoveBullet(idx, bIdx)}
                            className="p-1 text-red-300 hover:text-red-500 opacity-0 group-hover/bullet:opacity-100 transition-opacity"
                          >
                            <MinusCircle className="w-3 h-3" />
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="mt-0.5 select-none shrink-0">•</span>
                          <span>{bullet}</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                {isEditing && (
                  <button
                    onClick={() => onAddBullet(idx)}
                    className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-600 mt-1 transition-colors"
                  >
                    <PlusCircle className="w-3 h-3" /> Add Achievement
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
