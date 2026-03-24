export const prerender = false;
import type { APIRoute } from 'astro';
import { db, Order, eq, not } from 'astro:db';

export const GET: APIRoute = async () => {
    try {
        const pendingOrders = await db.select().from(Order).where(eq(Order.status, 'pending'));
        
        // Use raw SQL operator to find non-pending rows since `not` helper can sometimes be finicky in older versions
        const historyOrders = await db.select().from(Order).where(not(eq(Order.status, 'pending')));
        
        // Simple manual sort since we are limited without importing desc()
        historyOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const recentHistory = historyOrders.slice(0, 50);

        return new Response(JSON.stringify({ orders: pendingOrders, history: recentHistory }), { 
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
