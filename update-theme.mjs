import fs from 'fs';
import path from 'path';

function replaceInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Replace amber theme with emerald theme
    content = content.replace(/amber-/g, 'emerald-');
    
    // For Menu component, update the red price tags to an aesthetic green
    if (filePath.endsWith('Menu.tsx')) {
        content = content.replace(/bg-red-600\/90/g, 'bg-emerald-700/90');
        content = content.replace(/bg-red-600/g, 'bg-emerald-700');
        // Also update the cart notification red badge (optional but looks nice)
        // content = content.replace(/bg-red-600/g, 'bg-emerald-700'); // done above
    }
    
    fs.writeFileSync(filePath, content, 'utf-8');
}

const files = [
    'src/pages/index.astro',
    'src/layouts/Layout.astro',
    'src/components/Menu.tsx',
    'src/components/CounterDashboard.tsx'
];

files.forEach(f => {
    const p = path.join(process.cwd(), f);
    if(fs.existsSync(p)) {
        replaceInFile(p);
    }
});
