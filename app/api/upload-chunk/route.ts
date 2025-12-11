// Allow long execution time
export const maxDuration = 60;
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { uploadId, chunkIndex, totalChunks, data } = body;

        if (!uploadId || chunkIndex === undefined || !data) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        console.log(`[Chunk] Receiving chunk ${chunkIndex + 1}/${totalChunks} for upload ${uploadId}`);

        // Decode base64 chunk
        const buffer = Buffer.from(data, 'base64');

        // Store chunk in Vercel Blob
        const blobPath = `chunks/${uploadId}/${chunkIndex}.bin`;
        const blob = await put(blobPath, buffer, {
            access: 'public', // Needed to fetch later
            addRandomSuffix: false, // Keep predictable path
        });

        console.log(`[Chunk] Saved chunk ${chunkIndex} (${buffer.length} bytes) to Blob: ${blob.url}`);

        return NextResponse.json({
            success: true,
            chunkIndex,
            bytesReceived: buffer.length,
            blobUrl: blob.url
        });

    } catch (error: any) {
        console.error('[Chunk] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
