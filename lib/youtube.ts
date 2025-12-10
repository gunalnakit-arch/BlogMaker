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

    // Simplified Direct Approach: No Cobalt, No Custom Headers, IOS Client
    async downloadAudio(url: string, outputPath: string): Promise<void> {
        await this.ensureBinary();

        // Removed: getCookiesPath() (causing auth errors)

        const wrap = new YTDlpWrap(YT_DLP_PATH);

        return new Promise((resolve, reject) => {
            const args = [
                url,
                '--no-check-certificate',
                // Use iOS client - often cleaner anonymous access
                '--extractor-args', 'youtube:player_client=ios',
                // Format: best audio
                '-f', 'ba',
                '-o', '-'
            ];

            const ytStream = wrap.execStream(args);
            const fileStream = fs.createWriteStream(outputPath);

            ytStream.pipe(fileStream);

            ytStream.on('error', (err) => reject(err));
            fileStream.on('finish', () => resolve());
            fileStream.on('error', (err) => reject(err));
        });
    },

    async getVideoInfo(url: string) {
        try {
            await this.ensureBinary();
            const wrap = new YTDlpWrap(YT_DLP_PATH);

            const args = [
                url,
                '--no-check-certificate',
                '--extractor-args', 'youtube:player_client=ios',
                '--dump-json'
            ];

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
            console.error("yt-dlp info failed, attempting OEmbed fallback...", e);
            // Fallback to OEmbed (Safe, reliable for metadata)
            return await this.getOEmbedInfo(url);
        }
    }
};
