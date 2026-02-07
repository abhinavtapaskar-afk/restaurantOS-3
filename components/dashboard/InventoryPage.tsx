
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Ingredient, Restaurant } from '../../types';
import { cn } from '../../lib/utils';
import Modal from '../ui/Modal';
import { 
    Plus, 
    Archive, 
    AlertTriangle, 
    TrendingUp, 
    Package, 
    Trash2, 
    Edit, 
    Loader2, 
    Zap, 
    Scale, 
    ShoppingCart,
    X
} from 'lucide-react';

const InventoryPage: React.FC = () => {
    const { user } = useAuth();
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
    const [saving, setSaving] = useState(false);
    const [errorToast, setErrorToast] = useState<string | null>(null);

    // Form State
    const [name, setName] = useState('');
    const [stock, setStock] = useState('0');
    const [unit, setUnit] = useState('kg');
    const [cost, setCost] = useState('0');
    const [minStock, setMinStock] = useState('1');

    const fetchInventory = useCallback(async () => {
        if (!user) return;
        if (!restaurant) { // Only show full-page loader on first load
            setLoading(true);
        }
        try {
            let currentRestaurant = restaurant;
            if (!currentRestaurant) {
                const { data: restData } = await supabase.from('restaurants').select('id').eq('owner_id', user.id).single();
                if (restData) {
                    setRestaurant(restData as Restaurant);
                    currentRestaurant = restData as Restaurant;
                }
            }
            if (currentRestaurant) {
                const { data, error } = await supabase
                    .from('ingredients')
                    .select('*')
                    .eq('restaurant_id', currentRestaurant.id)
                    .order('name');
                if (data) setIngredients(data);
                if (error) throw error;
            }
        } catch (err: any) {
            console.error('[Inventory] Load Error:', err);
            setErrorToast(`Failed to load inventory: ${err.message}`);
        } finally {
            setLoading(false);
        }
    }, [user, restaurant]);

    useEffect(() => { fetchInventory(); }, [fetchInventory]);
    
    useEffect(() => {
        if (errorToast) {
            const timer = setTimeout(() => setErrorToast(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [errorToast]);

    const handleOpenAdd = () => {
        setEditingIngredient(null);
        setName(''); setStock('0'); setUnit('kg'); setCost('0'); setMinStock('1');
        setIsModalOpen(true);
    };

    const handleEdit = (ing: Ingredient) => {
        setEditingIngredient(ing);
        setName(ing.name);
        setStock(ing.current_stock.toString());
        setUnit(ing.unit);
        setCost(ing.cost_per_unit.toString());
        setMinStock((ing.min_stock_alert || 1).toString());
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!restaurant) return;
        setSaving(true);
        setErrorToast(null);

        const upsertData = {
            restaurant_id: restaurant.id,
            name,
            current_stock: parseFloat(stock) || 0,
            unit,
            cost_per_unit: parseFloat(cost) || 0,
            min_stock_alert: parseFloat(minStock) || 0
        };

        try {
            const { error } = editingIngredient
                ? await supabase.from('ingredients').update(upsertData).eq('id', editingIngredient.id)
                : await supabase.from('ingredients').insert(upsertData);
            
            if (error) throw error;

            fetchInventory();
            setIsModalOpen(false);
        } catch (err: any) {
            console.error('[Inventory] Save Error:', err);
            setErrorToast(`Save failed: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };
    
    const handleDelete = async (id: string) => {
        if (!confirm('Discard this ingredient from the Wardrobe? This cannot be undone.')) return;
        setErrorToast(null);
        try {
            const { error } = await supabase.from('ingredients').delete().eq('id', id);
            if (error) throw error;
            setIngredients(prev => prev.filter(i => i.id !== id));
        } catch (err: any) {
            console.error('[Inventory] Delete Error:', err);
            setErrorToast(`Delete failed: ${err.message}`);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-64 text-slate-500 font-black uppercase tracking-widest animate-pulse">
            <Loader2 className="animate-spin mb-4" size={32} />
            Scanning Mystic Wardrobe...
        </div>
    );

    const totalValuation = ingredients.reduce((sum, ing) => sum + (ing.current_stock * ing.cost_per_unit), 0);
    const lowStockCount = ingredients.filter(i => i.current_stock <= (i.min_stock_alert || 0)).length;

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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter flex items-center gap-3">
                        Mystic <span className="text-indigo-500 underline decoration-indigo-500/20">Wardrobe</span>
                    </h1>
                    <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.2em] mt-1">Raw Ingredient Logistics</p>
                </div>
                <button 
                    onClick={handleOpenAdd}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3 px-8 rounded-xl transition-all shadow-glow-indigo flex items-center gap-2"
                >
                    <Plus size={20} />
                    Procure Ingredient
                </button>
            </div>

            {/* Main Inventory Table */}
            <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                <table className="min-w-full divide-y divide-white/5">
                    <thead className="bg-slate-800/50">
                        <tr>
                            <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Ingredient Name</th>
                            <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Stock</th>
                            <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Cost/Unit</th>
                            <th className="px-6 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Manage</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {ingredients.map((ing) => {
                            const isLow = ing.current_stock <= (ing.min_stock_alert || 0);
                            return (
                                <tr key={ing.id} className={cn("hover:bg-white/[0.02] transition-colors group", isLow && "bg-indigo-500/5")}>
                                    <td className="px-6 py-5"><div className="text-sm font-black text-white">{ing.name}</div></td>
                                    <td className="px-6 py-5"><div className={cn("text-lg font-black", isLow ? "text-indigo-400" : "text-emerald-400")}>{ing.current_stock} <span className="text-[10px] uppercase">{ing.unit}</span></div></td>
                                    <td className="px-6 py-5 text-sm font-bold text-slate-400">₹{ing.cost_per_unit}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => handleEdit(ing)} className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-white/5"><Edit size={16} /></button>
                                            <button onClick={() => handleDelete(ing.id)} className="text-red-500/50 hover:text-red-500 p-2 rounded-lg hover:bg-white/5"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                 {ingredients.length === 0 && <div className="p-20 text-center text-slate-500 font-black uppercase text-xs tracking-widest">No stock records found.</div>}
            </div>

            <Modal title={editingIngredient ? "Edit Material" : "New Procurement"} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input value={name} onChange={e => setName(e.target.value)} required className="w-full bg-slate-800 p-3 rounded-xl border border-white/5 text-white outline-none focus:border-indigo-500" placeholder="e.g. Arabica Beans" />
                    <div className="grid grid-cols-2 gap-4">
                        <input type="number" step="0.01" value={stock} onChange={e => setStock(e.target.value)} required className="w-full bg-slate-800 p-3 rounded-xl border border-white/5 text-white outline-none focus:border-indigo-500" placeholder="Stock Level"/>
                        <select value={unit} onChange={e => setUnit(e.target.value)} className="w-full bg-slate-800 p-3 rounded-xl border border-white/5 text-white outline-none focus:border-indigo-500">
                            <option value="kg">kg</option><option value="L">L</option><option value="pcs">pcs</option><option value="g">g</option><option value="ml">ml</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <input type="number" step="0.01" value={cost} onChange={e => setCost(e.target.value)} required className="w-full bg-slate-800 p-3 rounded-xl border border-white/5 text-white outline-none focus:border-indigo-500" placeholder="Cost/Unit"/>
                         <input type="number" step="1" value={minStock} onChange={e => setMinStock(e.target.value)} required className="w-full bg-slate-800 p-3 rounded-xl border border-white/5 text-white outline-none focus:border-indigo-500" placeholder="Alert Threshold"/>
                    </div>
                    <button type="submit" disabled={saving} className="w-full bg-indigo-600 text-white font-black uppercase tracking-widest py-3 rounded-xl shadow-glow-indigo mt-4 flex items-center justify-center gap-2">
                        {saving ? <Loader2 className="animate-spin" size={16} /> : (editingIngredient ? 'Update Record' : 'Log Ingredient')}
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default InventoryPage;
