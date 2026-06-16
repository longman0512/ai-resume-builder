import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, FileText, Loader2 } from 'lucide-react';
import { useBaseProfiles } from '../hooks/useBaseProfiles';
import type { BaseProfile } from '../hooks/useBaseProfiles';
import { cn } from '../lib/utils';

export default function ProfilePage() {
  const { baseProfiles, isLoading, create, update, remove } = useBaseProfiles();

  // ── "new" form state ────────────────────────────────────────────
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // ── edit state ──────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim() || !newContent.trim()) return;
    setIsCreating(true);
    await create(newName.trim(), newContent.trim());
    setIsCreating(false);
    setShowNew(false);
    setNewName('');
    setNewContent('');
  };

  const startEdit = (p: BaseProfile) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditContent(p.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditContent('');
  };

  const handleSave = async () => {
    if (!editingId || !editName.trim() || !editContent.trim()) return;
    setIsSaving(true);
    await update(editingId, editName.trim(), editContent.trim());
    setIsSaving(false);
    cancelEdit();
  };

  return (
    <div className="py-10 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Base Profiles</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Save multiple base resumes. Select one in the Builder when tailoring for a job.
          </p>
        </div>
        <button
          onClick={() => { setShowNew(true); setEditingId(null); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200"
        >
          <Plus className="w-4 h-4" />
          New profile
        </button>
      </div>

      {/* ── New profile form ──────────────────────────────────────── */}
      {showNew && (
        <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-6 space-y-4">
          <h3 className="font-semibold text-slate-800">New base profile</h3>
          <input
            type="text"
            placeholder="Profile name (e.g. Software Engineer 2026)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <textarea
            placeholder="Paste your base resume text here…"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            rows={10}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm resize-none bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowNew(false); setNewName(''); setNewContent(''); }}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={isCreating || !newName.trim() || !newContent.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-all"
            >
              {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save
            </button>
          </div>
        </div>
      )}

      {/* ── Profile list ─────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center gap-3 text-sm text-slate-500 py-8">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading profiles…
        </div>
      ) : baseProfiles.length === 0 && !showNew ? (
        <div className="bg-white rounded-2xl border border-slate-200 border-dashed p-14 text-center">
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <div className="bg-slate-50 p-5 rounded-full">
              <FileText className="w-10 h-10 text-slate-200" />
            </div>
            <p className="text-sm text-slate-500">No base profiles yet. Click <strong>New profile</strong> to add one.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {baseProfiles.map((p) => (
            <div
              key={p.id}
              className={cn(
                'bg-white rounded-2xl border shadow-sm p-6 space-y-4 transition-all',
                editingId === p.id ? 'border-indigo-300' : 'border-slate-200'
              )}
            >
              {editingId === p.id ? (
                <>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={10}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm resize-none bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={cancelEdit}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-all"
                    >
                      <X className="w-4 h-4" /> Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving || !editName.trim() || !editContent.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-all"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Save changes
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-50 p-2 rounded-xl">
                        <FileText className="w-4 h-4 text-indigo-500" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{p.name}</div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Updated {new Date(p.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => startEdit(p)}
                        className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => remove(p.id)}
                        className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <pre className="text-xs text-slate-500 bg-slate-50 rounded-xl p-4 whitespace-pre-wrap line-clamp-6 font-sans">
                    {p.content}
                  </pre>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
