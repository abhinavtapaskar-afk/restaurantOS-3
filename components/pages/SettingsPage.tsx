
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Restaurant } from '../../types';
import { cn } from '../../lib/utils';
import { Check, CreditCard } from 'lucide-react';

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input className={cn("block w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-slate-800 disabled:cursor-not-allowed", className)} ref={ref} {...props} />
  )
);
Input.displayName = "Input";

const TextArea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea className={cn("block w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500", className)} ref={ref} rows={4} {...props} />
  )
);
TextArea.displayName = "TextArea";

const SectionHeader: React.FC<{ title: string, subtitle: string }> = ({ title, subtitle }) => (
    <div className="border-b border-slate-700 pb-4 mb-6">
        <h2 className="text-xl font-bold text-white">{title}</h2>
        <p className="text-sm text-slate-400">{subtitle}</p>
    </div>
);

const themes = [
    { name: 'emerald', color: 'bg-emerald-500' },
    { name: 'sky', color: 'bg-sky-500' },
    { name: 'rose', color: 'bg-rose-500' },
    { name: 'amber', color: 'bg-amber-500' },
];

const fonts = [
    { name: 'Inter', className: 'font-sans' },
    { name: 'Roboto Slab', className: 'font-roboto-slab' },
    { name: 'Lato', className: 'font-lato' },
];

