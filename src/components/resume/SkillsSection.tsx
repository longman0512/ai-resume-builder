import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { ResumeData } from '../../types';

interface SkillsSectionProps {
  skills: ResumeData['skills'];
  isEditing: boolean;
  onUpdateSkill: (category: string, value: string) => void;
  onUpdateCategory: (oldCategory: string, newCategory: string) => void;
  onRemoveCategory: (category: string) => void;
  onAddCategory: () => void;
}

export default function SkillsSection({
  skills,
  isEditing,
  onUpdateSkill,
  onUpdateCategory,
  onRemoveCategory,
  onAddCategory,
}: SkillsSectionProps) {
  return (
    <section>
      <div className="flex items-center justify-between border-b-2 border-slate-900 mb-3">
        <h2 className="text-lg font-bold uppercase tracking-wide">Core Technologies</h2>
        {isEditing && (
          <button onClick={onAddCategory} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded flex items-center gap-1 text-xs font-bold">
            <Plus className="w-3 h-3" /> ADD CATEGORY
          </button>
        )}
      </div>
      <div className="space-y-1 text-sm">
        {Object.entries(skills).map(([category, skillValue]) => (
          <div key={category} className="flex gap-2 group/skill relative">
            {isEditing && (
              <button
                onClick={() => onRemoveCategory(category)}
                className="absolute -left-8 top-0 p-1 text-red-400 opacity-0 group-hover/skill:opacity-100 transition-opacity"
                title="Remove Category"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            {isEditing ? (
              <input
                className="font-bold border-b border-transparent hover:border-slate-200 focus:border-indigo-500 outline-none w-32"
                defaultValue={category}
                onBlur={(e) => onUpdateCategory(category, e.target.value)}
              />
            ) : (
              <span className="font-bold whitespace-nowrap">{category}:</span>
            )}
            {isEditing ? (
              <input
                className="flex-1 border-b border-transparent hover:border-slate-200 focus:border-indigo-500 outline-none"
                value={skillValue}
                onChange={(e) => onUpdateSkill(category, e.target.value)}
              />
            ) : (
              <span>{skillValue}</span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
