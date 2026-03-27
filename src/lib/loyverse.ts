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
        const variantsData = item.variants || [];
        
        const variants = variantsData.map((v: any) => {
          const opts = [v.option1_value, v.option2_value, v.option3_value].filter(Boolean);
          const name = opts.length > 0 ? opts.join(' / ') : 'Standard';
          const priceVal = v.default_price ?? v.stores?.[0]?.price ?? 0;
          return {
            variant_id: v.variant_id || item.id,
            name,
            price: `CHF ${Number(priceVal).toFixed(2)}`
          };
        });

        const displayPrice = variants.length > 0 ? variants[0].price : "CHF 0.00";

        return {
          id: item.id, // React key
          item_id: item.id,
          name: item.item_name,
          description: (item.description || '').replace(/<[^>]*>?/gm, ''),
          price: displayPrice,
          image: item.image_url || 'https://placehold.co/400x300?text=' + encodeURIComponent(item.item_name),
          tags: [],
          variants
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
