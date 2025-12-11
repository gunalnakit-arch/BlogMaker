// DOCX Export API
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

// Simple HTML to text converter
function htmlToText(html: string): string {
    return html
        .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n\n$1\n\n')
        .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<li[^>]*>(.*?)<\/li>/gi, '• $1\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

export async function POST(req: NextRequest) {
    try {
        const { title, content, metaDescription } = await req.json();

        if (!content) {
            return NextResponse.json({ error: 'Content is required' }, { status: 400 });
        }

        const plainText = htmlToText(content);
        const paragraphs = plainText.split('\n\n').filter(Boolean);

        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    // Title
                    new Paragraph({
                        text: title || 'Blog Post',
                        heading: HeadingLevel.HEADING_1,
                        spacing: { after: 400 },
                    }),
                    // Description
                    ...(metaDescription ? [
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: metaDescription,
                                    italics: true,
                                    color: '666666',
                                }),
                            ],
                            spacing: { after: 400 },
                        }),
                    ] : []),
                    // Content paragraphs
                    ...paragraphs.map(text =>
                        new Paragraph({
                            children: [new TextRun({ text })],
                            spacing: { after: 200 },
                        })
                    ),
                ],
            }],
        });

        const buffer = await Packer.toBuffer(doc);

        return new NextResponse(new Uint8Array(buffer), {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="${(title || 'blog-post').replace(/[^a-z0-9]/gi, '-')}.docx"`,
            },
        });

    } catch (error: any) {
        console.error('[DOCX Export] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
