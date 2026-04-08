import { defineDb, defineTable, column } from 'astro:db';

const Order = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    cartItems: column.json(),
    cartTotal: column.number(),
    status: column.text({ default: 'pending' }), // 'pending', 'accepted', 'ready', 'rejected'
    createdAt: column.date(),
    tableNumber: column.text({ optional: true }),
  }
});

const StoreSettings = defineTable({
    columns: {
        id: column.number({ primaryKey: true }),
        isOrderingPaused: column.boolean({ default: false }),
        storePin: column.text({ optional: true, default: '0000' })
    }
});

// https://astro.build/db/config
export default defineDb({
  tables: { Order, StoreSettings }
});
