import { NextRequest, NextResponse } from 'next/server';
import { fileSystem } from '@/lib/file-system';
import { aiService } from '@/lib/ai-service';

export const maxDuration = 300; // 5 minutes

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const { prompt } = await req.json();

    const post = await fileSystem.getPost(id);

    if (!post) {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (!post.transcript) {
        return NextResponse.json({ error: 'No transcript found for this post' }, { status: 400 });
    }

    try {
        console.log(`[Generate] Generating blog for post ${id}...`);
        const blogData = await aiService.generateBlog(post.transcript, prompt);

        await fileSystem.updatePost(id, {
            blogContent: blogData.contentHtml,
            metaTitle: blogData.metaTitle,
            metaDescription: blogData.metaDescription,
            slug: blogData.slug,
            keywords: blogData.keywords,
            title: blogData.h1
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[Generate] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
