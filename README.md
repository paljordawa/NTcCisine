# Nomade Tibetan Cuisine - Restaurant Web App

A modern, full-stack, responsive web application for a Tibetan restaurant called "Nomade Tibetan Cuisine". It displays a live menu synchronized with Loyverse POS, styled with a premium matcha green glassmorphic aesthetic, and enables direct table ordering with a staff-facing Counter Dashboard.

## 🚀 Features

*   **Loyverse POS Integration:** Real-time synchronization of food categories, items, and variations directly from your Loyverse store API.
*   **Intuitive Variation Selection:** Beautifully styled dropdown selectors embedded directly within item cards for handling POS item options (e.g. Momo portions, meat choices).
*   **QR Code Table Ordering:** Seamlessly trace orders to specific tables when customers scan dynamic URLs (e.g. `/?table=10`).
*   **Aesthetic Japanese Matcha Theme:** Deep emerald greens, dark slate backgrounds, bold typography, and gorgeous glassmorphic transparencies.
*   **Live Counter Dashboard:** Staff-facing terminal utilizing Astro DB to view, interact with, modify, accept, and reject customer orders in real-time.
*   **Responsive UX:** Optimized grid and list views that elegantly adapt to both mobile and desktop screens.

## 🛠️ Tech Stack

*   **Framework:** [Astro](https://astro.build/) - For fast static generation and full-stack API capabilities.
*   **Database:** `astro:db` (LibSQL) for persistent order tracking and local state.
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework mapped to custom emerald themes.
*   **Interactive UI:** React components handling complex cart states, dropdown selections, and counter syncing.
*   **Icons:** `lucide-react` for scalable SVG icon assets.

## 📁 Project Structure

```text
/
├── public/                 # Static assets (images, fonts)
├── db/
│   └── config.ts           # Astro DB Schema definition (Orders table)
├── src/
│   ├── components/
│   │   ├── Menu.tsx             # Interactive customer-facing menu and cart
│   │   └── CounterDashboard.tsx # Staff-facing live order management
│   ├── data/
│   │   └── menu.ts              # TypeScript definitions mapping Loyverse entities
│   ├── lib/
│   │   └── loyverse.ts          # Loyverse API fetch and variation parsing logic
│   ├── pages/
│   │   └── api/                 # Checkout and Order REST API endpoints
│   ├── layouts/
│   └── pages/                   # Astro templates (e.g. index.astro)
```

## 📋 Customization & Workflows

### POS Integration (Loyverse)
The application dynamically builds the menu from **Loyverse POS**.
*   **Setup:** Go to your Loyverse Back Office, generate a Developer API Access Token, and save it in a `.env` file at the root of this project:
    `LOYVERSE_ACCESS_TOKEN=your_token_here`
*   The `fetchMenuData` function automatically groups matching base items into dynamic variation dropdown selectors based on Loyverse properties.

### QR Code Menus
When generating QR Codes for physical tables, append the `table` query parameter to the site URL:
*   **Example Table 5 URL:** `https://your-site.app/?table=5`
When an order is submitted via that link, "Table 5" will appear prominently on the Live Counter Dashboard ticket.

### Theming
The site utilizes a premium matcha theme:
*   **Backgrounds:** Deep slate/grays (`gray-900`, `gray-950`).
*   **Accents:** Emerald greens (`emerald-500` to `emerald-700`) replacing standard reds and oranges. 

## 🧞 Commands

| Command                   | Action                                                |
| :------------------------ | :---------------------------------------------------- |
| `npm run dev`             | Starts local dev server at `localhost:4321`           |
| `npm run build`           | Builds the production site and DB schema to `./dist/` |
| `npm run preview`         | Preview your build locally before deploying           |

---
*Built with ❤️ for Nomade Tibetan Cuisine.*
