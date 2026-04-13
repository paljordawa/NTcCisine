import React, { useState, useEffect, useRef } from 'react';
import { Check, X, Clock, AlertCircle, Trash2, Lock, KeyRound, Printer, Settings, BookOpen, MessageSquare, PieChart, Send, Star, RefreshCw } from 'lucide-react';

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

interface Feedback {
    id: number;
    content: string;
    rating: number;
    createdAt: string;
    tableNumber?: string | null;
}

export default function CounterDashboard() {
    const [isAuthed, setIsAuthed] = useState(false);
    const [pinCode, setPinCode] = useState('');
    const [loginError, setLoginError] = useState(false);

    const [orders, setOrders] = useState<Order[]>([]);
    const [history, setHistory] = useState<Order[]>([]);
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
    const [activeTab, setActiveTab] = useState<'live' | 'history' | 'community'>('live');
    const [activePoll, setActivePoll] = useState<any>(null);
    const [pollResults, setPollResults] = useState<any>(null);
    const [pollTotalVotes, setPollTotalVotes] = useState(0);
    const [newPollQuestion, setNewPollQuestion] = useState('');
    const [newPollOptions, setNewPollOptions] = useState(['', '']);
    const [isUpdatingPoll, setIsUpdatingPoll] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [printingOrderId, setPrintingOrderId] = useState<string | null>(null);
    const [isPaused, setIsPaused] = useState<boolean>(false);
    const [isPollEnabled, setIsPollEnabled] = useState<boolean>(true);
    const [isFeedbackEnabled, setIsFeedbackEnabled] = useState<boolean>(true);
    const [printerMode, setPrinterMode] = useState<'direct' | 'proxy'>('direct');
    const [printerIp, setPrinterIp] = useState('192.168.1.106');
    const [printerId, setPrinterId] = useState('local_printer');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [storePin, setStorePin] = useState('0000');
    const [pinInput, setPinInput] = useState('0000');
    const [isScanning, setIsScanning] = useState(false);
    const prevOrdersCount = useRef(0);

    useEffect(() => {
        const savedMode = localStorage.getItem('printerMode') as 'direct' | 'proxy';
        if (savedMode === 'direct' || savedMode === 'proxy') {
            setPrinterMode(savedMode);
        }

        const savedIp = localStorage.getItem('printerIp');
        if (savedIp) setPrinterIp(savedIp);

        const savedId = localStorage.getItem('printerId');
        if (savedId) setPrinterId(savedId);
    }, []);

    const togglePrinterMode = () => {
        const newMode = printerMode === 'direct' ? 'proxy' : 'direct';
        setPrinterMode(newMode);
        localStorage.setItem('printerMode', newMode);
    };

    const updatePrinterIp = (val: string) => {
        setPrinterIp(val);
        localStorage.setItem('printerIp', val);
    };

    const updatePrinterId = (val: string) => {
        setPrinterId(val);
        localStorage.setItem('printerId', val);
    };

    const handleScan = async () => {
        setIsScanning(true);
        try {
            const res = await fetch('http://localhost:8000/scan');
            const data = await res.json();
            if (data.success) {
                updatePrinterIp(data.ip);
                alert(`Printer found and updated to: ${data.ip}`);
            } else {
                alert(data.message || "No printers found. Please check your network and ensure Proxy is running.");
            }
        } catch (e) {
            alert("Connection to Proxy failed. Please ensure the 'printer-proxy' script is running on your computer.");
        } finally {
            setIsScanning(false);
        }
    };

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

    const fetchFeedbacks = async () => {
        try {
            const res = await fetch('/api/feedback');
            if (res.ok) {
                const data = await res.json();
                setFeedbacks(data.feedbacks);
            }
        } catch (e) {}
    };

    const fetchPollData = async () => {
        try {
            const res = await fetch('/api/polls');
            if (res.ok) {
                const data = await res.json();
                setActivePoll(data.poll);
                setPollResults(data.results);
                setPollTotalVotes(data.totalVotes);
            }
        } catch (e) {}
    };

    const handleCreatePoll = async () => {
        if (!newPollQuestion || newPollOptions.some(o => !o) || isUpdatingPoll) return;
        setIsUpdatingPoll(true);
        try {
            const res = await fetch('/api/polls', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: newPollQuestion,
                    options: newPollOptions
                })
            });
            if (res.ok) {
                setNewPollQuestion('');
                setNewPollOptions(['', '']);
                fetchPollData();
                alert('Poll updated successfully!');
            }
        } catch (e) {
            alert('Failed to update poll');
        } finally {
            setIsUpdatingPoll(false);
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings');
            if (res.ok) {
                const data = await res.json();
                setIsPaused(data.isOrderingPaused);
                setIsPollEnabled(data.isPollEnabled);
                setIsFeedbackEnabled(data.isFeedbackEnabled);
                setStorePin(data.storePin || '0000');
                setPinInput(data.storePin || '0000');
            }
        } catch(e) {}
    };

    const saveStorePin = async (newPin: string) => {
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storePin: newPin })
            });
            const data = await res.json();
            setStorePin(data.storePin || '0000');
            setPinInput(data.storePin || '0000');
        } catch(e) { }
    };

    const generateRandomPin = () => {
        const newPin = Math.floor(1000 + Math.random() * 9000).toString();
        setPinInput(newPin);
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

    const togglePollSetting = async () => {
        const newState = !isPollEnabled;
        setIsPollEnabled(newState);
        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isPollEnabled: newState })
            });
        } catch(e) {
            setIsPollEnabled(!newState);
        }
    };

    const toggleFeedbackSetting = async () => {
        const newState = !isFeedbackEnabled;
        setIsFeedbackEnabled(newState);
        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isFeedbackEnabled: newState })
            });
        } catch(e) {
            setIsFeedbackEnabled(!newState);
        }
    };

    const handleClearPoll = async () => {
        if (!confirm('Are you sure you want to end and archive the current poll? It will be removed from the customer menu.')) return;
        try {
            const res = await fetch('/api/polls', { method: 'DELETE' });
            if (res.ok) {
                fetchPollData();
                alert('Poll ended successfully.');
            }
        } catch (e) {
            alert('Failed to clear poll');
        }
    };

    const exportPollToCSV = () => {
        if (!activePoll || !pollResults) return;
        
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += `Question,"${activePoll.question}"\n`;
        csvContent += `Total Votes,${pollTotalVotes}\n\n`;
        csvContent += "Option,Votes,Percentage\n";
        
        activePoll.options.forEach((opt: string, idx: number) => {
            const res = pollResults.find((r: any) => r.optionIndex === idx);
            const count = res?.count || 0;
            const pct = pollTotalVotes > 0 ? Math.round((count / pollTotalVotes) * 100) : 0;
            csvContent += `"${opt}",${count},${pct}%\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `poll_results_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Poll every 5 seconds
    useEffect(() => {
        fetchOrders();
        fetchSettings();
        fetchFeedbacks();
        fetchPollData();
        const interval = setInterval(() => {
            fetchOrders();
            fetchSettings();
            fetchFeedbacks();
            fetchPollData();
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
            
            const endpoint = printerMode === 'direct' 
                ? `http://${printerIp}/cgi-bin/epos/dispacher.cgi?devid=${encodeURIComponent(printerId)}&timeout=5000`
                : `http://localhost:8000/print?ip=${encodeURIComponent(printerIp)}&devid=${encodeURIComponent(printerId)}`;

            const printRes = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/xml; charset=utf-8'
                },
                body: soapEnvelope
            });

            if (!printRes.ok) {
                const errorText = await printRes.text();
                console.error("Printer rejected the job:", printRes.status, printRes.statusText, errorText);
                alert(`Kitchen Printer Error (Status ${printRes.status}):\n${printRes.statusText}\n\nPlease check if ePOS-Print is enabled in your printer settings.`);
            }
        } catch (e) {
            console.error("Print connection error:", e);
            alert(`Could not connect to Kitchen Printer at ${printerIp}.\n\nIMPORTANT: Please ensure 'Insecure Content' is set to 'Allow' in your Chrome Site Settings for this to work over HTTPS.`);
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
                    <button
                        onClick={() => setActiveTab('community')}
                        className={`px-6 py-2 rounded-md font-bold transition-all flex items-center gap-2 ${activeTab === 'community' ? 'bg-white text-gray-900 shadow-sm border border-stone-200' : 'text-stone-500 hover:text-gray-900'}`}
                    >
                        Community
                        {feedbacks.length > 0 && <span className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0.5 rounded-full">New</span>}
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className={`flex items-center justify-center w-10 h-10 rounded-full shadow-sm transition-all border bg-white border-stone-200 text-stone-500 hover:bg-stone-50 hover:text-emerald-600 hover:rotate-90`}
                        title="Dashboard Settings"
                    >
                        <Settings size={20} strokeWidth={2.5} />
                    </button>
                    
                    <div className="hidden sm:flex items-center gap-3">
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs transition-all shadow-sm border ${isPaused ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                            <div className={`w-2 h-2 rounded-full ${isPaused ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'}`}></div>
                            {isPaused ? 'SERVICE PAUSED' : 'SERVICE LIVE'}
                        </div>
                        
                        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full font-bold text-xs shadow-sm shadow-indigo-100/50">
                            <span className="text-[10px] opacity-60 uppercase tracking-widest">Order PIN:</span>
                            <span className="font-mono tracking-widest text-sm">{storePin}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-stone-600 font-bold bg-white border border-stone-200 px-4 py-2 rounded-full shadow-sm">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                            Sync
                        </div>
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

            {activeTab === 'community' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:hidden">
                    {/* Feedback Feed */}
                    <div className="flex flex-col gap-6">
                        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm">
                            <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                                <MessageSquare className="text-emerald-600" />
                                Customer Feedback
                            </h3>
                            
                            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                {feedbacks.length === 0 ? (
                                    <div className="text-center py-12 text-stone-400 font-medium">No feedback received yet.</div>
                                ) : (
                                    feedbacks.map((f) => (
                                        <div key={f.id} className="bg-stone-50 border border-stone-100 rounded-2xl p-4 transition-all hover:border-emerald-200 hover:bg-white hover:shadow-md">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex gap-1">
                                                    {[1, 2, 3, 4, 5].map(star => (
                                                        <Star 
                                                            key={star} 
                                                            size={14} 
                                                            className={`${f.rating >= star ? 'fill-amber-500 text-amber-500' : 'text-stone-200'}`} 
                                                        />
                                                    ))}
                                                </div>
                                                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                                                    {new Date(f.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <p className="text-sm text-stone-700 font-medium leading-relaxed mb-3">"{f.content}"</p>
                                            <div className="flex items-center gap-2">
                                                {f.tableNumber && (
                                                    <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase tracking-widest border border-emerald-200">
                                                        Table {f.tableNumber}
                                                    </span>
                                                )}
                                                <span className="text-[9px] font-black bg-stone-200 text-stone-500 px-2 py-0.5 rounded-full uppercase tracking-widest">
                                                    Customer
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Poll Management */}
                    <div className="flex flex-col gap-6">
                        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm">
                            <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-2">
                                <PieChart className="text-amber-600" />
                                Live Poll Manager
                            </h3>

                            {/* Current Results */}
                            {activePoll ? (
                                <div className="mb-10 bg-amber-50 rounded-2xl p-6 border border-amber-100">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h4 className="text-sm font-black text-amber-900 uppercase tracking-widest mb-1 opacity-60">Currently Asking</h4>
                                            <p className="text-lg font-black text-gray-900">{activePoll.question}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-2xl font-black text-amber-600">{pollTotalVotes}</span>
                                            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Votes</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {Array.isArray(activePoll.options) && activePoll.options.map((option: string, index: number) => {
                                            const result = pollResults?.find((r: any) => r.optionIndex === index);
                                            const percentage = pollTotalVotes > 0 ? Math.round((result?.count || 0) / pollTotalVotes * 100) : 0;
                                            return (
                                                <div key={index} className="space-y-1">
                                                    <div className="flex justify-between text-xs font-bold text-stone-600">
                                                        <span>{option}</span>
                                                        <span className="text-amber-700">{result?.count || 0} ({percentage}%)</span>
                                                    </div>
                                                    <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full bg-amber-500 rounded-full transition-all duration-1000" 
                                                            style={{ width: `${percentage}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    
                                    <div className="flex gap-4 mt-6 pt-6 border-t border-amber-200/50">
                                        <button 
                                            onClick={() => fetchPollData()}
                                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-600 hover:text-amber-800 transition-colors"
                                        >
                                            <RefreshCw size={12} /> Refresh
                                        </button>
                                        <button 
                                            onClick={exportPollToCSV}
                                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-800 transition-colors"
                                        >
                                            <Printer size={12} /> Export CSV
                                        </button>
                                        <button 
                                            onClick={handleClearPoll}
                                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-700 transition-colors ml-auto"
                                        >
                                            <Trash2 size={12} /> Clear/End Poll
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="mb-10 p-8 bg-stone-50 rounded-2xl border border-stone-100 text-center">
                                    <p className="text-stone-500 font-bold italic">No active poll. Create one below to engage your guests!</p>
                                </div>
                            )}

                            {/* Create/Replace Poll Form */}
                            <div className="bg-stone-50 rounded-2xl p-6 border border-stone-100">
                                <h4 className="text-sm font-black text-stone-500 uppercase tracking-widest mb-4">Launch New Poll</h4>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">The Question</label>
                                        <input 
                                            type="text" 
                                            value={newPollQuestion}
                                            onChange={(e) => setNewPollQuestion(e.target.value)}
                                            placeholder="e.g. Which Momo should be our next special?"
                                            className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all placeholder:text-stone-400"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">Options</label>
                                        <div className="space-y-2">
                                            {newPollOptions.map((opt, i) => (
                                                <div key={i} className="flex gap-2">
                                                    <input 
                                                        type="text" 
                                                        value={opt}
                                                        onChange={(e) => {
                                                            const next = [...newPollOptions];
                                                            next[i] = e.target.value;
                                                            setNewPollOptions(next);
                                                        }}
                                                        placeholder={`Option ${i+1}`}
                                                        className="flex-grow bg-white border border-stone-200 rounded-xl px-4 py-2 text-sm font-medium text-gray-900 focus:border-emerald-500 outline-none placeholder:text-stone-400"
                                                    />
                                                    {i > 1 && (
                                                        <button 
                                                            onClick={() => setNewPollOptions(prev => prev.filter((_, idx) => idx !== i))}
                                                            className="text-red-300 hover:text-red-500 transition-colors"
                                                        >
                                                            <Trash2 size={20} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <button 
                                            onClick={() => setNewPollOptions(prev => [...prev, ''])}
                                            className="mt-3 text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-800"
                                        >
                                            + Add Another Option
                                        </button>
                                    </div>

                                    <button 
                                        onClick={handleCreatePoll}
                                        disabled={!newPollQuestion || newPollOptions.some(o => !o) || isUpdatingPoll}
                                        className="w-full bg-amber-600 hover:bg-stone-900 disabled:bg-stone-200 text-white font-black py-4 rounded-xl shadow-lg shadow-amber-600/20 transition-all flex items-center justify-center gap-2 mt-4"
                                    >
                                        {isUpdatingPoll ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
                                        LAUNCH POLL ON MENU
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'history' && history.length === 0 && (
                <div className="flex flex-col items-center justify-center py-32 bg-white rounded-2xl border-2 border-emerald-100 border-dashed shadow-sm">
                    <Check size={64} className="text-emerald-200 mb-4" />
                    <p className="text-2xl text-emerald-900 font-bold">No history</p>
                    <p className="text-emerald-800/60 mt-2 font-medium">Processed orders will appear here.</p>
                </div>
            )}

            {activeTab === 'live' && orders.length === 0 && (
                <div className="flex flex-col items-center justify-center py-32 bg-white rounded-2xl border-2 border-emerald-100 border-dashed shadow-sm">
                    <Clock size={64} className="text-emerald-200 mb-4" />
                    <p className="text-2xl text-emerald-900 font-bold">No pending orders</p>
                    <p className="text-emerald-800/60 mt-2 font-medium">New web orders will appear here automatically.</p>
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

                                <div className="flex flex-row items-center justify-between lg:justify-end gap-6 pt-4 lg:pt-0 border-t border-stone-100 lg:border-t-0 w-full lg:w-auto shrink-0 lg:pl-6 lg:border-l">
                                    <div className="flex flex-col lg:items-end">
                                        <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mb-1">Total</span>
                                        <span className="text-xl font-black text-emerald-700">CHF {order.cartTotal.toFixed(2)}</span>
                                    </div>
                                    <div className="flex flex-col lg:items-end">
                                        <span className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mb-1">Status</span>
                                        {order.status === 'ready' ? (
                                            <span className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold rounded-lg text-xs shadow-sm">
                                                <Check size={14} /> Completed
                                            </span>
                                        ) : order.status === 'accepted' ? (
                                            <span className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 font-bold rounded-lg text-xs shadow-sm">
                                                <Printer size={14} /> Accepted
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 font-bold rounded-lg text-xs shadow-sm">
                                                <X size={14} /> Rejected
                                            </span>
                                        )}
                                    </div>
                                    
                                    <div className="flex flex-col lg:items-end">
                                        <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mb-1">Action</span>
                                        <button 
                                            onClick={() => handleSilentPrint(order)}
                                            className="flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-emerald-600 hover:text-white border border-stone-200 text-stone-600 font-bold rounded-xl text-xs transition-all active:scale-95 shadow-sm"
                                        >
                                            <Printer size={14} /> Print
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Settings Sidebar Overlay */}
            <div className={`fixed inset-0 z-50 flex justify-end print:hidden transition-all duration-300 ${isSettingsOpen ? 'visible' : 'invisible'}`}>
                {/* Backdrop */}
                <div 
                    className={`absolute inset-0 bg-stone-900/30 backdrop-blur-sm transition-opacity duration-300 ${isSettingsOpen ? 'opacity-100' : 'opacity-0'}`}
                    onClick={() => setIsSettingsOpen(false)}
                ></div>

                {/* Sliding Drawer */}
                <div className={`relative w-full max-w-sm bg-stone-50 h-full shadow-2xl flex flex-col transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${isSettingsOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="flex items-center justify-between p-6 bg-white border-b border-stone-200 shadow-sm z-10 relative">
                        <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
                            <Settings className="text-emerald-600" /> Settings
                        </h2>
                        <button 
                            onClick={() => setIsSettingsOpen(false)}
                            className="p-2 bg-stone-100 hover:bg-red-100 hover:text-red-600 text-stone-500 rounded-full transition-colors active:scale-95"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6 flex flex-col gap-8 overflow-y-auto z-0 relative">
                        {/* Store Status Card */}
                        <div className="flex flex-col gap-3">
                            <h3 className="text-xs font-black text-stone-400 uppercase tracking-widest pl-1">Store Status</h3>
                            <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm flex flex-col gap-4 relative overflow-hidden">
                                <div className={`absolute top-0 left-0 w-1 h-full ${isPaused ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                                <p className="text-sm text-stone-500 font-medium leading-relaxed pl-1">
                                    Toggle whether dine-in customers can actively place orders via their QR code menus.
                                </p>
                                <button 
                                    onClick={togglePause}
                                    className={`w-full flex items-center justify-center gap-2 px-4 py-3.5 font-black text-sm tracking-wide rounded-xl shadow-sm transition-all border ${isPaused ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'} active:scale-95`}
                                >
                                    {isPaused ? <X size={18} strokeWidth={3} /> : <Check size={18} strokeWidth={3} />}
                                    {isPaused ? 'ORDERING IS PAUSED' : 'ONLINE ORDERS LIVE'}
                                </button>
                                
                                </div>

                                <div className="border-t border-stone-100 pt-6 mt-2 space-y-4">
                                    <div className="bg-stone-50 rounded-xl p-4 border border-stone-100 mb-2">
                                        <label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest pl-1 mb-2 flex items-center justify-between">
                                            <span>Customer Order PIN</span>
                                            <span className="text-emerald-500 flex items-center gap-1"><Check size={10}/> ACTIVE</span>
                                        </label>
                                        <div className="flex gap-2">
                                            <input 
                                                type="text" 
                                                maxLength={4}
                                                value={pinInput} 
                                                onChange={(e) => setPinInput(e.target.value.replace(/[^0-9]/g, ''))}
                                                className="w-full bg-white rounded-xl px-3 py-2 font-mono text-xl tracking-[0.5em] text-center transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-stone-900 border border-stone-200"
                                                placeholder="0000"
                                            />
                                            <button 
                                                onClick={() => saveStorePin(pinInput)}
                                                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs active:scale-95 transition-all outline-none whitespace-nowrap"
                                            >
                                                {storePin === pinInput ? 'Saved' : 'Update'}
                                            </button>
                                        </div>
                                    </div>

                                    <h3 className="text-xs font-black text-stone-400 uppercase tracking-widest pl-1">Community Toggles</h3>
                                    
                                    <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-100">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${isPollEnabled ? 'bg-amber-100 text-amber-600' : 'bg-stone-200 text-stone-400'}`}>
                                                <PieChart size={18} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-stone-700">Customer Polls</span>
                                                <span className="text-[10px] text-stone-400 font-medium">{isPollEnabled ? 'Running' : 'Hidden'}</span>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={togglePollSetting}
                                            className={`w-12 h-6 rounded-full transition-all relative ${isPollEnabled ? 'bg-amber-500' : 'bg-stone-300'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isPollEnabled ? 'left-7' : 'left-1'}`}></div>
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-100">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${isFeedbackEnabled ? 'bg-emerald-100 text-emerald-600' : 'bg-stone-200 text-stone-400'}`}>
                                                <MessageSquare size={18} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-stone-700">Guest Feedback</span>
                                                <span className="text-[10px] text-stone-400 font-medium">{isFeedbackEnabled ? 'Active' : 'Hidden'}</span>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={toggleFeedbackSetting}
                                            className={`w-12 h-6 rounded-full transition-all relative ${isFeedbackEnabled ? 'bg-emerald-500' : 'bg-stone-300'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isFeedbackEnabled ? 'left-7' : 'left-1'}`}></div>
                                        </button>
                                     </div>
                                 </div>
                             </div>
 
                         {/* Hardware Routing Card */}
                         <div className="flex flex-col gap-3">
                             <h3 className="text-xs font-black text-stone-400 uppercase tracking-widest pl-1">Receipt Routing</h3>
                             <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-sm flex flex-col gap-4">
                                 <p className="text-sm text-stone-500 font-medium leading-relaxed pl-1">
                                     Configure how tickets are transmitted to the kitchen hardware when accepted.
                                 </p>
                                 <div className="grid grid-cols-2 gap-3">
                                     <button
                                         onClick={() => { setPrinterMode('direct'); localStorage.setItem('printerMode', 'direct'); }}
                                         className={`flex flex-col items-center gap-2 p-4 rounded-[1rem] border-2 transition-all active:scale-95 ${printerMode === 'direct' ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-inner' : 'border-stone-100 bg-stone-50 text-stone-400 hover:border-stone-200 hover:bg-stone-100 hover:text-stone-600'}`}
                                     >
                                         <Printer size={24} strokeWidth={2} className={`transition-colors ${printerMode === 'direct' ? 'text-amber-500' : 'text-stone-300'}`} />
                                         <span className="text-xs font-black">Direct IP</span>
                                     </button>
                                     <button
                                         onClick={() => { setPrinterMode('proxy'); localStorage.setItem('printerMode', 'proxy'); }}
                                         className={`flex flex-col items-center gap-2 p-4 rounded-[1rem] border-2 transition-all active:scale-95 ${printerMode === 'proxy' ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-inner' : 'border-stone-100 bg-stone-50 text-stone-400 hover:border-stone-200 hover:bg-stone-100 hover:text-stone-600'}`}
                                     >
                                         <Printer size={24} strokeWidth={2} className={`transition-colors ${printerMode === 'proxy' ? 'text-emerald-500' : 'text-stone-300'}`} />
                                         <span className="text-xs font-black">Local Proxy</span>
                                     </button>
                                 </div>
                                 <div className="flex flex-col gap-2 mt-2">
                                     <div className="flex items-center justify-between pl-1">
                                         <label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">IP Address</label>
                                         <button 
                                             onClick={handleScan}
                                             disabled={isScanning || printerMode !== 'proxy'}
                                             className={`text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded transition-all ${isScanning ? 'bg-amber-100 text-amber-600 animate-pulse' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 active:scale-95 disabled:opacity-30 disabled:grayscale'}`}
                                         >
                                             {isScanning ? 'Scanning...' : 'Scan Network'}
                                         </button>
                                     </div>
                                     <input 
                                         type="text" 
                                         value={printerIp} 
                                         onChange={(e) => updatePrinterIp(e.target.value)}
                                         className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 font-mono text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all shadow-inner placeholder:text-stone-400"
                                         placeholder="192.168.x.x"
                                     />
                                     
                                     <label className="text-[10px] text-stone-500 font-bold uppercase tracking-widest pl-1 mt-1">Epson Device ID</label>
                                     <input 
                                         type="text" 
                                         value={printerId} 
                                         onChange={(e) => updatePrinterId(e.target.value)}
                                         className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 font-mono text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all shadow-inner placeholder:text-stone-400"
                                         placeholder="local_printer"
                                     />
 
                                     <button 
                                         onClick={() => {
                                             localStorage.setItem('printerIp', printerIp);
                                             localStorage.setItem('printerId', printerId);
                                             alert("Printer configuration saved locally!");
                                         }}
                                         className="mt-4 w-full py-3 bg-stone-900 hover:bg-black text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-stone-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                                     >
                                         <Check size={14} strokeWidth={3} />
                                         Save Changes
                                     </button>
                                 </div>
                             </div>
                         </div>
 
                         {/* Documentation Link */}
                         <div className="flex flex-col gap-3">
                             <a 
                                 href="/docs" 
                                 className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-stone-100/50 hover:bg-stone-100 border border-stone-200 rounded-[1rem] font-bold text-stone-600 hover:text-stone-800 transition-all active:scale-95 group shadow-sm"
                                 target="_blank"
                                 rel="noopener noreferrer"
                             >
                                 <BookOpen size={18} className="text-emerald-600 group-hover:rotate-12 transition-transform" />
                                 Manager Documentation
                             </a>
                         </div>
                     </div>
                 </div>
             </div>
         </div>
     );
 }
