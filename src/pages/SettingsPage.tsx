import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, Loader2, Check, Trash2, ExternalLink } from 'lucide-react';
import {
  clearGeminiApiKey,
  getGeminiApiKey,
  getGeminiApiKeySource,
  hasCustomGeminiApiKey,
  maskApiKey,
  setGeminiApiKey,
} from '../lib/geminiApiKey';
import { testGeminiApiKey } from '../services/ai';

export default function SettingsPage() {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [source, setSource] = useState(getGeminiApiKeySource());
  const [maskedCurrent, setMaskedCurrent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const refreshStatus = () => {
    setSource(getGeminiApiKeySource());
    setMaskedCurrent(maskApiKey(getGeminiApiKey()));
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const handleSave = async () => {
    setMessage(null);
    if (!apiKeyInput.trim()) {
      setMessage({ type: 'error', text: 'Please enter a Gemini API key.' });
      return;
    }
    setIsSaving(true);
    try {
      await testGeminiApiKey(apiKeyInput.trim());
      setGeminiApiKey(apiKeyInput.trim());
      setApiKeyInput('');
      refreshStatus();
      setMessage({ type: 'success', text: 'API key saved and verified.' });
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Could not verify this API key.';
      setMessage({ type: 'error', text });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestCurrent = async () => {
    setMessage(null);
    const key = apiKeyInput.trim() || getGeminiApiKey();
    if (!key) {
      setMessage({ type: 'error', text: 'No API key to test. Enter a key or set one in .env.' });
      return;
    }
    setIsTesting(true);
    try {
      await testGeminiApiKey(apiKeyInput.trim() || undefined);
      setMessage({ type: 'success', text: 'Connection successful.' });
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Connection failed.';
      setMessage({ type: 'error', text });
    } finally {
      setIsTesting(false);
    }
  };

  const handleClear = () => {
    clearGeminiApiKey();
    setApiKeyInput('');
    refreshStatus();
    const nextSource = getGeminiApiKeySource();
    setMessage({
      type: 'success',
      text:
        nextSource === 'env'
          ? 'Saved key removed. Using API key from .env.'
          : 'Saved key removed.',
    });
  };

  return (
    <div className="py-10 max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
        <p className="text-sm text-slate-500 mt-1">
          Manage your Gemini API key for resume generation and Q&amp;A.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-indigo-50">
            <KeyRound className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900">Gemini API key</h3>
            <p className="text-xs text-slate-500 mt-1">
              Stored in this browser only. Overrides the key from{' '}
              <code className="text-[11px] bg-slate-100 px-1 rounded">.env</code> when set.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-slate-500">Active source</span>
            <span className="font-medium text-slate-800">
              {source === 'custom' && 'Saved in Settings'}
              {source === 'env' && 'From .env file'}
              {source === 'none' && 'Not configured'}
            </span>
          </div>
          {maskedCurrent && (
            <div className="flex justify-between gap-4 mt-2 pt-2 border-t border-slate-200">
              <span className="text-slate-500">Current key</span>
              <span className="font-mono text-xs text-slate-700">{maskedCurrent}</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="gemini-api-key" className="text-sm font-medium text-slate-700">
            {hasCustomGeminiApiKey() ? 'Update API key' : 'API key'}
          </label>
          <div className="relative">
            <input
              id="gemini-api-key"
              type={showKey ? 'text' : 'password'}
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Paste your Gemini API key"
              className="w-full pl-4 pr-11 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              title={showKey ? 'Hide key' : 'Show key'}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Get a key from{' '}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:underline inline-flex items-center gap-0.5"
            >
              Google AI Studio
              <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>

        {message && (
          <div
            className={
              message.type === 'success'
                ? 'text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3'
                : 'text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3'
            }
          >
            {message.text}
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={isSaving || !apiKeyInput.trim()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-all"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Save &amp; verify
          </button>
          <button
            onClick={handleTestCurrent}
            disabled={isTesting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 transition-all"
          >
            {isTesting && <Loader2 className="w-4 h-4 animate-spin" />}
            Test connection
          </button>
          {hasCustomGeminiApiKey() && (
            <button
              onClick={handleClear}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Remove saved key
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-400 text-center">
        <Link to="/builder" className="text-indigo-600 hover:underline">
          Back to Builder
        </Link>
      </p>
    </div>
  );
}
