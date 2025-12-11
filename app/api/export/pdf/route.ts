// PDF Export API - Returns HTML for client-side PDF generation
// Note: Server-side PDF generation requires C++ binaries not available on Vercel
// Client will use window.print() or a JS library like html2pdf
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { title, content, metaDescription } = await req.json();

        if (!content) {
            return NextResponse.json({ error: 'Content is required' }, { status: 400 });
        }

        // Generate printable HTML
        const html = `
<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <title>${title || 'Blog Post'}</title>
    <style>
        body {
            font-family: 'Georgia', serif;
            max-width: 800px;
            margin: 40px auto;
            padding: 20px;
            line-height: 1.8;
            color: #333;
        }
        h1 {
            color: #1a1a1a;
            border-bottom: 2px solid #eee;
            padding-bottom: 10px;
        }
        h2, h3 { color: #2a2a2a; margin-top: 30px; }
        p { margin: 16px 0; }
        ul, ol { margin: 16px 0; padding-left: 30px; }
        li { margin: 8px 0; }
        blockquote {
            border-left: 4px solid #ddd;
            padding-left: 20px;
            margin: 20px 0;
            color: #666;
            font-style: italic;
        }
        .meta {
            color: #888;
            font-style: italic;
            margin-bottom: 30px;
        }
        @media print {
            body { margin: 0; padding: 20px; }
        }
    </style>
</head>
<body>
    <h1>${title || 'Blog Post'}</h1>
    ${metaDescription ? `<p class="meta">${metaDescription}</p>` : ''}
    ${content}
</body>
</html>`;

        return new NextResponse(html, {
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
            },
        });

    } catch (error: any) {
        console.error('[PDF Export] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
