
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Restaurant, MenuItem, InventoryItem, MenuItemIngredient } from '../../types';
import Modal from '../ui/Modal';
import { PlusCircle, Trash2, Edit, Calculator, Loader2, AlertTriangle, X } from 'lucide-react';
import { cn } from '../../lib/utils';

const RecipeModal: React.FC<{ 
    item: MenuItem, 
    inventoryItems: InventoryItem[], 
    onClose: () => void, 
    onRefresh: () => void,
    onError: (message: string) => void
}> = ({ item, inventoryItems, onClose, onRefresh, onError }) => {
    const [menuItemIngredients, setMenuItemIngredients] = useState<MenuItemIngredient[]>(item.menu_item_ingredients || []);
    const [selectedInvId, setSelectedInvId] = useState('');
    const [qty, setQty] = useState('1');
    const [saving, setSaving] = useState(false);

    const handleAdd = async () => {
        if (!selectedInvId) return;
        setSaving(true);
        try {
            const { data: newIngredientLink, error } = await supabase.from('menu_item_ingredients')
                .insert({ menu_item_id: item.id, inventory_id: selectedInvId, quantity: parseFloat(qty) })
                .select('*, inventory_item:inventory(*)').single();

            if (error) throw error;
            if (newIngredientLink) setMenuItemIngredients(prev => [...prev, newIngredientLink]);
            setSelectedInvId(''); setQty('1');
            onRefresh();
        } catch (err: any) { onError(`Failed to link ingredient: ${err.message}`); } 
        finally { setSaving(false); }
    };

    const handleRemove = async (id: string) => {
        try {
            const { error } = await supabase.from('menu_item_ingredients').delete().eq('id', id);
            if (error) throw error;
            setMenuItemIngredients(prev => prev.filter(ri => ri.id !== id));
            onRefresh();
        } catch (err: any) { onError(`Failed to remove ingredient: ${err.message}`); }
    };
    
    const totalCost = menuItemIngredients.reduce((sum, ri) => sum + (ri.quantity * (ri.inventory_item?.cost_price || 0)), 0);
    const margin = item.price > 0 ? ((item.price - totalCost) / item.price) * 100 : 0;

    return (
        <Modal title={`Recipe: ${item.name}`} isOpen={true} onClose={onClose}>
             <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                    <div className="bg-slate-950/50 p-3 rounded-xl border border-white/5"><p className="text-[10px] uppercase text-slate-500">Cost/Dish</p><p className="font-bold text-white">₹{totalCost.toFixed(2)}</p></div>
                    <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20"><p className="text-[10px] uppercase text-slate-500">Margin</p><p className="font-bold text-emerald-400">{margin.toFixed(0)}%</p></div>
                </div>
                {menuItemIngredients.map(mii => (
                    <div key={mii.id} className="flex justify-between items-center bg-slate-800/50 p-2 rounded-lg group text-sm">
                        <span>{mii.quantity}{mii.inventory_item?.unit} of {mii.inventory_item?.item_name}</span>
                        <button onClick={() => handleRemove(mii.id)} className="text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={14}/></button>
                    </div>
                ))}
                <div className="flex gap-2">
                    <select value={selectedInvId} onChange={e => setSelectedInvId(e.target.value)} className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white">
                        <option value="">Select Item from Inventory...</option>
                        {inventoryItems.filter(i => !menuItemIngredients.some(mii => mii.inventory_id === i.id)).map(inv => (
                            <option key={inv.id} value={inv.id}>{inv.item_name} ({inv.unit})</option>
                        ))}
                    </select>
                    <input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="Qty" className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white" />
                </div>
                <button onClick={handleAdd} disabled={saving || !selectedInvId} className="w-full bg-indigo-600 text-white font-bold py-2 rounded-lg disabled:opacity-50">Link Ingredient</button>
            </div>
        </Modal>
    );
};

