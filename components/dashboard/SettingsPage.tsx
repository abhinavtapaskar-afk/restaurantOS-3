import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Restaurant } from '../../types';

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [city, setCity] = useState('Nanded');
  const [subdomain, setSubdomain] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const createSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/ /g, '-')
      .replace(/[^\w-]+/g, '');
  };

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
      setSubdomain(data.subdomain);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchRestaurant();
  }, [fetchRestaurant]);

  // Effect to auto-generate subdomain for new restaurants
  useEffect(() => {
    if (!restaurant) { // only for new restaurants
      setSubdomain(createSlug(name));
    }
  }, [name, restaurant]);


  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setSaving(true);
    setMessage(null);

    let error;

    if (restaurant) {
      // Update existing restaurant (subdomain is not changed)
      const { error: updateError } = await supabase
        .from('restaurants')
        .update({ name, city })
        .eq('id', restaurant.id);
      error = updateError;
    } else {
      // Create new restaurant
      const restaurantData = {
        name,
        city,
        slug: createSlug(name) + '-' + Math.random().toString(36).substring(2, 8), // Add random suffix to slug for uniqueness
        subdomain,
      };
      const { error: insertError } = await supabase
        .from('restaurants')
        .insert(restaurantData);
      error = insertError;
    }

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      // Always refetch to get the latest data, including new restaurant details
      fetchRestaurant();
    }
    setSaving(false);
  };
  
  const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
     <input {...props} className="block w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-800 disabled:cursor-not-allowed" />
  );

  if (loading) return <div>Loading settings...</div>

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-white">Restaurant Settings</h1>
      <div className="max-w-2xl bg-slate-800/50 p-8 rounded-lg border border-slate-700">
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1">
              Restaurant Name
            </label>
            <Input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
           <div>
            <label htmlFor="subdomain" className="block text-sm font-medium text-slate-300 mb-1">
              Subdomain
            </label>
            <div className="flex mt-1">
                 <input
                    type="text"
                    id="subdomain"
                    value={subdomain}
                    onChange={(e) => setSubdomain(createSlug(e.target.value))}
                    required
                    disabled={!!restaurant}
                    className="block w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-l-md text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-800 disabled:cursor-not-allowed"
                />
                <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-slate-700 bg-slate-700 text-slate-400 text-sm">
                    .restaurantos.app
                </span>
            </div>
             {!!restaurant && <p className="mt-2 text-xs text-slate-500">Subdomain cannot be changed after creation.</p>}
          </div>
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-slate-300 mb-1">
              City
            </label>
            <Input
              type="text"
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
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