
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Restaurant } from '../../types';
import { cn } from '../../lib/utils';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { QRCodeCanvas } from 'qrcode.react';
import { 
    Check, 
    Smartphone, 
    Layout, 
    Palette, 
    Globe, 
    Instagram, 
    MessageCircle, 
    Phone, 
    MapPin, 
    Image as ImageIcon,
    Save,
    RefreshCw,
    QrCode,
    FileDown,
    Table as TableIcon,
    Loader2,
    Zap
} from 'lucide-react';

export const fonts = [
    { name: 'Poppins', category: 'Modern', family: "'Poppins', sans-serif" },
    { name: 'Montserrat', category: 'Modern', family: "'Montserrat', sans-serif" },
    { name: 'Playfair Display', category: 'Classic', family: "'Playfair Display', serif" },
    { name: 'Roboto Slab', category: 'Classic', family: "'Roboto Slab', serif" },
    { name: 'Quicksand', category: 'Soft', family: "'Quicksand', sans-serif" },
    { name: 'Lato', category: 'Standard', family: "'Lato', sans-serif" },
];

const SettingsPage: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [pdfGenerating, setPdfGenerating] = useState(false);
    const [showPdfSource, setShowPdfSource] = useState(false);
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const pdfSourceRef = useRef<HTMLDivElement>(null);

    const [formState, setFormState] = useState({
        name: '', city: 'Nanded', slug: '', address: '', phone: '', about: '',
        theme_color: '#10b981', secondary_theme_color: '#059669', font: 'Poppins',
        hero_title: '', hero_subtitle: '', hero_opacity: 60,
        opening_hours: '', google_maps_url: '', upi_id: '',
        whatsapp_number: '', instagram_url: '', is_accepting_orders: true,
        total_tables: 0
    });
    const [heroImageFile, setHeroImageFile] = useState<File | null>(null);
    const [previewHeroUrl, setPreviewHeroUrl] = useState<string | null>(null);
    
    const cleanSlug = (text: string) => text.toLowerCase()
        .replace(/&/g, 'and')
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { id, value, type } = e.target;
        const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : (type === 'number' ? parseInt(value) || 0 : value);
        
        setFormState(prev => {
            const newState = { ...prev, [id]: val };
            if (id === 'name' && !restaurant) {
                newState.slug = cleanSlug(value);
            }
            if (id === 'slug') {
                newState.slug = cleanSlug(value);
            }
            return newState;
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setHeroImageFile(file);
            setPreviewHeroUrl(URL.createObjectURL(file));
        }
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
                    theme_color: data.theme_color || '#10b981', 
                    secondary_theme_color: data.secondary_theme_color || '#059669',
                    font: data.font || 'Poppins',
                    hero_title: data.hero_title || '', 
                    hero_subtitle: data.hero_subtitle || '', 
                    hero_opacity: data.hero_opacity ?? 60,
                    opening_hours: data.opening_hours || '', 
                    google_maps_url: data.google_maps_url || '', 
                    upi_id: data.upi_id || '',
                    whatsapp_number: data.whatsapp_number || '',
                    instagram_url: data.instagram_url || '',
                    is_accepting_orders: data.is_accepting_orders ?? true,
                    total_tables: data.total_tables || 0
                });
            }
        } catch (err: any) {
            console.error('[SettingsPage] Fetch error:', err);
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
                await supabase.storage.from('restaurant-assets').upload(filePath, heroImageFile);
                const { data: { publicUrl } } = supabase.storage.from('restaurant-assets').getPublicUrl(filePath);
                hero_image_url = publicUrl;
            }

            const finalSlug = formState.slug.trim();
            const subdomainValue = finalSlug || cleanSlug(formState.name) || `store-${user.id.substring(0, 5)}`;

            const upsertData = {
                id: restaurant?.id, 
                owner_id: user.id,
                name: formState.name,
                city: formState.city,
                address: formState.address,
                phone_number: formState.phone,
                whatsapp_number: formState.whatsapp_number,
                instagram_url: formState.instagram_url,
                about_us: formState.about,
                theme_color: formState.theme_color,
                secondary_theme_color: formState.secondary_theme_color,
                font: formState.font,
                hero_title: formState.hero_title,
                hero_subtitle: formState.hero_subtitle,
                hero_opacity: formState.hero_opacity,
                hero_image_url,
                opening_hours: formState.opening_hours,
                google_maps_url: formState.google_maps_url,
                upi_id: formState.upi_id,
                slug: subdomainValue,
                subdomain: subdomainValue,
                is_accepting_orders: formState.is_accepting_orders,
                total_tables: formState.total_tables
            };

            const { error } = await supabase.from('restaurants').upsert(upsertData, { onConflict: 'id' });
            if (error) throw error;

            setMessage({ type: 'success', text: 'Studio changes published!' });
            fetchRestaurant();
        } catch (err: any) {
            console.error('[SettingsPage] Save Error:', err);
            setMessage({ type: 'error', text: `Publication failed: ${err.message}` });
        } finally {
            setSaving(false);
        }
    };

    const handleDownloadPDF = async () => {
        setPdfGenerating(true);
        setShowPdfSource(true);
        console.log('[PDF] Multipage generation started...');

        // Wait for React to render all virtual pages and QR canvases to stabilize
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            if (!pdfSourceRef.current) {
                throw new Error('PDF source container not found');
            }

            const pageElements = pdfSourceRef.current.querySelectorAll('.pdf-page');
            if (pageElements.length === 0) {
                throw new Error('No printable pages generated');
            }

            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            for (let i = 0; i < pageElements.length; i++) {
                const pageEl = pageElements[i] as HTMLElement;
                console.log(`[PDF] Capturing Page ${i + 1}/${pageElements.length}...`);
                
                const canvas = await html2canvas(pageEl, {
                    scale: 2.5, // Perfect balance between resolution and memory
                    useCORS: true,
                    backgroundColor: '#ffffff',
                    logging: false
                });

                const imgData = canvas.toDataURL('image/jpeg', 0.95);
                
                // Add the captured canvas to the current PDF page
                pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

                // Add a new page if this wasn't the last one
                if (i < pageElements.length - 1) {
                    pdf.addPage();
                }
            }

            pdf.save(`${formState.slug}-HQ-QR-Codes.pdf`);
            console.log('[PDF] Distribution package ready.');
        } catch (err: any) {
            console.error('[PDF] Critical Failure:', err);
            alert(`PDF Generation failed: ${err.message}`);
        } finally {
            setPdfGenerating(false);
            setShowPdfSource(false);
        }
    };

    if (loading) return <div className="p-12 text-center text-slate-500 animate-pulse font-bold uppercase tracking-widest">Inking your design...</div>;

    const selectedFont = fonts.find(f => f.name === formState.font);
    const publicBaseUrl = `${window.location.origin}${window.location.pathname}#/menu/${formState.slug}`;

    // Helper to chunk tables into pairs for 2-per-page layout
    const tableChunks = [];
    for (let i = 0; i < formState.total_tables; i += 2) {
        tableChunks.push(Array.from({ length: formState.total_tables }).slice(i, i + 2).map((_, idx) => i + idx + 1));
    }

    return (
        <div className="flex flex-col xl:flex-row gap-8 h-full max-w-[1600px] mx-auto font-sans">
            {/* --- STUDIO CONTROLS --- */}
            <div className="flex-1 space-y-8 pb-12">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tighter">Design <span className="text-emerald-500">Studio</span></h1>
                        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Nanded SaaS Edition</p>
                    </div>
                    <button 
                        onClick={handleSave} 
                        disabled={saving} 
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 px-8 rounded-xl transition-all shadow-glow-emerald flex items-center gap-2 disabled:opacity-50"
                    >
                        {saving ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
                        {saving ? 'Publishing...' : 'Publish Studio'}
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Section: Basic Identity */}
                    <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Globe size={18} className="text-emerald-500"/> Basic Identity</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Restaurant Name</label>
                                <input id="name" value={formState.name} onChange={handleInputChange} className="w-full bg-slate-950/50 border border-white/5 rounded-lg px-4 py-2.5 text-white focus:border-emerald-500 outline-none font-bold" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Public Slug / Subdomain</label>
                                <input id="slug" value={formState.slug} onChange={handleInputChange} className="w-full bg-slate-950/50 border border-white/5 rounded-lg px-4 py-2.5 text-emerald-400 font-mono text-sm focus:border-emerald-500 outline-none font-bold" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">UPI ID (Business)</label>
                                <input id="upi_id" value={formState.upi_id} onChange={handleInputChange} placeholder="business@upi" className="w-full bg-slate-950/50 border border-white/5 rounded-lg px-4 py-2.5 text-white focus:border-emerald-500 outline-none font-bold" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">City</label>
                                <input id="city" value={formState.city} onChange={handleInputChange} className="w-full bg-slate-950/50 border border-white/5 rounded-lg px-4 py-2.5 text-white focus:border-emerald-500 outline-none font-bold" />
                            </div>
                        </div>
                    </div>

                    {/* Section: Table QR Management */}
                    <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-white font-bold flex items-center gap-2"><QrCode size={18} className="text-indigo-500"/> Table QR Management</h3>
                            {formState.total_tables > 0 && (
                                <button 
                                    onClick={handleDownloadPDF} 
                                    disabled={pdfGenerating}
                                    className="flex items-center gap-2 text-[10px] font-black uppercase text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50"
                                >
                                    {pdfGenerating ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
                                    {pdfGenerating ? 'Preparing HQ PDF...' : 'Download QR PDF (HQ)'}
                                </button>
                            )}
                        </div>
                        <div className="space-y-6">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Number of Tables</label>
                                <input id="total_tables" type="number" min="0" max="100" value={formState.total_tables} onChange={handleInputChange} className="w-full bg-slate-950/50 border border-white/5 rounded-lg px-4 py-2.5 text-white focus:border-indigo-500 outline-none font-bold" />
                            </div>

                            {formState.total_tables > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4 h-48 overflow-y-auto pr-2 scrollbar-hide">
                                    {Array.from({ length: formState.total_tables }).map((_, i) => {
                                        const tableNum = i + 1;
                                        const qrUrl = `${publicBaseUrl}?table=${tableNum}`;
                                        return (
                                            <div key={tableNum} className="bg-slate-950/50 p-3 rounded-xl border border-white/5 text-center group">
                                                <div className="aspect-square bg-white rounded-lg p-1.5 mb-2 flex items-center justify-center">
                                                    <QRCodeCanvas value={qrUrl} size={100} level="H" />
                                                </div>
                                                <span className="text-[10px] font-black uppercase text-slate-500">Table {tableNum.toString().padStart(2, '0')}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="py-8 text-center bg-slate-950/30 rounded-xl border border-dashed border-white/10">
                                    <TableIcon size={32} className="text-slate-700 mx-auto mb-2 opacity-20" />
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Configure tables to generate codes</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* HIDDEN PDF TEMPLATE - Professional Multi-Page A4 Structure */}
                    <div 
                        ref={pdfSourceRef} 
                        className={cn(
                            "fixed top-0 left-0 z-[-100]", 
                            showPdfSource ? "block" : "hidden pointer-events-none"
                        )}
                        style={{ position: 'fixed', top: '-20000px', left: '-20000px' }}
                    >
                        {tableChunks.map((chunk, pageIndex) => (
                            <div 
                                key={pageIndex} 
                                className="pdf-page bg-white w-[210mm] h-[297mm] flex flex-row items-center justify-center px-[15mm] py-[20mm] gap-[10mm]"
                                style={{ pageBreakAfter: 'always' }}
                            >
                                {chunk.map((tableNum) => {
                                    const qrUrl = `${publicBaseUrl}?table=${tableNum}`;
                                    return (
                                        <div 
                                            key={tableNum} 
                                            className="w-[85mm] h-[250mm] border-[5px] border-[#4f46e5] rounded-[3rem] flex flex-col items-center justify-between p-10 bg-white"
                                        >
                                            <div className="text-center w-full">
                                                <div className="flex items-center justify-center gap-3 mb-2">
                                                    <Zap size={32} className="text-[#4f46e5] fill-[#4f46e5]" />
                                                    <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tight">Mystic Falls</h2>
                                                </div>
                                                <p className="text-[#4f46e5] font-black uppercase text-sm tracking-[0.2em] mb-12">{formState.name}</p>
                                            </div>
                                            
                                            <div className="w-[65mm] h-[65mm] p-6 bg-white border-2 border-slate-100 rounded-[2.5rem] flex items-center justify-center shadow-inner">
                                                <QRCodeCanvas 
                                                    value={qrUrl} 
                                                    size={400} 
                                                    level="H" 
                                                    style={{ width: '100%', height: '100%' }}
                                                />
                                            </div>
                                            
                                            <div className="flex flex-col items-center gap-6 w-full">
                                                <div className="bg-[#4f46e5] text-white px-12 py-6 rounded-[2.5rem] shadow-2xl w-full text-center">
                                                    <span className="text-5xl font-black uppercase tracking-[0.1em]">Table {tableNum.toString().padStart(2, '0')}</span>
                                                </div>
                                                <div className="flex flex-col gap-1 items-center">
                                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.4em]">Scan to Order & Pay</p>
                                                    <p className="text-[9px] text-slate-300 font-black uppercase tracking-widest">Digital Hub by RestaurantOS</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {/* Placeholder for empty half on odd count pages */}
                                {chunk.length === 1 && <div className="w-[85mm] h-[250mm] invisible" />}
                            </div>
                        ))}
                    </div>

                    {/* Section: Design Lab */}
                    <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Palette size={18} className="text-purple-500"/> The Design Lab</h3>
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Primary Theme Color</label>
                                    <div className="flex items-center gap-3">
                                        <input type="color" id="theme_color" value={formState.theme_color} onChange={handleInputChange} className="w-12 h-12 rounded-lg cursor-pointer bg-transparent border-none" />
                                        <input type="text" value={formState.theme_color} onChange={handleInputChange} id="theme_color" className="bg-slate-950/50 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-slate-300 font-mono w-24 font-bold" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Secondary Blend Color</label>
                                    <div className="flex items-center gap-3">
                                        <input type="color" id="secondary_theme_color" value={formState.secondary_theme_color} onChange={handleInputChange} className="w-12 h-12 rounded-lg cursor-pointer bg-transparent border-none" />
                                        <input type="text" value={formState.secondary_theme_color} onChange={handleInputChange} id="secondary_theme_color" className="bg-slate-950/50 border border-white/5 rounded-lg px-3 py-1.5 text-xs text-slate-300 font-mono w-24 font-bold" />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex justify-between">Hero Overlay Opacity <span>{formState.hero_opacity}%</span></label>
                                <input type="range" id="hero_opacity" value={formState.hero_opacity} onChange={handleInputChange} min="0" max="100" className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Typography selection</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {fonts.map(f => (
                                        <button 
                                            key={f.name}
                                            onClick={() => setFormState(p => ({...p, font: f.name}))}
                                            className={cn(
                                                "p-3 rounded-xl border text-left transition-all",
                                                formState.font === f.name ? "bg-emerald-500/10 border-emerald-500 text-white shadow-glow-emerald" : "bg-slate-950/30 border-white/5 text-slate-500 hover:border-white/20"
                                            )}
                                        >
                                            <p className="text-[8px] font-black uppercase tracking-tighter opacity-50">{f.category}</p>
                                            <p style={{ fontFamily: f.family }} className="text-sm font-bold truncate">{f.name}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section: Content & Operations */}
                    <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-white font-bold flex items-center gap-2"><Layout size={18} className="text-amber-500"/> Content & Operations</h3>
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <span className={cn("text-[10px] font-black uppercase tracking-wider transition-colors font-bold", formState.is_accepting_orders ? "text-emerald-500" : "text-red-500")}>
                                    {formState.is_accepting_orders ? 'Orders Active' : 'Kitchen Closed'}
                                </span>
                                <div className="relative">
                                    <input type="checkbox" id="is_accepting_orders" checked={formState.is_accepting_orders} onChange={handleInputChange} className="sr-only" />
                                    <div className={cn("w-10 h-5 rounded-full transition-colors", formState.is_accepting_orders ? "bg-emerald-600" : "bg-slate-800")}></div>
                                    <div className={cn("absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform", formState.is_accepting_orders ? "translate-x-5" : "translate-x-0")}></div>
                                </div>
                            </label>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Hero Headline</label>
                                <input id="hero_title" value={formState.hero_title} onChange={handleInputChange} placeholder="e.g., Best Biryani in Nanded" className="w-full bg-slate-950/50 border border-white/5 rounded-lg px-4 py-2.5 text-white outline-none font-bold" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Hero Image</label>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-lg bg-slate-950 flex items-center justify-center border border-white/5 overflow-hidden">
                                        {(previewHeroUrl || restaurant?.hero_image_url) ? (
                                            <img src={previewHeroUrl || restaurant?.hero_image_url || ''} className="w-full h-full object-cover" />
                                        ) : (
                                            <ImageIcon size={20} className="text-slate-700" />
                                        )}
                                    </div>
                                    <input type="file" onChange={handleFileChange} className="text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-slate-800 file:text-white hover:file:bg-slate-700 cursor-pointer" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">About Us Narration</label>
                                <textarea id="about" value={formState.about} onChange={handleInputChange} rows={3} className="w-full bg-slate-950/50 border border-white/5 rounded-lg px-4 py-2.5 text-white outline-none resize-none font-bold leading-relaxed" />
                            </div>
                        </div>
                    </div>

                    {/* Section: Contact & Socials */}
                    <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Phone size={18} className="text-sky-500"/> Connect & Socials</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1"><Instagram size={10}/> Instagram</label>
                                <input id="instagram_url" value={formState.instagram_url} onChange={handleInputChange} placeholder="@profile" className="w-full bg-slate-950/50 border border-white/5 rounded-lg px-4 py-2.5 text-white outline-none font-bold" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1"><MessageCircle size={10}/> WhatsApp Number</label>
                                <input id="whatsapp_number" value={formState.whatsapp_number} onChange={handleInputChange} placeholder="91XXXXXXXXXX" className="w-full bg-slate-950/50 border border-white/5 rounded-lg px-4 py-2.5 text-white outline-none font-bold" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- LIVE PREVIEW (MOBILE) --- */}
            <div className="xl:w-[400px] flex-shrink-0">
                <div className="sticky top-24">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2"><Smartphone size={14}/> Live Mirror Preview</p>
                        <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                        </div>
                    </div>
                    
                    <div className="relative mx-auto w-[320px] h-[640px] bg-slate-950 rounded-[3rem] border-8 border-slate-800 shadow-2xl overflow-hidden shadow-black/50">
                        {/* Status Bar */}
                        <div className="h-6 w-full flex justify-between items-center px-6 pt-2">
                            <span className="text-[10px] font-bold text-slate-400">9:41</span>
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 border border-slate-400 rounded-sm"></div>
                                <div className="w-3 h-3 bg-slate-400 rounded-full"></div>
                            </div>
                        </div>

                        {/* Mirror Content */}
                        <div className="h-full overflow-y-auto overflow-x-hidden" style={{ fontFamily: selectedFont?.family }}>
                            {/* Mirror Hero */}
                            <div className="h-48 relative bg-slate-800 overflow-hidden">
                                {(previewHeroUrl || restaurant?.hero_image_url) && (
                                    <img src={previewHeroUrl || restaurant?.hero_image_url || ''} className="absolute inset-0 w-full h-full object-cover" />
                                )}
                                <div 
                                    className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center"
                                    style={{ backgroundColor: `rgba(0,0,0,${formState.hero_opacity / 100})` }}
                                >
                                    <h2 className="text-white text-xl font-bold line-clamp-2">{formState.hero_title || 'Your Store Name'}</h2>
                                    <p className="text-white/60 text-[10px] mt-1 line-clamp-1">{formState.hero_subtitle || 'Tagline goes here'}</p>
                                </div>
                            </div>

                            {/* Mirror Sections */}
                            <div className="p-4 space-y-4">
                                <div className="bg-slate-900 border border-white/5 p-4 rounded-xl -mt-10 relative z-10 shadow-lg">
                                    <h4 className="text-[10px] font-black uppercase text-slate-500 mb-2">About Us</h4>
                                    <p className="text-[10px] text-slate-400 line-clamp-3 leading-relaxed">{formState.about || 'A beautiful story about your restaurant...'}</p>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-xs font-bold text-white">Featured Menu</h4>
                                        <div className="h-4 w-12 bg-slate-800 rounded-full"></div>
                                    </div>
                                    {[1, 2].map(i => (
                                        <div key={i} className="flex gap-3 bg-slate-900 border border-white/5 p-2 rounded-xl">
                                            <div className="w-16 h-16 bg-slate-800 rounded-lg"></div>
                                            <div className="flex-1 space-y-1">
                                                <div className="h-2 w-20 bg-slate-800 rounded-full"></div>
                                                <div className="h-2 w-12 bg-slate-800 rounded-full"></div>
                                                <div className="flex justify-between items-center pt-2">
                                                    <span className="text-[10px] font-bold" style={{ color: formState.theme_color }}>₹299</span>
                                                    <div className="w-6 h-6 rounded-full" style={{ background: `linear-gradient(45deg, ${formState.theme_color}, ${formState.secondary_theme_color})` }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Sticky Order Button Mirror */}
                            <div className="absolute bottom-6 left-0 right-0 px-6">
                                <div 
                                    className="w-full py-2.5 rounded-full text-white text-[10px] font-black uppercase text-center shadow-lg"
                                    style={{ 
                                        background: `linear-gradient(45deg, ${formState.theme_color}, ${formState.secondary_theme_color})`,
                                        opacity: formState.is_accepting_orders ? 1 : 0.5
                                    }}
                                >
                                    {formState.is_accepting_orders ? 'View Full Menu' : 'Currently Offline'}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {message && (
                <div className={cn(
                    "fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest shadow-2xl animate-in slide-in-from-bottom-10",
                    message.type === 'success' ? "bg-emerald-500 text-white shadow-emerald-500/20" : "bg-red-500 text-white shadow-red-500/20"
                )}>
                    {message.text}
                </div>
            )}
        </div>
    );
};

export default SettingsPage;