const MenuPage: React.FC = () => {
    const { user } = useAuth();
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [recipeModalItem, setRecipeModalItem] = useState<MenuItem | null>(null);
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
    const [errorToast, setErrorToast] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [category, setCategory] = useState('');

    const fetchData = useCallback(async () => {
        if (!user) return;
        if (!restaurant) {
          setLoading(true);
        }
        try {
            let currentRestaurant = restaurant;
            if(!currentRestaurant) {
              const { data: restaurantData } = await supabase.from('restaurants').select('id').eq('owner_id', user.id).single();
              if (restaurantData) {
                  setRestaurant(restaurantData as Restaurant);
                  currentRestaurant = restaurantData as Restaurant;
              }
            }
            if (currentRestaurant) {
                const { data: menuData } = await supabase.from('menu_items').select('*, menu_item_ingredients(*, inventory_item:inventory(*))').eq('restaurant_id', currentRestaurant.id);
                const { data: invData } = await supabase.from('inventory').select('*').eq('restaurant_id', currentRestaurant.id);
                if (menuData) setMenuItems(menuData);
                if (invData) setInventoryItems(invData);
            }
        } catch (err: any) { setErrorToast(`Data sync failed: ${err.message}`); } 
        finally { setLoading(false); }
    }, [user, restaurant]);

    useEffect(() => { fetchData(); }, [fetchData]);
    
    useEffect(() => {
        if (errorToast) {
            const timer = setTimeout(() => setErrorToast(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [errorToast]);

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!restaurant) return;
        setSaving(true);
        setErrorToast(null);
        try {
            const upsertData = { name, price: parseFloat(price), category, restaurant_id: restaurant.id };
            const { error } = editingItem 
                ? await supabase.from('menu_items').update(upsertData).eq('id', editingItem.id)
                : await supabase.from('menu_items').insert(upsertData);
            if (error) throw error;
            fetchData();
            setIsModalOpen(false);
        } catch (err: any) { setErrorToast(`Save failed: ${err.message}`); } 
        finally { setSaving(false); }
    };
    
    if (loading) return <div className="p-12 text-center text-slate-500 font-black uppercase tracking-widest animate-pulse">Loading Menu Studio...</div>;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
             {errorToast && (
                <div className="fixed top-24 right-8 z-[100] bg-red-600/90 backdrop-blur-sm border border-red-400/50 text-white p-4 rounded-2xl shadow-2xl shadow-red-500/30 flex items-start gap-4 animate-in slide-in-from-right-full">
                    <AlertTriangle className="flex-shrink-0 mt-1" />
                    <div>
                        <p className="font-black text-sm uppercase tracking-wider">Operation Failed</p>
                        <p className="text-xs text-white/80 mt-1">{errorToast}</p>
                    </div>
                    <button onClick={() => setErrorToast(null)} className="p-1 -mt-2 -mr-2 text-white/70 hover:text-white"><X size={16} /></button>
                </div>
            )}
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter">Menu <span className="text-emerald-500">Studio</span></h1>
                </div>
                <button onClick={() => { setEditingItem(null); setName(''); setPrice(''); setCategory(''); setIsModalOpen(true); }} className="flex items-center gap-2 bg-emerald-600 text-white font-black py-3 px-8 rounded-xl hover:bg-emerald-500 shadow-glow-emerald">
                    <PlusCircle size={20} /> Create Dish
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {menuItems.map(item => (
                    <div key={item.id} className="bg-slate-800/50 rounded-lg border border-slate-700 p-4 space-y-2">
                        <h3 className="font-bold text-lg text-white truncate">{item.name}</h3>
                        <p className="text-emerald-400 font-black text-xl">₹{item.price}</p>
                        <div className="flex justify-end gap-2 pt-2">
                             <button onClick={() => setRecipeModalItem(item)} className="text-indigo-400 p-1.5 rounded-md hover:bg-white/5"><Calculator size={16} /></button>
                             <button onClick={() => { setEditingItem(item); setName(item.name); setPrice(item.price.toString()); setCategory(item.category || ''); setIsModalOpen(true); }} className="text-slate-400 p-1.5 rounded-md hover:bg-white/5"><Edit size={16} /></button>
                        </div>
                    </div>
                ))}
            </div>

            <Modal title={editingItem ? "Refine Dish" : "Assemble Dish"} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <form onSubmit={handleFormSubmit} className="space-y-4">
                     <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Dish Name" className="w-full bg-slate-800 p-3 rounded-xl border border-white/5 text-white outline-none"/>
                     <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} required placeholder="Price" className="w-full bg-slate-800 p-3 rounded-xl border border-white/5 text-white outline-none"/>
                     <input type="text" value={category} onChange={e => setCategory(e.target.value)} placeholder="Category (e.g. Main Course)" className="w-full bg-slate-800 p-3 rounded-xl border border-white/5 text-white outline-none"/>
                     <button type="submit" disabled={saving} className="w-full bg-emerald-600 text-white font-black uppercase py-3 rounded-xl disabled:opacity-50">
                        {saving ? 'Processing...' : 'Save Dish'}
                    </button>
                </form>
            </Modal>

            {recipeModalItem && (
                <RecipeModal 
                    item={recipeModalItem} 
                    inventoryItems={inventoryItems} 
                    onClose={() => setRecipeModalItem(null)} 
                    onRefresh={fetchData}
                    onError={setErrorToast}
                />
            )}
        </div>
    );
};

export default MenuPage;
