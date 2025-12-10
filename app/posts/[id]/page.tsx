'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, Download, FileText, Bot, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface PostDetail {
    id: string;
    url: string;
    transcript: string;
    blogContent: string;
    metaTitle: string;
    metaDescription: string;
    slug: string;
    keywords: string[];
}

export default function PostDetail({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [post, setPost] = useState<PostDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'blog' | 'meta' | 'transcript'>('blog');

    useEffect(() => {
        fetch(`/api/posts/${id}`)
            .then(res => res.json())
            .then(data => {
                if (data.error) throw new Error(data.error);
                setPost(data);
                setLoading(false);
            })
            .catch(err => {
                toast.error('Failed to load post');
                setLoading(false);
            });
    }, [id]);

    const handleSave = async () => {
        if (!post) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/posts/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(post),
            });
            if (!res.ok) throw new Error('Failed to save');
            toast.success('Saved successfully');
        } catch (error) {
            toast.error('Error saving post');
        } finally {
            setSaving(false);
        }
    };

    if (loading || !post) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 px-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard">
                        <Button variant="ghost" size="icon" className="hover:bg-white/10 rounded-full">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                            {post.metaTitle || 'Untitled Post'}
                        </h1>
                        <p className="text-sm text-muted-foreground">{post.url}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={handleSave}
                        className="bg-purple-600 hover:bg-purple-500 text-white"
                        disabled={saving}
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Changes
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 h-[calc(100vh-12rem)]">
                {/* Sidebar Navigation */}
                <div className="space-y-2">
                    <Button
                        variant={activeTab === 'blog' ? "default" : "ghost"}
                        className={`w-full justify-start ${activeTab === 'blog' ? 'bg-gradient-to-r from-purple-600/20 to-cyan-600/20 text-purple-300 border border-purple-500/30' : 'text-gray-400'}`}
                        onClick={() => setActiveTab('blog')}
                    >
                        <Bot className="w-4 h-4 mr-2" /> Blog Content
                    </Button>
                    <Button
                        variant={activeTab === 'meta' ? "default" : "ghost"}
                        className={`w-full justify-start ${activeTab === 'meta' ? 'bg-gradient-to-r from-purple-600/20 to-cyan-600/20 text-purple-300 border border-purple-500/30' : 'text-gray-400'}`}
                        onClick={() => setActiveTab('meta')}
                    >
                        <FileText className="w-4 h-4 mr-2" /> Metadata & SEO
                    </Button>
                    <Button
                        variant={activeTab === 'transcript' ? "default" : "ghost"}
                        className={`w-full justify-start ${activeTab === 'transcript' ? 'bg-gradient-to-r from-purple-600/20 to-cyan-600/20 text-purple-300 border border-purple-500/30' : 'text-gray-400'}`}
                        onClick={() => setActiveTab('transcript')}
                    >
                        <FileText className="w-4 h-4 mr-2" /> Original Transcript
                    </Button>

                    <div className="pt-8 border-t border-white/10 mt-8 space-y-4">
                        {/* Generate Button Area */}
                        <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/10 p-4 rounded-xl border border-white/5 space-y-3">
                            <p className="text-xs font-medium text-purple-200">AI Actions</p>
                            <Button
                                onClick={async () => {
                                    if (!confirm('Generate blog post from transcript? This will overwrite existing content.')) return;
                                    setSaving(true);
                                    toast.info('Generating blog...', { description: 'This may take a minute.' });
                                    try {
                                        const res = await fetch(`/api/posts/${post.id}/generate`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ prompt: 'Create a high quality blog post.' }) // could allow user prompt here later
                                        });
                                        if (!res.ok) throw new Error((await res.json()).error);

                                        // Reload post
                                        const updatedRes = await fetch(`/api/posts/${post.id}`);
                                        const updatedData = await updatedRes.json();
                                        setPost(updatedData);
                                        setActiveTab('blog');
                                        toast.success('Blog Generated Successfully!');
                                    } catch (e: any) {
                                        toast.error('Generation Failed', { description: e.message });
                                    } finally {
                                        setSaving(false);
                                    }
                                }}
                                disabled={saving}
                                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-900/20"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Bot className="w-4 h-4 mr-2" />}
                                Generate Blog AI
                            </Button>
                        </div>

                        <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-widest pl-2">Downloads</p>
                        <a href={`/api/export/pdf?id=${post.id}`} target="_blank" className="block">
                            <Button variant="outline" className="w-full justify-start border-white/10 hover:bg-white/5">
                                <Download className="w-4 h-4 mr-2" /> Export PDF
                            </Button>
                        </a>
                        <a href={`/api/export/docx?id=${post.id}`} target="_blank" className="block">
                            <Button variant="outline" className="w-full justify-start border-white/10 hover:bg-white/5">
                                <Download className="w-4 h-4 mr-2" /> Export DOCX
                            </Button>
                        </a>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="lg:col-span-3 h-full overflow-hidden">

                    {/* Note: In a real app, use a Rich Text Editor like TipTap. Here using Textarea for simplicity as per MVP */}
                    {activeTab === 'blog' && (
                        <Card className="h-full bg-[#0D0D0F]/50 border-white/10 flex flex-col p-0 overflow-hidden">
                            <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center text-xs text-muted-foreground">
                                <span>HTML Editor</span>
                                <span className="text-amber-500">Edit HTML directly</span>
                            </div>
                            <textarea
                                className="flex-1 w-full bg-transparent p-6 font-mono text-sm leading-relaxed resize-none focus:outline-none text-gray-300"
                                value={post.blogContent}
                                onChange={(e) => setPost({ ...post, blogContent: e.target.value })}
                            />
                        </Card>
                    )}

                    {activeTab === 'transcript' && (
                        <Card className="h-full bg-[#0D0D0F]/50 border-white/10 flex flex-col p-6 overflow-hidden">
                            <h3 className="text-lg font-bold mb-4">Original Transcript</h3>
                            <textarea
                                className="flex-1 w-full bg-white/5 rounded-lg p-4 font-mono text-sm leading-relaxed resize-none focus:outline-none text-gray-400 border border-white/10"
                                value={post.transcript}
                                onChange={(e) => setPost({ ...post, transcript: e.target.value })}
                            />
                        </Card>
                    )}

                    {activeTab === 'meta' && (
                        <Card className="h-full bg-[#0D0D0F]/50 border-white/10 p-8 space-y-6 overflow-y-auto">
                            <div className="space-y-2">
                                <Label>Meta Title</Label>
                                <Input
                                    value={post.metaTitle}
                                    onChange={e => setPost({ ...post, metaTitle: e.target.value })}
                                    className="bg-white/5 border-white/10"
                                />
                                <p className="text-xs text-muted-foreground">{post.metaTitle?.length || 0}/60</p>
                            </div>

                            <div className="space-y-2">
                                <Label>Meta Description</Label>
                                <Textarea
                                    value={post.metaDescription}
                                    onChange={e => setPost({ ...post, metaDescription: e.target.value })}
                                    className="bg-white/5 border-white/10 h-24"
                                />
                                <p className="text-xs text-muted-foreground">{post.metaDescription?.length || 0}/160</p>
                            </div>

                            <div className="space-y-2">
                                <Label>Slug</Label>
                                <Input
                                    value={post.slug}
                                    onChange={e => setPost({ ...post, slug: e.target.value })}
                                    className="bg-white/5 border-white/10"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Keywords (Comma separated)</Label>
                                <Input
                                    value={post.keywords?.join(', ')}
                                    onChange={e => setPost({ ...post, keywords: e.target.value.split(',').map(s => s.trim()) })}
                                    className="bg-white/5 border-white/10"
                                />
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
