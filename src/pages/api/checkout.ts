export const prerender = false;

import type {APIRoute} from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { cartItems, cartTotal } = body;

    if (!cartItems || cartItems.length === 0) {
      return new Response(JSON.stringify({ error: 'Cart is empty' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    const loyverseToken = import.meta.env.LOYVERSE_ACCESS_TOKEN;

    if (!loyverseToken) {
      console.error('LOYVERSE_ACCESS_TOKEN is missing in environment variables.');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Format the receipt data for Loyverse API
    // https://developer.loyverse.com/docs/#tag/Receipts/paths/~1receipts/post
    // Loyverse expects specific shape for receipt creation. We are mapping our cart items to receipt lines.
    const receiptLines = cartItems.map((item: any, index: number) => {
        const price = parseFloat(item.item.price.replace(/[^0-9.]/g, ''));
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
      receipts: [
        {
          receipt_type: 'SALE',
          total_money: cartTotal,
          line_items: receiptLines,
          note: `Web Order Placed at ${new Date().toLocaleTimeString()}`
        }
      ]
    };

    console.log("Sending order to Loyverse:", JSON.stringify(loyverseOrderData, null, 2));

    // Send the order to Loyverse
    const loyverseResponse = await fetch('https://api.loyverse.com/v1.0/receipts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loyverseToken}`
      },
      body: JSON.stringify(loyverseOrderData)
    });

    if (!loyverseResponse.ok) {
        const errorData = await loyverseResponse.text();
        console.error("Loyverse API Error:", loyverseResponse.status, errorData);
        // Note: We don't expose full API error to client for security
        throw new Error(`Loyverse API responded with status ${loyverseResponse.status}`);
    }

    const responseData = await loyverseResponse.json();

    return new Response(JSON.stringify({ 
        success: true, 
        message: 'Order successfully sent to POS',
        receipt_id: responseData.receipts?.[0]?.receipt_number || 'UNKNOWN'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Checkout API Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to process order' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};
