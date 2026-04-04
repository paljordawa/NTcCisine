export const prerender = false;
import type { APIRoute } from 'astro';
import { db, Order, eq, not, inArray } from 'astro:db';

export const GET: APIRoute = async () => {
    try {
        const liveOrders = await db.select().from(Order).where(inArray(Order.status, ['pending', 'accepted']));
        
        // Use not(inArray(...)) to fetch everything else as history
        const historyOrders = await db.select().from(Order).where(not(inArray(Order.status, ['pending', 'accepted'])));
        
        // Simple manual sort since we are limited without importing desc()
        historyOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const recentHistory = historyOrders.slice(0, 50);

        return new Response(JSON.stringify({ orders: liveOrders, history: recentHistory }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
        });
    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: 'Failed to fetch pending orders' }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
}

export const PATCH: APIRoute = async ({ request }) => {
    try {
        const { orderId, cartItems, cartTotal } = await request.json();
        
        await db.update(Order).set({ 
            cartItems: cartItems,
            cartTotal: cartTotal
        }).where(eq(Order.id, orderId));
        
        return new Response(JSON.stringify({ success: true }), { 
            status: 200, headers: { 'Content-Type': 'application/json' } 
        });
    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: 'Failed to update order' }), { 
            status: 500, headers: { 'Content-Type': 'application/json' } 
        });
    }
}
