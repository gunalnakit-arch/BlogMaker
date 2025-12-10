import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const DATA_DIR = path.join(process.cwd(), 'data', 'posts');

export interface PostMeta {
    id: string;
    url: string;
    title?: string;
    createdAt: string;
    transcriptPath: string;
    blogPath: string;
    metaTitle?: string;
    metaDescription?: string;
    slug?: string;
    keywords?: string[];
}

export interface PostDetail extends PostMeta {
    transcript: string;
    blogContent: string;
}

// Ensure data directory exists
const init = async () => {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
    } catch (error) {
        console.error('Failed to initialize data directory:', error);
    }
};
init();

export const fileSystem = {
    async createPost(url: string): Promise<string> {
        const id = uuidv4();
        const postDir = path.join(DATA_DIR, id);

        await fs.mkdir(postDir, { recursive: true });

        const initialMeta: PostMeta = {
            id,
            url,
            createdAt: new Date().toISOString(),
            transcriptPath: 'transcript.txt',
            blogPath: 'blog.html'
        };

        await fs.writeFile(
            path.join(postDir, 'meta.json'),
            JSON.stringify(initialMeta, null, 2)
        );

        // Initialize empty files
        await fs.writeFile(path.join(postDir, 'transcript.txt'), '');
        await fs.writeFile(path.join(postDir, 'blog.html'), '');

        return id;
    },

    async getPosts(): Promise<PostMeta[]> {
        try {
            const dirs = await fs.readdir(DATA_DIR);
            const posts: PostMeta[] = [];

            for (const dir of dirs) {
                if (dir.startsWith('.')) continue; // skip .DS_Store etc

                try {
                    const metaPath = path.join(DATA_DIR, dir, 'meta.json');
                    const metaContent = await fs.readFile(metaPath, 'utf-8');
                    posts.push(JSON.parse(metaContent));
                } catch (e) {
                    console.error(`Failed to read post ${dir}:`, e);
                }
            }

            return posts.sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
        } catch (error) {
            console.error('Error reading posts:', error);
            return [];
        }
    },

    async getPost(id: string): Promise<PostDetail | null> {
        try {
            const postDir = path.join(DATA_DIR, id);

            const metaPath = path.join(postDir, 'meta.json');
            const transcriptPath = path.join(postDir, 'transcript.txt');
            const blogPath = path.join(postDir, 'blog.html');

            const [metaStr, transcript, blogContent] = await Promise.all([
                fs.readFile(metaPath, 'utf-8'),
                fs.readFile(transcriptPath, 'utf-8'),
                fs.readFile(blogPath, 'utf-8')
            ]);

            const meta = JSON.parse(metaStr);

            return {
                ...meta,
                transcript,
                blogContent
            };
        } catch (error) {
            console.error(`Error fetching post ${id}:`, error);
            return null;
        }
    },

    async updatePost(id: string, data: Partial<PostDetail>) {
        const postDir = path.join(DATA_DIR, id);

        // 1. Update Meta
        if (data.metaTitle || data.metaDescription || data.title || data.slug || data.keywords) {
            const metaPath = path.join(postDir, 'meta.json');
            const currentMeta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));

            const newMeta = {
                ...currentMeta,
                ...data,
            };
            // Clean up fields that shouldn't be in meta file if passed by accident
            delete (newMeta as any).transcript;
            delete (newMeta as any).blogContent;

            await fs.writeFile(metaPath, JSON.stringify(newMeta, null, 2));
        }

        // 2. Update Transcript
        if (data.transcript !== undefined) {
            await fs.writeFile(path.join(postDir, 'transcript.txt'), data.transcript);
        }

        // 3. Update Blog
        if (data.blogContent !== undefined) {
            await fs.writeFile(path.join(postDir, 'blog.html'), data.blogContent);
        }
    },

    async getPostPath(id: string): Promise<string> {
        return path.join(DATA_DIR, id);
    }
};
