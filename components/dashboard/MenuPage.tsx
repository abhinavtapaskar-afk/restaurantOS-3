import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Restaurant, MenuItem } from '../../types';
import Modal from '../ui/Modal';
import { PlusCircle, Image as ImageIcon, ToggleLeft, ToggleRight, Trash2, Edit } from 'lucide-react';
import { cn } from '../../lib/utils';

const MenuItemCard: React.FC<{ item: MenuItem, onToggle: (id: string, isAvailable: boolean) => void, onDelete: (id: string, imageUrl?: string) => void, onEdit: (item: MenuItem) => void }> = ({ item, onToggle, onDelete, onEdit }) => (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden group transition-all duration-300 hover:border-emerald-500/30 hover:shadow-glow-emerald">
        <div className="relative aspect-video bg-slate-800">
            {item.image_url ? (
                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500"><ImageIcon size={40} /></div>
            )}
            <div className={cn('absolute top-2 left-2 px-2 py-0.5 text-xs font-bold rounded-full text-white', item.is_veg ? 'bg-green-600/80' : 'bg-red-600/80')}>
                {item.is_veg ? 'VEG' : 'NON-VEG'}
            </div>
        </div>
        <div className="p-4">
            <h3 className="font-bold text-lg text-white truncate">{item.name}</h3>
            <p className="text-emerald-400 font-semibold">₹{item.price}</p>
            <p className="text-sm text-slate-400 capitalize">{item.category || 'Uncategorized'}</p>
            <div className="flex items-center justify-between mt-4">
                 <button onClick={() => onToggle(item.id, !item.is_available)} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
                    {item.is_available ? <ToggleRight size={22} className="text-emerald-500" /> : <ToggleLeft size={22} className="text-slate-500" />}
                    <span className={item.is_available ? 'text-slate-300' : 'text-slate-500'}>{item.is_available ? 'Available' : 'Unavailable'}</span>
                </button>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => onEdit(item)} className="text-slate-400 hover:text-white p-1.5 rounded-md hover:bg-slate-700">
                        <Edit size={16} />
                    </button>
                    <button onClick={() => onDelete(item.id, item.image_url)} className="text-red-500 hover:text-red-400 p-1.5 rounded-md hover:bg-slate-700">
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
        </div>
    </div>
);


