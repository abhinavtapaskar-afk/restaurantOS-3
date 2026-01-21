import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Restaurant } from '../../types';

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [city, setCity] = useState('Nanded');
  const [subdomain, setSubdomain] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [about, setAbout] = useState('');
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null);

  const createSlug = (text: string) => {
    return text.toLowerCase().replace(/&/g, 'and').replace(/ /g, '-').replace(/[^\w-]+/g, '');
  };

  const fetchRestaurant = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('restaurants').select('*').eq('owner_id', user.id).single();
    if (data) {
      setRestaurant(data);
      setName(data.name);
      setCity(data.city);
      setSubdomain(data.subdomain);
      setAddress(data.address || '');
      setPhone(data.phone_number || '');
      setAbout(data.about_us || '');
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchRestaurant() }, [fetchRestaurant]);

  useEffect(() => {
    if (!restaurant) setSubdomain(createSlug(name));
  }, [name, restaurant]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setMessage(null);

    let hero_image_url = restaurant?.hero_image_url;

    if (heroImageFile) {
        const filePath = `public/${restaurant?.id || user.id}/hero-${Date.now()}`;
        const { error: uploadError } = await supabase.storage.from('restaurant-assets').upload(filePath, heroImageFile);
        if (uploadError) {
            setMessage({ type: 'error', text: `Image upload failed: ${uploadError.message}` });
            setSaving(false);
            return;
        }
        const { data: { publicUrl } } = supabase.storage.from('restaurant-assets').getPublicUrl(filePath);
        hero_image_url = publicUrl;
    }

    const restaurantData = {
      name, city, address, phone_number: phone, about_us: about, hero_image_url,
    };

    let error;
    if (restaurant) {
      const { error: updateError } = await supabase.from('restaurants').update(restaurantData).eq('id', restaurant.id);
      error = updateError;
    } else {
      const slug = createSlug(name) + '-' + Math.random().toString(36).substring(2, 8);
      const { error: insertError } = await supabase.from('restaurants').insert({ ...restaurantData, subdomain, slug });
      error = insertError;
    }

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      fetchRestaurant();
    }
    setSaving(false);
  };
  
  const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
     <input {...props} className="block w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-800 disabled:cursor-not-allowed" />
  );
  const TextArea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea {...props} rows={4} className="block w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
 );

  if (loading) return <div>Loading settings...</div>

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2 text-white">Restaurant Settings</h1>
      <p className="mb-6 text-slate-400">This information will be used to generate your public website.</p>
      <div className="max-w-3xl bg-slate-800/50 p-8 rounded-lg border border-slate-700">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1">Restaurant Name</label>
              <Input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-slate-300 mb-1">City</label>
              <Input type="text" id="city" value={city} onChange={(e) => setCity(e.target.value)} required />
            </div>
          </div>
          <div>
            <label htmlFor="subdomain" className="block text-sm font-medium text-slate-300 mb-1">Subdomain</label>
            <div className="flex mt-1">
                 <input type="text" id="subdomain" value={subdomain} onChange={(e) => setSubdomain(createSlug(e.target.value))} required disabled={!!restaurant} className="block w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-l-md text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-800 disabled:cursor-not-allowed" />
                <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-slate-700 bg-slate-700 text-slate-400 text-sm">.restaurantos.app</span>
            </div>
             {!!restaurant && <p className="mt-2 text-xs text-slate-500">Subdomain cannot be changed after creation.</p>}
          </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label htmlFor="address" className="block text-sm font-medium text-slate-300 mb-1">Address</label>
                <Input type="text" id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div>
                <label htmlFor="phone" className="block text-sm font-medium text-slate-300 mb-1">Phone Number</label>
                <Input type="tel" id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
           <div>
              <label htmlFor="about" className="block text-sm font-medium text-slate-300 mb-1">About Us</label>
              <TextArea id="about" value={about} onChange={(e) => setAbout(e.target.value)} placeholder="Tell your customers a little about your restaurant..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Hero Image</label>
            {restaurant?.hero_image_url && !heroImageFile && <img src={restaurant.hero_image_url} alt="Hero" className="w-48 h-24 object-cover rounded-md mb-2" />}
            <input type="file" onChange={e => e.target.files && setHeroImageFile(e.target.files[0])} accept="image/*" className="mt-1 block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-500/10 file:text-emerald-500 hover:file:bg-emerald-500/20 transition-colors"/>
          </div>
          <div>
            <button type="submit" disabled={saving} className="inline-flex justify-center py-2 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-emerald-500 disabled:opacity-50">
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