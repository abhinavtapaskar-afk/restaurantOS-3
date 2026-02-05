
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Restaurant, MenuItem, Ingredient, RecipeItem } from '../../types';
import Modal from '../ui/Modal';
import { PlusCircle, Image as ImageIcon, ToggleLeft, ToggleRight, Trash2, Edit, Calculator, Plus, Package, Archive, Loader2, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';

const RecipeModal: React.FC<{ 
    item: MenuItem, 
    ingredients: Ingredient[], 
    onClose: () => void, 
    onRefresh: () => void 
}> = ({ item, ingredients, onClose, onRefresh }) => {
    const [recipeItems, setRecipeItems] = useState<RecipeItem[]>(item.recipe_items || []);
    const [selectedIngId, setSelectedIngId] = useState('');
    const [qty, setQty] = useState('1');
    const [saving, setSaving] = useState(false);

    const handleAdd = async () => {
        if (!selectedIngId) return;
        setSaving(true);
        const data = {
            menu_item_id: item.id,
            ingredient_id: selectedIngId,
            quantity: parseFloat(qty)
        };
        try {
            const { data: newRi, error } = await supabase.from('recipe_items').insert(data).select('*, ingredient:ingredients(*)').single();
            if (error) throw error;
            if (newRi) setRecipeItems(prev => [...prev, newRi]);
            setSelectedIngId(''); setQty('1');
            onRefresh();
        } catch (err) {
            console.error('[Recipe] Add Error:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleRemove = async (id: string) => {
        try {
            await supabase.from('recipe_items').delete().eq('id', id);
            setRecipeItems(prev => prev.filter(ri => ri.id !== id));
            onRefresh();
        } catch (err) {
            console.error('[Recipe] Remove Error:', err);
        }
    };

    const totalCost = recipeItems.reduce((sum, ri) => sum + (ri.quantity * (ri.ingredient?.cost_per_unit || 0)), 0);
    const profit = item.price - totalCost;
    const margin = item.price > 0 ? (profit / item.price) * 100 : 0;

    return (
        <Modal title={`Recipe: ${item.name}`} isOpen={true} onClose={onClose}>
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-950/50 p-4 rounded-xl border border-white/5">
                        <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Cost / Unit</p>
                        <p className="text-xl font-black text-white">₹{totalCost.toFixed(2)}</p>
                    </div>
                    <div className={cn("p-4 rounded-xl border border-white/5", margin > 30 ? "bg-emerald-500/10 border-emerald-500/20" : "bg-indigo-500/10 border-indigo-500/20")}>
                        <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Net Margin</p>
                        <p className={cn("text-xl font-black", margin > 30 ? "text-emerald-400" : "text-indigo-400")}>{margin.toFixed(1)}%</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-white/5 pb-2">Ingredients Mapping</h4>
                    <div className="space-y-2">
                        {recipeItems.map(ri => (
                            <div key={ri.id} className="flex items-center justify-between bg-slate-800/50 p-3 rounded-lg group">
                                <div className="flex flex-col">
                                    <span className="text-sm font-bold text-white">{ri.ingredient?.name}</span>
                                    <span className="text-[10px] text-slate-500 uppercase">{ri.quantity} {ri.ingredient?.unit} @ ₹{ri.ingredient?.cost_per_unit}</span>
                                </div>
                                <button onClick={() => handleRemove(ri.id)} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-slate-950/50 p-4 rounded-xl space-y-3">
                    <div className="flex gap-2">
                        <select 
                            value={selectedIngId} 
                            onChange={e => setSelectedIngId(e.target.value)}
                            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none"
                        >
                            <option value="">Select Ingredient...</option>
                            {ingredients.filter(i => !recipeItems.some(ri => ri.ingredient_id === i.id)).map(ing => (
                                <option key={ing.id} value={ing.id}>{ing.name} ({ing.unit})</option>
                            ))}
                        </select>
                        <input 
                            type="number" 
                            value={qty} 
                            onChange={e => setQty(e.target.value)}
                            className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none"
                            placeholder="Qty"
                        />
                    </div>
                    <button 
                        onClick={handleAdd}
                        disabled={saving || !selectedIngId}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                        {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                        Link Ingredient
                    </button>
                </div>
            </div>
        </Modal>
    );
};

const MenuItemCard: React.FC<{ 
    item: MenuItem, 
    onToggle: (id: string, isAvailable: boolean) => void, 
    onDelete: (id: string, imageUrl?: string) => void, 
    onEdit: (item: MenuItem) => void,
    onRecipe: (item: MenuItem) => void
}> = ({ item, onToggle, onDelete, onEdit, onRecipe }) => {
    const totalCost = item.recipe_items?.reduce((sum, ri) => sum + (ri.quantity * (ri.ingredient?.cost_per_unit || 0)), 0) || 0;
    const margin = item.price > 0 ? ((item.price - totalCost) / item.price) * 100 : 0;

    return (
        <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden group transition-all duration-300 hover:border-emerald-500/30 hover:shadow-glow-emerald">
            <div className="relative aspect-video bg-slate-800">
                {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500"><ImageIcon size={40} /></div>
                )}
                <div className={cn('absolute top-2 left-2 px-2 py-0.5 text-xs font-bold rounded-full text-white shadow-lg', item.is_veg ? 'bg-green-600/80' : 'bg-red-600/80')}>
                    {item.is_veg ? 'VEG' : 'NON-VEG'}
                </div>
                <div className="absolute top-2 right-2 flex gap-1">
                    <div className="bg-slate-900/80 backdrop-blur-md px-2 py-0.5 rounded-md text-[8px] font-black text-white uppercase border border-white/10">
                        {item.recipe_items?.length || 0} Mat.
                    </div>
                </div>
            </div>
            <div className="p-4">
                <div className="flex justify-between items-start mb-1">
                    <h3 className="font-bold text-lg text-white truncate flex-1">{item.name}</h3>
                    <div className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded ml-2", margin > 40 ? "text-emerald-400 bg-emerald-500/10" : "text-indigo-400 bg-indigo-500/10")}>
                        {margin.toFixed(0)}% Margin
                    </div>
                </div>
                <div className="flex items-center justify-between mb-4">
                    <p className="text-emerald-400 font-black text-xl">₹{item.price}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Cost: ₹{totalCost.toFixed(1)}</p>
                </div>
                
                <div className="flex items-center justify-between">
                    <button onClick={() => onToggle(item.id, !item.is_available)} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
                        {item.is_available ? <ToggleRight size={22} className="text-emerald-500" /> : <ToggleLeft size={22} className="text-slate-500" />}
                        <span className={item.is_available ? 'text-slate-300' : 'text-slate-500'}>{item.is_available ? 'Ready' : 'Draft'}</span>
                    </button>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onRecipe(item)} className="text-[#4f46e5] hover:text-indigo-400 p-1.5 rounded-md hover:bg-white/5" title="Recipe Mapping">
                            <Calculator size={16} />
                        </button>
                        <button onClick={() => onEdit(item)} className="text-slate-400 hover:text-white p-1.5 rounded-md hover:bg-white/5">
                            <Edit size={16} />
                        </button>
                        <button onClick={() => onDelete(item.id, item.image_url)} className="text-red-500 hover:text-red-400 p-1.5 rounded-md hover:bg-white/5">
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

const MenuPage: React.FC = () => {
    const { user } = useAuth();
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [recipeModalItem, setRecipeModalItem] = useState<MenuItem | null>(null);
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
    
    // Form state
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [category, setCategory] = useState('');
    const [isVeg, setIsVeg] = useState(true);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [currentImageUrl, setCurrentImageUrl] = useState<string | undefined>(undefined);
    const [saving, setSaving] = useState(false);

    const inputStyle = "block w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500";

    const fetchData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        const { data: restaurantData } = await supabase.from('restaurants').select('id').eq('owner_id', user.id).single();
        if (restaurantData) {
            setRestaurant(restaurantData as Restaurant);
            
            // Fetch Menu with Recipes
            const { data: menuData } = await supabase
                .from('menu_items')
                .select('*, recipe_items(*, ingredient:ingredients(*))')
                .eq('restaurant_id', restaurantData.id)
                .order('created_at');
            if (menuData) setMenuItems(menuData);

            // Fetch Ingredients for mapping
            const { data: ingData } = await supabase
                .from('ingredients')
                .select('*')
                .eq('restaurant_id', restaurantData.id)
                .order('name');
            if (ingData) setIngredients(ingData);
        }
        setLoading(false);
    }, [user]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const resetForm = () => {
        setName(''); setPrice(''); setCategory(''); setIsVeg(true); setImageFile(null); setEditingItem(null); setCurrentImageUrl(undefined);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!restaurant) return;
        setSaving(true);
        
        let imageUrl: string | undefined = editingItem ? editingItem.image_url : undefined;

        if (imageFile) {
            const filePath = `${restaurant.id}/${Date.now()}-${imageFile.name}`;
            const { error: uploadError } = await supabase.storage.from('menu-images').upload(filePath, imageFile);
            if (!uploadError) {
                const { data: { publicUrl } } = supabase.storage.from('menu-images').getPublicUrl(filePath);
                imageUrl = publicUrl;
            }
        }

        const itemData = {
            restaurant_id: restaurant.id,
            name,
            price: parseFloat(price),
            category,
            is_veg: isVeg,
            image_url: imageUrl
        };
        
        if (editingItem) {
            await supabase.from('menu_items').update(itemData).eq('id', editingItem.id);
        } else {
            await supabase.from('menu_items').insert(itemData);
        }

        fetchData();
        setIsModalOpen(false);
        resetForm();
        setSaving(false);
    };

    const handleAvailabilityToggle = async (id: string, is_available: boolean) => {
        await supabase.from('menu_items').update({ is_available }).eq('id', id);
        setMenuItems(prev => prev.map(m => m.id === id ? { ...m, is_available } : m));
    };
    
    const handleDeleteItem = async (id: string, imageUrl?: string) => {
        if (confirm('Delete this dish?')) {
            await supabase.from('menu_items').delete().eq('id', id);
            fetchData();
        }
    };

    if (loading) return <div>Loading Command Center...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter">Menu <span className="text-emerald-500 underline decoration-emerald-500/20">Studio</span></h1>
                    <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.2em] mt-1">Design & Margin Control</p>
                </div>
                <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="flex items-center gap-2 bg-emerald-600 text-white font-black py-3 px-8 rounded-xl hover:bg-emerald-500 transition-all shadow-glow-emerald uppercase tracking-widest text-xs">
                    <PlusCircle size={20} />
                    Create Dish
                </button>
            </div>

            {menuItems.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {menuItems.map(item => (
                        <MenuItemCard 
                            key={item.id} 
                            item={item} 
                            onToggle={handleAvailabilityToggle} 
                            onDelete={handleDeleteItem} 
                            onEdit={(item) => { setEditingItem(item); setName(item.name); setPrice(item.price.toString()); setCategory(item.category || ''); setIsVeg(item.is_veg); setCurrentImageUrl(item.image_url); setIsModalOpen(true); }}
                            onRecipe={(item) => setRecipeModalItem(item)}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-24 bg-slate-900/40 backdrop-blur-md border-2 border-dashed border-white/5 rounded-3xl">
                    <Package className="mx-auto text-slate-700 opacity-20 mb-4" size={64} />
                    <p className="text-slate-400 font-black uppercase tracking-widest">No signature dishes found.</p>
                </div>
            )}

            <Modal title={editingItem ? "Refine Dish" : "Assemble Dish"} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <form onSubmit={handleFormSubmit} className="space-y-4">
                     <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Item Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} required className={inputStyle} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Selling Price (₹)</label>
                            <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} required className={inputStyle} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Category</label>
                            <input type="text" value={category} onChange={e => setCategory(e.target.value)} placeholder="Main Course" className={inputStyle} />
                        </div>
                    </div>
                    <div className="flex items-center gap-4 py-2">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Type:</label>
                        <button type="button" onClick={() => setIsVeg(true)} className={cn("px-4 py-1 text-[10px] font-black uppercase rounded-full transition-all", isVeg ? 'bg-emerald-500 text-white shadow-glow-emerald' : 'bg-slate-800 text-slate-500 border border-white/5')}>Pure Veg</button>
                        <button type="button" onClick={() => setIsVeg(false)} className={cn("px-4 py-1 text-[10px] font-black uppercase rounded-full transition-all", !isVeg ? 'bg-red-500 text-white shadow-glow-red' : 'bg-slate-800 text-slate-500 border border-white/5')}>Meat/Egg</button>
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block mb-2">Signature Shot (Image)</label>
                        <input type="file" onChange={e => e.target.files && setImageFile(e.target.files[0])} accept="image/*" className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-slate-800 file:text-white hover:file:bg-slate-700 cursor-pointer"/>
                    </div>
                    <div className="pt-6">
                        <button type="submit" disabled={saving} className="w-full bg-emerald-600 text-white font-black uppercase tracking-widest py-3 rounded-xl shadow-glow-emerald disabled:opacity-50">
                            {saving ? 'Processing...' : (editingItem ? 'Update Portfolio' : 'Publish Dish')}
                        </button>
                    </div>
                </form>
            </Modal>

            {recipeModalItem && (
                <RecipeModal 
                    item={recipeModalItem} 
                    ingredients={ingredients} 
                    onClose={() => setRecipeModalItem(null)} 
                    onRefresh={fetchData}
                />
            )}
        </div>
    );
};

export default MenuPage;
