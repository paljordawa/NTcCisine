import type { APIRoute } from 'astro';
import { db, StoreSettings, eq } from 'astro:db';

export const prerender = false;

export const GET: APIRoute = async ({ request, clientAddress }) => {
    try {
        const settings = await db.select().from(StoreSettings).where(eq(StoreSettings.id, 1));
        const isPaused = settings.length > 0 ? settings[0].isOrderingPaused : false;
        const lockedIp = settings.length > 0 ? settings[0].networkIpLock : '127.0.0.1';
        
        const yourIpAddress = request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for') || clientAddress || '127.0.0.1';

        return new Response(JSON.stringify({ isOrderingPaused: isPaused, lockedIp, yourIpAddress }), { 
            status: 200, headers: { 'Content-Type': 'application/json' } 
        });
    } catch(e) {
        console.error(e);
        return new Response(JSON.stringify({ error: 'Failed to fetch settings' }), { 
            status: 500, headers: { 'Content-Type': 'application/json' } 
        });
    }
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
    try {
        const payload = await request.json();
        
        const settings = await db.select().from(StoreSettings).where(eq(StoreSettings.id, 1));
        const currentSettings = settings.length > 0 ? settings[0] : { isOrderingPaused: false, networkIpLock: '127.0.0.1' };

        let newIsPaused = payload.isOrderingPaused !== undefined ? payload.isOrderingPaused : currentSettings.isOrderingPaused;
        let newIpLock = currentSettings.networkIpLock;

        if (payload.lockNetwork === true) {
            const userIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for') || clientAddress;
            newIpLock = payload.customIp || userIp || '127.0.0.1'; // Fallback to localhost if entirely untraceable
        } else if (payload.lockNetwork === false) {
            newIpLock = null;
        }

        if (settings.length === 0) {
            await db.insert(StoreSettings).values({ id: 1, isOrderingPaused: newIsPaused, networkIpLock: newIpLock });
        } else {
            await db.update(StoreSettings).set({ isOrderingPaused: newIsPaused, networkIpLock: newIpLock }).where(eq(StoreSettings.id, 1));
        }
        
        return new Response(JSON.stringify({ success: true, isOrderingPaused: newIsPaused, lockedIp: newIpLock }), { 
            status: 200, headers: { 'Content-Type': 'application/json' } 
        });
    } catch(e) {
        console.error(e);
        return new Response(JSON.stringify({ error: 'Failed to update settings' }), { 
            status: 500, headers: { 'Content-Type': 'application/json' } 
        });
    }
}
