// Allow long execution time
export const maxDuration = 300; // 5 minutes for transcription + blog generation
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { aiService } from '@/lib/ai-service';
import { list, del } from '@vercel/blob';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';

// Simple ID generator
const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

export async function POST(req: NextRequest) {
    try {
        console.log('[Finalize] Received request');

        const body = await req.json();
        const { uploadId, totalChunks, fileName, prompt } = body;

        if (!uploadId || !totalChunks) {
            return NextResponse.json({ error: 'Missing uploadId or totalChunks' }, { status: 400 });
        }

        console.log(`[Finalize] Merging ${totalChunks} chunks for upload ${uploadId}`);

        const tempDir = os.tmpdir();
        const requestId = generateId();
        const mergedFilePath = path.join(tempDir, `merged-${requestId}.mp3`);

        try {
            // 1. Fetch all chunk URLs from Vercel Blob
            console.log('[Finalize] Stage 1: Fetching chunks from Blob...');
            const { blobs } = await list({ prefix: `chunks/${uploadId}/` });

            if (blobs.length === 0) {
                throw new Error('No chunks found in Blob storage');
            }

            console.log(`[Finalize] Found ${blobs.length} blobs`);

            // Sort blobs by chunk index (extracted from pathname)
            blobs.sort((a, b) => {
                const indexA = parseInt(a.pathname.split('/').pop()?.replace('.bin', '') || '0');
                const indexB = parseInt(b.pathname.split('/').pop()?.replace('.bin', '') || '0');
                return indexA - indexB;
            });

            // 2. Download and merge chunks
            console.log('[Finalize] Stage 2: Downloading and merging...');
            const chunks: Buffer[] = [];

            for (const blob of blobs) {
                try {
                    const response = await fetch(blob.url);
                    const arrayBuffer = await response.arrayBuffer();
                    const chunkBuffer = Buffer.from(arrayBuffer);
                    chunks.push(chunkBuffer);
                    console.log(`[Finalize] Downloaded ${blob.pathname} (${chunkBuffer.length} bytes)`);
                } catch (e: any) {
                    throw new Error(`Failed to download chunk ${blob.pathname}: ${e.message}`);
                }
            }

            const mergedBuffer = Buffer.concat(chunks);
            console.log(`[Finalize] Total merged size: ${mergedBuffer.length} bytes`);

            // Save merged file to temp for processing
            await fs.writeFile(mergedFilePath, mergedBuffer);

            // 3. Clean up Blob chunks
            console.log('[Finalize] Cleaning up Blob chunks...');
            for (const blob of blobs) {
                await del(blob.url).catch(e => console.error(`Failed to delete ${blob.url}:`, e));
            }

            // 4. Transcribe
            console.log('[Finalize] Stage 3: Transcribing...');
            let transcript = "";
            try {
                transcript = await aiService.transcribeAudio(mergedFilePath);
                console.log(`[Finalize] Transcript length: ${transcript.length}`);
            } catch (e: any) {
                throw new Error(`Transcription Failed: ${e.message}`);
            }

            // 5. Generate Blog
            console.log('[Finalize] Stage 4: Generating Blog...');
            let generatedBlog;
            try {
                generatedBlog = await aiService.generateBlog(transcript, prompt);
            } catch (e: any) {
                throw new Error(`Blog Generation Failed: ${e.message}`);
            }

            // 6. Clean up temp merged file
            await fs.unlink(mergedFilePath).catch(() => { });

            // 7. Return result
            const responsePayload = {
                id: requestId,
                title: generatedBlog.h1,
                content: generatedBlog.contentHtml,
                metaTitle: generatedBlog.metaTitle,
                metaDescription: generatedBlog.metaDescription,
                slug: generatedBlog.slug,
                keywords: generatedBlog.keywords,
                createdAt: new Date().toISOString(),
                transcript: transcript
            };

            console.log('[Finalize] Success!');
            return NextResponse.json(responsePayload);

        } catch (error: any) {
            console.error('[Finalize] Error:', error);
            await fs.unlink(mergedFilePath).catch(() => { });
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

