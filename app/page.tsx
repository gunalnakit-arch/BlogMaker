'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import Link from 'next/link';

// Sparkle Button SVG Icon
const SparkleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="sparkle-icon">
    <path strokeLinejoin="round" strokeLinecap="round" stroke="currentColor" fill="currentColor" d="M14.187 8.096L15 5.25L15.813 8.096C16.0231 8.83114 16.4171 9.50062 16.9577 10.0413C17.4984 10.5819 18.1679 10.9759 18.903 11.186L21.75 12L18.904 12.813C18.1689 13.0231 17.4994 13.4171 16.9587 13.9577C16.4181 14.4984 16.0241 15.1679 15.814 15.903L15 18.75L14.187 15.904C13.9769 15.1689 13.5829 14.4994 13.0423 13.9587C12.5016 13.4181 11.8321 13.0241 11.097 12.814L8.25 12L11.096 11.187C11.8311 10.9769 12.5006 10.5829 13.0413 10.0423C13.5819 9.50162 13.9759 8.83214 14.186 8.097L14.187 8.096Z" />
    <path strokeLinejoin="round" strokeLinecap="round" stroke="currentColor" fill="currentColor" d="M6 14.25L5.741 15.285C5.59267 15.8785 5.28579 16.4206 4.85319 16.8532C4.42059 17.2858 3.87853 17.5927 3.285 17.741L2.25 18L3.285 18.259C3.87853 18.4073 4.42059 18.7142 4.85319 19.1468C5.28579 19.5794 5.59267 20.1215 5.741 20.715L6 21.75L6.259 20.715C6.40725 20.1216 6.71398 19.5796 7.14639 19.147C7.5788 18.7144 8.12065 18.4075 8.714 18.259L9.75 18L8.714 17.741C8.12065 17.5925 7.5788 17.2856 7.14639 16.853C6.71398 16.4204 6.40725 15.8784 6.259 15.285L6 14.25Z" />
    <path strokeLinejoin="round" strokeLinecap="round" stroke="currentColor" fill="currentColor" d="M6.5 4L6.303 4.5915C6.24777 4.75718 6.15472 4.90774 6.03123 5.03123C5.90774 5.15472 5.75718 5.24777 5.5915 5.303L5 5.5L5.5915 5.697C5.75718 5.75223 5.90774 5.84528 6.03123 5.96877C6.15472 6.09226 6.24777 6.24282 6.303 6.4085L6.5 7L6.697 6.4085C6.75223 6.24282 6.84528 6.09226 6.96877 5.96877C7.09226 5.84528 7.24282 5.75223 7.4085 5.697L8 5.5L7.4085 5.303C7.24282 5.24777 7.09226 5.15472 6.96877 5.03123C6.84528 4.90774 6.75223 4.75718 6.697 4.5915L6.5 4Z" />
  </svg>
);

export default function Home() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  const CHUNK_SIZE = 2.5 * 1024 * 1024;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsLoading(true);
    setUploadProgress('Preparing file...');

    try {
      const uploadId = Math.random().toString(36).substring(2, 15);
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        setUploadProgress(`Uploading ${chunkIndex + 1}/${totalChunks}...`);

        const base64Chunk = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(chunk);
        });

        const chunkRes = await fetch('/api/upload-chunk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uploadId, chunkIndex, totalChunks, data: base64Chunk }),
        });

        if (!chunkRes.ok) throw new Error(`Chunk ${chunkIndex} failed`);
      }

      setUploadProgress('Transcribing audio...');

      const finalRes = await fetch('/api/finalize-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId, totalChunks, fileName: file.name }),
      });

      const data = await finalRes.json();
      if (!finalRes.ok) throw new Error(data.error);

      // Save to localStorage and Blob
      const postData = { ...data, prompt };
      localStorage.setItem(`post-${data.id}`, JSON.stringify(postData));

      // Also save to Blob for persistence
      await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData),
      });

      toast.success('Transcription Complete!');
      router.push(`/posts/${data.id}`);

    } catch (error: any) {
      toast.error('Error', { description: error.message });
      setIsLoading(false);
      setUploadProgress('');
    }
  };

  return (
    <>
      {/* Washing Machine Loader Overlay */}
      {isLoading && (
        <div className="loader-overlay">
          <div className="washing-loader" />
          <p>{uploadProgress || 'Processing...'}</p>
        </div>
      )}

      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-2xl text-center space-y-8"
        >
          {/* Header with Dashboard Link */}
          <div className="absolute top-6 right-6">
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-white transition-colors">
              Dashboard →
            </Link>
          </div>

          <div className="space-y-4">
            <h1 className="text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/50">
              Turn Audio into <br />
              <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">Blog Posts</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-lg mx-auto">
              AI-powered transcription & blog generation
            </p>
          </div>

          <Card className="p-1 bg-white/5 border-white/10 backdrop-blur-xl shadow-2xl">
            <form onSubmit={handleSubmit} className="bg-[#0A0A0B] p-6 rounded-xl space-y-6">
              {/* File Upload */}
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-white/10 border-dashed rounded-lg cursor-pointer bg-white/5 hover:bg-white/10 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Sparkles className="w-8 h-8 mb-3 text-gray-400" />
                    <p className="mb-2 text-sm text-gray-400"><span className="font-semibold">Click to upload MP3</span></p>
                    <p className="text-xs text-gray-500">{file ? file.name : 'Audio files supported'}</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="audio/*"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    disabled={isLoading}
                  />
                </label>
              </div>

              {/* Prompt Input */}
              <Input
                placeholder="Custom prompt for blog generation (optional)"
                className="h-12 bg-white/5 border-white/10"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isLoading}
              />

              {/* Sparkle Button */}
              <div className="flex justify-center">
                <button
                  type="submit"
                  disabled={isLoading || !file}
                  className="sparkle-button"
                >
                  <div className="dots_border" />
                  <SparkleIcon />
                  <span className="text_button">Generate</span>
                </button>
              </div>
            </form>
          </Card>
        </motion.div>
      </div>
    </>
  );
}

