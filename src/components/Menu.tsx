import React, { useState } from 'react';
import { type MainCategory, type SubCategory, type MenuItem } from '../data/menu';
import { ChevronRight, Star, LayoutGrid, List, ConciergeBell, X, Plus, Minus, Trash2 } from 'lucide-react';

interface CartItem {
    item: MenuItem;
    quantity: number;
}

interface MenuProps {
    initialData: MainCategory[];
}

export default function Menu({ initialData }: MenuProps) {
    const [activeMainId, setActiveMainId] = useState(initialData[0].id);
    const activeMainCategory = initialData.find(c => c.id === activeMainId) || initialData[0];
    const [activeSubId, setActiveSubId] = useState(activeMainCategory.subCategories[0].id);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const addToCart = (item: MenuItem) => {
        setCartItems(prev => {
            const existing = prev.find(i => i.item.id === item.id);
            if (existing) {
                return prev.map(i => i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { item, quantity: 1 }];
        });
    };

    const updateQuantity = (itemId: string, delta: number) => {
        setCartItems(prev => prev.map(i => {
            if (i.item.id === itemId) {
                return { ...i, quantity: Math.max(0, i.quantity + delta) };
            }
            return i;
        }).filter(i => i.quantity > 0));
    };

    const removeFromCart = (itemId: string) => {
        setCartItems(prev => prev.filter(i => i.item.id !== itemId));
    };

    const cartTotal = cartItems.reduce((sum, cartItem) => {
        const price = parseFloat(cartItem.item.price.replace(/[^0-9.]/g, ''));
        return sum + price * cartItem.quantity;
    }, 0);

    const handleMainChange = (id: string) => {
        if (id === activeMainId) return;
        setActiveMainId(id);
        const newMain = initialData.find(c => c.id === id);
        if (newMain && newMain.subCategories.length > 0) {
            setActiveSubId(newMain.subCategories[0].id);
        }
    };

    const handleCheckout = async () => {
        if (cartItems.length === 0) return;
        setIsSubmitting(true);
        setSubmitMessage(null);

        try {
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    cartItems,
                    cartTotal
                }),
            });

            const data = await response.json();

            if (response.ok) {
                setSubmitMessage({ type: 'success', text: `Order sent! Ticket: ${data.receipt_id || 'N/A'}` });
                // Clear cart after successful checkout
                setTimeout(() => {
                    setCartItems([]);
                    setIsCartOpen(false);
                    setSubmitMessage(null);
                }, 3000);
            } else {
                setSubmitMessage({ type: 'error', text: data.error || 'Failed to send order' });
            }
        } catch (error) {
            console.error('Checkout error:', error);
            setSubmitMessage({ type: 'error', text: 'Network error occurred.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const activeSubCategory = activeMainCategory.subCategories.find(s => s.id === activeSubId) || activeMainCategory.subCategories[0];

    return (
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative ">

            {/* Cart Floating Button - Top Right */}
            <button
                onClick={() => setIsCartOpen(true)}
                className="fixed top-4 right-4 z-50 p-3 bg-amber-600 text-white rounded-full shadow-lg hover:bg-amber-700 transition-all duration-300 hover:scale-110 border-2 border-amber-500/50"
                aria-label="Open Cart"
            >
                <div className="relative">
                    <ConciergeBell size={24} />
                    {cartItems.length > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border border-gray-900">
                            {cartItems.reduce((a, b) => a + b.quantity, 0)}
                        </span>
                    )}
                </div>
            </button>

            {/* View Toggle - Top Left */}
            <div className="absolute top-4 left-4 sm:top-12 sm:left-8 z-10 flex bg-gray-900/80 backdrop-blur-md rounded-lg p-1 border border-gray-800">
                <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-amber-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    aria-label="Grid View"
                >
                    <LayoutGrid size={20} />
                </button>
                <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-amber-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                    aria-label="List View"
                >
                    <List size={20} />
                </button>
            </div>

            {/* Level 1 Tabs (Main Categories) */}
            <div className="flex justify-center mb-10 pt-12 sm:pt-0">
                <div className="inline-flex bg-gray-900/50 p-1.5 rounded-full border border-gray-800 backdrop-blur-sm overflow-x-auto max-w-full">
                    {initialData.map(category => (
                        <button
                            key={category.id}
                            onClick={() => handleMainChange(category.id)}
                            className={`px-6 py-2 sm:px-8 sm:py-3 rounded-full text-sm sm:text-lg font-medium transition-all duration-300 whitespace-nowrap
                ${activeMainId === category.id
                                    ? 'bg-amber-600 text-white shadow-lg'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                                }`}
                        >
                            {category.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Level 2 Tabs (Sub Categories) */}
            {/* <div className="flex flex-col items-center mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight relative inline-block">
                    {activeMainCategory.name}
                    <span className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-amber-600 rounded-full"></span>
                </h2>
                <div className="flex flex-wrap justify-center gap-3">
                    {activeMainCategory.subCategories.map(sub => (
                        <button
                            key={sub.id}
                            onClick={() => setActiveSubId(sub.id)}
                            className={`px-5 py-2 rounded-xl text-sm font-medium transition-all duration-300 border
                ${activeSubId === sub.id
                                    ? 'bg-amber-500/10 border-amber-500 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                                    : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-200'
                                }`}
                        >
                            {sub.name}
                        </button>
                    ))}
                </div>
            </div> */}

            {/* Menu Content */}
            {viewMode === 'grid' ? (
                /* Grid View */
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
                    {activeSubCategory.items.map(item => (
                        <div key={item.id} className="group relative bg-gray-900 rounded-xl md:rounded-2xl overflow-hidden border border-gray-800 hover:border-gray-700 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 flex flex-col h-full">
                            <div className="relative h-40 md:h-48 lg:h-64 overflow-hidden">
                                <img
                                    src={item.image}
                                    alt={item.name}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-80"></div>

                                {/* Tags */}
                                <div className="absolute top-3 left-3 md:top-4 md:left-4 flex flex-wrap gap-1.5 md:gap-2">
                                    {item.tags?.map(tag => (
                                        <span key={tag} className="px-2 py-0.5 md:px-3 md:py-1 text-[10px] md:text-xs font-bold uppercase tracking-wider bg-black/70 backdrop-blur-md text-amber-400 rounded-md md:rounded-lg border border-amber-500/30">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="p-4 md:p-6 flex-grow flex flex-col">
                                <div className="flex flex-col md:flex-row justify-between items-start mb-2 md:mb-3 gap-1">
                                    <h3 className="text-sm md:text-xl font-bold text-white group-hover:text-amber-500 transition-colors leading-tight">{item.name}</h3>
                                    <span className="text-sm md:text-xl font-bold text-amber-500 tabular-nums">{item.price}</span>
                                </div>
                                <p className="text-gray-400 text-xs md:text-sm leading-snug md:leading-relaxed mb-4 md:mb-6 flex-grow line-clamp-3 md:line-clamp-none">{item.description}</p>

                                <button
                                    onClick={() => addToCart(item)}
                                    className="w-full py-2 md:py-3 bg-gray-800 hover:bg-amber-600 hover:text-white text-gray-300 rounded-lg md:rounded-xl transition-all duration-300 font-semibold text-xs md:text-sm flex items-center justify-center gap-1.5 md:gap-2 group-hover:bg-amber-600 group-hover:text-white"
                                >
                                    <span>Add</span>
                                    <ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4 transition-transform group-hover:translate-x-1" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* List View */
                <div className="flex flex-col gap-4 max-w-4xl mx-auto">
                    {activeSubCategory.items.map(item => (
                        <div key={item.id} className="group bg-gray-900 rounded-xl overflow-hidden border border-gray-800 hover:border-gray-700 transition-all duration-300 hover:shadow-xl flex flex-row h-32 md:h-40">
                            <div className="relative w-32 md:w-48 overflow-hidden shrink-0">
                                <img
                                    src={item.image}
                                    alt={item.name}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-gray-900/50"></div>
                            </div>

                            <div className="p-4 md:p-6 flex-grow flex flex-col justify-between relative">
                                <div className="absolute top-4 right-4 flex gap-2">
                                    {item.tags?.map(tag => (
                                        <span key={tag} className="hidden sm:inline-block px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-gray-800 text-amber-400 rounded-md border border-amber-500/30">
                                            {tag}
                                        </span>
                                    ))}
                                </div>

                                <div>
                                    <div className="flex justify-between items-start pr-0 sm:pr-20">
                                        <h3 className="text-lg md:text-xl font-bold text-white group-hover:text-amber-500 transition-colors">{item.name}</h3>
                                        <span className="text-lg md:text-xl font-bold text-amber-500 tabular-nums">{item.price}</span>
                                    </div>
                                    <p className="text-gray-400 text-xs md:text-sm mt-1 md:mt-2 line-clamp-2">{item.description}</p>
                                </div>

                                <div className="flex justify-between items-end mt-2">
                                    <div className="sm:hidden flex gap-1">
                                        {item.tags?.map(tag => (
                                            <span key={tag} className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-gray-800 text-amber-400 rounded border border-amber-500/30">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => addToCart(item)}
                                        className="ml-auto px-4 py-2 bg-gray-800 hover:bg-amber-600 hover:text-white text-gray-300 rounded-lg transition-all duration-300 font-semibold text-xs md:text-sm flex items-center gap-1 group-hover:bg-amber-600 group-hover:text-white"
                                    >
                                        <span>Add</span>
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Cart Drawer */}
            {isCartOpen && (
                <div className="fixed inset-0 z-[60]">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsCartOpen(false)}
                    ></div>

                    {/* Drawer Panel */}
                    <div className="absolute top-0 right-0 h-full w-full max-w-md bg-gray-900 shadow-2xl border-l border-gray-800 transform transition-transform duration-300 overflow-y-auto">
                        <div className="p-6 h-full flex flex-col">
                            <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
                                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                    <ConciergeBell className="text-amber-500" />
                                    Your Order
                                </h2>
                                <button
                                    onClick={() => setIsCartOpen(false)}
                                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {cartItems.length === 0 ? (
                                <div className="flex-grow flex flex-col items-center justify-center text-gray-500 text-center">
                                    <ConciergeBell size={48} className="mb-4 opacity-20" />
                                    <p className="text-lg font-medium">Your cart is empty</p>
                                    <p className="text-sm mt-2">Start adding some delicious items!</p>
                                    <button
                                        onClick={() => setIsCartOpen(false)}
                                        className="mt-6 px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
                                    >
                                        Browse Menu
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex-grow space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                                        {cartItems.map((cartItem) => (
                                            <div key={cartItem.item.id} className="flex gap-4 p-4 bg-gray-800/50 rounded-xl border border-gray-800">
                                                <img
                                                    src={cartItem.item.image}
                                                    alt={cartItem.item.name}
                                                    className="w-20 h-20 object-cover rounded-lg"
                                                />
                                                <div className="flex-grow flex flex-col justify-between">
                                                    <div className="flex justify-between items-start">
                                                        <h3 className="text-white font-medium line-clamp-1 pr-2">{cartItem.item.name}</h3>
                                                        <button
                                                            onClick={() => removeFromCart(cartItem.item.id)}
                                                            className="text-gray-500 hover:text-red-500 transition-colors p-1"
                                                            aria-label="Remove item"
                                                        >
                                                            <X size={18} />
                                                        </button>
                                                    </div>

                                                    <div className="flex items-center justify-between mt-2">
                                                        <p className="text-amber-500 font-bold">{cartItem.item.price}</p>
                                                        <div className="flex items-center gap-3 bg-gray-900 rounded-lg p-1">
                                                            <button
                                                                onClick={() => updateQuantity(cartItem.item.id, -1)}
                                                                className="p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
                                                            >
                                                                <Minus size={16} />
                                                            </button>
                                                            <span className="text-white font-medium w-4 text-center">{cartItem.quantity}</span>
                                                            <button
                                                                onClick={() => updateQuantity(cartItem.item.id, 1)}
                                                                className="p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
                                                            >
                                                                <Plus size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-8 border-t border-gray-800 pt-6">
                                        <div className="flex justify-between items-center mb-6">
                                            <span className="text-gray-400 text-lg">Total</span>
                                            <span className="text-3xl font-bold text-amber-500">CHF {cartTotal.toFixed(2)}</span>
                                        </div>

                                        {submitMessage && (
                                            <div className={`p-3 rounded-lg mb-4 text-center text-sm font-medium ${submitMessage.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                                                {submitMessage.text}
                                            </div>
                                        )}

                                        <button
                                            onClick={handleCheckout}
                                            disabled={isSubmitting || cartItems.length === 0}
                                            className="w-full py-4 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-700 disabled:text-gray-400 disabled:transform-none disabled:shadow-none text-white text-lg font-bold rounded-xl shadow-lg hover:shadow-amber-900/20 transition-all transform hover:-translate-y-1 flex justify-center items-center"
                                        >
                                            {isSubmitting ? (
                                                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            ) : (
                                                'Send to Counter'
                                            )}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
