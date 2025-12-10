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

    async downloadAudio(url: string, outputPath: string): Promise<void> {
        await this.ensureBinary();

        const wrap = new YTDlpWrap(YT_DLP_PATH);

        return new Promise((resolve, reject) => {
            // Stream the download to the output path
            // -f ba: best audio
            // -o -: output to stdout
            const ytStream = wrap.execStream([
                url,
                '--no-check-certificate',
                '-f', 'ba',
                '-o', '-'
            ]);

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

            // Manual execution to pass --no-check-certificate
            const stdout = await wrap.execPromise([
                url,
                '--no-check-certificate',
                '--dump-json'
            ]);

            const metadata = JSON.parse(stdout);

            return {
                title: metadata.title,
                thumbnail: metadata.thumbnail,
                duration: metadata.duration,
                channel: metadata.uploader
            };
        } catch (e) {
            console.error("Failed to get video info", e);
            return null;
        }
    }
};
