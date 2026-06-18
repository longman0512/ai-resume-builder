import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface BaseProfile {
  id: string;
  name: string;       // label the user gives (e.g. "Software Engineer – 2026")
  content: string;    // the raw resume text
  createdAt: string;
  updatedAt: string;
}

interface BaseProfileRow {
  id: string;
  user_id: string;
  name: string;
  content: string;
  created_at: string;
  updated_at: string;
}

function rowToBaseProfile(row: BaseProfileRow): BaseProfile {
  return {
    id: row.id,
    name: row.name,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function useBaseProfiles() {
  const { user } = useAuth();
  const [baseProfiles, setBaseProfiles] = useState<BaseProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) { setBaseProfiles([]); return; }
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('base_profiles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to load base profiles:', error);
      } else {
        setBaseProfiles((data || []).map((r: BaseProfileRow) => rowToBaseProfile(r)));
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (name: string, content: string): Promise<BaseProfile | null> => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('base_profiles')
      .insert({ user_id: user.id, name, content })
      .select()
      .single();

    if (error || !data) { console.error('Failed to create base profile:', error); return null; }
    const profile = rowToBaseProfile(data as BaseProfileRow);
    setBaseProfiles((prev) => [profile, ...prev]);
    return profile;
  }, [user]);

  const update = useCallback(async (id: string, name: string, content: string): Promise<void> => {
    const { error } = await supabase
      .from('base_profiles')
      .update({ name, content, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) { console.error('Failed to update base profile:', error); return; }
    setBaseProfiles((prev) =>
      prev.map((p) => p.id === id ? { ...p, name, content, updatedAt: new Date().toISOString() } : p)
    );
  }, []);

  const remove = useCallback(async (id: string): Promise<void> => {
    const { error } = await supabase.from('base_profiles').delete().eq('id', id);
    if (error) { console.error('Failed to delete base profile:', error); return; }
    setBaseProfiles((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return { baseProfiles, isLoading, refresh, create, update, remove };
}
