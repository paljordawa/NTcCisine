export const prerender = false;

import type {APIRoute} from 'astro';
import { db, Order } from 'astro:db';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { cartItems, cartTotal } = body;

    if (!cartItems || cartItems.length === 0) {
      return new Response(JSON.stringify({ error: 'Cart is empty' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const orderId = crypto.randomUUID();

    await db.insert(Order).values({
      id: orderId,
      cartItems: cartItems, // astro:db json() handles objects automatically
      cartTotal: cartTotal,
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
