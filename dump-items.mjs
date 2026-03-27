import fs from 'fs';
const envContent = fs.readFileSync('.env', 'utf-8');
const token = envContent.match(/^LOYVERSE_ACCESS_TOKEN=(.*)$/m)[1].trim();
fetch('https://api.loyverse.com/v1.0/items?limit=250', { headers: { Authorization: `Bearer ${token}` } })
  .then(res => res.json())
  .then(data => {
    const multiVariant = data.items.filter(i => i.variants && i.variants.length > 1);
    fs.writeFileSync('loyverse-dump.json', JSON.stringify({ multiVariant }, null, 2));
    console.log(`Dumped ${multiVariant.length} items with multiple variants`);
  });
