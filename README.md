# Nomade Tibetan Cuisine - Restaurant Menu Web App

[https://ntcucine.netlify.app/](https://ntcucine.netlify.app/)

This is a modern, responsive web application for a Tibetan restaurant called "Nomade Tibetan Cuisine". It displays a categorized food and beverage menu using a beautiful, dark-themed UI.

## 🚀 Features

*   **Responsive Design:** Fully responsive layout that looks great on both mobile and desktop.
*   **Dynamic Menu System:** A two-tier tab system handling main categories (Food/Beverages) and subcategories (Starters, Momos, etc.).
*   **Rich Aesthetics:** Premium dark-mode styling with subtle gradients, glassmorphism effects, and a custom Tibetan background pattern.
*   **Performance:** Built with Astro for incredibly fast, zero-JS-by-default page loads.
*   **Modern Interactive Components:** React components for interactive state management (tab switching).

## 🛠️ Tech Stack

*   **Framework:** [Astro](https://astro.build/) - For fast static site generation and component islands.
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework for rapid UI development.
*   **UI Components:** React (embedded as Astro Islands using `client:load`).
*   **Icons:** `lucide-react` for beautiful, scalable SVG icons.

## 📁 Project Structure

```text
/
├── public/
│   ├── tibetan-pattern.avif       # Background pattern asset
│   └── Tibetan-cuisine.jpg        # Hero area background image
├── src/
│   ├── components/
│   │   └── Menu.tsx               # Primary interactive React component handling the menu state and rendering
│   ├── layouts/
│   │   └── Layout.astro           # Main HTML shell, global CSS, and fonts
│   └── pages/
│       └── index.astro            # Application homepage (Hero section and Menu container)
├── astro.config.mjs               # Astro configuration file
├── tailwind.config.mjs            # Tailwind CSS configuration theme and customizations
└── package.json                   # Project dependencies and operational scripts
```

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `pnpm install`            | Installs dependencies (requires pnpm)            |
| `pnpm run dev`            | Starts local dev server at `localhost:4321`      |
| `pnpm run build`          | Build your production site to `./dist/`          |
| `pnpm run preview`        | Preview your build locally, before deploying     |

## 🎨 Design System

The application uses a custom Tailwind configuration (`tailwind.config.mjs`) extending the default palette:
*   **Primary Accent:** Amber (`amber-500` to `amber-700`) representing warmth and spices.
*   **Backgrounds:** Deep grays/blacks (`gray-900`, `gray-950`) with slate undertones (`slate-800`).
*   **Typography:** 'Inter' font family for clean, modern readability.

## 📝 Modification Guide

### Adding New Menu Items
To add or modify menu items, edit the `menuData` object located at the top of `src/components/Menu.tsx`. The data is structured hierarchically:
`Main Category` -> `Subcategory` -> `Array of Item Objects`.

### Changing Background Images
The hero and pattern images are controlled in `src/pages/index.astro`. Replace the files in the `public/` folder and update the filenames in the `.astro` file if necessary.

### POS Integration (Loyverse)
The application is set up to automatically send web orders to **Loyverse POS**.
*   **Documentation:** [Loyverse Developer API](https://developer.loyverse.com/docs/)
*   **Setup:** You must generate an Access Token from your Loyverse Back Office and save it in a `.env` file at the root of this project as `LOYVERSE_ACCESS_TOKEN=your_token_here`.

---
*Built with ❤️ for Nomade Tibetan Cuisine.*
