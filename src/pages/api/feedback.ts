export const prerender = false;
import type { APIRoute } from 'astro';
import { db, Feedback } from 'astro:db';

export const GET: APIRoute = async () => {
    try {
        const feedbacks = await db.select().from(Feedback);
        feedbacks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        
        return new Response(JSON.stringify({ feedbacks: feedbacks.slice(0, 100) }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: 'Failed to fetch feedback' }), { status: 500 });
    }
}

export const POST: APIRoute = async ({ request }) => {
    try {
        const { content, rating, tableNumber } = await request.json();
        
        if (!content || !rating) {
            return new Response(JSON.stringify({ error: 'Missing content or rating' }), { status: 400 });
        }

        await db.insert(Feedback).values({
            content,
            rating,
            tableNumber,
            createdAt: new Date()
        });

        return new Response(JSON.stringify({ success: true }), { status: 201 });
    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: 'Failed to submit feedback' }), { status: 500 });
    }
}
