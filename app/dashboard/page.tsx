'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { FileText, Download, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

interface Post {
    id: string;
    url: string;
    createdAt: string;
    title: string;
    metaTitle?: string;
}

export default function Dashboard() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/posts')
            .then(res => res.json())
            .then(data => {
                setPosts(data);
                setLoading(false);
            });
    }, []);

    return (
        <div className="container mx-auto py-12 px-4">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Your Posts</h1>
                <Link href="/">
                    <Button className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500">
                        + New Post
                    </Button>
                </Link>
            </div>

            <Card className="bg-[#0D0D0F]/50 border-white/10 backdrop-blur-xl">
                <Table>
                    <TableHeader>
                        <TableRow className="border-white/5 hover:bg-white/5">
                            <TableHead className="text-gray-400">Date</TableHead>
                            <TableHead className="text-gray-400">Title</TableHead>
                            <TableHead className="text-gray-400">Source</TableHead>
                            <TableHead className="text-right text-gray-400">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {posts.map((post) => (
                            <TableRow key={post.id} className="border-white/5 hover:bg-white/5 group">
                                <TableCell className="font-medium text-gray-400">
                                    {new Date(post.createdAt).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="font-semibold text-white">
                                    {post.metaTitle || post.title || 'Untitled Post'}
                                </TableCell>
                                <TableCell className="text-cyan-400 truncate max-w-[200px]">
                                    {post.url}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2 opacity-100 transition-opacity">
                                        <Link href={`/posts/${post.id}`} passHref>
                                            <Button variant="ghost" size="sm" className="hover:bg-white/10 hover:text-cyan-400">
                                                <ExternalLink className="w-4 h-4 mr-2" /> View
                                            </Button>
                                        </Link>
                                        <a href={`/api/export/pdf?id=${post.id}`} download>
                                            <Button variant="ghost" size="sm" className="hover:bg-white/10 hover:text-purple-400">
                                                <Download className="w-4 h-4 mr-2" /> PDF
                                            </Button>
                                        </a>
                                        <a href={`/api/export/docx?id=${post.id}`} download>
                                            <Button variant="ghost" size="sm" className="hover:bg-white/10 hover:text-blue-400">
                                                <Download className="w-4 h-4 mr-2" /> Word
                                            </Button>
                                        </a>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {posts.length === 0 && !loading && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                                    No posts found. Create one to get started.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>
            {loading && <div className="text-center mt-8 text-muted-foreground">Loading posts...</div>}
        </div>
    );
}
