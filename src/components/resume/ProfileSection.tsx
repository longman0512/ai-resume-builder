import React from 'react';

interface ProfileSectionProps {
  profile: string;
  isEditing: boolean;
  onUpdate: (value: string) => void;
}

export default function ProfileSection({ profile, isEditing, onUpdate }: ProfileSectionProps) {
  if (!profile && !isEditing) return null;

  return (
    <section className="mb-6">
      <h2 className="text-lg font-bold border-b-2 border-slate-900 mb-2 uppercase tracking-wide">Profile</h2>
      {isEditing ? (
        <textarea
          className="w-full p-2 border border-slate-200 rounded focus:border-indigo-500 outline-none text-sm leading-relaxed"
          rows={4}
          value={profile}
          onChange={(e) => onUpdate(e.target.value)}
        />
      ) : (
        <p className="text-sm text-justify">{profile}</p>
      )}
    </section>
  );
}
