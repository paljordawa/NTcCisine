const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const os = require('os');

const app = express();
const PORT = 8000;
const PRINTER_IP = "192.168.1.106";

// Enable CORS so the Cloudflare website can securely hit this local endpoint
app.use(cors());

// Parse incoming raw text/xml bodies
app.use(express.text({ type: ['text/xml', 'application/xml'] }));

app.post('/print', async (req, res) => {
    console.log(`[${new Date().toISOString()}] Received print job routing request.`);
    
    if (!req.body) {
        return res.status(400).send("No XML body provided for printing.");
    }

    // Capture dynamic IP and Device ID routing configuration
    const targetIp = req.query.ip || PRINTER_IP;
    const targetDevId = req.query.devid || 'local_printer';

    try {
        const printerUrl = `http://${targetIp}/cgi-bin/epos/dispacher.cgi?devid=${encodeURIComponent(targetDevId)}&timeout=5000`;
        
        console.log(`Forwarding payload to ${printerUrl}...`);
        
        const epsonRes = await fetch(printerUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/xml; charset=utf-8'
            },
            body: req.body
        });

        if (epsonRes.ok) {
            console.log(`✅ Print job successfully dispatched to Epson TM-m30III!`);
            res.status(200).send("Printed successfully via Proxy.");
        } else {
            console.error(`❌ Printer returned error: ${epsonRes.status} ${epsonRes.statusText}`);
            res.status(502).send("Printer failed to process job.");
        }
    } catch (e) {
        console.error(`❌ Connection to Printer ${targetIp} failed:`, e.message);
        res.status(503).send("Failed to connect to Local Printer IP.");
    }
});

app.get('/scan', async (req, res) => {
    console.log(`[${new Date().toISOString()}] Starting network scan for Epson printers...`);
    
    // 1. Get local IPv4 address and subnet
    const interfaces = os.networkInterfaces();
    let localIpBase = '';
    
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                const parts = iface.address.split('.');
                parts[3] = ''; // Remove last octet
                localIpBase = parts.join('.');
                break;
            }
        }
        if (localIpBase) break;
    }

    if (!localIpBase) {
        return res.status(500).json({ error: "Could not detect local network interface." });
    }

    console.log(`Subnet detected: ${localIpBase}0/24. Probing 254 addresses...`);

    const checkForPrinter = async (ip) => {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 200); // Fast 200ms timeout
            
            const probeUrl = `http://${ip}/cgi-bin/epos/dispacher.cgi?devid=local_printer&timeout=1000`;
            const response = await fetch(probeUrl, { signal: controller.signal });
            clearTimeout(timeout);
            
            // If the epos endpoint exists, it's an Epson printer
            return response.status === 200 || response.status === 405; // 405 is common for GET vs POST
        } catch (e) {
            return false;
        }
    };

    // 2. Scan the subnet in chunks of 50 to avoid overwhelming the system
    const batchSize = 50;
    let foundIp = null;

    for (let i = 1; i <= 254; i += batchSize) {
        const end = Math.min(i + batchSize - 1, 254);
        const probes = [];
        for (let j = i; j <= end; j++) {
            const ip = localIpBase + j;
            probes.push(checkForPrinter(ip).then(isPrinter => isPrinter ? ip : null));
        }

        const results = await Promise.all(probes);
        foundIp = results.find(ip => ip !== null);
        if (foundIp) break;
    }

    if (foundIp) {
        console.log(`✅ Printer discovered at: ${foundIp}`);
        res.json({ success: true, ip: foundIp });
    } else {
        console.log(`❌ No printers found on subnet ${localIpBase}0/24`);
        res.status(404).json({ success: false, message: "No Epson printers discovered on local network." });
    }
});

app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`  Nomade Kitchen Printer Proxy Server ACTIVE`);
    console.log(`===============================================`);
    console.log(`Listening strictly on http://localhost:${PORT}/print`);
    console.log(`Routing jobs dynamically to: 192.168.1.106`);
    console.log(`Waiting for print commands from Counter Dashboard...`);
});
