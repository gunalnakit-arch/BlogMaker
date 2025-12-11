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
  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsLoading(true);
    toast.info('Starting pipeline...', { description: 'Uploading and transcribing audio.' });

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('prompt', prompt);

      const res = await fetch('/api/pipeline', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Pipeline failed');
      }

      // STATELESS: Save result to LocalStorage
      // Use the returned ID as the key
      localStorage.setItem(`post-${data.id}`, JSON.stringify(data));

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
            Turn Audio into <br />
            <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">Blog Posts</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-lg mx-auto leading-relaxed">
            AI-powered pipeline.
          </p>
        </div>

        <Card className="p-1 bg-white/5 border-white/10 backdrop-blur-xl shadow-2xl shadow-purple-900/20">
          <form onSubmit={handleSubmit} className="bg-[#0A0A0B] p-6 rounded-xl space-y-4">
            <div className="relative">
              {/* File Input Mockup using standard input for now */}
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-white/10 border-dashed rounded-lg cursor-pointer bg-white/5 hover:bg-white/10 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Sparkles className="w-8 h-8 mb-3 text-gray-400" />
                    <p className="mb-2 text-sm text-gray-400"><span className="font-semibold">Click to upload MP3</span></p>
                    <p className="text-xs text-gray-500">
                      {file ? file.name : 'MP3 (Max 25MB)'}
                    </p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="audio/mp3,audio/mpeg"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
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
                disabled={isLoading || !file}
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


      </motion.div>
    </div>
  );
}
