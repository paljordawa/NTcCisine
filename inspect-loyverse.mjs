import fs from 'fs';

function getEnvToken() {
  try {
    const envContent = fs.readFileSync('.env', 'utf-8');
    const match = envContent.match(/^LOYVERSE_ACCESS_TOKEN=(.*)$/m);
    return match ? match[1].trim() : null;
  } catch (e) {
    return null;
  }
}

async function inspectLoyverse() {
  const token = getEnvToken();
  if (!token) {
    console.error("Token not found");
    return;
  }

  const headers = { 'Authorization': `Bearer ${token}` };

  try {
    const itemsRes = await fetch('https://api.loyverse.com/v1.0/items?limit=5', { headers });
    const itemsData = await itemsRes.json();
    console.log("ITEMS:");
    console.log(JSON.stringify(itemsData.items.slice(0, 2), null, 2));

    const catRes = await fetch('https://api.loyverse.com/v1.0/categories', { headers });
    const catData = await catRes.json();
    console.log("\nCATEGORIES:");
    console.log(JSON.stringify(catData.categories.slice(0, 2), null, 2));

  } catch (e) {
    console.error(e);
  }
}

inspectLoyverse();
