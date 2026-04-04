import type { APIRoute } from 'astro';
import { db, StoreSettings, eq } from 'astro:db';

export const prerender = false;

export const GET: APIRoute = async () => {
    try {
        const settings = await db.select().from(StoreSettings).where(eq(StoreSettings.id, 1));
        const isPaused = settings.length > 0 ? settings[0].isOrderingPaused : false;
        
        return new Response(JSON.stringify({ isOrderingPaused: isPaused }), { 
            status: 200, headers: { 'Content-Type': 'application/json' } 
        });
    } catch(e) {
        console.error(e);
        return new Response(JSON.stringify({ error: 'Failed to fetch settings' }), { 
            status: 500, headers: { 'Content-Type': 'application/json' } 
        });
    }
}

export const POST: APIRoute = async ({ request }) => {
    try {
        const { isOrderingPaused } = await request.json();
        
        const settings = await db.select().from(StoreSettings).where(eq(StoreSettings.id, 1));
        if (settings.length === 0) {
            await db.insert(StoreSettings).values({ id: 1, isOrderingPaused });
        } else {
            await db.update(StoreSettings).set({ isOrderingPaused }).where(eq(StoreSettings.id, 1));
        }
        
        return new Response(JSON.stringify({ success: true, isOrderingPaused }), { 
            status: 200, headers: { 'Content-Type': 'application/json' } 
        });
    } catch(e) {
        console.error(e);
        return new Response(JSON.stringify({ error: 'Failed to update settings' }), { 
            status: 500, headers: { 'Content-Type': 'application/json' } 
        });
    }
}
