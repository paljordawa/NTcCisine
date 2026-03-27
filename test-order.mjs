import fs from 'fs';
fetch('http://localhost:4321/api/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        cartItems: [{ item: { name: 'Test Token', price: "CHF 10.00", id: "001" }, quantity: 2 }],
        cartTotal: 20.00,
        tableNumber: "99"
    })
}).then(res => res.json()).then(console.log).catch(console.error);
