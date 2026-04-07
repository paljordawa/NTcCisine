export const prerender = false;
import type { APIRoute } from 'astro';
import { db, Order, eq } from 'astro:db';

export const GET: APIRoute = async ({ request }) => {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
        return new Response(JSON.stringify({ error: 'Missing ID' }), { 
            status: 400, headers: { 'Content-Type': 'application/json' } 
        });
    }

    try {
        const results = await db.select().from(Order).where(eq(Order.id, id));
        if (results.length === 0) {
            return new Response(JSON.stringify({ error: 'Order not found' }), { 
                status: 404, headers: { 'Content-Type': 'application/json' } 
            });
        }
        
        return new Response(JSON.stringify(results[0]), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
        });
    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: 'Server error' }), { 
            status: 500, headers: { 'Content-Type': 'application/json' } 
        });
    }
}
