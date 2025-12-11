// Separate endpoint for blog generation from transcript
export const maxDuration = 120;
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { aiService } from '@/lib/ai-service';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { transcript, prompt } = body;

        if (!transcript) {
            return NextResponse.json({ error: 'transcript is required' }, { status: 400 });
        }

        console.log(`[GenerateBlog] Generating blog from transcript (${transcript.length} chars)`);

        const generatedBlog = await aiService.generateBlog(transcript, prompt);

        console.log('[GenerateBlog] Success!');

        return NextResponse.json({
            title: generatedBlog.h1,
            content: generatedBlog.contentHtml,
            metaTitle: generatedBlog.metaTitle,
            metaDescription: generatedBlog.metaDescription,
            slug: generatedBlog.slug,
            keywords: generatedBlog.keywords,
        });

    } catch (error: any) {
        console.error('[GenerateBlog] Error:', error);
        return NextResponse.json({ error: `Blog Generation Failed: ${error.message}` }, { status: 500 });
    }
}
