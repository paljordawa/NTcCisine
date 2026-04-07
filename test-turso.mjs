import fs from 'fs';

async function testTurso() {
  const envContent = fs.readFileSync('.env', 'utf-8');
  const urlMatch = envContent.match(/^ASTRO_DB_REMOTE_URL=(.*)$/m);
  const tokenMatch = envContent.match(/^ASTRO_DB_APP_TOKEN=(.*)$/m);

  if (!urlMatch || !tokenMatch) {
    console.error("Missing Astro DB config in .env");
    return;
  }

  const url = urlMatch[1].trim().replace('libsql://', 'https://');
  const token = tokenMatch[1].trim();

  console.log(`Testing Turso at: ${url}`);

  try {
    const response = await fetch(`${url}/v2/pipeline`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requests: [
          { type: 'execute', stmt: { sql: 'SELECT 1' } },
          { type: 'close' }
        ]
      })
    });

    const data = await response.json();
    if (response.ok) {
      console.log("Turso Connection: SUCCESS");
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.error("Turso Connection: FAILED");
      console.error(data);
    }
  } catch (e) {
    console.error("Error connecting to Turso:", e.message);
  }
}

testTurso();
