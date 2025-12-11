// Allow long execution time
export const maxDuration = 60;
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

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

        // Save to temp directory
        const tempDir = os.tmpdir();
        const chunkPath = path.join(tempDir, `chunk-${uploadId}-${chunkIndex}.bin`);

        await fs.writeFile(chunkPath, buffer);

        console.log(`[Chunk] Saved chunk ${chunkIndex} (${buffer.length} bytes) to ${chunkPath}`);

        return NextResponse.json({
            success: true,
            chunkIndex,
            bytesReceived: buffer.length
        });

    } catch (error: any) {
        console.error('[Chunk] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
