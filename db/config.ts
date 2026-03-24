import { defineDb, defineTable, column } from 'astro:db';

const Order = defineTable({
  columns: {
    id: column.text({ primaryKey: true }),
    cartItems: column.json(),
    cartTotal: column.number(),
    status: column.text({ default: 'pending' }), // 'pending', 'accepted', 'rejected'
    createdAt: column.date(),
  }
});

// https://astro.build/db/config
export default defineDb({
  tables: { Order }
});