const SettingsPage: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [formState, setFormState] = useState({
        name: '', city: 'Nanded', slug: '', address: '', phone: '', about: '',
        theme_color: 'emerald', font: 'Inter', hero_title: '', hero_subtitle: '',
        opening_hours: '', google_maps_url: '', upi_id: ''
    });
    const [heroImageFile, setHeroImageFile] = useState<File | null>(null);
    
    const createSlug = (text: string) => text.toLowerCase().replace(/&/g, 'and').replace(/ /g, '-').replace(/[^\w-]+/g, '');
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { id, value } = e.target;
        setFormState(prev => {
            const newState = { ...prev, [id]: value };
            // If name changes for a *new* restaurant, update the slug suggestion.
            if (id === 'name' && !restaurant) {
                newState.slug = createSlug(value);
            }
            return newState;
        });
    };

    const fetchRestaurant = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await supabase.from('restaurants').select('*').eq('owner_id', user.id).maybeSingle();
            if (error) throw error;
            if (data) {
                setRestaurant(data);
                setFormState({
                    name: data.name || '', city: data.city || 'Nanded', slug: data.slug || '',
                    address: data.address || '', phone: data.phone_number || '', about: data.about_us || '',
                    theme_color: data.theme_color || 'emerald', font: data.font || 'Inter',
                    hero_title: data.hero_title || '', hero_subtitle: data.hero_subtitle || '',
                    opening_hours: data.opening_hours || '', google_maps_url: data.google_maps_url || '',
                    upi_id: data.upi_id || ''
                });
            }
        } catch (err: any) {
            console.error('[SettingsPage] Error fetching restaurant:', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { fetchRestaurant() }, [fetchRestaurant]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setSaving(true);
        setMessage(null);

        try {
            let hero_image_url = restaurant?.hero_image_url;
            if (heroImageFile) {
                const filePath = `public/${restaurant?.id || user.id}/hero-${Date.now()}`;
                const { error: uploadError } = await supabase.storage.from('restaurant-assets').upload(filePath, heroImageFile);
                if (uploadError) throw uploadError;
                
                const { data: { publicUrl } } = supabase.storage.from('restaurant-assets').getPublicUrl(filePath);
                hero_image_url = publicUrl;
            }

            const upsertData = {
                id: restaurant?.id, // Supabase handles undefined as new insert
                owner_id: user.id,
                name: formState.name,
                city: formState.city,
                address: formState.address,
                phone_number: formState.phone,
                about_us: formState.about,
                theme_color: formState.theme_color,
                font: formState.font,
                hero_title: formState.hero_title,
                hero_subtitle: formState.hero_subtitle,
                hero_image_url,
                opening_hours: formState.opening_hours,
                google_maps_url: formState.google_maps_url,
                upi_id: formState.upi_id,
                slug: formState.slug
            };

            const { data, error } = await supabase.from('restaurants').upsert(upsertData, { onConflict: 'id' }).select().single();
            if (error) throw error;

            setMessage({ type: 'success', text: 'Settings saved successfully!' });
            if (data) {
                setRestaurant(data);
            } else {
                fetchRestaurant(); 
            }
        } catch (err: any) {
            console.error('[SettingsPage] Error saving settings:', err);
            setMessage({ type: 'error', text: `Save failed: ${err.message}` });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-400">Loading settings...</div>;

    return (
        <div>
            <h1 className="text-3xl font-bold mb-2 text-white">Restaurant Settings</h1>
            <p className="mb-6 text-slate-400">Manage your restaurant details and customize your public website.</p>
            <form onSubmit={handleSave} className="max-w-4xl bg-slate-800/50 p-8 rounded-lg border border-slate-700 space-y-10">
                
                <section>
                    <SectionHeader title="Basic Information" subtitle="Core details for your restaurant." />
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1">Restaurant Name</label>
                                <Input type="text" id="name" value={formState.name} onChange={handleInputChange} required />
                            </div>
                            <div>
                                <label htmlFor="city" className="block text-sm font-medium text-slate-300 mb-1">City</label>
                                <Input type="text" id="city" value={formState.city} onChange={handleInputChange} required />
                            </div>
                        </div>
                         <div>
                            <label htmlFor="slug" className="block text-sm font-medium text-slate-300 mb-1">Public URL Slug</label>
                            <Input type="text" id="slug" value={formState.slug} onChange={handleInputChange} required placeholder="your-restaurant-name" />
                            <p className="text-xs text-slate-500 mt-1">This URL slug is always editable. Changing it will break existing links to your menu.</p>
                         </div>
                         <div>
                            <label htmlFor="upi_id" className="block text-sm font-medium text-slate-300 mb-1 flex items-center gap-2">
                                <CreditCard size={16} className="text-emerald-500" />
                                Business UPI ID (for Online Payments)
                            </label>
                            <Input type="text" id="upi_id" value={formState.upi_id} onChange={handleInputChange} placeholder="e.g., business@okaxis" />
                            <p className="mt-1 text-xs text-slate-500 italic">Customers will see a Pay via UPI option during checkout.</p>
                        </div>
                    </div>
                </section>

                <section>
                    <SectionHeader title="Branding & Website" subtitle="Customize the look and feel of your public page." />
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Theme Color</label>
                            <div className="flex gap-4">
                                {themes.map(theme => (
                                    <button type="button" key={theme.name} onClick={() => setFormState(p => ({...p, theme_color: theme.name}))} className={cn('w-10 h-10 rounded-full transition-transform hover:scale-110 flex items-center justify-center', theme.color, formState.theme_color === theme.name && 'ring-2 ring-offset-2 ring-offset-slate-800 ring-white')}>
                                        {formState.theme_color === theme.name && <Check className="w-5 h-5 text-white" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                             <label htmlFor="font" className="block text-sm font-medium text-slate-300 mb-1">Font Style</label>
                             <select id="font" value={formState.font} onChange={handleInputChange} className="block w-full max-w-xs px-3 py-2 bg-slate-900 border border-slate-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                                {fonts.map(font => <option key={font.name} value={font.name} className={font.className}>{font.name}</option>)}
                             </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Hero Image</label>
                            {restaurant?.hero_image_url && !heroImageFile && <img src={restaurant.hero_image_url} alt="Hero" className="w-48 h-24 object-cover rounded-md mb-2" />}
                            <input type="file" onChange={e => e.target.files && setHeroImageFile(e.target.files[0])} accept="image/*" className="mt-1 block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-500/10 file:text-emerald-500 hover:file:bg-emerald-500/20"/>
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="hero_title" className="block text-sm font-medium text-slate-300 mb-1">Hero Title</label>
                                <Input type="text" id="hero_title" value={formState.hero_title} onChange={handleInputChange} placeholder="e.g., The Best Biryani in Nanded" />
                            </div>
                            <div>
                                <label htmlFor="hero_subtitle" className="block text-sm font-medium text-slate-300 mb-1">Hero Subtitle</label>
                                <Input type="text" id="hero_subtitle" value={formState.hero_subtitle} onChange={handleInputChange} placeholder="Authentic flavors, delivered to you." />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="about" className="block text-sm font-medium text-slate-300 mb-1">About Us</label>
                            <TextArea id="about" value={formState.about} onChange={handleInputChange} placeholder="Tell your customers a little about your restaurant..." />
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="address" className="block text-sm font-medium text-slate-300 mb-1">Address</label>
                                <Input type="text" id="address" value={formState.address} onChange={handleInputChange} />
                            </div>
                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-slate-300 mb-1">Phone Number</label>
                                <Input type="tel" id="phone" value={formState.phone} onChange={handleInputChange} />
                            </div>
                        </div>
                         <div>
                            <label htmlFor="opening_hours" className="block text-sm font-medium text-slate-300 mb-1">Opening Hours</label>
                            <TextArea id="opening_hours" value={formState.opening_hours} onChange={handleInputChange} rows={3} placeholder="e.g., Mon-Fri: 9am - 10pm&#10;Sat-Sun: 11am - 11pm" />
                        </div>
                         <div>
                            <label htmlFor="google_maps_url" className="block text-sm font-medium text-slate-300 mb-1">Google Maps URL</label>
                            <Input type="url" id="google_maps_url" value={formState.google_maps_url} onChange={handleInputChange} placeholder="https://maps.app.goo.gl/..." />
                        </div>
                    </div>
                </section>
                
                <div>
                    <button type="submit" disabled={saving} className="inline-flex justify-center py-2 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-emerald-500 disabled:opacity-50">
                        {saving ? 'Saving...' : 'Save All Settings'}
                    </button>
                </div>
            </form>
            {message && (
                <div className={`mt-4 max-w-4xl p-3 rounded-md text-sm ${message.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {message.text}
                </div>
            )}
        </div>
    );
};

export default SettingsPage;
