import type { APIRoute } from 'astro';
import { db, StoreSettings, eq } from 'astro:db';

export const prerender = false;

export const GET: APIRoute = async () => {
    try {
        const settings = await db.select().from(StoreSettings).where(eq(StoreSettings.id, 1));
        const isPaused = settings.length > 0 ? settings[0].isOrderingPaused : false;
        const storePin = settings.length > 0 ? settings[0].storePin : '0000';
        
        return new Response(JSON.stringify({ isOrderingPaused: isPaused, storePin }), { 
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
        const payload = await request.json();
        
        const settingsList = await db.select().from(StoreSettings).where(eq(StoreSettings.id, 1));
        const currentSettings = settingsList.length > 0 ? settingsList[0] : { isOrderingPaused: false, storePin: '0000' };

        let newIsPaused = payload.isOrderingPaused !== undefined ? payload.isOrderingPaused : currentSettings.isOrderingPaused;
        let newStorePin = payload.storePin !== undefined ? payload.storePin : currentSettings.storePin;

        if (settingsList.length === 0) {
            await db.insert(StoreSettings).values({ id: 1, isOrderingPaused: newIsPaused, storePin: newStorePin });
        } else {
            await db.update(StoreSettings).set({ isOrderingPaused: newIsPaused, storePin: newStorePin }).where(eq(StoreSettings.id, 1));
        }
        
        return new Response(JSON.stringify({ success: true, isOrderingPaused: newIsPaused, storePin: newStorePin }), { 
            status: 200, headers: { 'Content-Type': 'application/json' } 
        });
    } catch(e) {
        console.error(e);
        return new Response(JSON.stringify({ error: 'Failed to update settings' }), { 
            status: 500, headers: { 'Content-Type': 'application/json' } 
        });
    }
}
