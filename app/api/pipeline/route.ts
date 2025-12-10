import { NextRequest, NextResponse } from 'next/server';
import { fileSystem } from '@/lib/file-system';
import { youtubeService } from '@/lib/youtube';
import { aiService } from '@/lib/ai-service';
import path from 'path';
import fs from 'fs/promises';

// Allow long execution time
export const maxDuration = 300; // 5 minutes

export async function POST(req: NextRequest) {
    try {
        const { url, prompt } = await req.json();

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        // 1. Create Post Entry (Folder)
        const postId = await fileSystem.createPost(url);
        console.log(`[Pipeline] Created post: ${postId}`);

        const postPath = await fileSystem.getPostPath(postId);
        const audioPath = path.join(postPath, 'audio.mp3');

        try {
            // 2. Download Audio
            console.log('[Pipeline] Downloading audio...');
            await youtubeService.downloadAudio(url, audioPath);

            // 3. Transcribe
            console.log('[Pipeline] Transcribing...');
            const transcript = await aiService.transcribeAudio(audioPath);
            await fileSystem.updatePost(postId, { transcript });

            // 4. Generate Blog SKIPPED (Decoupled)
            console.log('[Pipeline] Transcription done. Saving...');

            // Save initial meta with title as 'New Transcription' or video title if available
            // getting video info would be good here but for now just use ID or we can fetch info in youtube service
            // Let's rely on the fileSystem.createPost which sets defaults. 
            // We can actually try to get the video title if we want, but let's keep it simple as requested.

            // Just ensure we save the transcript status
            await fileSystem.updatePost(postId, { transcript });

            return NextResponse.json({ id: postId, success: true });

        } catch (error: any) {
            console.error('[Pipeline] Error:', error);
            // In case of error, we still return the ID so user can see "Failed" state or partial data?
            // For now, let's just 500.
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
