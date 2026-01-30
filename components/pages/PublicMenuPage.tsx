
import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../../services/supabase';
import { Restaurant, MenuItem, CartItem, PaymentMethod } from '../../types';
import { Plus, Minus, ShoppingCart, X, MapPin, Phone, Navigation, CreditCard, Banknote, Bike, Instagram, MessageCircle, Utensils, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';
import Modal from '../ui/Modal';
import { fonts } from './SettingsPage';

interface CartContextType { cart: CartItem[]; addToCart: (item: MenuItem) => void; removeFromCart: (itemId: string) => void; updateQuantity: (itemId: string, quantity: number) => void; clearCart: () => void; total: number; itemCount: number; }
const CartContext = createContext<CartContextType | undefined>(undefined);
export const useCart = () => { const context = useContext(CartContext); if (!context) throw new Error('useCart must be used within a CartProvider'); return context; };
export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [cart, setCart] = useState<CartItem[]>([]);
    const addToCart = (item: MenuItem) => { setCart(prev => { const existing = prev.find(i => i.id === item.id); return existing ? prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i) : [...prev, { ...item, quantity: 1 }]; }); };
    const removeFromCart = (itemId: string) => { setCart(prev => prev.filter(i => i.id !== itemId)); };
    const updateQuantity = (itemId: string, quantity: number) => { if (quantity <= 0) { removeFromCart(itemId); } else { setCart(prev => prev.map(i => i.id === itemId ? { ...i, quantity } : i)) } };
    const clearCart = () => setCart([]);
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    return (<CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, total, itemCount }}>{children}</CartContext.Provider>);
};

const CartSidebar: React.FC<{ isOpen: boolean, onClose: () => void, primaryColor: string, secondaryColor: string, restaurant: Restaurant | null, tableNumber: number | null }> = ({ isOpen, onClose, primaryColor, secondaryColor, restaurant, tableNumber }) => {
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
                                <p style={{ color: primaryColor }}>₹{item.price.toFixed(2)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="p-1 bg-slate-800 rounded-full text-white"><Minus size={14} /></button>
                                <span className="text-white">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="p-1 bg-slate-800 rounded-full text-white"><Plus size={14} /></button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t border-slate-800 space-y-4">
                    <div className="flex justify-between font-bold text-lg text-white"><span>Total</span><span>₹{total.toFixed(2)}</span></div>
                    <button 
                        onClick={() => setIsCheckoutOpen(true)} 
                        style={{ background: `linear-gradient(45deg, ${primaryColor}, ${secondaryColor})` }}
                        className="w-full text-white font-bold py-3 rounded-lg shadow-lg"
                    >
                        Proceed to Checkout
                    </button>
                </div></>) : (<div className="flex-1 flex flex-col items-center justify-center text-slate-500"><ShoppingCart size={48} /><p className="mt-4">Your cart is empty</p></div>)}
            </div>
        </div>
        {isCheckoutOpen && <CheckoutModal onClose={() => setIsCheckoutOpen(false)} primaryColor={primaryColor} secondaryColor={secondaryColor} restaurant={restaurant} tableNumber={tableNumber} />}
    </>);
};

