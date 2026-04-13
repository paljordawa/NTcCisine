export const prerender = false;
import type { APIRoute } from 'astro';
import { db, Poll, Vote, eq, and } from 'astro:db';

export const GET: APIRoute = async () => {
    try {
        const activePoll = await db.select().from(Poll).where(eq(Poll.isActive, true)).get();
        if (!activePoll) {
            return new Response(JSON.stringify({ poll: null }), { status: 200 });
        }

        const votes = await db.select().from(Vote).where(eq(Vote.pollId, activePoll.id));
        
        // Count votes per option
        const results = (activePoll.options as string[]).map((_, index) => ({
            optionIndex: index,
            count: votes.filter(v => v.optionIndex === index).length
        }));

        return new Response(JSON.stringify({ poll: activePoll, results, totalVotes: votes.length }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: 'Failed to fetch poll' }), { status: 500 });
    }
}

export const POST: APIRoute = async ({ request }) => {
    try {
        const { pollId, optionIndex, tableNumber } = await request.json();
        
        if (pollId === undefined || optionIndex === undefined) {
            return new Response(JSON.stringify({ error: 'Missing pollId or optionIndex' }), { status: 400 });
        }

        await db.insert(Vote).values({
            pollId,
            optionIndex,
            tableNumber,
            createdAt: new Date()
        });

        return new Response(JSON.stringify({ success: true }), { 
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: 'Failed to submit vote' }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export const PATCH: APIRoute = async ({ request }) => {
    try {
        const { question, options } = await request.json();
        
        // Deactivate all old polls
        await db.update(Poll).set({ isActive: false }).where(eq(Poll.isActive, true));

        // Create new active poll
        const newPoll = await db.insert(Poll).values({
            question,
            options, // Astro DB handles arrays/objects in JSON columns
            isActive: true,
            createdAt: new Date()
        }).returning();

        return new Response(JSON.stringify({ poll: newPoll[0] }), { 
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: 'Failed to update poll' }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export const DELETE: APIRoute = async () => {
    try {
        await db.update(Poll).set({ isActive: false }).where(eq(Poll.isActive, true));
        return new Response(JSON.stringify({ success: true }), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: 'Failed to clear poll' }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
