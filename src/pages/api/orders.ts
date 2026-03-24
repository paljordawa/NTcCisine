export const prerender = false;
import type { APIRoute } from 'astro';
import { db, Order, eq } from 'astro:db';

export const GET: APIRoute = async () => {
    try {
        const pendingOrders = await db.select().from(Order).where(eq(Order.status, 'pending'));
        return new Response(JSON.stringify({ orders: pendingOrders }), { 
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
