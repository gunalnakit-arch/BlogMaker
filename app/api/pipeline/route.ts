import { NextRequest, NextResponse } from 'next/server';
import { fileSystem } from '@/lib/file-system';
import { aiService } from '@/lib/ai-service';
import { Innertube } from 'youtubei.js';
import { createClient } from '@deepgram/sdk';

// Allow long execution time
export const maxDuration = 300; // 5 minutes
export const runtime = 'nodejs'; // Use Node.js runtime as requested

const deepgram = createClient(process.env.DEEPGRAM_API_KEY || "");

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const youtubeUrl = body.url || body.youtubeUrl; // Support both format
        const prompt = body.prompt;

        if (!youtubeUrl) {
            return NextResponse.json({ error: 'youtubeUrl is required' }, { status: 400 });
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
        console.log('[Pipeline] Fetching video info via youtubei.js (Android Client)...');
        const yt = await Innertube.create();

        // Use ANDROID client as requested
        const info = await yt.getInfo(videoId, { client: 'ANDROID' });

        // Use standard selection method
        const format = info.chooseFormat({ type: 'audio', quality: 'best' });

        if (!format) {
            throw new Error("Audio stream not found (no suitable audio format)");
        }

        let audioUrl: string | undefined;

        // Adapted decipher logic: check type and await if function
        // This handles explicit signature deciphering required for many videos
        if (typeof (format as any).decipher === 'function') {
            audioUrl = await (format as any).decipher(yt.session.player);
        } else {
            audioUrl = (format as any).url;
        }

        if (!audioUrl) {
            throw new Error("Audio stream not found for this video (no playable url)");
        }

        console.log('[Pipeline] Got Audio URL. Sending to Deepgram...');

        // 4. Transcribe via Deepgram URL
        if (!process.env.DEEPGRAM_API_KEY) {
            throw new Error("DEEPGRAM_API_KEY is not set");
        }

        // Adapted for Deepgram SDK v4 (listen.prerecorded.transcribeUrl)
        const dgResponse = await deepgram.listen.prerecorded.transcribeUrl(
            { url: audioUrl },
            {
                model: "nova-2",
                language: 'tr', // Defaulting to TR as per project context
                smart_format: true,
                punctuate: true,
                paragraphs: false,
            }
        );

        const transcript = dgResponse.result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";

        if (!transcript) {
            throw new Error("Transcript is empty");
        }

        console.log(`[Pipeline] Transcription success. Length: ${transcript.length}`);

        // Save transcript
        const videoTitle = info.basic_info?.title || "Unknown Video";
        await fileSystem.updatePost(postId, { transcript, title: videoTitle });

        // 5. Generate Blog
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

        // Return JSON with ID so frontend can redirect
        return NextResponse.json({ id: postId, success: true });

    } catch (error: any) {
        console.error('[Pipeline] Error:', error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
