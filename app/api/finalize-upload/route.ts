// Allow long execution time
export const maxDuration = 300; // 5 minutes for transcription + blog generation
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { aiService } from '@/lib/ai-service';
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
            // 1. Read and merge all chunks
            console.log('[Finalize] Stage 1: Merging chunks...');
            const chunks: Buffer[] = [];

            for (let i = 0; i < totalChunks; i++) {
                const chunkPath = path.join(tempDir, `chunk-${uploadId}-${i}.bin`);
                try {
                    const chunkData = await fs.readFile(chunkPath);
                    chunks.push(chunkData);
                    console.log(`[Finalize] Read chunk ${i} (${chunkData.length} bytes)`);
                } catch (e: any) {
                    throw new Error(`Failed to read chunk ${i}: ${e.message}`);
                }
            }

            const mergedBuffer = Buffer.concat(chunks);
            console.log(`[Finalize] Total merged size: ${mergedBuffer.length} bytes`);

            // Save merged file
            await fs.writeFile(mergedFilePath, mergedBuffer);

            // 2. Clean up chunk files
            for (let i = 0; i < totalChunks; i++) {
                const chunkPath = path.join(tempDir, `chunk-${uploadId}-${i}.bin`);
                await fs.unlink(chunkPath).catch(() => { });
            }

            // 3. Transcribe
            console.log('[Finalize] Stage 2: Transcribing...');
            let transcript = "";
            try {
                transcript = await aiService.transcribeAudio(mergedFilePath);
                console.log(`[Finalize] Transcript length: ${transcript.length}`);
            } catch (e: any) {
                throw new Error(`Transcription Failed: ${e.message}`);
            }

            // 4. Generate Blog
            console.log('[Finalize] Stage 3: Generating Blog...');
            let generatedBlog;
            try {
                generatedBlog = await aiService.generateBlog(transcript, prompt);
            } catch (e: any) {
                throw new Error(`Blog Generation Failed: ${e.message}`);
            }

            // 5. Clean up merged file
            await fs.unlink(mergedFilePath).catch(() => { });

            // 6. Return result
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
            // Attempt cleanup
            await fs.unlink(mergedFilePath).catch(() => { });
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
