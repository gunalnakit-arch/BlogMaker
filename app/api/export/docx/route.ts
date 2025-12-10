import { NextRequest, NextResponse } from 'next/server';
import { fileSystem } from '@/lib/file-system';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const post = await fileSystem.getPost(id);
    if (!post) {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    try {
        // Basic HTML to DOCX mapper
        // Note: A full HTML parser is complex. Here we split by paragraphs and headers roughly.
        // For a real robust solution, we'd need 'html-to-docx', but we use 'docx' primitive here as requested.

        const children = [];

        // Add Title
        children.push(new Paragraph({
            text: post.title || 'Blog Post',
            heading: HeadingLevel.TITLE,
            spacing: { after: 300 }
        }));

        // Naive HTML strip and split. 
        // In production, use 'cheerio' or 'html-to-docx'. 
        // Here we will just strip tags and put everything in paragraphs for safety, 
        // assuming Gemini output is clean paragraphs.

        const lines = post.blogContent
            .replace(/<\/p>/g, '\n')
            .replace(/<br\s*\/?>/g, '\n')
            .replace(/<\/h[1-6]>/g, '\n')
            .split('\n')
            .map(line => line.replace(/<[^>]*>/g, '').trim()) // Strip remaining tags
            .filter(line => line.length > 0);

        lines.forEach(line => {
            children.push(new Paragraph({
                children: [new TextRun(line)],
                spacing: { after: 200 }
            }));
        });

        const doc = new Document({
            sections: [{
                properties: {},
                children: children,
            }],
        });

        const buffer = await Packer.toBuffer(doc);

        const headers = new Headers();
        headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        headers.set('Content-Disposition', `attachment; filename="blog-${post.slug || id}.docx"`);

        return new NextResponse(new Blob([buffer as any]), { headers });

    } catch (error) {
        console.error('DOCX Export Error:', error);
        return NextResponse.json({ error: 'Failed to generate DOCX' }, { status: 500 });
    }
}
