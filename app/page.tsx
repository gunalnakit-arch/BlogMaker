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

    // Vercel free tier has 4.5MB payload limit, base64 adds ~33% overhead
    // So we limit to 3MB to be safe (3MB file -> ~4MB base64)
    const MAX_FILE_SIZE_MB = 3;
    const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error('File Too Large', {
        description: `Maximum file size is ${MAX_FILE_SIZE_MB}MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB. Please compress the audio or use a shorter clip.`
      });
      return;
    }

    setIsLoading(true);
    toast.info('Starting pipeline...', { description: 'Encoding and uploading audio...' });

    try {
      // Convert file to base64 to bypass Vercel WAF blocking binary FormData
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove the data URL prefix (e.g., "data:audio/mpeg;base64,")
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/pipeline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileBase64: base64,
          fileName: file.name,
          prompt: prompt,
        }),
      });

      // Get raw text first to debug if JSON parsing fails
      const rawText = await res.text();
      console.log('[Client] Raw Response:', rawText.substring(0, 500));

      let data;
      try {
        data = JSON.parse(rawText);
      } catch (parseError) {
        throw new Error(`Server returned non-JSON: ${rawText.substring(0, 200)}`);
      }

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}: ${rawText.substring(0, 100)}`);
      }

      // STATELESS: Save result to LocalStorage
      localStorage.setItem(`post-${data.id}`, JSON.stringify(data));

      toast.success('Blog Generated!', { description: 'Redirecting to editor...' });
      router.push(`/posts/${data.id}`);

    } catch (error: any) {
      console.error('[Client] Full Error:', error);
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
