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
        isPollEnabled: column.boolean({ default: true }),
        isFeedbackEnabled: column.boolean({ default: true }),
        storePin: column.text({ optional: true, default: '0000' }),
        networkIpLock: column.text({ optional: true, deprecated: true })
    }
});

const Feedback = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    content: column.text(),
    rating: column.number(),
    createdAt: column.date(),
    tableNumber: column.text({ optional: true }),
  }
});

const Poll = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    question: column.text(),
    options: column.json(), // Array of strings: ["Option A", "Option B"]
    isActive: column.boolean({ default: true }),
    createdAt: column.date(),
  }
});

const Vote = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    pollId: column.number({ references: () => Poll.columns.id }),
    optionIndex: column.number(),
    createdAt: column.date(),
    tableNumber: column.text({ optional: true }),
  }
});

// https://astro.build/db/config
export default defineDb({
  tables: { Order, StoreSettings, Feedback, Poll, Vote }
});
