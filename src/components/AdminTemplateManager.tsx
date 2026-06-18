import React, { useState } from 'react';
import { Check, Edit3, FileUp, LayoutTemplate, Loader2, Plus, Trash2, X } from 'lucide-react';
import { RESUME_TEMPLATE_KEYS } from '../constants';
import { useAppContext } from '../App';
import { cn } from '../lib/utils';
import type { ResumeTemplate, ResumeTemplateKey } from '../types';
import TemplatePreviewImage from './TemplatePreviewImage';

type FormState = {
  name: string;
  description: string;
  templateKey: ResumeTemplateKey;
  previewUrl: string;
  isActive: boolean;
  sortOrder: number;
};

const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  templateKey: 'classic',
  previewUrl: '',
  isActive: true,
  sortOrder: 10,
};

function templateToForm(template: ResumeTemplate): FormState {
  return {
    name: template.name,
    description: template.description,
    templateKey: template.templateKey,
    previewUrl: template.previewUrl,
    isActive: template.isActive,
    sortOrder: template.sortOrder,
  };
}

export default function AdminTemplateManager() {
  const {
    templates,
    templatesLoading,
    templatesError,
    createTemplate,
    updateTemplate,
    removeTemplate,
    refreshTemplates,
  } = useAppContext();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const startCreate = () => {
    setNotice(null);
    setEditingId(null);
    setForm({ ...EMPTY_FORM, sortOrder: (templates.length + 1) * 10 });
    setShowForm(true);
  };

  const startEdit = (template: ResumeTemplate) => {
    setNotice(null);
    setEditingId(template.id);
    setForm(templateToForm(template));
    setShowForm(true);
  };

  const saveTemplate = async () => {
    if (!form.name.trim()) return;
    setIsSaving(true);
    try {
      if (editingId) {
        await updateTemplate(editingId, { ...form, name: form.name.trim(), description: form.description.trim() });
        setNotice('Template updated.');
      } else {
        const created = await createTemplate({ ...form, name: form.name.trim(), description: form.description.trim() });
        if (created) setNotice('Template created.');
      }
      resetForm();
    } finally {
      setIsSaving(false);
    }
  };

  const deleteTemplate = async (template: ResumeTemplate) => {
    if (template.id.startsWith('builtin-')) {
      setNotice('Built-in fallback templates cannot be deleted. Add Supabase templates to override them.');
      return;
    }
    if (!confirm(`Delete template "${template.name}"?`)) return;
    await removeTemplate(template.id);
    setNotice('Template deleted.');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/60">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <LayoutTemplate className="w-4 h-4 text-indigo-500" />
              Resume Templates
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage the templates users can select in Builder. Uploaded resume conversion will map into these approved layout keys.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setNotice('Upload-to-AI conversion is the next layer. This panel is ready to receive generated template metadata.')}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
            >
              <FileUp className="w-3.5 h-3.5" />
              Import resume
            </button>
            <button
              type="button"
              onClick={refreshTemplates}
              disabled={templatesLoading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-60 transition-all"
            >
              {templatesLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Refresh
            </button>
            <button
              type="button"
              onClick={startCreate}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              New template
            </button>
          </div>
        </div>
      </div>

      {(templatesError || notice) && (
        <div className={cn(
          'mx-5 mt-4 rounded-xl border px-4 py-3 text-sm',
          templatesError ? 'bg-amber-50 border-amber-100 text-amber-800' : 'bg-emerald-50 border-emerald-100 text-emerald-800'
        )}>
          {templatesError || notice}
        </div>
      )}

      {showForm && (
        <div className="m-5 rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-600">Name</span>
              <input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                placeholder="Modern Resume"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-600">Layout key</span>
              <select
                value={form.templateKey}
                onChange={(event) => setForm((prev) => ({ ...prev, templateKey: event.target.value as ResumeTemplateKey }))}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {RESUME_TEMPLATE_KEYS.map((key) => (
                  <option key={key} value={key}>{key}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 md:col-span-2">
              <span className="text-xs font-semibold text-slate-600">Description</span>
              <textarea
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                rows={2}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                placeholder="Briefly describe the template for users."
              />
            </label>
            <label className="space-y-1 md:col-span-2">
              <span className="text-xs font-semibold text-slate-600">Preview URL</span>
              <input
                value={form.previewUrl}
                onChange={(event) => setForm((prev) => ({ ...prev, previewUrl: event.target.value }))}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                placeholder="/templates/classic-preview.svg"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-600">Sort order</span>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(event) => setForm((prev) => ({ ...prev, sortOrder: Number(event.target.value) || 0 }))}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </label>
            <label className="flex items-center gap-2 self-end text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Active for users
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-white transition-all"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
            <button
              type="button"
              onClick={saveTemplate}
              disabled={isSaving || !form.name.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 transition-all"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save template
            </button>
          </div>
        </div>
      )}

      <div className="divide-y divide-slate-100">
        {templates.map((template) => (
          <div key={template.id} className="px-5 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              {template.previewUrl ? (
                <TemplatePreviewImage
                  src={template.previewUrl}
                  alt={`${template.name} preview`}
                  thumbnailClassName="w-16 h-24 shrink-0"
                />
              ) : (
                <div className="w-16 h-24 rounded-lg border border-dashed border-slate-200 bg-slate-50 shrink-0" />
              )}
              <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-semibold text-slate-900">{template.name}</h4>
                <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                  {template.templateKey}
                </span>
                <span className={cn(
                  'text-[10px] font-bold uppercase px-2 py-1 rounded-full',
                  template.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                )}>
                  {template.isActive ? 'Active' : 'Hidden'}
                </span>
                {template.sourceType !== 'code' && (
                  <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                    {template.sourceType}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-1">{template.description || 'No description.'}</p>
              {template.sourceFilename && (
                <p className="text-xs text-slate-400 mt-1">Source: {template.sourceFilename}</p>
              )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => startEdit(template)}
                className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                title="Edit template"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => deleteTemplate(template)}
                className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                title="Delete template"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