const CheckoutModal: React.FC<{ onClose: () => void, primaryColor: string, secondaryColor: string, restaurant: Restaurant | null, tableNumber: number | null }> = ({ onClose, primaryColor, secondaryColor, restaurant, tableNumber }) => {
    const { cart, total, clearCart } = useCart();
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState(tableNumber ? `Table ${tableNumber}` : '');
    const [location, setLocation] = useState<{ lat: number, lng: number } | null>(tableNumber ? { lat: 0, lng: 0 } : null);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');
    const [isLocating, setIsLocating] = useState(false);
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const isReadyToOrder = location !== null || tableNumber !== null;

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                setName(session.user.user_metadata.full_name || '');
            }
        });
    }, []);

    const detectLocation = () => {
        setIsLocating(true);
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            setIsLocating(false);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
                setIsLocating(false);
            },
            (error) => {
                console.error('[Checkout] Geolocation error:', error);
                alert("Could not detect location. Please check your permissions.");
                setIsLocating(false);
            },
            { enableHighAccuracy: true }
        );
    };

    const handleUPIPayment = () => {
        if (!restaurant?.upi_id) {
            alert("UPI payment is not configured for this restaurant yet.");
            return;
        }
        const upiUrl = `upi://pay?pa=${restaurant.upi_id}&pn=${encodeURIComponent(restaurant.name)}&am=${total}&cu=INR`;
        window.location.href = upiUrl;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isReadyToOrder) {
            alert("Please detect your location for faster delivery!");
            return;
        }

        setIsPlacingOrder(true);
        try {
            if (!restaurant) throw new Error("Restaurant data missing.");

            const newOrder = {
                restaurant_id: restaurant.id,
                customer_name: name,
                customer_phone: phone,
                customer_address: address,
                latitude: location?.lat || null,
                longitude: location?.lng || null,
                subtotal: total,
                total_amount: total,
                order_details: cart, 
                items: cart, 
                status: 'pending' as const,
                payment_method: paymentMethod,
                order_type: tableNumber ? 'DINE_IN' : 'DELIVERY',
                table_number: tableNumber
            };

            const { data, error } = await supabase.from('orders').insert(newOrder).select('id').single();
            if (error) throw error;

            if (paymentMethod === 'UPI') {
                handleUPIPayment();
            }
            
            if (data?.id) {
                localStorage.setItem('last_order_id', data.id);
                clearCart();
                onClose();
                window.location.hash = `#/order-success/${data.id}`;
            }
        } catch (err: any) {
            console.error('[Checkout] Submit Error:', err);
            alert(`Could not place order: ${err.message}`);
        } finally {
            setIsPlacingOrder(false);
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={tableNumber ? `Table ${tableNumber} Order` : "Complete Your Order"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {tableNumber && (
                    <div className="bg-indigo-600/10 border border-indigo-500/20 p-3 rounded-xl flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-black">
                            {tableNumber}
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Dine-In Session</p>
                            <p className="text-xs text-white font-bold">Automatic Table Service Activated</p>
                        </div>
                    </div>
                )}
                
                <input type="text" placeholder="Your Name" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-slate-800 p-2.5 rounded-md border border-slate-700 text-white outline-none focus:border-emerald-500"/>
                <input type="tel" placeholder="WhatsApp Number" value={phone} onChange={e => setPhone(e.target.value)} required className="w-full bg-slate-800 p-2.5 rounded-md border border-slate-700 text-white outline-none focus:border-emerald-500"/>
                
                {!tableNumber && (
                    <div className="space-y-2">
                        <div className="flex gap-2">
                            <textarea placeholder="Delivery Address" value={address} onChange={e => setAddress(e.target.value)} required className="flex-1 bg-slate-800 p-2 rounded-md border border-slate-700 text-white outline-none focus:border-emerald-500" rows={2}/>
                            <button type="button" onClick={detectLocation} disabled={isLocating} className={cn("px-4 rounded-md border border-slate-700 transition-colors flex items-center justify-center", location ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-slate-800 text-slate-400")}>
                                {isLocating ? <div className="animate-spin h-5 w-5 border-2 border-emerald-500 border-t-transparent rounded-full" /> : <Navigation size={20} />}
                            </button>
                        </div>
                        {location ? (
                            <p className="text-xs text-emerald-400 text-right font-bold uppercase tracking-wider">✓ Dispatch Location Ready</p>
                        ) : (
                            <p className="text-xs text-amber-400 text-right italic">Required for logistics.</p>
                        )}
                    </div>
                )}

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Payment Method</label>
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            type="button" 
                            onClick={() => setPaymentMethod('COD')}
                            className={cn("flex flex-col items-center gap-2 p-3 rounded-xl border transition-all", paymentMethod === 'COD' ? "border-emerald-500 bg-emerald-500/10 text-white" : "border-slate-700 bg-slate-800 text-slate-400")}
                        >
                            <Banknote size={24} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{tableNumber ? 'Pay at Cashier' : 'Cash'}</span>
                        </button>
                        <button 
                            type="button" 
                            disabled={!restaurant?.upi_id}
                            onClick={() => setPaymentMethod('UPI')}
                            className={cn("flex flex-col items-center gap-2 p-3 rounded-xl border transition-all", paymentMethod === 'UPI' ? "border-emerald-500 bg-emerald-500/10 text-white" : "border-slate-700 bg-slate-800 text-slate-400", !restaurant?.upi_id && "opacity-50 cursor-not-allowed")}
                        >
                            <CreditCard size={24} />
                            <span className="text-[10px] font-black uppercase tracking-widest">UPI Pay</span>
                        </button>
                    </div>
                </div>

                <button 
                    type="submit" 
                    disabled={isPlacingOrder || !isReadyToOrder} 
                    style={{ background: isReadyToOrder ? `linear-gradient(45deg, ${primaryColor}, ${secondaryColor})` : '#334155' }}
                    className="w-full text-white font-black uppercase tracking-widest py-4 rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isPlacingOrder ? 'Processing...' : (paymentMethod === 'UPI' ? `Pay & Submit ₹${total.toFixed(2)}` : `Submit Order ₹${total.toFixed(2)}`)}
                </button>
            </form>
        </Modal>
    );
};

const PublicMenuPageContent: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const [searchParams] = useSearchParams();
    const tableNumber = searchParams.get('table') ? parseInt(searchParams.get('table')!) : null;
    
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [activeOrderId, setActiveOrderId] = useState<string | null>(localStorage.getItem('last_order_id'));
    const { addToCart, itemCount } = useCart();

    const fetchData = useCallback(async () => {
        if (!slug) { setError("Restaurant slug is missing."); setLoading(false); return; }
        setLoading(true);
        try {
            const { data: restaurantData, error: restaurantError } = await supabase.from('restaurants').select('*').eq('slug', slug).maybeSingle();
            if (restaurantError) throw restaurantError;
            if (!restaurantData) throw new Error("Storefront not found.");
            setRestaurant(restaurantData);
            const { data: menuData } = await supabase.from('menu_items').select('*').eq('restaurant_id', restaurantData.id).eq('is_available', true).order('category');
            if(menuData) setMenuItems(menuData);
        } catch (err: any) {
            console.error('[PublicMenu] Load Error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [slug]);

    useEffect(() => { fetchData() }, [fetchData]);
    
    useEffect(() => {
        const checkOrder = () => {
            const id = localStorage.getItem('last_order_id');
            if (id !== activeOrderId) setActiveOrderId(id);
        };
        const interval = setInterval(checkOrder, 2000);
        return () => clearInterval(interval);
    }, [activeOrderId]);

    if (loading) return <div className="text-center p-20 text-slate-500 font-black uppercase tracking-widest animate-pulse">Designing your menu...</div>;
    if (error) return <div className="text-center p-20 text-red-500 font-bold uppercase">Store Error: {error}</div>;
    if (!restaurant) return null;

    const primaryColor = restaurant.theme_color || '#10b981';
    const secondaryColor = restaurant.secondary_theme_color || '#059669';
    const heroOpacity = (restaurant.hero_opacity ?? 60) / 100;
    const fontConfig = fonts.find(f => f.name === restaurant.font) || fonts[0];

    const groupedMenu = menuItems.reduce((acc, item) => { 
        const cat = item.category || 'Specialties'; 
        if (!acc[cat]) acc[cat] = []; 
        acc[cat].push(item); 
        return acc; 
    }, {} as Record<string, MenuItem[]>);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-300 pb-32" style={{ fontFamily: fontConfig.family }}>
            {activeOrderId && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] animate-bounce">
                    <Link to={`/order-success/${activeOrderId}`} className="flex items-center gap-3 bg-white text-slate-950 px-6 py-3 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] font-black uppercase text-xs tracking-widest hover:scale-105 transition-all">
                        <Bike size={20} className="text-emerald-500" />
                        Track My Active Order
                    </Link>
                </div>
            )}

            <header className="h-[50vh] bg-cover bg-center relative" style={{ backgroundImage: `url(${restaurant.hero_image_url || 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=2070&auto=format&fit=crop'})` }}>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6" style={{ backgroundColor: `rgba(0,0,0,${heroOpacity})` }}>
                    {tableNumber && (
                        <div className="absolute top-6 left-6 flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-full font-black uppercase text-[10px] tracking-widest shadow-2xl animate-in slide-in-from-left duration-700">
                            <Zap size={14} className="fill-white" /> Table {tableNumber} Active
                        </div>
                    )}
                    
                    {restaurant.hero_title && (
                        <h1 className="text-5xl md:text-8xl font-black text-white tracking-tighter drop-shadow-2xl">{restaurant.hero_title}</h1>
                    )}
                    {restaurant.hero_subtitle && (
                        <p className="text-lg md:text-2xl text-white/80 mt-4 max-w-2xl font-medium">{restaurant.hero_subtitle}</p>
                    )}
                    
                    <div className="flex gap-4 mt-8">
                        {restaurant.instagram_url && (
                            <a href={restaurant.instagram_url} target="_blank" className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all border border-white/10"><Instagram size={20}/></a>
                        )}
                        {restaurant.whatsapp_number && (
                            <a href={`https://wa.me/${restaurant.whatsapp_number}`} target="_blank" className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all border border-white/10"><MessageCircle size={20}/></a>
                        )}
                        {restaurant.google_maps_url && (
                            <a href={restaurant.google_maps_url} target="_blank" className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all border border-white/10"><MapPin size={20}/></a>
                        )}
                    </div>
                </div>
            </header>
            
            <main className="max-w-6xl mx-auto p-4 md:p-12 space-y-24">
                {restaurant.about_us && (
                    <section className="bg-slate-900/50 backdrop-blur-xl p-10 rounded-3xl -mt-32 relative z-10 border border-white/5 shadow-2xl">
                        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] mb-4" style={{ color: primaryColor }}>Our Story</h2>
                        <p className="text-xl md:text-2xl text-slate-100 font-medium leading-relaxed italic">"{restaurant.about_us}"</p>
                    </section>
                )}

                <section>
                    <div className="flex flex-col items-center mb-16 text-center">
                         <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-4">The Selection</h2>
                         <div className="h-1.5 w-24 rounded-full" style={{ background: `linear-gradient(45deg, ${primaryColor}, ${secondaryColor})` }}></div>
                    </div>
                    
                    {!restaurant.is_accepting_orders && (
                        <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-2xl text-center mb-12">
                             <p className="text-red-400 font-black uppercase tracking-widest text-lg">The Kitchen is Currently Resting</p>
                             <p className="text-slate-500 text-sm mt-1">Check back during our opening hours!</p>
                        </div>
                    )}

                     {Object.entries(groupedMenu).map(([category, items]) => (
                        <div key={category} className="mb-20">
                            <h3 className="text-2xl font-black text-white mb-10 flex items-center gap-4">
                                <span className="h-0.5 flex-1 bg-white/5"></span>
                                {category}
                                <span className="h-0.5 flex-1 bg-white/5"></span>
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {items.map(item => (
                                    <div key={item.id} className="bg-slate-900/40 rounded-3xl border border-white/5 p-4 flex flex-col group hover:border-white/10 transition-all">
                                        <div className="relative aspect-square rounded-2xl overflow-hidden mb-4 bg-slate-800">
                                            {item.image_url ? (
                                                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-700"><Utensils size={48} /></div>
                                            )}
                                            <div className={cn("absolute top-3 left-3 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest", item.is_veg ? "bg-emerald-500 text-white" : "bg-red-500 text-white")}>
                                                {item.is_veg ? 'Pure Veg' : 'Non-Veg'}
                                            </div>
                                        </div>
                                        <div className="flex flex-col flex-grow">
                                            <h4 className="font-black text-lg text-white mb-1">{item.name}</h4>
                                            <div className="flex justify-between items-center mt-auto">
                                                <p className="text-2xl font-black" style={{ color: primaryColor }}>₹{item.price}</p>
                                                {restaurant.is_accepting_orders && (
                                                    <button 
                                                        onClick={() => addToCart(item)} 
                                                        style={{ background: `linear-gradient(45deg, ${primaryColor}, ${secondaryColor})` }}
                                                        className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg shadow-black/20 hover:scale-110 active:scale-95 transition-all"
                                                    >
                                                        <Plus size={20} strokeWidth={3} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </section>

                {/* Info Footer */}
                <footer className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-24 border-t border-white/5">
                    <div className="space-y-4">
                        <h5 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em]">Location</h5>
                        <p className="text-white text-lg font-bold leading-relaxed">{restaurant.address || 'Nanded, India'}</p>
                        {restaurant.google_maps_url && (
                            <a href={restaurant.google_maps_url} target="_blank" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
                                <Navigation size={14}/> Get Directions
                            </a>
                        )}
                    </div>
                    <div className="space-y-4">
                        <h5 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em]">Kitchen Hours</h5>
                        <p className="text-white text-lg font-bold whitespace-pre-wrap">{restaurant.opening_hours || 'Mon - Sun: 9 AM - 11 PM'}</p>
                    </div>
                    <div className="space-y-4">
                        <h5 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em]">Reservations</h5>
                        <p className="text-white text-2xl font-black">{restaurant.phone_number || '+91 000 000 000'}</p>
                        <p className="text-xs text-slate-500">Call for bulk party bookings.</p>
                    </div>
                </footer>
            </main>

            {/* Float Cart Trigger */}
            {restaurant.is_accepting_orders && (
                <button 
                    onClick={() => setIsCartOpen(true)} 
                    style={{ background: `linear-gradient(45deg, ${primaryColor}, ${secondaryColor})` }}
                    className="fixed bottom-10 right-10 h-20 w-20 rounded-full flex items-center justify-center text-white shadow-2xl hover:scale-110 active:scale-90 transition-all z-40 group overflow-hidden"
                >
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
                    <ShoppingCart size={32} />
                    {itemCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-white text-slate-950 text-xs font-black rounded-full h-8 w-8 flex items-center justify-center shadow-2xl border-2 border-slate-950">
                            {itemCount}
                        </span>
                    )}
                </button>
            )}

            <CartSidebar 
                isOpen={isCartOpen} 
                onClose={() => setIsCartOpen(false)} 
                primaryColor={primaryColor} 
                secondaryColor={secondaryColor} 
                restaurant={restaurant} 
                tableNumber={tableNumber}
            />
        </div>
    );
};

// Global Font Injector
const PublicMenuPage: React.FC = () => {
    return (
        <CartProvider>
            <PublicMenuPageContent />
        </CartProvider>
    );
};
export default PublicMenuPage;
