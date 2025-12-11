// Allow long execution time
export const maxDuration = 300; // 5 minutes
export const runtime = 'nodejs'; // Use Node.js runtime as requested

import { NextRequest, NextResponse } from 'next/server';
import { fileSystem } from '@/lib/file-system';
import { aiService } from '@/lib/ai-service';
import { createClient } from '@deepgram/sdk';
import path from 'path';
import fs from 'fs/promises';

const deepgram = createClient(process.env.DEEPGRAM_API_KEY || "");

export async function POST(req: NextRequest) {
    try {
        try {
            console.log('[Pipeline] Received request');
            let formData: FormData;
            try {
                formData = await req.formData();
            } catch (e: any) {
                console.error('[Pipeline] FormData Parsing Error:', e);
                // This specific error "string did not match..." often comes from headers/parsing
                throw new Error(`Failed to parse upload: ${e.message}`);
            }

            const file = formData.get('file') as File;
            const prompt = formData.get('prompt') as string;

            if (!file) {
                return NextResponse.json({ error: 'File is required' }, { status: 400 });
            }

            console.log(`[Pipeline] File: ${file.name}, Size: ${file.size}, Type: ${file.type}`);

            // 1. Create Post Entry (Folder)
            // Use filename as the "URL" / source identifier
            const postId = await fileSystem.createPost(file.name);
            console.log(`[Pipeline] Created post: ${postId} for file: ${file.name} `);

            const postPath = await fileSystem.getPostPath(postId);
            const audioPath = path.join(postPath, 'audio.mp3');

            try {
                // 2. Save Uploaded Audio
                console.log('[Pipeline] Saving uploaded audio...');
                const buffer = Buffer.from(await file.arrayBuffer());
                await fs.writeFile(audioPath, buffer);

                // 3. Transcribe
                console.log('[Pipeline] Transcribing...');
                const transcript = await aiService.transcribeAudio(audioPath);
                await fileSystem.updatePost(postId, { transcript, title: file.name });

                // 4. Generate Blog
                console.log('[Pipeline] Generating Blog Post via Gemini...');
                const generatedBlog = await aiService.generateBlog(transcript, prompt);

                await fileSystem.updatePost(postId, {
                    blogContent: generatedBlog.contentHtml,
                    metaTitle: generatedBlog.metaTitle,
                    metaDescription: generatedBlog.metaDescription,
                    slug: generatedBlog.slug,
                    keywords: generatedBlog.keywords,
                    title: generatedBlog.h1
                });

                return NextResponse.json({ id: postId, success: true });

            } catch (error: any) {
                console.error('[Pipeline] Error:', error);
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

        } catch (error: any) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
    }
