import React, { useState, useEffect, useRef } from 'react';
import { Check, X, Clock, AlertCircle, Trash2, Lock, KeyRound, Printer } from 'lucide-react';

const LiveTimer = ({ createdAt }: { createdAt: string }) => {
    const [elapsed, setElapsed] = useState('');
    const [isOverdue, setIsOverdue] = useState(false);

    useEffect(() => {
        const updateTimer = () => {
            const start = new Date(createdAt).getTime();
            const now = new Date().getTime();
            const diff = now - start;

            if (diff < 0) return setElapsed('Just now');

            const minutes = Math.floor(diff / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            
            setIsOverdue(minutes >= 10);
            setElapsed(`${minutes}m ${seconds}s`);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [createdAt]);

    return (
        <div className={`flex flex-col items-end print:hidden`}>
            <span className="text-[9px] uppercase font-black text-stone-400 tracking-widest mb-1">Elapsed</span>
            <span className={`text-sm font-black px-2.5 py-1 rounded-lg tracking-wide shadow-sm border ${isOverdue ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-white text-stone-600 border-stone-200'}`}>
                {elapsed}
            </span>
        </div>
    );
};

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
    const [isAuthed, setIsAuthed] = useState(false);
    const [pinCode, setPinCode] = useState('');
    const [loginError, setLoginError] = useState(false);

    const [orders, setOrders] = useState<Order[]>([]);
    const [history, setHistory] = useState<Order[]>([]);
    const [activeTab, setActiveTab] = useState<'live' | 'history'>('live');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [printingOrderId, setPrintingOrderId] = useState<string | null>(null);
    const [isPaused, setIsPaused] = useState<boolean>(false);
    const prevOrdersCount = useRef(0);

    const playDing = () => {
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const strikeBell = (startTime: number) => {
                const frequencies = [1200, 1600, 2400, 3200];
                const masterGain = ctx.createGain();
                masterGain.connect(ctx.destination);
                
                frequencies.forEach(freq => {
                    const osc = ctx.createOscillator();
                    const partialGain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = freq;
                    osc.connect(partialGain);
                    partialGain.connect(masterGain);
                    
                    partialGain.gain.setValueAtTime(0, startTime);
                    partialGain.gain.linearRampToValueAtTime(0.4 / frequencies.length, startTime + 0.02);
                    partialGain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.2);
                    
                    osc.start(startTime);
                    osc.stop(startTime + 1.2);
                });
            };
            strikeBell(ctx.currentTime);
            strikeBell(ctx.currentTime + 0.15);
        } catch(e) { } // Ignore if browser blocks audio
    };

    useEffect(() => {
        // Only ding if we already loaded the initial list to avoid dinging on page refresh
        if (!loading && orders.length > prevOrdersCount.current) {
            playDing();
        }
        prevOrdersCount.current = orders.length;
    }, [orders.length, loading]);

    const handlePinSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (pinCode === '8888') {
            setIsAuthed(true);
            setLoginError(false);
            setPinCode('');
        } else {
            setLoginError(true);
            setPinCode('');
        }
    };

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

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings');
            if (res.ok) {
                const data = await res.json();
                setIsPaused(data.isOrderingPaused);
            }
        } catch(e) {}
    };

    const togglePause = async () => {
        const newState = !isPaused;
        setIsPaused(newState);
        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isOrderingPaused: newState })
            });
        } catch(e) {
            setIsPaused(!newState); // revert
        }
    };

    // Poll every 5 seconds
    useEffect(() => {
        fetchOrders();
        fetchSettings();
        const interval = setInterval(() => {
            fetchOrders();
            fetchSettings();
        }, 5000);
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

    const handleAction = async (orderId: string, action: 'accept' | 'reject' | 'ready') => {
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
                if (action === 'accept') {
                    handleSilentPrint(order, () => {
                        setOrders(prev => prev.filter(o => o.id !== orderId));
                    });
                } else {
                    // Immediately remove from UI
                    setOrders(prev => prev.filter(o => o.id !== orderId));
                }
            } else {
                alert(`Failed to ${action} order!`);
            }
        } catch (e) {
            alert('Error communicating with server');
        }
    };

    const escapeXML = (str: string) => str.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });

    const handleSilentPrint = async (order: Order, onPrintDone?: () => void) => {
        try {
            const items = typeof order.cartItems === 'string' ? JSON.parse(order.cartItems) : order.cartItems;
            
            let xmlContent = `<epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">`;
            xmlContent += `<text align="center" smooth="true" dw="true" dh="true">NEW KITCHEN ORDER&#10;</text>`;
            xmlContent += `<text>------------------------------------------&#10;</text>`;
            xmlContent += `<text align="left" dw="true" dh="true">Order #${order.id.slice(0, 6).toUpperCase()}</text>`;
            if (order.tableNumber) {
                xmlContent += `<text dw="true" dh="true"> (TABLE ${order.tableNumber})</text>`;
            }
            xmlContent += `<text>&#10;------------------------------------------&#10;</text>`;
            
            items.forEach((item: any) => {
                xmlContent += `<text dw="true" dh="true">${item.quantity}x ${escapeXML(item.item.name)}&#10;</text>`;
            });
            
            xmlContent += `<text>------------------------------------------&#10;</text>`;
            xmlContent += `<text align="right">Total: CHF ${order.cartTotal.toFixed(2)}&#10;</text>`;
            xmlContent += `<feed unit="30"/>`;
            xmlContent += `<cut type="feed"/>`; // Full cut
            xmlContent += `</epos-print>`;

            const soapEnvelope = `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body>${xmlContent}</s:Body></s:Envelope>`;
            
            const printRes = await fetch(`http://192.168.1.106/cgi-bin/epos/dispacher.cgi?devid=local_printer&timeout=5000`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/xml; charset=utf-8'
                },
                body: soapEnvelope
            });

            if (!printRes.ok) {
                 console.error("Printer rejected the job:", printRes.statusText);
                 alert("Kitchen Printer Error! Check printer power/paper.");
            }
        } catch (e) {
            console.error("Print connection error:", e);
            alert("Could not connect to Kitchen Printer at 192.168.1.106.\n\nIMPORTANT: Please ensure 'Insecure Content' is set to 'Allow' in your Chrome Site Settings for this to work over HTTPS.");
        } finally {
            if (onPrintDone) onPrintDone();
        }
    };

    if (!isAuthed) {
        return (
            <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4 fixed inset-0 z-50">
                <div className="max-w-md w-full bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-emerald-500/10">
                    <div className="bg-emerald-600 p-8 text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-8 bg-white/20" style={{ maskImage: "url('/frame.svg')", maskSize: "auto 100%", maskRepeat: "repeat-x", WebkitMaskImage: "url('/frame.svg')", WebkitMaskSize: "auto 100%", WebkitMaskRepeat: "repeat-x" }}></div>
                        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-md mt-6 shadow-inner">
                            <Lock className="w-10 h-10 text-white" />
                        </div>
                        <h2 className="text-3xl font-black text-white drop-shadow-sm">Cashier Login</h2>
                        <p className="text-emerald-100/90 text-sm mt-2 font-medium">Enter your staff PIN to access orders</p>
                    </div>

                    <form onSubmit={handlePinSubmit} className="p-8 space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-stone-500 uppercase tracking-widest mb-3">Secure PIN Code</label>
                            <div className="relative">
                                <KeyRound className="absolute left-6 top-1/2 transform -translate-y-1/2 text-stone-400 w-6 h-6" />
                                <input
                                    type="password"
                                    pattern="[0-9]*"
                                    inputMode="numeric"
                                    value={pinCode}
                                    onChange={(e) => setPinCode(e.target.value)}
                                    maxLength={4}
                                    placeholder="••••"
                                    className={`w-full pl-16 pr-6 py-5 text-center text-3xl font-black tracking-[0.5em] bg-stone-50 border-2 rounded-2xl outline-none transition-all ${loginError ? 'border-red-400 text-red-600 focus:border-red-500 focus:ring-4 focus:ring-red-100 placeholder-red-300 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'border-stone-200 text-emerald-900 focus:border-amber-500 focus:ring-4 focus:ring-amber-200/50 placeholder-stone-300'}`}
                                    autoFocus
                                />
                            </div>
                            {loginError && (
                                <p className="text-red-500 text-sm font-bold text-center mt-4 animate-pulse">Incorrect PIN. Please try again.</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="w-full py-5 text-lg bg-amber-600 hover:bg-emerald-600 text-white font-black rounded-2xl shadow-lg shadow-amber-600/40 hover:shadow-emerald-600/40 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            <Lock size={20} />
                            Unlock Dashboard
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    if (loading && orders.length === 0) {
        return <div className="text-emerald-900 font-bold text-center py-20 text-xl animate-pulse">Loading Web Orders...</div>;
    }

    return (
        <div className={`max-w-6xl mx-auto ${printingOrderId ? 'bg-white print:bg-white print:p-0' : ''}`}>
            {/* Header section (hidden during print) */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6 print:hidden">
                <div className="flex items-center gap-4 group cursor-pointer transition-transform hover:scale-105">
                     <img src="/nomade-logo-final-svg.svg" alt="Nomade Logo" className="w-16 sm:w-20 drop-shadow-md" />
                     <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
                         Counter <span className="text-emerald-600 block sm:inline">Dashboard</span>
                     </h1>
                </div>

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

                <div className="flex items-center gap-4">
                    <button 
                        onClick={togglePause}
                        className={`flex items-center gap-2 px-4 py-2 font-bold text-sm tracking-wide rounded-full shadow-sm transition-all border ${isPaused ? 'bg-red-500 text-white border-red-600 hover:bg-red-600' : 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200'}`}
                    >
                        {isPaused ? <X size={16} strokeWidth={3} /> : <Check size={16} strokeWidth={3} />}
                        {isPaused ? 'Online Disabled' : 'Online Orders Live'}
                    </button>
                    
                    <div className="hidden sm:flex items-center gap-2 text-stone-600 font-bold bg-white border border-stone-200 px-4 py-2 rounded-full shadow-sm">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                        Sync
                    </div>
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-3 font-bold print:hidden">
                    <AlertCircle />
                    {error}
                </div>
            )}

            {/* Daily History Summary & Analytics */}
            {activeTab === 'history' && history.length > 0 && (
                <div className="mb-8 flex flex-col gap-6 print:hidden">
                    <div className="flex flex-wrap gap-4 text-sm font-bold bg-white p-4 border border-stone-200 rounded-xl max-w-fit shadow-sm">
                        <div className="text-emerald-700 flex flex-col items-start pr-4">
                            <span className="text-[10px] uppercase tracking-widest text-stone-400 mb-1">Total Sales Today</span>
                            <span className="text-2xl font-black">CHF {history.filter(o => o.status === 'ready' || o.status === 'accepted').reduce((sum, o) => sum + o.cartTotal, 0).toFixed(2)}</span>
                        </div>
                        <div className="border-l border-stone-200 pl-4 text-emerald-600 flex flex-col justify-center">
                            <span className="text-lg">{history.filter(o => o.status === 'ready' || o.status === 'accepted').length}</span>
                            <span className="text-[10px] uppercase text-stone-400">Completed</span>
                        </div>
                        <div className="border-l border-stone-200 pl-4 text-red-500 flex flex-col justify-center">
                            <span className="text-lg">{history.filter(o => o.status === 'rejected').length}</span>
                            <span className="text-[10px] uppercase text-stone-400">Rejected</span>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm max-w-4xl">
                        <h3 className="font-black text-stone-700 mb-4 tracking-tight flex items-center gap-2">
                            <div className="w-2 h-6 bg-emerald-500 rounded-full"></div> Hourly Volume
                        </h3>
                        <div className="h-40 flex items-end gap-2 sm:gap-4 overflow-x-auto pb-2">
                            {(() => {
                                const hours = new Array(24).fill(0);
                                history.filter(o => o.status === 'ready' || o.status === 'accepted').forEach(order => {
                                    const h = new Date(order.createdAt).getHours();
                                    hours[h] += 1;
                                });
                                // Find valid range (e.g. 10 to 22)
                                const activeHours = hours.map((count, hr) => ({ hr, count })).filter(h => h.count > 0);
                                if (activeHours.length === 0) return <div className="text-stone-400 text-sm">No data yet</div>;
                                const minHour = Math.max(0, activeHours[0].hr - 1);
                                const maxHour = Math.min(23, activeHours[activeHours.length - 1].hr + 1);
                                const displayHours = hours.slice(minHour, maxHour + 1);
                                const maxCount = Math.max(...displayHours, 1);

                                return displayHours.map((count, idx) => (
                                    <div key={idx} className="flex flex-col items-center flex-1 min-w-[30px]">
                                        <div className="w-full flex justify-center mb-2 h-full relative" style={{ minHeight: '100px' }}>
                                            <div 
                                                className="absolute bottom-0 w-full sm:w-8 bg-emerald-200 rounded-t-lg transition-all duration-700"
                                                style={{ height: `${(count / maxCount) * 100}%` }}
                                            >
                                                {count > 0 && (
                                                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-bold text-emerald-800">
                                                        {count}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <span className="text-[10px] text-stone-400 font-bold uppercase">{minHour + idx}:00</span>
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>
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

            {activeTab === 'live' && orders.length > 0 && (
                <div className="flex flex-col gap-6">
                    {/* Kitchen Aggregate View / Prep List */}
                    <div className="bg-stone-800 p-4 rounded-2xl shadow-md text-white print:hidden">
                        <div className="flex items-center justify-between mb-3 border-b border-stone-700 pb-2">
                            <span className="text-xs uppercase tracking-widest font-bold text-stone-400 flex items-center gap-2">
                                <Printer size={14} className="text-stone-500" /> Kitchen Prep List
                            </span>
                        </div>
                        <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-thin">
                            {(() => {
                                const itemsToCook = orders.flatMap((o: any) => o.status === 'pending' || o.status === 'accepted' ? (typeof o.cartItems === 'string' ? JSON.parse(o.cartItems) : o.cartItems) : []);
                                const prepCounts = itemsToCook.reduce((acc: any, item: CartItem) => {
                                    const name = item.item.name;
                                    acc[name] = (acc[name] || 0) + item.quantity;
                                    return acc;
                                }, {});
                                const entries = Object.entries(prepCounts).sort((a: any, b: any) => b[1] - a[1]);
                                
                                if (entries.length === 0) return <span className="text-sm text-stone-500">Nothing to prep.</span>;
                                
                                return entries.map(([name, qty]) => (
                                    <div key={name} className="flex items-center gap-2 bg-stone-700 py-1.5 px-3 rounded-lg whitespace-nowrap">
                                        <span className="bg-amber-500 text-white font-black text-xs w-6 h-6 rounded flex items-center justify-center">{qty as number}</span>
                                        <span className="text-sm font-medium pr-1">{name}</span>
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {orders.map((order: any) => {
                            const items: CartItem[] = typeof order.cartItems === 'string' ? JSON.parse(order.cartItems) : order.cartItems;
                            const orderDate = new Date(order.createdAt);
                            const timeString = orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            const isPrintingThis = printingOrderId === order.id;
                            const isCooking = order.status === 'accepted';

                        // Give print styling only to the active document being printed
                        return (
                            <div key={order.id} className={`bg-white font-sans border-2 border-emerald-600/10 rounded-[2rem] p-5 lg:p-6 shadow-xl shadow-stone-900/5 flex flex-col transform transition-transform duration-300 hover:-translate-y-1 block relative ${printingOrderId ? (isPrintingThis ? 'print:block print:shadow-none print:border-black print:text-black print:absolute print:inset-0 print:w-[80mm] print:h-max print:overflow-visible print:p-2' : 'print:hidden hidden') : 'overflow-hidden'}`}>
                                
                                {/* Background glow accent */}
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none print:hidden"></div>

                                {/* Custom Header */}
                                <div className="flex justify-between items-start border-b border-stone-100 pb-4 print:pb-2 print:border-black print:border-b-2 print:mb-2">
                                    <div className="flex flex-col gap-2 relative z-10 print:gap-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`${isCooking ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'} border shadow-sm font-black text-xs px-2.5 py-1 rounded-lg uppercase tracking-widest print:bg-transparent print:border-0 print:text-black print:p-0 print:text-lg`}>
                                                #{order.id.slice(0, 6).toUpperCase()} {isCooking && ' (COOKING)'}
                                            </span>
                                            {order.tableNumber && (
                                                <span className="bg-blue-50 text-blue-800 border border-blue-200 shadow-sm font-black text-xs px-2.5 py-1 rounded-lg uppercase tracking-widest print:bg-transparent print:border-0 print:text-black print:p-0 print:text-sm">
                                                    Table {order.tableNumber}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-stone-500 font-bold text-sm bg-stone-50 print:bg-transparent print:font-black print:text-black print:p-0 w-max px-2 py-1 rounded-md">
                                            <Clock size={14} className="text-stone-400 print:hidden"/>
                                            {timeString}
                                        </div>
                                    </div>
                                    <div className="relative z-10">
                                        {!printingOrderId && <LiveTimer createdAt={order.createdAt} />}
                                    </div>
                                </div>

                                {/* Items Container */}
                                <div className="py-5 flex-grow flex flex-col gap-4 relative z-10 print:py-2 print:gap-2">
                                    {items.length === 0 && (
                                        <div className="bg-red-50 rounded-xl p-4 text-center border-dashed border-2 border-red-200 print:border-black print:text-black">
                                            <p className="text-red-500 font-bold text-sm print:text-black">All items removed</p>
                                        </div>
                                    )}
                                    
                                    {items.map((cartItem, idx) => (
                                        <div key={idx} className="flex justify-between items-start group print:border-b print:border-dotted print:border-black print:pb-2">
                                            <div className="flex gap-3.5 items-start flex-grow print:gap-2">
                                                <div className="bg-stone-100 border border-stone-200 shadow-inner text-stone-600 font-black text-xs w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center shrink-0 print:border-black print:border-2 print:text-black print:bg-white print:shadow-none print:w-6 print:h-6 print:mt-1">
                                                    {cartItem.quantity}
                                                </div>
                                                <span className="font-bold text-gray-900 text-base md:text-lg leading-tight mt-0.5 print:text-black print:text-sm print:leading-snug">
                                                    {cartItem.item.name}
                                                </span>
                                            </div>
                                            {!printingOrderId && (
                                                <button
                                                    onClick={() => handleRemoveItem(order.id, idx)}
                                                    className="opacity-0 group-hover:opacity-100 text-red-300 hover:text-red-600 transition-all p-1.5 hover:bg-red-50 rounded-lg shrink-0 ml-2"
                                                    title="Remove item"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Total and Actions */}
                                <div className="mt-auto flex flex-col border-t border-stone-100 pt-5 print:border-black print:border-t-2 print:pt-2 relative z-10">
                                    <div className="flex justify-between items-center mb-5 print:mb-2">
                                        <span className="text-stone-400 print:text-black font-black uppercase tracking-widest text-xs print:text-[10px]">Total Amount</span>
                                        <span className={`text-2xl md:text-3xl font-black ${items.length === 0 ? 'text-stone-300 line-through print:text-black' : 'text-amber-600 print:text-black print:text-xl'}`}>
                                            CHF {order.cartTotal.toFixed(2)}
                                        </span>
                                    </div>
                                    
                                    {/* Action Buttons Row */}
                                    <div className="flex gap-3 print:hidden w-full">
                                        {isCooking ? (
                                            <button
                                                onClick={() => handleAction(order.id, 'ready')}
                                                className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-2xl py-3 md:py-4 flex items-center justify-center font-black tracking-wider transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 active:scale-95 gap-2"
                                            >
                                                <Check size={18} strokeWidth={3} /> MARK READY
                                            </button>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => handleAction(order.id, 'reject')}
                                                    className="flex-1 bg-white border-2 border-stone-200 text-stone-500 hover:border-red-400 hover:text-red-500 hover:bg-red-50 rounded-2xl py-3 md:py-4 flex items-center justify-center font-bold tracking-wide transition-all shadow-sm gap-1.5"
                                                    title="Reject Order"
                                                >
                                                    <X size={18} strokeWidth={2.5} /> <span className="text-[10px] md:text-xs">REJECT</span>
                                                </button>
                                                
                                                <button
                                                    onClick={() => handleAction(order.id, 'accept')}
                                                    disabled={items.length === 0}
                                                    className={`flex-1 rounded-2xl py-3 md:py-4 flex items-center justify-center font-black tracking-wider transition-all gap-1.5 ${
                                                        items.length === 0 
                                                        ? 'bg-stone-100 text-stone-400 cursor-not-allowed border-2 border-stone-200' 
                                                        : 'bg-amber-500 hover:bg-emerald-500 text-white shadow-lg shadow-amber-500/30 hover:shadow-emerald-500/40 active:scale-95'
                                                    }`}
                                                >
                                                    <Check size={18} strokeWidth={3} />
                                                    <span className="text-[10px] md:text-xs uppercase break-words text-center px-1">
                                                        {items.length === 0 ? 'EMPTY' : 'ACCEPT & POS'}
                                                    </span>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                        })}
                    </div>
                </div>
            )}

            {activeTab === 'history' && history.length > 0 && (
                <div className="flex flex-col gap-4">
                    {history.map((order: any) => {
                        const items: CartItem[] = typeof order.cartItems === 'string' ? JSON.parse(order.cartItems) : order.cartItems;
                        const orderDate = new Date(order.createdAt);
                        const timeString = orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                        return (
                            <div key={order.id} className="bg-white border border-stone-200 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex flex-row items-center gap-8 min-w-[250px] shrink-0">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mb-1">Time</span>
                                        <div className="flex items-center gap-1.5 font-black text-gray-900 text-xl tracking-tight">
                                            <Clock size={18} className="text-emerald-600" />
                                            {timeString}
                                        </div>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mb-1">Order #</span>
                                        <span className="font-mono text-base tracking-wider bg-stone-100 px-3 py-1 rounded-lg text-stone-600 font-bold border border-stone-200">
                                            {order.id.slice(0, 6).toUpperCase()}
                                        </span>
                                    </div>
                                    {order.tableNumber && (
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mb-1">Tab</span>
                                            <span className="font-black text-amber-600 text-lg">#{order.tableNumber}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex-grow flex flex-row flex-wrap gap-2 lg:border-l lg:border-stone-100 lg:pl-6 py-2 lg:py-0">
                                    {items.map((cartItem, idx) => (
                                        <span key={idx} className="bg-stone-50 border border-stone-200 text-stone-700 text-xs px-3 py-1.5 rounded-lg flex items-center gap-2 font-bold shadow-sm">
                                            <span className="font-black bg-stone-200 text-stone-500 w-5 h-5 flex items-center justify-center rounded text-[10px]">{cartItem.quantity}</span>
                                            {cartItem.item.name}
                                        </span>
                                    ))}
                                </div>

                                <div className="flex flex-row items-center justify-between lg:justify-end gap-8 pt-4 lg:pt-0 border-t border-stone-100 lg:border-t-0 w-full lg:w-auto shrink-0 lg:pl-6 lg:border-l">
                                    <div className="flex flex-col lg:items-end">
                                        <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mb-1">Total</span>
                                        <span className="text-2xl font-black text-emerald-700">CHF {order.cartTotal.toFixed(2)}</span>
                                    </div>
                                    <div className="flex flex-col lg:items-end">
                                        <span className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mb-1">Status</span>
                                        {order.status === 'accepted' ? (
                                            <span className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold rounded-xl text-sm shadow-sm">
                                                <Check size={16} /> Accepted
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 border border-red-200 font-bold rounded-xl text-sm shadow-sm">
                                                <X size={16} /> Rejected
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
