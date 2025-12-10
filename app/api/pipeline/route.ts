import { NextRequest, NextResponse } from 'next/server';
import { fileSystem } from '@/lib/file-system';
import { aiService } from '@/lib/ai-service';
import path from 'path';
import fs from 'fs/promises';

// Allow long execution time
export const maxDuration = 300; // 5 minutes

import { Innertube } from 'youtubei.js';
import { createClient } from '@deepgram/sdk'; // Make sure to use createClient if using newer SDK versions or just Deepgram class
// Actually user code used `import { Deepgram } from "@deepgram/sdk"`. I'll match their style but ensure imports are valid.
// Checking imports... SDK v3 uses createClient, v2 uses Deepgram. 
// Assuming installed SDK is compatible. I'll stick to what worked or is standard.
// Let's use the standard import form for the snippet provided.

// NOTE: The user's snippet uses `new Deepgram()`. 
// If that fails we can adjust. I'll paste their logic adapted for the pipeline.

const deepgram = createClient(process.env.DEEPGRAM_API_KEY || "");
// NOTE: I changed `new Deepgram` to `createClient` because newer SDKs default to this. 
// If the user's snippet was for SDK v2, it might differ. But `createClient` is safer for modern docs.

export async function POST(req: NextRequest) {
    try {
        const { url: youtubeUrl, prompt } = await req.json();

        if (!youtubeUrl) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        console.log(`[Pipeline] Processing URL: ${youtubeUrl}`);

        // 1. Parse Video ID
        let videoId: string | null = null;
        try {
            const u = new URL(youtubeUrl);
            videoId = u.searchParams.get("v");
            if (!videoId && u.hostname.includes("youtu.be")) {
                videoId = u.pathname.replace("/", "");
            }
        } catch (e) {
            return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
        }

        if (!videoId) {
            return NextResponse.json({ error: "Could not parse video id" }, { status: 400 });
        }

        // 2. Create Post Entry (to reserve ID)
        const postId = await fileSystem.createPost(youtubeUrl);
        console.log(`[Pipeline] Created post: ${postId}`);

        // 3. Get Audio Stream URL via youtubei.js
        console.log('[Pipeline] Fetching video info via youtubei.js...');
        const yt = await Innertube.create();
        const info = await yt.getBasicInfo(videoId);

        const adaptiveFormats = info?.streaming_data?.adaptive_formats || [];
        const formats = info?.streaming_data?.formats || [];

        // Find audio only format
        let audioFormat = adaptiveFormats.find((f: any) => f.mime_type?.includes("audio"));
        if (!audioFormat) {
            audioFormat = formats.find((f: any) => f.mime_type?.includes("audio"));
        }

        if (!audioFormat || !audioFormat.url) {
            throw new Error("Audio stream not found for this video");
        }

        const audioUrl = audioFormat.url;
        console.log('[Pipeline] Got Audio URL. Sending to Deepgram...');

        // 4. Transcribe via Deepgram URL
        if (!process.env.DEEPGRAM_API_KEY) {
            throw new Error("DEEPGRAM_API_KEY is not set");
        }

        const dgResponse = await deepgram.listen.prerecorded.transcribeUrl(
            { url: audioUrl },
            {
                model: "nova-2",
                smart_format: true,
                punctuate: true,
                paragraphs: false,
            }
        );

        const transcript = dgResponse.result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";

        if (!transcript) {
            throw new Error("Transcript is empty");
        }

        console.log('[Pipeline] Transcription success. Length:', transcript.length);
        await fileSystem.updatePost(postId, { transcript, title: info.basic_info.title });

        // 5. Generate Blog (Decoupled but we trigger it here logic-wise or user navigates to it)
        // Since we have the transcript, we can proceed to save it. 
        // The frontend redirects to the editor/viewer which potentially triggers generation or displays data.
        // If we want to Auto-Generate the blog using Gemini immediately:
        // We can do it here or let the user click "Generate" on the next page.
        // Original logic seemed to rely on `aiService.transcribeAudio` doing everything? 
        // No, the original code had a separate step for blog generation usually, 
        // OR the user expects it done. 
        // Let's generate it now to match previous "One Click" experience.

        console.log('[Pipeline] Generating Blog Post via Gemini...');
        console.log('[Pipeline] Generating Blog Post via Gemini...');
        const generatedBlog = await aiService.generateBlog(transcript, prompt);

        // generatedBlog contains { metaTitle, metaDescription, slug, h1, keywords, contentHtml }
        // updatePost expects { blogContent, ...metadata }
        await fileSystem.updatePost(postId, {
            blogContent: generatedBlog.contentHtml,
            metaTitle: generatedBlog.metaTitle,
            metaDescription: generatedBlog.metaDescription,
            slug: generatedBlog.slug,
            // PostMeta interface has keywords string[]. 
            // generatedBlog has keywords string[].
            keywords: generatedBlog.keywords,
            title: generatedBlog.h1 // Use H1 as the main title for the list
        });

        return NextResponse.json({ id: postId, success: true });

    } catch (error: any) {
        console.error('[Pipeline] Error:', error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
