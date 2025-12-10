import YTDlpWrap from 'yt-dlp-wrap';
import path from 'path';
import fs from 'fs';

import fsPromises from 'fs/promises';

import os from 'os';

const isVercel = process.env.VERCEL === '1';
// In Vercel, we can only write to /tmp. 
// Also binaries might need to be downloaded there if not included in build.
const BIN_DIR = isVercel ? path.join(os.tmpdir(), 'bin') : path.join(process.cwd(), 'bin');
const YT_DLP_PATH = path.join(BIN_DIR, 'yt-dlp');

export const youtubeService = {
    async ensureBinary(): Promise<void> {
        if (fs.existsSync(YT_DLP_PATH)) return;

        console.log('Downloading yt-dlp binary...');
        try {
            await fsPromises.mkdir(BIN_DIR, { recursive: true });

            if (isVercel) {
                console.log('Detected Vercel environment. Downloading standalone Linux binary...');
                const response = await fetch('https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux');
                if (!response.ok) throw new Error(`Failed to download binary: ${response.statusText}`);

                const buffer = Buffer.from(await response.arrayBuffer());
                await fsPromises.writeFile(YT_DLP_PATH, buffer);
            } else {
                await YTDlpWrap.downloadFromGithub(YT_DLP_PATH);
            }

            // Make executable
            await fsPromises.chmod(YT_DLP_PATH, '755');
            console.log('yt-dlp downloaded successfully.');
        } catch (error) {
            console.error('Failed to download yt-dlp:', error);
            throw new Error('Failed to install yt-dlp');
        }
    },


    async getCookiesPath(): Promise<string | null> {
        const cookies = process.env.YOUTUBE_COOKIES;
        if (!cookies) return null;

        const cookiesPath = isVercel ? path.join(os.tmpdir(), 'cookies.txt') : path.join(process.cwd(), 'cookies.txt');
        await fsPromises.writeFile(cookiesPath, cookies);
        return cookiesPath;
    },

    async getOEmbedInfo(url: string) {
        try {
            const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
            if (!res.ok) throw new Error('OEmbed failed');
            const data = await res.json();
            return {
                title: data.title,
                thumbnail: data.thumbnail_url,
                duration: 0, // OEmbed doesn't give duration
                channel: data.author_name
            };
        } catch (e) {
            console.error('OEmbed fallback failed:', e);
            return null;
        }
    },

    async downloadAudioCobalt(url: string, outputPath: string): Promise<void> {
        console.log('[Cobalt] Falling back to Cobalt API...');
        // Using a public instance - in production, users should ideally host their own or use a reliable one
        // Try multiple instances if one fails? For now just the main one.
        const res = await fetch('https://api.cobalt.tools/api/json', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url,
                isAudioOnly: true,
                aFormat: 'mp3'
            })
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Cobalt API request failed: ${res.status} ${text}`);
        }

        const data = await res.json();

        if (data.status === 'error') throw new Error(data.text || 'Cobalt Error');

        const downloadUrl = data.url;
        if (!downloadUrl) throw new Error('No download URL returned from Cobalt');

        console.log(`[Cobalt] Streaming from ${downloadUrl}`);
        const streamRes = await fetch(downloadUrl);
        if (!streamRes.ok) throw new Error('Failed to download from Cobalt stream');

        // Write stream to file
        const buffer = Buffer.from(await streamRes.arrayBuffer());
        await fsPromises.writeFile(outputPath, buffer);
    },

    async downloadAudio(url: string, outputPath: string): Promise<void> {
        try {
            await this.ensureBinary();
            const cookiesPath = await this.getCookiesPath();

            const wrap = new YTDlpWrap(YT_DLP_PATH);

            await new Promise<void>((resolve, reject) => {
                // Stream the download to the output path
                // -f ba: best audio
                // -o -: output to stdout
                const args = [
                    url,
                    '--no-check-certificate',
                    '--extractor-args', 'youtube:player_client=android',
                    '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    '-f', 'ba',
                    '-o', '-'
                ];

                if (cookiesPath) {
                    args.push('--cookies', cookiesPath);
                }

                const ytStream = wrap.execStream(args);

                const fileStream = fs.createWriteStream(outputPath);

                ytStream.pipe(fileStream);

                ytStream.on('error', (err) => reject(err));

                fileStream.on('finish', () => resolve());
                fileStream.on('error', (err) => reject(err));
            });
        } catch (error) {
            console.error('yt-dlp download failed, attempting fallback...', error);
            // Fallback to Cobalt
            await this.downloadAudioCobalt(url, outputPath);
        }
    },

    async getVideoInfo(url: string) {
        try {
            await this.ensureBinary();
            const cookiesPath = await this.getCookiesPath();
            const wrap = new YTDlpWrap(YT_DLP_PATH);

            const args = [
                url,
                '--no-check-certificate',
                '--extractor-args', 'youtube:player_client=android',
                '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                '--dump-json'
            ];

            if (cookiesPath) {
                args.push('--cookies', cookiesPath);
            }

            // Manual execution to pass --no-check-certificate
            const stdout = await wrap.execPromise(args);

            const metadata = JSON.parse(stdout);

            return {
                title: metadata.title,
                thumbnail: metadata.thumbnail,
                duration: metadata.duration,
                channel: metadata.uploader
            };
        } catch (e) {
            console.error("yt-dlp info failed, attempting fallback...", e);
            // Fallback to OEmbed
            return await this.getOEmbedInfo(url);
        }
    }
};
