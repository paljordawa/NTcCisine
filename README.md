# 🏔️ Nomade Tibetan Cuisine - Restaurant Web App

A modern, full-stack, highly responsive web application designed for "Nomade Tibetan Cuisine". This project fuses a premium, culturally-authentic visual aesthetic with powerful POS integration. 

It acts as both a **dynamic customer-facing digital menu** (synchronized in real-time with Loyverse POS) and a **staff-facing Counter Dashboard** for live order management, securely locked behind a staff PIN.

---

## 🚀 Key Features

*   **Loyverse POS Integrations:** Automatic synchronization of food categories, items, and variations directly from the Loyverse API. 
*   **Intuitive Square-Grid Layout:** A high-contrast "bento-box" square card aesthetic optimized for both mobile and desktop screens.
*   **Staff Counter Dashboard:** A dedicated `/counter` terminal route for staff to view, interact with, modify, accept, and reject customer orders in real-time, protected by a secure 4-digit PIN pad.
*   **Aesthetic Tritone Theme:** Carefully curated visual palette consisting of warm rice-paper `stone-50`, spicy mustard `amber-600`, and deep matcha `emerald-600` colors, overlaid with visually repeating cultural SVG frames.
*   **QR Code Table Ordering:** Seamlessly trace orders to specific tables when customers scan dynamic URLs (e.g. `/?table=10`).

---

## 🛠️ Technology Architecture

### 1. Frontend: Astro + React + Tailwind
*   **[Astro](https://astro.build/):** The core framework driving the application. Offers fast static rendering for the homepage and seamless API route handling for the backend endpoints.
*   **React:** Used via Astro islands (`client:load`) to manage complex, highly interactive UI components like the `Menu.tsx` cart system and the live `CounterDashboard.tsx`.
*   **Tailwind CSS:** Powers the entire design system, leveraging version 4 `@theme` directives to enforce the strict Stone/Amber/Emerald tritone palette.

### 2. Database: Astro DB + Turso
*   **Astro DB:** The native, typesafe ORM and database solution used to manage the `Orders` table.
*   **[Turso](https://turso.tech/):** The production database provider. Turso provides a globally distributed SQLite-compatible (libSQL) edge database perfectly suited for Astro DB's serverless queries.

### 3. Hosting: Cloudflare Pages
*   **[Cloudflare Pages](https://pages.cloudflare.com/):** The application is hosted on Cloudflare Pages, using Cloudflare Workers (edge functions) for all Astro SSR API endpoints (Loyverse sync and order processing).
*   The `nodejs_compat` compatibility flag is enabled via `wrangler.toml` to ensure full compatibility with Turso's libSQL HTTP client.

---

## 📁 Project Structure

```text
/
├── public/                 # Static assets (images, fonts, frame.svg, logos)
├── db/
│   └── config.ts           # Astro DB Schema definition (Orders table for Turso)
├── src/
│   ├── components/
│   │   ├── Menu.tsx             # Interactive customer-facing menu and cart
│   │   └── CounterDashboard.tsx # Staff-facing live order management + PIN Lock
│   ├── data/
│   │   └── menu.ts              # TypeScript definitions mapping Loyverse entities
│   ├── lib/
│   │   └── loyverse.ts          # Loyverse API fetch and variation parsing logic
│   ├── pages/
│   │   ├── api/                 # Checkout and Order REST API endpoints
│   │   ├── index.astro          # Main Customer Menu Application
│   │   └── counter.astro        # Protected Admin Dashboard
│   └── layouts/                 # Astro HTML templates
```

---

## ⚙️ Configuration & Deployment

### Loyverse POS Setup
The customer menu is built dynamically from **Loyverse POS**.
1. Log into your Loyverse Back Office.
2. Generate a **Developer API Access Token**.
3. Save it as an environment variable (`LOYVERSE_ACCESS_TOKEN`) in **Cloudflare Pages**.

### 🏷️ Interactive Menu Tagging (Today's Special)
The Nomade web application intelligently reacts to metadata tags added directly from the Loyverse Dashboard. 
To mark any item as the "Today's Special":
1. Open the item in your **Loyverse Back Office**.
2. Add the exact hashtag `#special` anywhere within its Description box (e.g. `Spicy handmade dish. #special`).
3. The platform will automatically extract the hashtag, keeping the visible description seamless, and dynamically highlight the food card with a gorgeous amber overlay!

### Turso Database Setup
To hook up Astro DB to your production Turso database:
1. Create a database on Turso (`turso db create nomade-db`).
2. Generate database credentials using the Turso CLI.
3. Add the resulting `ASTRO_STUDIO_APP_TOKEN` (or direct Turso credentials depending on your adapter) to your **Cloudflare Pages Environment Variables**.

### Cloudflare Pages Deployment
1. Connect your GitHub repository to Cloudflare Pages.
2. Set the build command to: `npm run build`
3. Set the output directory to: `dist`
4. Ensure all environment variables (Loyverse Token, Database URLs) are correctly mapped in the **Cloudflare Pages > Settings > Environment Variables** dashboard before triggering a production build.
5. The `wrangler.toml` at the project root will automatically apply the `nodejs_compat` compatibility flag.

---

## 🖨️ Silent Kitchen Printer Configuration

The Counter Dashboard features a **100% Silent Print** toggle specifically designed for the **Epson TM-m30III** kitchen printer via ePOS-Print XML. Staff can configure how print data is actively routed to the printer by clicking the Printer toggle in the dashboard header.

### Mode 1: Direct IP (`192.168.1.106`)
This is the fastest method. It transmits data securely from the client browser straight to the local Ethernet/WiFi Epson printer via `fetch()`.
*   **The Catch:** Because the Cloudflare website is hosted over a secure HTTPS connection, browsers automatically block outgoing requests to insecure local IP addresses as "Mixed Content".
*   **The Solution:** You MUST open Google Chrome on the Counter Tablet, click the padlock next to the URL, go to **Site Settings**, and change **Insecure Content** to **Allow**. Once allowed, the browser will seamlessly transmit print streams internally.

### Mode 2: Local Proxy Bridge (`localhost`)
If you refuse or are unable to change Chrome's security settings, or want deeper local integration, you can use the bundled Node proxy script. Secure web pages are allowed to bypass the Mixed Content block if they route strictly to `localhost`.
1.  Navigate into the newly created folder: `cd printer-proxy`
2.  Install dependencies: `npm install`
3.  Start the proxy server in the background: `npm start`
4.  Switch the dashboard to **Local Proxy** mode. The front-end will post to `http://localhost:8000/print`, which will flawlessly tunnel the secure payload natively to the printer.

---

## 🔒 Security

*   **Cashier Login:** Access to the `/counter` route is strictly protected by a client-side PIN pad rendering lock. The default PIN is configured to `8888`.
*   **API Obfuscation:** The Loyverse API key is securely managed via Astro SSR and is never exposed to the client browser.
