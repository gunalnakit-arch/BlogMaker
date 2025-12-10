import { NextResponse } from 'next/server';
import { fileSystem } from '@/lib/file-system';

export async function GET() {
    const posts = await fileSystem.getPosts();
    return NextResponse.json(posts);
}
