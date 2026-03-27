import fs from 'fs';
fetch('http://localhost:4321/api/orders')
  .then(res => res.json())
  .then(data => {
    fs.writeFileSync('output.json', JSON.stringify(data.orders, null, 2), 'utf-8');
  }).catch(console.error);
