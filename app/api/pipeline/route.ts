// Allow long execution time
export const maxDuration = 300; // 5 minutes
export const runtime = 'nodejs'; // Use Node.js runtime as requested

import { NextRequest, NextResponse } from 'next/server';
import { aiService } from '@/lib/ai-service';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';

// Simple ID generator to avoid uuid package issues
const generateId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

export async function POST(req: NextRequest) {
    try {
        console.log('[Pipeline] Received request');

        // Parse JSON body (base64 encoded file)
        let body;
        try {
            body = await req.json();
        } catch (e: any) {
            console.error('[Pipeline] JSON Parsing Error:', e);
            throw new Error(`Failed to parse request: ${e.message}`);
        }

        const { fileBase64, fileName, prompt } = body;

        if (!fileBase64) {
            return NextResponse.json({ error: 'fileBase64 is required' }, { status: 400 });
        }

        console.log(`[Pipeline] Processing file: ${fileName}, Base64 length: ${fileBase64.length}`);

        // Decode base64 to buffer
        const buffer = Buffer.from(fileBase64, 'base64');
        console.log(`[Pipeline] Decoded buffer size: ${buffer.length} bytes`);

        // Use standard system temp directory
        const tempDir = os.tmpdir();
        const requestId = generateId();
        const tempFilePath = path.join(tempDir, `upload-${requestId}.mp3`);

        try {
            // 1. Save Uploaded Audio to Temp
            console.log('[Pipeline] Saving to temp...', tempFilePath);
            try {
                await fs.writeFile(tempFilePath, buffer);
            } catch (e: any) {
                throw new Error(`Stage 1 (File Save) Failed: ${e.message}`);
            }

            // 2. Transcribe
            console.log('[Pipeline] Transcribing...');
            let transcript = "";
            try {
                transcript = await aiService.transcribeAudio(tempFilePath);
                console.log(`[Pipeline] Transcript length: ${transcript.length}`);
            } catch (e: any) {
                throw new Error(`Stage 2 (Transcription) Failed: ${e.message}`);
            }

            // 3. Generate Blog
            console.log('[Pipeline] Generating Blog Post via Gemini...');
            let generatedBlog;
            try {
                generatedBlog = await aiService.generateBlog(transcript, prompt);
            } catch (e: any) {
                throw new Error(`Stage 3 (Blog Gen) Failed: ${e.message}`);
            }

            // 4. Clean up temp file
            await fs.unlink(tempFilePath).catch(e => console.error('Failed to delete temp file:', e));

            // 5. Return Full Data Payload (Stateless)
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

            return NextResponse.json(responsePayload);

        } catch (error: any) {
            console.error('[Pipeline] Processing Error:', error);
            // Attempt cleanup
            await fs.unlink(tempFilePath).catch(() => { });
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
