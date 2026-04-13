# 🏔️ Nomade Tibetan Cuisine - Restaurant Web App

A modern, full-stack, highly responsive web application designed for "Nomade Tibetan Cuisine". This project fuses a premium, culturally-authentic visual aesthetic with powerful POS integration. 

It acts as both a **dynamic customer-facing digital menu** (synchronized in real-time with Loyverse POS) and a **staff-facing Counter Dashboard** for live order management, securely locked behind a staff PIN.

---

## 🚀 Key Features

*   **Loyverse POS Integrations:** Automatic synchronization of food categories, items, and variations directly from the Loyverse API. 
*   **Intuitive Square-Grid Layout:** A high-contrast "bento-box" square card aesthetic optimized for both mobile and desktop screens.
*   **Staff Counter Dashboard:** A dedicated `/counter` terminal route for staff to view, interact with, modify, accept, and reject customer orders in real-time.
*   **Community Engagement:** Integrated **Live Guest Polls** and **Customer Feedback** systems to engage directly with diners from their own devices.
*   **Aesthetic Tritone Theme:** Carefully curated visual palette consisting of warm rice-paper `stone-50`, spicy mustard `amber-600`, and deep matcha `emerald-600` colors.
*   **QR Code Table Ordering:** Seamlessly trace orders to specific tables when customers scan dynamic URLs (e.g. `/?table=10`).

---

## 🛠️ Technology Architecture

### 1. Frontend: Astro + React + Tailwind
*   **[Astro](https://astro.build/):** The core framework driving the application. Offers fast static rendering for the homepage and seamless API route handling for the backend endpoints.
*   **React:** Used via Astro islands (`client:load`) to manage complex, highly interactive UI components like the `Menu.tsx` cart system and the live `CounterDashboard.tsx`.
*   **Tailwind CSS:** Powers the entire design system, leveraging version 4 `@theme` directives to enforce the strict Stone/Amber/Emerald tritone palette.

### 2. Database: Astro DB + Turso
*   **Astro DB:** Native ORM managing five key tables: `Order`, `StoreSettings`, `Poll`, `Vote`, and `Feedback`.
*   **[Turso](https://turso.tech/):** The production database provider, providing a globally distributed SQLite edge database perfectly suited for serverless queries.

### 3. Hosting: Cloudflare Pages
*   **[Cloudflare Pages](https://pages.cloudflare.com/):** Hosted using Cloudflare Workers (edge functions) for all Astro SSR API endpoints. The `nodejs_compat` flag is enabled for full compatibility.

---

## 📁 Project Structure

```text
/
├── public/                 # Static assets (images, fonts, frame.svg, logos)
├── db/
│   └── config.ts           # DB Schema (Orders, StoreSettings, Polls, Feedback, Votes)
├── src/
│   ├── components/
│   │   ├── Menu.tsx             # Customer menu, cart, feedback modal, and poll voting
│   │   └── CounterDashboard.tsx # Staff live dashboard, settings, and community manager
├── printer-proxy/
│   └── index.js            # Node.js bridge for printer discovery and XML routing
```

---

## ⚙️ Configuration & Store Settings

### 🛠️ Settings Control (Counter Dashboard)
Accessible via the **Settings (Gear)** icon in the Counter Dashboard (locked behind staff PIN):
*   **Ordering Toggle**: Emergency switch to pause/resume incoming web orders.
*   **Poll Toggle**: Enable/Disable the live poll for customers.
*   **Feedback Toggle**: Enable/Disable the guest feedback modal.
*   **Staff PIN Update**: Directly update the dashboard access passcode.
*   **Printer IP & Mode**: Persistently configure how receipts are routed (Direct vs Proxy).

### 🏷️ Interactive Menu Tagging (Loyverse)
Add the hashtag `#special` within a Loyverse item's Description to automatically highlight it as "Today's Special" on the web menu with a custom Amber overlay.

---

## 🗳️ Community Engagement

### 1. Live Guest Polls
Staff can manage engagement from the **Community** tab:
*   **Launch Poll**: Define a question and up to 5 options (e.g., "Favorite Momo spice level?").
*   **Live Metrics**: View real-time voting percentages and raw counts.
*   **Analytics**: **Export CSV** to download a spreadsheet of results for review.
*   **Clear Poll**: Instantly end a poll to start a new one or clear the dashboard.

### 2. Customer Feedback
When enabled, customers can submit:
*   **Star Ratings (1-5 Stars)**: Visual feedback on their dining experience.
*   **Comments**: Direct text feedback sent instantly to the staff dashboard.
*   **Table Tracking**: Feedback is automatically tagged with the table number from the URL.

---

## 🖨️ Silent Kitchen Printer Configuration

The system uses **ePOS-Print XML** for the **Epson TM-m30III**. Staff can toggle between two connectivity modes in the Settings Drawer.

### Mode 1: Direct IP
Transmits data securely from the browser straight to the printer.
*   **Requirement**: You MUST allow **Insecure Content** in Chrome's **Site Settings** for this domain to bypass "Mixed Content" blocks.

### Mode 2: Local Proxy Bridge (Recommended)
Uses a local Node.js script to bypass browser security restrictions.
1.  **Start Proxy**: `cd printer-proxy && npm start`
2.  **Scan Network**: Click the **Scan Network** button in the Dashboard Settings. The script will automatically discover the printer's current IP on your subnet.
3.  **Route**: The dashboard will automatically post jobs to `http://localhost:8000/print`.

---

## 🔒 Security

*   **Access Control**: The `/counter` dashboard is locked by a 4-digit PIN.
*   **Database**: All guest votes and feedbacks are stored in `Astro DB` and can only be cleared by authorized staff via the dashboard.
*   **Sensitive Data**: Loyverse API tokens and database keys are managed via server-side environment variables and are never leaked to the client.
