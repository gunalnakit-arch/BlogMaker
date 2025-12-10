'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Loader2, Sparkles, Youtube } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function Home() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setIsLoading(true);
    toast.info('Starting pipeline...', { description: 'Processing YouTube video...' });

    try {
      const res = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, prompt }), // Back to JSON
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Pipeline failed');
      }

      toast.success('Blog Generated!', { description: 'Redirecting to editor...' });
      router.push(`/posts/${data.id}`);

    } catch (error: any) {
      toast.error('Error', { description: error.message });
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-2xl text-center space-y-8"
      >
        <div className="space-y-4">
          <h1 className="text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/50 drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">
            Turn Video into <br />
            <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">Blog Posts</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-lg mx-auto leading-relaxed">
            AI-powered pipeline: YouTube → Deepgram → Gemini → SEO Blog.
            <br />No database. Serverless Friendly.
          </p>
        </div>

        <Card className="p-1 bg-white/5 border-white/10 backdrop-blur-xl shadow-2xl shadow-purple-900/20">
          <form onSubmit={handleSubmit} className="bg-[#0A0A0B] p-6 rounded-xl space-y-4">
            <div className="relative">
              <div className="absolute left-3 top-3 text-muted-foreground">
                <Youtube className="w-5 h-5" />
              </div>
              <Input
                placeholder="Paste YouTube URL here..."
                className="pl-10 h-12 bg-white/5 border-white/10 text-lg focus-visible:ring-purple-500/50 transition-all font-medium"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                placeholder="Custom Prompt (Optional)"
                className="md:col-span-3 h-12 bg-white/5 border-white/10 focus-visible:ring-cyan-500/50"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isLoading}
              />
              <Button
                type="submit"
                disabled={isLoading || !url}
                className="h-12 w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold shadow-lg shadow-purple-500/25 transition-all"
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> Generate</>
                )}
              </Button>
            </div>
          </form>
        </Card>

        <div className="flex justify-center gap-8 text-sm text-muted-foreground/50 font-medium">
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Deepgram Nova-2</div>
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" /> Gemini 2.5 Pro</div>
          <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" /> Local FS</div>
        </div>
      </motion.div>
    </div>
  );
}
