'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, FileText, Trash2, Plus, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface Post {
    id: string;
    title?: string;
    metaTitle?: string;
    metaDescription?: string;
    createdAt: string;
    content?: string;
    blogContent?: string;
}

export default function Dashboard() {
    const router = useRouter();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPosts();
    }, []);

    const loadPosts = async () => {
        try {
            const res = await fetch('/api/posts');
            const data = await res.json();
            setPosts(data.posts || []);
        } catch (error) {
            toast.error('Failed to load posts');
        } finally {
            setLoading(false);
        }
    };

    const deletePost = async (id: string) => {
        if (!confirm('Are you sure you want to delete this post?')) return;

        try {
            await fetch(`/api/posts?id=${id}`, { method: 'DELETE' });
            setPosts(posts.filter(p => p.id !== id));
            localStorage.removeItem(`post-${id}`);
            toast.success('Post deleted');
        } catch (error) {
            toast.error('Failed to delete post');
        }
    };

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 px-4">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/">
                        <Button variant="ghost" size="icon" className="hover:bg-white/10 rounded-full">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            Dashboard
                        </h1>
                        <p className="text-muted-foreground">{posts.length} blog posts</p>
                    </div>
                </div>
                <Link href="/">
                    <Button className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500">
                        <Plus className="w-4 h-4 mr-2" /> New Post
                    </Button>
                </Link>
            </div>

            {posts.length === 0 ? (
                <Card className="p-12 text-center bg-white/5 border-white/10">
                    <FileText className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                    <h3 className="text-xl font-semibold mb-2">No Posts Yet</h3>
                    <p className="text-muted-foreground mb-4">Create your first blog post to get started.</p>
                    <Link href="/">
                        <Button className="bg-gradient-to-r from-purple-600 to-cyan-600">
                            <Plus className="w-4 h-4 mr-2" /> Create Post
                        </Button>
                    </Link>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {posts.map((post, index) => (
                        <motion.div
                            key={post.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card
                                className="p-6 bg-[#0D0D0F]/50 border-white/10 hover:border-purple-500/30 transition-all cursor-pointer group"
                                onClick={() => router.push(`/posts/${post.id}`)}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <FileText className="w-8 h-8 text-purple-400" />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deletePost(post.id);
                                        }}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                                <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                                    {post.title || post.metaTitle || 'Untitled'}
                                </h3>
                                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                                    {post.metaDescription || 'No description'}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {new Date(post.createdAt).toLocaleDateString('tr-TR', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </p>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
