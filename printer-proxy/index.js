const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

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
        console.error(`❌ Connection to Printer ${PRINTER_IP} failed:`, e.message);
        res.status(503).send("Failed to connect to Local Printer IP.");
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
