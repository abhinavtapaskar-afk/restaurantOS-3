import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { Restaurant, MenuItem, Review, CartItem } from '../../types';
import { Plus, Minus, ShoppingCart, X, Star, MapPin, Clock, Phone } from 'lucide-react';
import { cn } from '../../lib/utils';
import Modal from '../ui/Modal';

// --- Cart Context & Components (as before, no changes needed here) ---
interface CartContextType { cart: CartItem[]; addToCart: (item: MenuItem) => void; removeFromCart: (itemId: string) => void; updateQuantity: (itemId: string, quantity: number) => void; clearCart: () => void; total: number; itemCount: number; }
const CartContext = createContext<CartContextType | undefined>(undefined);
export const useCart = () => { const context = useContext(CartContext); if (!context) throw new Error('useCart must be used within a CartProvider'); return context; };
export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [cart, setCart] = useState<CartItem[]>([]);
    const addToCart = (item: MenuItem) => { setCart(prev => { const existing = prev.find(i => i.id === item.id); return existing ? prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i) : [...prev, { ...item, quantity: 1 }]; }); };
    const removeFromCart = (itemId: string) => { setCart(prev => prev.filter(i => i.id !== itemId)); };
    const updateQuantity = (itemId: string, quantity: number) => { if (quantity <= 0) { removeFromCart(itemId); } else { setCart(prev => prev.map(i => i.id === itemId ? { ...i, quantity } : i)); } };
    const clearCart = () => setCart([]);
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    return (<CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, total, itemCount }}>{children}</CartContext.Provider>);
};
const CartSidebar: React.FC<{ isOpen: boolean, onClose: () => void, themeColor: string }> = ({ isOpen, onClose, themeColor }) => {
    const { cart, updateQuantity, total, itemCount } = useCart();
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    return (<>
        <div className={cn("fixed top-0 right-0 h-full w-full max-w-sm bg-slate-900 shadow-2xl transform transition-transform duration-300 ease-in-out z-50", isOpen ? 'translate-x-0' : 'translate-x-full')}>
            <div className="flex flex-col h-full">
                <div className="flex justify-between items-center p-4 border-b border-slate-800">
                    <h2 className="text-xl font-bold text-white">Your Order</h2>
                    <button onClick={onClose} className="p-1 hover:text-white"><X size={24} /></button>
                </div>
                {itemCount > 0 ? (<>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {cart.map(item => (
                        <div key={item.id} className="flex items-center gap-4">
                            <img src={item.image_url} alt={item.name} className="w-16 h-16 rounded-md object-cover" />
                            <div className="flex-1">
                                <p className="font-semibold text-white">{item.name}</p>
                                <p className={`text-${themeColor}-400`}>₹{item.price.toFixed(2)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1 bg-slate-800 rounded-full"><Minus size={14} /></button>
                                <span>{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1 bg-slate-800 rounded-full"><Plus size={14} /></button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t border-slate-800 space-y-4">
                    <div className="flex justify-between font-bold text-lg"><span>Total</span><span>₹{total.toFixed(2)}</span></div>
                    <button onClick={() => setIsCheckoutOpen(true)} className={`w-full bg-${themeColor}-600 text-white font-bold py-3 rounded-lg hover:bg-${themeColor}-500 transition-colors`}>Proceed to Checkout</button>
                </div></>) : (<div className="flex-1 flex flex-col items-center justify-center text-slate-500"><ShoppingCart size={48} /><p className="mt-4">Your cart is empty</p></div>)}
            </div>
        </div>
        {isCheckoutOpen && <CheckoutModal onClose={() => setIsCheckoutOpen(false)} themeColor={themeColor} />}
    </>);
};
const CheckoutModal: React.FC<{ onClose: () => void, themeColor: string }> = ({ onClose, themeColor }) => {
    const { cart, total, clearCart } = useCart();
    const { slug } = useParams<{ slug: string }>();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); setIsPlacingOrder(true);
        const { data: restaurantData } = await supabase.from('restaurants').select('id').eq('slug', slug).single();
        if (!restaurantData) { alert("Restaurant not found."); setIsPlacingOrder(false); return; }
        const newOrder = { restaurant_id: restaurantData.id, customer_name: name, customer_phone: phone, customer_address: address, total_amount: total, order_details: cart, status: 'pending' as const };
        const { error } = await supabase.from('orders').insert(newOrder);
        if (error) { alert('Could not place order. Please try again.'); } else { alert('Order placed successfully!'); clearCart(); onClose(); }
        setIsPlacingOrder(false);
    };
    return (
        <Modal isOpen={true} onClose={onClose} title="Checkout">
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" placeholder="Your Name" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-slate-800 p-2 rounded-md border border-slate-700"/>
                <input type="tel" placeholder="Phone Number" value={phone} onChange={e => setPhone(e.target.value)} required className="w-full bg-slate-800 p-2 rounded-md border border-slate-700"/>
                <textarea placeholder="Delivery Address" value={address} onChange={e => setAddress(e.target.value)} required className="w-full bg-slate-800 p-2 rounded-md border border-slate-700" rows={3}/>
                <button type="submit" disabled={isPlacingOrder} className={`w-full bg-${themeColor}-600 text-white font-bold py-3 rounded-lg hover:bg-${themeColor}-500 disabled:bg-slate-700`}>{isPlacingOrder ? 'Placing Order...' : `Place Order (₹${total.toFixed(2)})`}</button>
            </form>
        </Modal>
    );
};

const fontLinks: Record<string, string> = {
    'Inter': "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
    'Roboto Slab': "https://fonts.googleapis.com/css2?family=Roboto+Slab:wght@400;700&display=swap",
    'Lato': "https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap",
};
const fontClasses: Record<string, string> = {
    'Inter': 'font-sans',
    'Roboto Slab': 'font-roboto-slab',
    'Lato': 'font-lato',
};

// --- Main Page Component ---
const PublicMenuPageContent: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const { addToCart, itemCount } = useCart();

    const fetchData = useCallback(async () => {
        if (!slug) { setError("Restaurant not specified."); setLoading(false); return; }
        setLoading(true);
        const { data: restaurantData, error: restaurantError } = await supabase.from('restaurants').select('*').eq('slug', slug).single();
        if (restaurantError || !restaurantData) { setError("Restaurant not found."); } 
        else {
            setRestaurant(restaurantData);
            const { data: menuData } = await supabase.from('menu_items').select('*').eq('restaurant_id', restaurantData.id).eq('is_available', true).order('category');
            if(menuData) setMenuItems(menuData);
            const { data: reviewData } = await supabase.from('reviews').select('*').eq('restaurant_id', restaurantData.id).eq('is_visible', true).order('created_at', { ascending: false });
            if(reviewData) setReviews(reviewData);
        }
        setLoading(false);
    }, [slug]);

    useEffect(() => { fetchData() }, [fetchData]);
    
    useEffect(() => {
        if (restaurant?.font && fontLinks[restaurant.font]) {
            const link = document.createElement('link');
            link.href = fontLinks[restaurant.font];
            link.rel = 'stylesheet';
            document.head.appendChild(link);
            return () => { document.head.removeChild(link); };
        }
    }, [restaurant?.font]);

    if (loading) return <div className="text-center p-10">Loading...</div>;
    if (error) return <div className="text-center p-10 text-red-400">{error}</div>;
    if (!restaurant) return null;

    const themeColor = restaurant.theme_color || 'emerald';
    const fontClass = fontClasses[restaurant.font || 'Inter'] || 'font-sans';
    const groupedMenu = menuItems.reduce((acc, item) => { const cat = item.category || 'Other'; if (!acc[cat]) acc[cat] = []; acc[cat].push(item); return acc; }, {} as Record<string, MenuItem[]>);

    return (
        <div className={cn("min-h-screen bg-slate-950 text-slate-300", fontClass)}>
            <header className="h-96 bg-cover bg-center relative" style={{ backgroundImage: `url(${restaurant.hero_image_url || '/placeholder-hero.jpg'})` }}>
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-center p-4">
                    <h1 className="text-5xl md:text-7xl font-bold text-white">{restaurant.hero_title || restaurant.name}</h1>
                    <p className="text-lg text-slate-300 mt-2">{restaurant.hero_subtitle || restaurant.city}</p>
                </div>
            </header>
            
            <main className="max-w-5xl mx-auto p-4 sm:p-6 md:p-8 space-y-16">
                {restaurant.about_us && (
                    <section className="bg-slate-900 p-8 rounded-lg -mt-32 relative z-10 border border-slate-800 shadow-xl">
                        <h2 className={`text-3xl font-bold text-${themeColor}-400 mb-4`}>About Us</h2>
                        <p className="text-slate-400 whitespace-pre-wrap">{restaurant.about_us}</p>
                    </section>
                )}

                <section>
                    <h2 className={`text-3xl font-bold text-${themeColor}-400 text-center mb-8`}>Our Menu</h2>
                     {Object.entries(groupedMenu).map(([category, items]) => (
                        <div key={category} className="mb-10">
                            <h3 className="text-2xl font-semibold text-white mb-6">{category}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {items.map(item => (
                                    <div key={item.id} className="bg-slate-900 p-4 rounded-lg border border-slate-800 flex gap-4">
                                        {item.image_url && <img src={item.image_url} alt={item.name} className="w-28 h-28 rounded-md object-cover flex-shrink-0" />}
                                        <div className="flex flex-col flex-grow">
                                            <h4 className="font-bold text-lg text-white">{item.name}</h4>
                                            <p className={`text-${themeColor}-400 font-semibold mt-auto text-lg`}>₹{item.price}</p>
                                            <button onClick={() => addToCart(item)} className={`self-end -mb-2 -mr-2 bg-${themeColor}-600 text-white rounded-full p-2 hover:bg-${themeColor}-500 transition-colors`}><Plus size={20} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </section>

                {reviews.length > 0 && (
                <section>
                     <h2 className={`text-3xl font-bold text-${themeColor}-400 text-center mb-8`}>What Our Customers Say</h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {reviews.map(review => (
                            <div key={review.id} className="bg-slate-900 p-6 rounded-lg border border-slate-800">
                                <div className="flex justify-between items-center"><p className="font-bold text-white">{review.customer_name}</p><div className="flex gap-1">{[...Array(review.rating)].map((_, i) => <Star key={i} size={16} className="text-yellow-400 fill-yellow-400" />)}</div></div>
                                <p className="text-slate-400 mt-2 italic">"{review.comment}"</p>
                            </div>
                        ))}
                     </div>
                </section>
                )}

                <section>
                    <h2 className={`text-3xl font-bold text-${themeColor}-400 text-center mb-8`}>Location & Contact</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-center">
                        <div className="bg-slate-900 p-6 rounded-lg border border-slate-800">
                            <MapPin className={`mx-auto mb-3 h-8 w-8 text-${themeColor}-400`} />
                            <h3 className="text-xl font-bold text-white">Address</h3>
                            <p className="text-slate-400 mt-1">{restaurant.address || 'Not specified'}</p>
                            {restaurant.google_maps_url && (
                                <a href={restaurant.google_maps_url} target="_blank" rel="noopener noreferrer" className={`mt-4 inline-block bg-${themeColor}-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-${themeColor}-500 transition-colors`}>
                                    Open in Map
                                </a>
                            )}
                        </div>
                        <div className="bg-slate-900 p-6 rounded-lg border border-slate-800">
                            <Clock className={`mx-auto mb-3 h-8 w-8 text-${themeColor}-400`} />
                            <h3 className="text-xl font-bold text-white">Opening Hours</h3>
                            <p className="text-slate-400 mt-1 whitespace-pre-line">{restaurant.opening_hours || 'Not specified'}</p>
                            {restaurant.phone_number && (
                                 <a href={`tel:${restaurant.phone_number}`} className={`mt-4 inline-block bg-${themeColor}-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-${themeColor}-500 transition-colors`}>
                                    Call Now
                                </a>
                            )}
                        </div>
                    </div>
                </section>
            </main>

            <footer className="text-center p-8 mt-8 border-t border-slate-800 text-slate-500 space-y-2">
                <p className="text-lg font-bold text-slate-300">{restaurant.name}</p>
                <p>{restaurant.address}</p>
                <p>{restaurant.phone_number}</p>
                <p className="whitespace-pre-line">{restaurant.opening_hours}</p>
            </footer>

            <button onClick={() => setIsCartOpen(true)} className={`fixed bottom-6 right-6 bg-${themeColor}-600 text-white rounded-full p-4 shadow-lg hover:bg-${themeColor}-500 transition-transform hover:scale-110`}>
                <ShoppingCart size={28} />
                {itemCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">{itemCount}</span>}
            </button>
            <CartSidebar isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} themeColor={themeColor} />
        </div>
    );
};

const PublicMenuPage: React.FC = () => ( <CartProvider><PublicMenuPageContent /></CartProvider> );
export default PublicMenuPage;