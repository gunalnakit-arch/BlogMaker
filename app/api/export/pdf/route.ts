import { NextRequest, NextResponse } from 'next/server';
import { fileSystem } from '@/lib/file-system';
import puppeteer from 'puppeteer';

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
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        // Inject some basic CSS for validation
        const htmlContent = `
      <html>
        <head>
          <style>
            body { font-family: Helvetica, Arial, sans-serif; padding: 40px; line-height: 1.6; }
            h1 { color: #333; }
            p { margin-bottom: 1em; }
          </style>
        </head>
        <body>
          <h1>${post.title || 'Blog Post'}</h1>
          ${post.blogContent}
        </body>
      </html>
    `;

        await page.setContent(htmlContent);
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        await browser.close();

        const headers = new Headers();
        headers.set('Content-Type', 'application/pdf');
        headers.set('Content-Disposition', `attachment; filename="blog-${post.slug || id}.pdf"`);

        return new NextResponse(new Blob([pdfBuffer as any]), { headers });

    } catch (error) {
        console.error('PDF Export Error:', error);
        return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
    }
}
