export const prerender = false;

import type {APIRoute} from 'astro';
import { db, Order, StoreSettings, eq } from 'astro:db';

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    const body = await request.json();
    const { cartItems, cartTotal, tableNumber } = body;

    if (!cartItems || cartItems.length === 0) {
      return new Response(JSON.stringify({ error: 'Cart is empty' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Security Gate: PIN Interceptor
    const { storePin: providedPin } = body;
    const settingsList = await db.select().from(StoreSettings).where(eq(StoreSettings.id, 1));
    const settings = settingsList.length > 0 ? settingsList[0] : null;

    if (settings && settings.storePin) {
        if (providedPin !== settings.storePin) {
            console.log(`[Security Alert] Blocked order attempt with invalid PIN: ${providedPin}`);
            return new Response(JSON.stringify({ error: "Invalid Security PIN. Please contact staff or check the physical menu for the daily order code." }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    }

    const orderId = crypto.randomUUID();

    await db.insert(Order).values({
      id: orderId,
      cartItems: cartItems, // astro:db json() handles objects automatically
      cartTotal: cartTotal,
      tableNumber: tableNumber || null,
      status: 'pending',
      createdAt: new Date(),
    });

    console.log(`Order ${orderId} saved to database for counter review.`);

    return new Response(JSON.stringify({ 
        success: true, 
        message: 'Order successfully sent to POS',
        receipt_id: orderId
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Checkout API Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to process order' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