const MenuPage: React.FC = () => {
    const { user } = useAuth();
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
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

    const fetchMenuItems = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        const { data: restaurantData } = await supabase.from('restaurants').select('id').eq('owner_id', user.id).single();
        if (restaurantData) {
            setRestaurant(restaurantData as Restaurant);
            const { data: menuData, error } = await supabase.from('menu_items').select('*').eq('restaurant_id', restaurantData.id).order('created_at');
            if (menuData) setMenuItems(menuData);
            if (error) console.error(error);
        }
        setLoading(false);
    }, [user]);

    useEffect(() => {
        fetchMenuItems();
    }, [fetchMenuItems]);

    const resetForm = () => {
        setName(''); setPrice(''); setCategory(''); setIsVeg(true); setImageFile(null); setEditingItem(null); setCurrentImageUrl(undefined);
    };

    const handleOpenAddModal = () => {
        resetForm();
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (item: MenuItem) => {
        setEditingItem(item);
        setName(item.name);
        setPrice(item.price.toString());
        setCategory(item.category || '');
        setIsVeg(item.is_veg);
        setCurrentImageUrl(item.image_url);
        setIsModalOpen(true);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!restaurant) return;
        setSaving(true);
        
        let imageUrl: string | undefined = editingItem ? editingItem.image_url : undefined;

        if (imageFile) {
            if (editingItem && editingItem.image_url) {
                const oldPath = editingItem.image_url.split('/menu-images/')[1];
                await supabase.storage.from('menu-images').remove([oldPath]);
            }
            const filePath = `${restaurant.id}/${Date.now()}-${imageFile.name}`;
            const { error: uploadError } = await supabase.storage.from('menu-images').upload(filePath, imageFile);
            if (uploadError) {
                console.error("Upload error:", uploadError.message);
                setSaving(false);
                return;
            }
            const { data: { publicUrl } } = supabase.storage.from('menu-images').getPublicUrl(filePath);
            imageUrl = publicUrl;
        }

        const itemData = {
            restaurant_id: restaurant.id,
            name,
            price: parseFloat(price),
            category,
            is_veg: isVeg,
            image_url: imageUrl
        };
        
        let error;
        if (editingItem) {
            const { error: updateError } = await supabase.from('menu_items').update(itemData).eq('id', editingItem.id);
            error = updateError;
        } else {
            const { error: insertError } = await supabase.from('menu_items').insert(itemData);
            error = insertError;
        }

        if (!error) {
            fetchMenuItems();
            setIsModalOpen(false);
            resetForm();
        } else {
            console.error("DB error:", error);
        }
        setSaving(false);
    };

    const handleAvailabilityToggle = async (id: string, is_available: boolean) => {
        const { error } = await supabase.from('menu_items').update({ is_available }).eq('id', id);
        if (!error) fetchMenuItems();
    };
    
    const handleDeleteItem = async (id: string, imageUrl?: string) => {
        if (window.confirm('Are you sure you want to delete this item?')) {
            if (imageUrl) {
                const path = imageUrl.split('/menu-images/')[1];
                await supabase.storage.from('menu-images').remove([path]);
            }
            const { error } = await supabase.from('menu_items').delete().eq('id', id);
            if (!error) fetchMenuItems();
        }
    };

    if (loading) return <div>Loading menu...</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-white">Menu</h1>
                <button onClick={handleOpenAddModal} className="flex items-center gap-2 bg-emerald-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-emerald-500 transition-colors">
                    <PlusCircle size={20} />
                    <span>Add Item</span>
                </button>
            </div>

            {menuItems.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {menuItems.map(item => <MenuItemCard key={item.id} item={item} onToggle={handleAvailabilityToggle} onDelete={handleDeleteItem} onEdit={handleOpenEditModal} />)}
                </div>
            ) : (
                <div className="text-center py-16 bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-lg">
                    <p>Your menu is empty.</p>
                    <p className="text-slate-400">Click 'Add Item' to get started.</p>
                </div>
            )}

            <Modal title={editingItem ? "Edit Menu Item" : "Add New Menu Item"} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <form onSubmit={handleFormSubmit} className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} required className={inputStyle} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Price (₹)</label>
                        <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} required className={inputStyle} />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Category</label>
                        <input type="text" value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g., Appetizer, Main Course" className={inputStyle} />
                    </div>
                    <div className="flex items-center gap-4">
                        <label className="text-sm font-medium text-slate-300">Type:</label>
                        <button type="button" onClick={() => setIsVeg(true)} className={`px-3 py-1 text-sm rounded-full transition-colors ${isVeg ? 'bg-green-500 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>Veg</button>
                        <button type="button" onClick={() => setIsVeg(false)} className={`px-3 py-1 text-sm rounded-full transition-colors ${!isVeg ? 'bg-red-500 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>Non-Veg</button>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Image</label>
                        {currentImageUrl && !imageFile && (
                            <div className="mt-2">
                                <img src={currentImageUrl} alt="Current" className="w-24 h-24 rounded-md object-cover"/>
                            </div>
                        )}
                        <input type="file" onChange={e => e.target.files && setImageFile(e.target.files[0])} accept="image/*" className="mt-1 block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-500/10 file:text-emerald-500 hover:file:bg-emerald-500/20 transition-colors"/>
                    </div>
                    <div className="pt-4 flex justify-end">
                        <button type="submit" disabled={saving} className="bg-emerald-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-emerald-500 disabled:opacity-50">
                            {saving ? 'Saving...' : (editingItem ? 'Update Item' : 'Save Item')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default MenuPage;