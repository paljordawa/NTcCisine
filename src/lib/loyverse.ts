import type { MainCategory, SubCategory, MenuItem } from '../data/menu';

export async function fetchMenuData(): Promise<MainCategory[]> {
  const token = import.meta.env.LOYVERSE_ACCESS_TOKEN;
  if (!token) {
    console.warn("LOYVERSE_ACCESS_TOKEN is missing. Returning empty menu.");
    return [];
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  try {
    const [catRes, itemsRes] = await Promise.all([
      fetch('https://api.loyverse.com/v1.0/categories', { headers }),
      fetch('https://api.loyverse.com/v1.0/items?limit=250', { headers })
    ]);

    if (!catRes.ok || !itemsRes.ok) {
        console.error("Failed to fetch from Loyverse API", await catRes.text(), await itemsRes.text());
        return [];
    }

    const catData = await catRes.json();
    const itemsData = await itemsRes.json();

    // Group items by category_id
    const itemsByCategory = new Map<string, any[]>();
    for (const item of itemsData.items) {
      if (!itemsByCategory.has(item.category_id)) {
        itemsByCategory.set(item.category_id, []);
      }
      itemsByCategory.get(item.category_id)!.push(item);
    }

    // Process categories into Main / Sub structure
    const mainCategoryMap = new Map<string, MainCategory>();

    for (const category of catData.categories) {
      const rawItems = itemsByCategory.get(category.id) || [];
      if (rawItems.length === 0) continue; // Skip empty categories

      // Parse Category Name (e.g., "Deserts / Classiques")
      const nameParts = category.name.split('/').map((p: string) => p.trim());
      const mainName = nameParts[0] || 'Other';
      const subName = nameParts.length > 1 ? nameParts[1] : mainName;

      // Ensure Main Category exists
      let mainCat = mainCategoryMap.get(mainName);
      if (!mainCat) {
        mainCat = {
          id: mainName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          name: mainName,
          subCategories: []
        };
        mainCategoryMap.set(mainName, mainCat);
      }

      // Format Items
      const menuItems: MenuItem[] = rawItems.map(item => {
        const variant = item.variants?.[0] || {};
        const variantId = variant.variant_id || item.id;
        // Loyverse prices are often stored as standard numbers (e.g. 150 -> maybe 1.50 or just exact 150)
        // Adjust this depending on your currency logic. Assuming exact numeric values for now.
        const defaultPrice = variant.default_price || variant.stores?.[0]?.price || 0;
        
        return {
          id: variantId, // React key
          item_id: item.id,
          variant_id: variantId,
          name: item.item_name,
          description: (item.description || '').replace(/<[^>]*>?/gm, ''),
          price: `CHF ${Number(defaultPrice).toFixed(2)}`, // Adjust symbol as needed
          image: item.image_url || 'https://placehold.co/400x300?text=' + encodeURIComponent(item.item_name),
          tags: [] // Loyverse doesn't have default tags, but we could parse them from descriptions if needed
        };
      });

      // Add to SubCategories
      mainCat.subCategories.push({
        id: category.id,
        name: subName,
        items: menuItems
      });
    }

    // Convert map to array
    return Array.from(mainCategoryMap.values());

  } catch (error) {
    console.error("Error fetching Loyverse menu data:", error);
    return [];
  }
}
