import React, { useState } from 'react';
import { type MainCategory, type SubCategory, type MenuItem } from '../data/menu';
import { ChevronRight, Star, LayoutGrid, List, ConciergeBell, X, Plus, Minus, Trash2, Info } from 'lucide-react';

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
    const [isAboutOpen, setIsAboutOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

    const triggerFlyAnimation = (imageSrc: string, startX: number, startY: number, endX: number, endY: number) => {
        const flyEl = document.createElement('img');
        flyEl.src = imageSrc;
        flyEl.className = 'fixed z-[100] w-12 h-12 object-cover rounded-full shadow-2xl border-2 border-emerald-500 pointer-events-none transition-all duration-700 ease-in-out';

        flyEl.style.left = `${startX - 24}px`;
        flyEl.style.top = `${startY - 24}px`;
        flyEl.style.opacity = '1';
        flyEl.style.transform = 'scale(1)';

        document.body.appendChild(flyEl);

        flyEl.getBoundingClientRect(); // trigger reflow

        flyEl.style.left = `${endX - 10}px`;
        flyEl.style.top = `${endY - 10}px`;
        flyEl.style.transform = 'scale(0.1)';
        flyEl.style.opacity = '0.1';

        setTimeout(() => flyEl.remove(), 700);
    };

    const addToCart = (item: MenuItem) => {
        setCartItems(prev => {
            const existing = prev.find(i => i.item.id === item.id);
            if (existing) {
                return prev.map(i => i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { item, quantity: 1 }];
        });
    };

    const handleAddToCart = (item: MenuItem, e?: React.MouseEvent) => {
        if (e) {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const startX = rect.left + rect.width / 2;
            const startY = rect.top + rect.height / 2;
            const endX = window.innerWidth - 30;
            const endY = 30;
            triggerFlyAnimation(item.image, startX, startY, endX, endY);
        }

        if (item.variants && item.variants.length > 1) {
            const selectedVarId = selectedVariants[item.id] || item.variants[0].variant_id;
            const variantInfo = item.variants.find(v => v.variant_id === selectedVarId) || item.variants[0];
            const itemToAdd: MenuItem = {
                ...item,
                id: selectedVarId,
                variant_id: selectedVarId,
                name: `${item.name} - ${variantInfo.name}`,
                price: variantInfo.price
            };
            addToCart(itemToAdd);
        } else {
            const variantInfo = item.variants?.[0];
            const itemToAdd: MenuItem = {
                ...item,
                id: variantInfo?.variant_id || item.id,
                variant_id: variantInfo?.variant_id || item.id,
                price: variantInfo?.price || item.price
            };
            addToCart(itemToAdd);
        }
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

        // Extract table number from URL
        const params = new URLSearchParams(window.location.search);
        const tableNumber = params.get('table');

        try {
            const response = await fetch('/api/checkout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    cartItems,
                    cartTotal,
                    tableNumber
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
        <div className="w-full relative">

            {/* View Toggle - Top Left (Sitting safely above the transition line) */}
            <div className="absolute -top-12 left-4 sm:-top-8 sm:left-8 z-20 flex gap-4">
                <button
                    onClick={() => setViewMode('grid')}
                    className={`transition-all duration-300 ${viewMode === 'grid' ? 'text-amber-600 scale-110 drop-shadow-sm' : 'text-stone-400 hover:text-gray-900 hover:scale-105'}`}
                    aria-label="Grid View"
                >
                    <LayoutGrid size={24} />
                </button>
                <button
                    onClick={() => setViewMode('list')}
                    className={`transition-all duration-300 ${viewMode === 'list' ? 'text-amber-600 scale-110 drop-shadow-sm' : 'text-stone-400 hover:text-gray-900 hover:scale-105'}`}
                    aria-label="List View"
                >
                    <List size={24} />
                </button>
            </div>

            {/* About Us Toggle - Top Right */}
            <div className="absolute -top-12 right-4 sm:-top-8 sm:right-8 z-20 flex">
                <button
                    onClick={() => setIsAboutOpen(true)}
                    className="flex items-center gap-1.5 text-stone-500 hover:text-amber-600 transition-all duration-300 hover:scale-105 bg-white/50 backdrop-blur-sm px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-stone-200 shadow-sm"
                    aria-label="About Us"
                >
                    <Info size={20} />
                    <span className="text-sm font-bold hidden sm:block">About Us</span>
                </button>
            </div>

            {/* Level 1 Tabs (Main Categories) Straddling the Color Horizon */}
            <div className="relative z-20 flex justify-center -mb-7 sm:-mb-8">
                <div className="inline-flex bg-white/95 p-1.5 rounded-full shadow-lg shadow-amber-900/10 border border-stone-100 backdrop-blur-md overflow-x-auto max-w-full">
                    {initialData.map(category => (
                        <button
                            key={category.id}
                            onClick={() => handleMainChange(category.id)}
                            className={`px-6 py-2 sm:px-8 sm:py-3 rounded-full text-sm sm:text-lg font-bold transition-all duration-300 whitespace-nowrap
                ${activeMainId === category.id
                                    ? 'bg-amber-600 text-white shadow-md shadow-amber-900/30'
                                    : 'text-stone-500 hover:text-gray-900 hover:bg-stone-50'
                                }`}
                        >
                            {category.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Matcha Content Era Begins -- Subsuming the menu grids down to the footer */}
            <div className="w-full bg-emerald-600 relative pt-16 pb-24 shadow-[0_-15px_40px_rgba(76,90,67,0.2)] min-h-screen">
                {/* Mobile-Safe Fixed Background: Using sticky inside an absolute container to bypass iOS Safari bg-fixed bugs */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="sticky top-0 w-full h-screen bg-[url('/tibetan-pattern.avif')] bg-[length:400px] bg-repeat opacity-[0.06] mix-blend-color-burn"></div>
                </div>

                <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-4">

                    {/* Level 2 Tabs (Sub Categories) */}
                    {/* <div className="flex flex-col items-center mb-12">
                <h2 className="text-3xl font-bold text-white mb-6 tracking-tight relative inline-block">
                    {activeMainCategory.name}
                    <span className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-emerald-600 rounded-full"></span>
                </h2>
                <div className="flex flex-wrap justify-center gap-3">
                    {activeMainCategory.subCategories.map(sub => (
                        <button
                            key={sub.id}
                            onClick={() => setActiveSubId(sub.id)}
                            className={`px-5 py-2 rounded-xl text-sm font-medium transition-all duration-300 border
                ${activeSubId === sub.id
                                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
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
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5 lg:gap-6">
                            {activeSubCategory.items.map(item => (
                                <div key={item.id} className="group relative bg-white rounded-[1.5rem] p-1.5 border border-emerald-500/30 hover:border-emerald-400 transition-all duration-500 shadow-xl shadow-emerald-900/20 hover:shadow-2xl hover:shadow-emerald-900/40 flex flex-col aspect-square overflow-hidden">
                                    
                                    {/* Top 55%: Image */}
                                    <div className="relative w-full h-[55%] rounded-[1rem] overflow-hidden mb-1.5 bg-stone-100 flex-shrink-0">
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        />
                                        {/* Tags over image */}
                                        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                                            {item.tags?.slice(0, 1).map(tag => (
                                                <span key={tag} className="px-2 py-0.5 text-[8px] lg:text-[10px] xl:text-[11px] font-black uppercase tracking-wider bg-white/95 backdrop-blur-md text-stone-600 rounded-full shadow-sm">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Bottom 45%: Content */}
                                    <div className="flex-grow flex flex-col justify-between px-1.5 pb-1">
                                        <div className="flex flex-col">
                                            <h3 className="text-[10px] sm:text-[11px] md:text-sm lg:text-base xl:text-lg font-bold text-gray-900 group-hover:text-amber-700 transition-colors leading-[1.2] line-clamp-1">
                                                {item.name}
                                            </h3>
                                            {item.description && (
                                                <p className="text-[8px] sm:text-[9px] md:text-[10px] lg:text-xs xl:text-sm text-stone-500 leading-tight mt-0.5 line-clamp-1 sm:line-clamp-2">
                                                    {item.description}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-between gap-1 w-full mt-auto pt-1">
                                            {item.variants && item.variants.length > 1 ? (
                                                <div className="relative flex-grow min-w-0">
                                                    <select
                                                        className="w-full bg-stone-50 text-[9px] md:text-[11px] lg:text-[13px] xl:text-sm font-bold text-amber-700 border border-stone-200 rounded-lg pl-2 pr-5 py-1 outline-none appearance-none cursor-pointer hover:bg-white hover:border-amber-300 transition-all shadow-sm"
                                                        value={selectedVariants[item.id] || item.variants[0].variant_id}
                                                        onChange={(e) => setSelectedVariants({ ...selectedVariants, [item.id]: e.target.value })}
                                                    >
                                                        {item.variants.map(v => (
                                                            <option key={v.variant_id} value={v.variant_id} className="text-gray-900">
                                                                {v.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <div className="absolute inset-y-0 right-0 flex items-center pr-1.5 pointer-events-none text-amber-600">
                                                        <svg className="w-3 h-3 md:w-4 md:h-4 lg:w-5 lg:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-amber-700 font-black text-[11px] md:text-xs lg:text-sm xl:text-base tracking-tight">
                                                    {item.price}
                                                </span>
                                            )}

                                            <button
                                                onClick={(e) => handleAddToCart(item, e)}
                                                className="shrink-0 bg-stone-50 hover:bg-amber-600 text-amber-700 hover:text-white border border-stone-200 hover:border-amber-500 w-7 h-7 md:w-9 md:h-9 lg:w-11 lg:h-11 xl:w-12 xl:h-12 rounded-full transition-all duration-300 font-bold flex items-center justify-center group-hover:shadow-[0_0_15px_rgba(217,119,6,0.3)] ml-auto"
                                            >
                                                <Plus className="w-4 h-4 lg:w-5 lg:h-5 xl:w-6 xl:h-6" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* List View */
                        <div className="flex flex-col gap-4 max-w-4xl mx-auto">
                            {activeSubCategory.items.map(item => (
                                <div key={item.id} className="group bg-white rounded-3xl p-3 border border-emerald-500/30 hover:border-emerald-400 transition-all duration-500 shadow-xl shadow-emerald-900/20 hover:shadow-2xl hover:shadow-emerald-900/40 flex flex-row gap-4 md:gap-6 items-center">
                                    <div className="relative w-28 h-28 md:w-36 md:h-36 rounded-2xl overflow-hidden shrink-0 bg-stone-100">
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                        />
                                        <div className="absolute top-2 left-2 flex flex-col gap-1">
                                            {item.tags?.slice(0, 1).map(tag => (
                                                <span key={tag} className="px-2 py-1 text-[8px] lg:text-[10px] xl:text-[11px] font-bold uppercase tracking-wider bg-white/95 backdrop-blur-md text-stone-600 rounded-full border border-stone-200 shadow-sm">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex-grow flex flex-col py-1 md:py-2 pr-2 md:pr-4">
                                        <div className="flex flex-col md:flex-row justify-start md:justify-between items-start mb-1 md:mb-2 gap-2 md:gap-4 w-full">
                                            <h3 className="text-xs md:text-base lg:text-xl xl:text-2xl font-bold text-gray-900 group-hover:text-amber-700 transition-colors w-full md:w-auto">{item.name}</h3>
                                            <span className="shrink-0 text-[10px] md:text-xs lg:text-sm xl:text-base font-bold text-amber-700 tabular-nums bg-white/95 backdrop-blur-md px-3 py-1 md:px-4 md:py-1.5 rounded-full border border-amber-100 shadow-sm inline-block">
                                                {item.variants && item.variants.length > 1
                                                    ? (item.variants.find(v => v.variant_id === (selectedVariants[item.id] || item.variants![0].variant_id)) || item.variants[0]).price
                                                    : item.price}
                                            </span>
                                        </div>
                                        <p className="text-stone-500 font-medium text-[11px] md:text-xs lg:text-sm xl:text-base leading-relaxed mb-3 line-clamp-2 md:line-clamp-3">{item.description}</p>

                                        {item.variants && item.variants.length > 1 && (
                                            <div className="mb-3 w-full relative mt-1">
                                                <select
                                                    className="w-full bg-stone-50 text-gray-900 text-[11px] md:text-xs lg:text-sm xl:text-base font-bold border border-stone-200 rounded-xl pl-3 pr-10 py-2 outline-none appearance-none cursor-pointer hover:bg-white hover:border-amber-300 transition-all shadow-sm"
                                                    value={selectedVariants[item.id] || item.variants[0].variant_id}
                                                    onChange={(e) => setSelectedVariants({ ...selectedVariants, [item.id]: e.target.value })}
                                                >
                                                    {item.variants.map(v => (
                                                        <option key={v.variant_id} value={v.variant_id} className="bg-white text-gray-900">
                                                            {v.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-amber-600">
                                                    <svg className="w-5 h-5 md:w-4 md:h-4 lg:w-5 lg:h-5 xl:w-6 xl:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex justify-between items-end mt-auto">
                                            <div className="hidden sm:flex gap-1.5">
                                                {item.tags?.slice(1).map(tag => (
                                                    <span key={tag} className="px-2 py-1 text-[9px] lg:text-[11px] xl:text-xs font-bold uppercase tracking-wider bg-stone-50 text-stone-600 rounded-full border border-stone-200">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                            <button
                                                onClick={(e) => handleAddToCart(item, e)}
                                                className="ml-auto w-10 h-10 md:w-auto md:px-5 md:py-2.5 lg:px-6 lg:py-3 xl:px-8 xl:py-4 bg-stone-50 hover:bg-amber-600 text-amber-700 hover:text-white border border-stone-200 hover:border-amber-500 rounded-full md:rounded-2xl transition-all duration-300 font-bold flex items-center justify-center gap-2 group-hover:shadow-[0_0_20px_rgba(217,119,6,0.2)]"
                                            >
                                                <Plus className="w-5 h-5 md:w-4 md:h-4 lg:w-5 lg:h-5" />
                                                <span className="hidden md:inline lg:text-lg">Add</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                </div> {/* End inner layout wrapper */}
            </div> {/* End amber background block */}

            {/* Global floating cart sits outside layout blocks entirely */}
            <button
                onClick={() => setIsCartOpen(true)}
                className="fixed top-4 right-4 z-50 p-3 bg-amber-600 text-white rounded-full shadow-lg shadow-amber-900/20 hover:bg-stone-900 transition-all duration-300 hover:scale-110 border-2 border-stone-100"
                aria-label="Open Cart"
            >
                <div className="relative">
                    <ConciergeBell size={24} />
                    {cartItems.length > 0 && (
                        <span className="absolute -top-2 -right-2 bg-stone-900 text-amber-500 hover:text-white transition-colors text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border border-stone-100">
                            {cartItems.reduce((a, b) => a + b.quantity, 0)}
                        </span>
                    )}
                </div>
            </button>

            {/* Cart Drawer Wrapper */}
            {isCartOpen && (
                <div className="fixed inset-0 z-[60]">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-stone-900/40 backdrop-blur-md transition-opacity"
                        onClick={() => setIsCartOpen(false)}
                    ></div>

                    {/* Drawer Panel */}
                    <div className="absolute top-0 right-0 h-full w-full max-w-md bg-stone-50 shadow-2xl border-l border-amber-200 transform transition-transform duration-300 overflow-y-auto">
                        <div className="p-6 h-full flex flex-col">
                            <div className="flex justify-between items-center mb-8 border-b border-stone-200 pb-4">
                                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                    <ConciergeBell className="text-amber-600" />
                                    Your Order
                                </h2>
                                <button
                                    onClick={() => setIsCartOpen(false)}
                                    className="p-2 text-stone-500 hover:text-red-600 hover:bg-stone-200 rounded-lg transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            {cartItems.length === 0 ? (
                                <div className="flex-grow flex flex-col items-center justify-center text-stone-400 text-center">
                                    <ConciergeBell size={48} className="mb-4 opacity-20 text-amber-600" />
                                    <p className="text-lg font-bold text-stone-600">Your cart is empty</p>
                                    <p className="text-sm mt-2">Start adding some delicious items!</p>
                                    <button
                                        onClick={() => setIsCartOpen(false)}
                                        className="mt-6 px-6 py-2 bg-amber-600 hover:bg-stone-900 text-white font-bold rounded-lg transition-colors shadow-md shadow-amber-600/30"
                                    >
                                        Browse Menu
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex-grow space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                                        {cartItems.map((cartItem) => (
                                            <div key={cartItem.item.id} className="flex gap-4 p-4 bg-white rounded-xl border border-stone-200 shadow-sm">
                                                <img
                                                    src={cartItem.item.image}
                                                    alt={cartItem.item.name}
                                                    className="w-20 h-20 object-cover rounded-lg shadow-sm border border-stone-100"
                                                />
                                                <div className="flex-grow flex flex-col justify-between">
                                                    <div className="flex justify-between items-start">
                                                        <h3 className="text-gray-900 font-bold line-clamp-1 pr-2">{cartItem.item.name}</h3>
                                                        <button
                                                            onClick={() => removeFromCart(cartItem.item.id)}
                                                            className="text-stone-400 hover:text-red-500 transition-colors p-1"
                                                            aria-label="Remove item"
                                                        >
                                                            <X size={18} />
                                                        </button>
                                                    </div>

                                                    <div className="flex items-center justify-between mt-2">
                                                        <p className="text-amber-600 font-black">{cartItem.item.price}</p>
                                                        <div className="flex items-center gap-3 bg-stone-50 rounded-lg p-1 border border-stone-200 shadow-sm">
                                                            <button
                                                                onClick={() => updateQuantity(cartItem.item.id, -1)}
                                                                className="p-1 text-amber-700 hover:text-white hover:bg-amber-600 rounded-md transition-colors"
                                                            >
                                                                <Minus size={16} />
                                                            </button>
                                                            <span className="text-gray-900 font-black w-4 text-center">{cartItem.quantity}</span>
                                                            <button
                                                                onClick={() => updateQuantity(cartItem.item.id, 1)}
                                                                className="p-1 text-amber-700 hover:text-white hover:bg-amber-600 rounded-md transition-colors"
                                                            >
                                                                <Plus size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-8 border-t border-stone-200 pt-6">
                                        <div className="flex justify-between items-center mb-6">
                                            <span className="text-stone-500 font-bold text-lg">Total</span>
                                            <span className="text-3xl font-black text-amber-600">CHF {cartTotal.toFixed(2)}</span>
                                        </div>

                                        {submitMessage && (
                                            <div className={`p-3 rounded-lg mb-4 text-center text-sm font-bold ${submitMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                                {submitMessage.text}
                                            </div>
                                        )}

                                        <button
                                            onClick={handleCheckout}
                                            disabled={isSubmitting || cartItems.length === 0}
                                            className="w-full py-4 bg-amber-600 hover:bg-stone-900 disabled:bg-stone-200 disabled:text-stone-500 disabled:transform-none disabled:shadow-none text-white text-lg font-black rounded-xl shadow-lg shadow-amber-600/40 hover:shadow-stone-900/30 transition-all transform hover:-translate-y-1 flex justify-center items-center"
                                        >
                                            {isSubmitting ? (
                                                <div className="w-6 h-6 border-2 border-stone-200 border-t-white rounded-full animate-spin"></div>
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

            {/* About Us Modal */}
            {isAboutOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-stone-900/40 backdrop-blur-md transition-opacity"
                        onClick={() => setIsAboutOpen(false)}
                    ></div>
                    
                    {/* Modal Content */}
                    <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-xl overflow-hidden transform transition-all">
                        {/* Header Banner */}
                        <div className="h-40 sm:h-52 w-full bg-[url('/hero-bg.jpg')] bg-cover bg-center relative bg-stone-200">
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/40 to-transparent"></div>
                            
                            <button
                                onClick={() => setIsAboutOpen(false)}
                                className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white text-white hover:text-gray-900 rounded-full backdrop-blur-md transition-colors shadow-lg"
                            >
                                <X size={20} />
                            </button>

                            <div className="absolute bottom-4 left-6 text-white max-w-[80%]">
                                <h2 className="text-2xl sm:text-3xl font-black mb-1 drop-shadow-lg leading-tight">Nomade Tibetan Cuisine</h2>
                                <p className="text-amber-400 font-bold tracking-widest uppercase text-[10px] sm:text-xs drop-shadow-md">Authentic Himalayan Flavors</p>
                            </div>
                        </div>
                        
                        <div className="p-6 sm:p-8 bg-stone-50">
                            <div className="space-y-4 text-stone-600 text-sm sm:text-base leading-relaxed font-medium">
                                <p>
                                    Welcome to Nomade! We bring you the authentic taste of the Himalayas right here. 
                                    Our dishes are crafted with traditional recipes passed down through generations, 
                                    using the freshest ingredients and bespoke spices.
                                </p>
                                <p>
                                    Whether you're craving comforting Momo (dumplings), hearty Thukpa, or rich curries, 
                                    our kitchen is dedicated to providing you with an unforgettable culinary journey. 
                                    Thank you for dining with us!
                                </p>
                            </div>

                            <div className="mt-8 pt-6 border-t border-stone-200 grid grid-cols-2 gap-6">
                                <div>
                                    <h4 className="font-black text-gray-900 text-[11px] sm:text-xs mb-1 uppercase tracking-wider">Location</h4>
                                    <p className="text-stone-500 text-xs sm:text-sm font-medium">1003 Lausanne<br/>Switzerland</p>
                                </div>
                                <div className="text-right sm:text-left">
                                    <h4 className="font-black text-gray-900 text-[11px] sm:text-xs mb-1 uppercase tracking-wider">Hours</h4>
                                    <p className="text-stone-500 text-xs sm:text-sm font-medium">Mon-Sat: 11:30 - 22:00<br/>Sun: Closed</p>
                                </div>
                                <div className="col-span-2">
                                    <h4 className="font-black text-gray-900 text-[11px] sm:text-xs mb-1 uppercase tracking-wider">Contact</h4>
                                    <p className="text-stone-500 text-xs sm:text-sm font-medium">info@nomadecuisine.ch<br/>+41 21 123 45 67</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
