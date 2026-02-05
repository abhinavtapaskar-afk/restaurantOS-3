
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
    ShoppingCart 
} from 'lucide-react';

const InventoryPage: React.FC = () => {
    const { user } = useAuth();
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
    const [saving, setSaving] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [stock, setStock] = useState('0');
    const [unit, setUnit] = useState('kg');
    const [cost, setCost] = useState('0');
    const [minStock, setMinStock] = useState('1');

    const fetchInventory = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data: restData } = await supabase.from('restaurants').select('id').eq('owner_id', user.id).single();
            if (restData) {
                setRestaurant(restData as Restaurant);
                const { data, error } = await supabase
                    .from('ingredients')
                    .select('*')
                    .eq('restaurant_id', restData.id)
                    .order('name');
                if (data) setIngredients(data);
                if (error) throw error;
            }
        } catch (err) {
            console.error('[Inventory] Load Error:', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { fetchInventory(); }, [fetchInventory]);

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

        const data = {
            restaurant_id: restaurant.id,
            name,
            current_stock: parseFloat(stock),
            unit,
            cost_per_unit: parseFloat(cost),
            min_stock_alert: parseFloat(minStock)
        };

        try {
            if (editingIngredient) {
                await supabase.from('ingredients').update(data).eq('id', editingIngredient.id);
            } else {
                await supabase.from('ingredients').insert(data);
            }
            fetchInventory();
            setIsModalOpen(false);
        } catch (err) {
            console.error('[Inventory] Save Error:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleQuickRestock = async (id: string, amount: number) => {
        try {
            const ing = ingredients.find(i => i.id === id);
            if (!ing) return;
            const newStock = ing.current_stock + amount;
            await supabase.from('ingredients').update({ current_stock: newStock }).eq('id', id);
            setIngredients(prev => prev.map(i => i.id === id ? { ...i, current_stock: newStock } : i));
        } catch (err) {
            console.error('[Inventory] Restock Error:', err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Discard this ingredient from the Wardrobe?')) return;
        try {
            await supabase.from('ingredients').delete().eq('id', id);
            setIngredients(prev => prev.filter(i => i.id !== id));
        } catch (err) {
            console.error('[Inventory] Delete Error:', err);
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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter flex items-center gap-3">
                        Mystic <span className="text-[#4f46e5] underline decoration-indigo-500/20">Wardrobe</span>
                    </h1>
                    <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.2em] mt-1">Raw Ingredient Logistics</p>
                </div>
                <button 
                    onClick={handleOpenAdd}
                    className="bg-[#4f46e5] hover:bg-indigo-500 text-white font-black py-3 px-8 rounded-xl transition-all shadow-glow-indigo flex items-center gap-2"
                >
                    <Plus size={20} />
                    Procure Ingredient
                </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 p-6 rounded-2xl relative overflow-hidden group">
                    <div className="absolute -top-4 -right-4 bg-emerald-500/10 w-20 h-20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Wardrobe Valuation</p>
                    <h3 className="text-2xl font-black text-white">₹{totalValuation.toLocaleString('en-IN')}</h3>
                    <TrendingUp className="text-emerald-500 absolute bottom-4 right-4 opacity-20" size={32} />
                </div>
                <div className={cn(
                    "bg-slate-900/40 backdrop-blur-md border border-white/10 p-6 rounded-2xl relative overflow-hidden group transition-all",
                    lowStockCount > 0 && "border-indigo-500/50 shadow-glow-indigo"
                )}>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Low Stock Alerts</p>
                    <h3 className={cn("text-2xl font-black", lowStockCount > 0 ? "text-[#4f46e5]" : "text-white")}>{lowStockCount} Items</h3>
                    <AlertTriangle className={cn("absolute bottom-4 right-4 opacity-20", lowStockCount > 0 ? "text-[#4f46e5] animate-pulse" : "text-slate-500")} size={32} />
                </div>
                <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 p-6 rounded-2xl relative overflow-hidden group">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total SKU Count</p>
                    <h3 className="text-2xl font-black text-white">{ingredients.length} Varieties</h3>
                    <Archive className="text-indigo-500 absolute bottom-4 right-4 opacity-20" size={32} />
                </div>
            </div>

            {/* Main Inventory Table */}
            <div className="bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                <table className="min-w-full divide-y divide-white/5">
                    <thead className="bg-slate-800/50">
                        <tr>
                            <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Ingredient Name</th>
                            <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Stock</th>
                            <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Cost/Unit</th>
                            <th className="px-6 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Value</th>
                            <th className="px-6 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Manage</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {ingredients.map((ing) => {
                            const isLow = ing.current_stock <= (ing.min_stock_alert || 0);
                            const isOut = ing.current_stock <= 0;
                            return (
                                <tr key={ing.id} className={cn("hover:bg-white/[0.02] transition-colors group", isLow && "bg-indigo-500/5")}>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("p-2 rounded-lg bg-slate-800", isLow ? "text-[#4f46e5]" : "text-slate-500")}>
                                                <Archive size={18} />
                                            </div>
                                            <div>
                                                <div className="text-sm font-black text-white">{ing.name}</div>
                                                <div className="text-[10px] text-slate-500 font-bold uppercase">{ing.unit} Tracking</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "text-lg font-black",
                                                isOut ? "text-red-500" : (isLow ? "text-[#4f46e5]" : "text-emerald-400")
                                            )}>
                                                {ing.current_stock} <span className="text-[10px] uppercase">{ing.unit}</span>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleQuickRestock(ing.id, 5)} className="bg-slate-800 hover:bg-slate-700 text-xs font-black text-slate-400 px-2 py-1 rounded">+5</button>
                                                <button onClick={() => handleQuickRestock(ing.id, 10)} className="bg-slate-800 hover:bg-slate-700 text-xs font-black text-slate-400 px-2 py-1 rounded">+10</button>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-sm font-bold text-slate-400">₹{ing.cost_per_unit}</td>
                                    <td className="px-6 py-5 text-sm font-black text-white">₹{(ing.current_stock * ing.cost_per_unit).toFixed(2)}</td>
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
                {ingredients.length === 0 && (
                    <div className="p-20 text-center flex flex-col items-center gap-4">
                        <Archive size={64} className="text-slate-800 opacity-20" />
                        <p className="text-slate-500 font-black uppercase text-xs tracking-widest">No stock records found in the Wardrobe.</p>
                    </div>
                )}
            </div>

            <Modal title={editingIngredient ? "Edit Material" : "New Procurement"} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Item Name</label>
                        <input value={name} onChange={e => setName(e.target.value)} required className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-indigo-500" placeholder="e.g. Arabica Beans" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Stock Level</label>
                            <input type="number" step="0.01" value={stock} onChange={e => setStock(e.target.value)} required className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-indigo-500" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Unit Type</label>
                            <select value={unit} onChange={e => setUnit(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-indigo-500">
                                <option value="kg">Kilograms (kg)</option>
                                <option value="L">Liters (L)</option>
                                <option value="pcs">Pieces (pcs)</option>
                                <option value="g">Grams (g)</option>
                                <option value="ml">Milliliters (ml)</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Cost Price (per unit)</label>
                            <input type="number" step="0.01" value={cost} onChange={e => setCost(e.target.value)} required className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-indigo-500" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Alert Threshold</label>
                            <input type="number" step="0.01" value={minStock} onChange={e => setMinStock(e.target.value)} required className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-indigo-500" />
                        </div>
                    </div>
                    <button 
                        type="submit" 
                        disabled={saving} 
                        className="w-full bg-[#4f46e5] text-white font-black uppercase tracking-widest py-3 rounded-xl shadow-glow-indigo mt-4 flex items-center justify-center gap-2"
                    >
                        {saving && <Loader2 className="animate-spin" size={16} />}
                        {saving ? 'Cataloging...' : (editingIngredient ? 'Update Record' : 'Log Ingredient')}
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default InventoryPage;
