
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Restaurant } from '../../types';

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [city, setCity] = useState('Nanded');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const fetchRestaurant = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('owner_id', user.id)
      .single();
    
    if (data) {
      setRestaurant(data);
      setName(data.name);
      setCity(data.city);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchRestaurant();
  }, [fetchRestaurant]);

  const createSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/ /g, '-')
      .replace(/[^\w-]+/g, '');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSaving(true);
    setMessage(null);

    const restaurantData = {
      id: restaurant?.id, // undefined if new
      owner_id: user.id,
      name,
      city,
      slug: restaurant?.slug || createSlug(name),
    };

    const { error } = await supabase.from('restaurants').upsert(restaurantData);

    if (error) {
        setMessage({ type: 'error', text: error.message });
    } else {
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
        if (!restaurant) { // if it was a new creation, refetch
            fetchRestaurant();
        }
    }
    setSaving(false);
  };
  
  if (loading) return <div>Loading settings...</div>

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-white">Restaurant Settings</h1>
      <div className="max-w-2xl bg-slate-900 p-8 rounded-lg border border-slate-800">
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-300">
              Restaurant Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-slate-300">
              City
            </label>
            <input
              type="text"
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
              disabled
              className="mt-1 block w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-400 placeholder-slate-500"
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex justify-center py-2 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-emerald-500 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
        {message && (
            <div className={`mt-4 p-3 rounded-md text-sm ${message.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                {message.text}
            </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
