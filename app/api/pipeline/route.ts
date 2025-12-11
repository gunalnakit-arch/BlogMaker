// Allow long execution time
export const maxDuration = 300; // 5 minutes
export const runtime = 'nodejs'; // Use Node.js runtime as requested

import { NextRequest, NextResponse } from 'next/server';
import { aiService } from '@/lib/ai-service';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
    try {
        console.log('[Pipeline] Received request');

        let formData: FormData;
        try {
            formData = await req.formData();
        } catch (e: any) {
            console.error('[Pipeline] FormData Parsing Error:', e);
            throw new Error(`Failed to parse upload: ${e.message}`);
        }

        const file = formData.get('file') as File;
        const prompt = formData.get('prompt') as string;

        if (!file) {
            return NextResponse.json({ error: 'File is required' }, { status: 400 });
        }

        console.log(`[Pipeline] Processing file: ${file.name}, Size: ${file.size}`);

        // Use standard system temp directory
        const tempDir = os.tmpdir();
        const tempFilePath = path.join(tempDir, `upload-${uuidv4()}.mp3`);

        try {
            // 1. Save Uploaded Audio to Temp
            console.log('[Pipeline] Saving to temp...', tempFilePath);
            const buffer = Buffer.from(await file.arrayBuffer());
            await fs.writeFile(tempFilePath, buffer);

            // 2. Transcribe
            console.log('[Pipeline] Transcribing...');
            const transcript = await aiService.transcribeAudio(tempFilePath);
            console.log(`[Pipeline] Transcript length: ${transcript.length}`);

            // 3. Generate Blog
            console.log('[Pipeline] Generating Blog Post via Gemini...');
            const generatedBlog = await aiService.generateBlog(transcript, prompt);

            // 4. Clean up temp file
            await fs.unlink(tempFilePath).catch(e => console.error('Failed to delete temp file:', e));

            // 5. Return Full Data Payload (Stateless)
            const responsePayload = {
                id: uuidv4(),
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
