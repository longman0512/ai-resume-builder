import React from 'react';
import { LayoutTemplate } from 'lucide-react';
import type { ResumeTemplate, ResumeTemplateKey } from '../types';
import TemplatePreviewImage from './TemplatePreviewImage';

interface ResumeTemplateSelectorProps {
  templates: ResumeTemplate[];
  selectedTemplateKey: ResumeTemplateKey;
  onChange: (key: ResumeTemplateKey) => void;
  compact?: boolean;
}

export default function ResumeTemplateSelector({
  templates,
  selectedTemplateKey,
  onChange,
  compact = false,
}: ResumeTemplateSelectorProps) {
  if (templates.length === 0) return null;
  const selectedTemplate = templates.find((template) => template.templateKey === selectedTemplateKey) ?? templates[0];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {selectedTemplate?.previewUrl ? (
            <TemplatePreviewImage
              src={selectedTemplate.previewUrl}
              alt={`${selectedTemplate.name} preview`}
              thumbnailClassName={compact ? 'w-12 h-16' : 'w-16 h-24'}
            />
          ) : (
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <LayoutTemplate className="w-4 h-4" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Resume Template</h3>
              {selectedTemplate?.sourceType && selectedTemplate.sourceType !== 'code' && (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                  {selectedTemplate.sourceType}
                </span>
              )}
            </div>
            {!compact && (
              <p className="text-xs text-slate-500">
                {selectedTemplate?.description || 'Choose the layout used for preview and DOCX download.'}
              </p>
            )}
          </div>
        </div>
        <select
          value={selectedTemplateKey}
          onChange={(event) => onChange(event.target.value as ResumeTemplateKey)}
          className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          {templates.map((template) => (
            <option key={template.id} value={template.templateKey}>
              {template.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
