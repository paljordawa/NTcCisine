export const prerender = false;
import type { APIRoute } from 'astro';
import { db, Order, eq } from 'astro:db';
import { LOYVERSE_ACCESS_TOKEN } from 'astro:env/server';

export const POST: APIRoute = async ({ request }) => {
    try {
        const { orderId, action, modifiedCartItems, modifiedCartTotal } = await request.json(); // action = 'accept' | 'reject'
        
        const orders = await db.select().from(Order).where(eq(Order.id, orderId));
        const order = orders[0];

        if (!order) {
            return new Response(JSON.stringify({ error: 'Order not found' }), { 
                status: 404, headers: { 'Content-Type': 'application/json' }
            });
        }

        const activeCartItems = modifiedCartItems ? (typeof modifiedCartItems === 'string' ? JSON.parse(modifiedCartItems) : modifiedCartItems) : (typeof order.cartItems === 'string' ? JSON.parse(order.cartItems) : order.cartItems);
        const activeTotal = typeof modifiedCartTotal === 'number' ? modifiedCartTotal : order.cartTotal;

        if (action === 'accept' && activeCartItems.length > 0) {
            const loyverseToken = LOYVERSE_ACCESS_TOKEN;
            const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${loyverseToken}` };

            const [storeRes, paymentRes] = await Promise.all([
               fetch('https://api.loyverse.com/v1.0/stores', { headers }),
               fetch('https://api.loyverse.com/v1.0/payment_types', { headers })
            ]);
            
            const storesData = await storeRes.json();
            const paymentsData = await paymentRes.json();
            
            const store_id = storesData.stores[0].id;
            const payment_type_id = paymentsData.payment_types[0].id;

            const receiptLines = activeCartItems.map((item: any, index: number) => {
                const price = typeof item.item.price === 'string' ? parseFloat(item.item.price.replace(/[^0-9.]/g, '')) : item.item.price;
                return {
                    line_num: index + 1,
                    item_id: item.item.item_id,
                    variant_id: item.item.variant_id,
                    quantity: item.quantity,
                    price: price,
                    total_money: price * item.quantity,
                }
            });

            const loyverseOrderData = {
                store_id: store_id,
                receipt_type: 'SALE',
                receipt_date: new Date().toISOString(),
                total_money: activeTotal,
                line_items: receiptLines,
                payments: [{ payment_type_id: payment_type_id, money: activeTotal }],
                note: `Web Order ${orderId}`
            };

            const loyverseResponse = await fetch('https://api.loyverse.com/v1.0/receipts', {
                method: 'POST',
                headers,
                body: JSON.stringify(loyverseOrderData)
            });

            if (!loyverseResponse.ok) {
                console.error("Loyverse Fulfillment Failed", await loyverseResponse.text());
                return new Response(JSON.stringify({ error: 'Loyverse API Error' }), { 
                    status: 500, headers: { 'Content-Type': 'application/json' } 
                });
            }
        }

        const newStatus = action === 'accept' ? 'accepted' : (action === 'ready' ? 'ready' : 'rejected');
        
        await db.update(Order).set({ 
            status: newStatus,
            cartItems: activeCartItems,
            cartTotal: activeTotal
        }).where(eq(Order.id, orderId));

        return new Response(JSON.stringify({ success: true, status: newStatus }), { 
            status: 200, headers: { 'Content-Type': 'application/json' }
        });

    } catch (e) {
        console.error(e);
        return new Response(JSON.stringify({ error: 'Server Error' }), { 
            status: 500, headers: { 'Content-Type': 'application/json' } 
        });
    }
}
