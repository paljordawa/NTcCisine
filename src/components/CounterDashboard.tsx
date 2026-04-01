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
    tableNumber?: string | null;
}

export default function CounterDashboard() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [history, setHistory] = useState<Order[]>([]);
    const [activeTab, setActiveTab] = useState<'live' | 'history'>('live');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchOrders = async () => {
        try {
            const res = await fetch('/api/orders');
            if (res.ok) {
                const data = await res.json();
                setOrders(data.orders);
                setHistory(data.history || []);
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
        return <div className="text-emerald-900 font-bold text-center py-20 text-xl animate-pulse">Loading Web Orders...</div>;
    }

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
                <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
                    Nomade Cuisine <span className="text-emerald-600">Orders</span>
                </h1>

                <div className="flex bg-stone-100 p-1 rounded-lg border border-stone-200 shadow-sm">
                    <button
                        onClick={() => setActiveTab('live')}
                        className={`px-6 py-2 rounded-md font-bold transition-all flex items-center gap-2 ${activeTab === 'live' ? 'bg-white text-gray-900 shadow-sm border border-stone-200' : 'text-stone-500 hover:text-gray-900'}`}
                    >
                        Live
                        {orders.length > 0 && <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === 'live' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>{orders.length}</span>}
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`px-6 py-2 rounded-md font-bold transition-all ${activeTab === 'history' ? 'bg-white text-gray-900 shadow-sm border border-stone-200' : 'text-stone-500 hover:text-gray-900'}`}
                    >
                        History
                    </button>
                </div>

                <div className="flex items-center gap-2 text-stone-600 font-bold bg-white border border-stone-200 px-4 py-2 rounded-full shadow-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                    Live Sync
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-3 font-bold">
                    <AlertCircle />
                    {error}
                </div>
            )}

            {activeTab === 'live' && orders.length === 0 && (
                <div className="flex flex-col items-center justify-center py-32 bg-white rounded-2xl border-2 border-emerald-100 border-dashed shadow-sm">
                    <Clock size={64} className="text-emerald-200 mb-4" />
                    <p className="text-2xl text-emerald-900 font-bold">No pending orders</p>
                    <p className="text-emerald-800/60 mt-2 font-medium">New web orders will appear here automatically.</p>
                </div>
            )}

            {activeTab === 'history' && history.length === 0 && (
                <div className="flex flex-col items-center justify-center py-32 bg-white rounded-2xl border-2 border-emerald-100 border-dashed shadow-sm">
                    <Check size={64} className="text-emerald-200 mb-4" />
                    <p className="text-2xl text-emerald-900 font-bold">No history</p>
                    <p className="text-emerald-800/60 mt-2 font-medium">Processed orders will appear here.</p>
                </div>
            )}

            {((activeTab === 'live' && orders.length > 0) || (activeTab === 'history' && history.length > 0)) && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(activeTab === 'live' ? orders : history).map((order: any) => {
                        const items: CartItem[] = typeof order.cartItems === 'string' ? JSON.parse(order.cartItems) : order.cartItems;
                        const orderDate = new Date(order.createdAt);
                        const timeString = orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                        return (
                            <div key={order.id} className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-xl shadow-stone-900/5 flex flex-col transform transition-transform duration-300 hover:-translate-y-1">
                                <div className="bg-gradient-to-r from-stone-800 to-stone-700 p-4 text-white flex justify-between items-center shadow-sm">
                                    <div className="flex items-center gap-2 font-bold text-lg">
                                        <Clock size={18} />
                                        {timeString}
                                        {order.tableNumber && (
                                            <span className="ml-2 bg-white/20 px-2.5 py-0.5 rounded-full text-sm flex items-center shadow-inner text-amber-100">
                                                Table {order.tableNumber}
                                            </span>
                                        )}
                                    </div>
                                    <div className="font-mono bg-black/20 px-2 py-1 rounded text-sm tracking-wider text-amber-100">
                                        # {order.id.slice(0, 6).toUpperCase()}
                                    </div>
                                </div>

                                <div className="p-6 flex-grow">
                                    <div className="space-y-3 mb-6 min-h-[100px]">
                                        {items.length === 0 && (
                                            <p className="text-red-500 font-bold text-sm italic text-center py-4 bg-red-50 rounded-lg">All items removed</p>
                                        )}
                                        {items.map((cartItem, idx) => (
                                            <div key={idx} className="flex justify-between items-start border-b border-stone-100 pb-2 last:border-0 last:pb-0 group">
                                                <div className="flex items-start gap-3 flex-grow">
                                                    <span className="bg-stone-100 border border-stone-200 text-stone-700 font-bold px-2 py-0.5 rounded text-sm w-7 text-center shrink-0">
                                                        {cartItem.quantity}
                                                    </span>
                                                    <span className="text-gray-900 font-bold text-lg leading-tight pt-0.5">{cartItem.item.name}</span>
                                                </div>
                                                {activeTab === 'live' && (
                                                    <button
                                                        onClick={() => handleRemoveItem(order.id, idx)}
                                                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all p-1.5 bg-red-50/50 hover:bg-red-100 rounded-lg ml-2"
                                                        title="Mark unavailable & remove"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex justify-between items-end border-t border-stone-100 pt-4 mt-auto">
                                        <span className="text-stone-500 uppercase tracking-wider text-sm font-bold">Total</span>
                                        <span className={`text-2xl font-black ${items.length === 0 ? 'text-stone-300 line-through' : 'text-amber-600'}`}>
                                            CHF {order.cartTotal.toFixed(2)}
                                        </span>
                                    </div>
                                </div>

                                <div className={`p-4 bg-stone-50 flex gap-3 border-t border-stone-200 ${activeTab === 'history' ? 'justify-between items-center' : ''}`}>
                                    {activeTab === 'live' ? (
                                        <>
                                            <button
                                                onClick={() => handleAction(order.id, 'reject')}
                                                className="flex-1 py-3 px-4 bg-white hover:bg-red-50 text-stone-600 hover:text-red-600 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 border border-stone-200 hover:border-red-200 shadow-sm"
                                            >
                                                <X size={20} />
                                                Reject
                                            </button>
                                            <button
                                                onClick={() => handleAction(order.id, 'accept')}
                                                className={`flex-[2] py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${items.length === 0 ? 'bg-stone-100 text-stone-400 cursor-not-allowed border border-stone-200' : 'bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-900/20 transform hover:scale-105'}`}
                                            >
                                                <Check size={20} />
                                                {items.length === 0 ? 'Empty Ticket' : 'Accept & POS'}
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-stone-500 text-sm font-bold pr-2 border-r border-stone-200 uppercase tracking-widest">
                                                Status
                                            </span>
                                            <div className="flex-1 flex justify-end">
                                                {order.status === 'accepted' ? (
                                                    <span className="flex items-center gap-2 px-4 py-1.5 bg-green-50 text-green-700 border border-green-200 font-bold rounded-lg shadow-sm">
                                                        <Check size={16} /> Accepted
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-2 px-4 py-1.5 bg-red-50 text-red-700 border border-red-200 font-bold rounded-lg shadow-sm">
                                                        <X size={16} /> Rejected
                                                    </span>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
