import React, { useState, useEffect } from 'react';
import { Check, X, Clock, AlertCircle, Trash2 } from 'lucide-react';

interface CartItem {
    item: { name: string; price: string };
    quantity: number;
}

interface Order {
    id: string;
    cartItems: string;
    cartTotal: number;
    status: string;
    createdAt: string;
}

export default function CounterDashboard() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchOrders = async () => {
        try {
            const res = await fetch('/api/orders');
            if (res.ok) {
                const data = await res.json();
                setOrders(data.orders);
            } else {
                setError('Failed to load orders');
            }
        } catch (e) {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    // Poll every 5 seconds
    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleRemoveItem = (orderId: string, itemIdx: number) => {
        setOrders(prev => prev.map(order => {
            if (order.id !== orderId) return order;
            
            const currentItems: CartItem[] = typeof order.cartItems === 'string' 
                ? JSON.parse(order.cartItems) 
                : order.cartItems;
            
            const newItems = currentItems.filter((_, idx) => idx !== itemIdx);
            
            // Calculate new total
            const newTotal = newItems.reduce((sum, cartItem) => {
                const priceMatch = String(cartItem.item.price).replace(/[^0-9.]/g, '');
                return sum + (parseFloat(priceMatch) || 0) * cartItem.quantity;
            }, 0);

            // Save immediately to DB to prevent 5s polling from overwriting edits
            fetch('/api/orders', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId,
                    cartItems: JSON.stringify(newItems),
                    cartTotal: newTotal
                })
            }).catch(e => console.error("Failed to sync edit", e));

            return {
                ...order,
                cartItems: JSON.stringify(newItems),
                cartTotal: newTotal
            };
        }));
    };

    const handleAction = async (orderId: string, action: 'accept' | 'reject') => {
        const order = orders.find(o => o.id === orderId);
        if (!order) return;

        // If the ticket has 0 items and they try to accept, auto-reject it instead
        const itemsList = typeof order.cartItems === 'string' ? JSON.parse(order.cartItems) : order.cartItems;
        if (action === 'accept' && itemsList.length === 0) {
            action = 'reject';
        }

        try {
            const res = await fetch('/api/fulfill', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    orderId, 
                    action,
                    modifiedCartItems: order.cartItems,
                    modifiedCartTotal: order.cartTotal
                })
            });

            if (res.ok) {
                // Immediately remove from UI
                setOrders(prev => prev.filter(o => o.id !== orderId));
            } else {
                alert(`Failed to ${action} order!`);
            }
        } catch (e) {
            alert('Error communicating with server');
        }
    };

    if (loading && orders.length === 0) {
        return <div className="text-white text-center py-20 text-xl animate-pulse">Loading Web Orders...</div>;
    }

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-10">
                <h1 className="text-4xl font-bold text-white tracking-tight">
                    Loyverse <span className="text-amber-500">Live Orders</span>
                </h1>
                <div className="flex items-center gap-2 text-gray-400 bg-gray-900 border border-gray-800 px-4 py-2 rounded-full shadow-lg">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
                    Live Sync active
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-900/50 border border-red-500 text-red-200 rounded-lg flex items-center gap-3">
                    <AlertCircle />
                    {error}
                </div>
            )}

            {orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 bg-gray-900/50 rounded-2xl border border-gray-800 border-dashed">
                    <Clock size={64} className="text-gray-600 mb-4" />
                    <p className="text-2xl text-gray-400 font-medium">No pending orders</p>
                    <p className="text-gray-500 mt-2">New web orders will appear here automatically.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {orders.map((order: any) => {
                        const items: CartItem[] = typeof order.cartItems === 'string' ? JSON.parse(order.cartItems) : order.cartItems;
                        const orderDate = new Date(order.createdAt);
                        const timeString = orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        
                        return (
                            <div key={order.id} className="bg-gray-900 border border-amber-500/30 rounded-2xl overflow-hidden shadow-2xl flex flex-col transform transition-transform duration-300 hover:-translate-y-1">
                                <div className="bg-gradient-to-r from-amber-600 to-amber-500 p-4 text-white flex justify-between items-center">
                                    <div className="flex items-center gap-2 font-bold text-lg">
                                        <Clock size={18} />
                                        {timeString}
                                    </div>
                                    <div className="font-mono bg-black/20 px-2 py-1 rounded text-sm tracking-wider">
                                        # {order.id.slice(0, 6).toUpperCase()}
                                    </div>
                                </div>
                                
                                <div className="p-6 flex-grow">
                                    <div className="space-y-3 mb-6 min-h-[100px]">
                                        {items.length === 0 && (
                                            <p className="text-red-400 text-sm italic text-center py-4">All items removed</p>
                                        )}
                                        {items.map((cartItem, idx) => (
                                            <div key={idx} className="flex justify-between items-start border-b border-gray-800 pb-2 last:border-0 last:pb-0 group">
                                                <div className="flex items-start gap-3 flex-grow">
                                                    <span className="bg-gray-800 text-gray-300 font-bold px-2 py-0.5 rounded text-sm w-7 text-center shrink-0">
                                                        {cartItem.quantity}
                                                    </span>
                                                    <span className="text-gray-200 text-lg leading-tight pt-0.5">{cartItem.item.name}</span>
                                                </div>
                                                <button 
                                                    onClick={() => handleRemoveItem(order.id, idx)} 
                                                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-500 transition-all p-1.5 bg-gray-800 hover:bg-red-900/30 rounded-lg ml-2" 
                                                    title="Mark unavailable & remove"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <div className="flex justify-between items-end border-t border-gray-800 pt-4 mt-auto">
                                        <span className="text-gray-400 uppercase tracking-wider text-sm font-bold">Total</span>
                                        <span className={`text-2xl font-bold ${items.length === 0 ? 'text-gray-600 line-through' : 'text-amber-500'}`}>
                                            ${order.cartTotal.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="p-4 bg-gray-800/50 flex gap-3 border-t border-gray-800">
                                    <button 
                                        onClick={() => handleAction(order.id, 'reject')}
                                        className="flex-1 py-3 px-4 bg-gray-800 hover:bg-red-600/90 text-gray-300 hover:text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 border border-gray-700 hover:border-red-500"
                                    >
                                        <X size={20} />
                                        Reject
                                    </button>
                                    <button 
                                        onClick={() => handleAction(order.id, 'accept')}
                                        className={`flex-[2] py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${items.length === 0 ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20 transform hover:scale-105'}`}
                                    >
                                        <Check size={20} />
                                        {items.length === 0 ? 'Empty Ticket' : 'Accept & POS'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
