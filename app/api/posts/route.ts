// Posts API - Save/List posts from Vercel Blob
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { put, list, del } from '@vercel/blob';

// GET - List all posts
export async function GET() {
    try {
        const { blobs } = await list({ prefix: 'posts/' });

        // Fetch content of each post
        const posts = await Promise.all(
            blobs.map(async (blob) => {
                try {
                    const res = await fetch(blob.url);
                    const data = await res.json();
                    return {
                        ...data,
                        blobUrl: blob.url,
                        uploadedAt: blob.uploadedAt,
                    };
                } catch {
                    return null;
                }
            })
        );

        // Filter out nulls and sort by date
        const validPosts = posts
            .filter(Boolean)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return NextResponse.json({ posts: validPosts });
    } catch (error: any) {
        console.error('[Posts API] List Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST - Save a post
export async function POST(req: NextRequest) {
    try {
        const post = await req.json();

        if (!post.id) {
            return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
        }

        // Save to Blob as JSON
        const blob = await put(`posts/${post.id}.json`, JSON.stringify(post), {
            access: 'public',
            addRandomSuffix: false,
            contentType: 'application/json',
        });

        console.log(`[Posts API] Saved post ${post.id} to Blob`);

        return NextResponse.json({ success: true, url: blob.url });
    } catch (error: any) {
        console.error('[Posts API] Save Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE - Delete a post
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
        }

        // Find and delete the blob
        const { blobs } = await list({ prefix: `posts/${id}` });

        for (const blob of blobs) {
            await del(blob.url);
        }

        console.log(`[Posts API] Deleted post ${id}`);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[Posts API] Delete Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
