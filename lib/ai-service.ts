import { createClient } from '@deepgram/sdk';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import fs from 'fs';

export const aiService = {
    async transcribeAudio(audioPath: string): Promise<string> {
        if (!process.env.DEEPGRAM_API_KEY) {
            throw new Error('DEEPGRAM_API_KEY is missing');
        }

        const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

        // Check file stats first
        const stats = await fs.promises.stat(audioPath);
        if (stats.size === 0) {
            throw new Error('Audio file is empty. Download might have failed.');
        }
        console.log(`[Deepgram] Transcribing file: ${audioPath} (${stats.size} bytes)`);

        // Use stream directly
        const audioSource = fs.createReadStream(audioPath);

        const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
            audioSource,
            {
                model: 'nova-2',
                language: 'tr', // Turkish
                smart_format: true,
                punctuate: true,
            }
        );

        if (error) {
            throw new Error(`Deepgram Error: ${error.message}`);
        }

        // Safely access the transcript
        const transcript = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript;

        if (!transcript) {
            throw new Error("Transcriptions failed: No transcript returned");
        }

        return transcript;
    },

    async generateBlog(transcript: string, userPrompt?: string): Promise<{
        metaTitle: string;
        metaDescription: string;
        slug: string;
        h1: string;
        contentHtml: string;
        keywords: string[];
    }> {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is missing');
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            generationConfig: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: SchemaType.OBJECT,
                    properties: {
                        metaTitle: { type: SchemaType.STRING },
                        metaDescription: { type: SchemaType.STRING },
                        slug: { type: SchemaType.STRING },
                        h1: { type: SchemaType.STRING },
                        contentHtml: { type: SchemaType.STRING },
                        keywords: {
                            type: SchemaType.ARRAY,
                            items: { type: SchemaType.STRING }
                        }
                    },
                    required: ["metaTitle", "metaDescription", "slug", "h1", "contentHtml", "keywords"]
                }
            }
        });

        const systemPrompt = `
      Sen profesyonel bir içerik editörü, blog yazarı ve SEO uzmanısın.
      Aşağıdaki transkript metnini kullanarak, tamamen Türkçe, anahtar kelime odaklı, SEO uyumlu, akıcı ve okunabilir profesyonel bir blog yazısı oluştur.
      Dil: Türkçe.

      Çıktı JSON formatında olmalıdır. Başka hiçbir metin (markdown backticks dahil) ekleme, sadece saf JSON döndür.

      JSON Şeması:
      {
        "metaTitle": "SEO uyumlu, tıklanmaya yönelik meta başlık (max 60 karakter)",
        "metaDescription": "İlgi çekici meta açıklama (140-160 karakter)",
        "slug": "url-dostu-slug",
        "h1": "Blog yazısının ana başlığı",
        "keywords": ["anahtar", "kelimeler", "listesi"],
        "contentHtml": "<p>Giriş...</p>..."
      }

      İçerik (contentHtml) Kuralları:
      1. Sadece semantic HTML etiketleri kullan (h2, h3, p, ul, li, strong, blockquote). H1 kullanma (o ayrı alanda).
      2. Asla <html>, <head>, <body> etiketlerini kullanma. Sadece gövde içeriği.
      3. Tonlama: Akademik değil; akıcı, anlaşılır, profesyonel. Gereksiz tekrar yok. Konuya sadık.
      4. Yapı:
         - 2-3 cümlelik etkili bir giriş paragrafı.
         - H2 ve H3 başlıklarla bölünmüş gövde metni.
         - Okunabilirliği artırmak için madde işaretleri ve listeler.
         - Sonuç / Özet bölümü.
      5. Transkriptin özüne sadık kal ama konuşma dilindeki hataları (ee, şey vb.) temizle.
      6. Ekstra CSS veya stil ekleme.
    `;

        const finalPrompt = userPrompt
            ? `${systemPrompt}\n\nKullanıcı Ek Notları: ${userPrompt}\n\nTRANSKRİPT:\n${transcript}`
            : `${systemPrompt}\n\nTRANSKRİPT:\n${transcript}`;

        try {
            const result = await model.generateContent(finalPrompt);
            const response = await result.response;
            let text = response.text();

            // Cleanup if Gemini adds markdown code blocks
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();

            return JSON.parse(text);
        } catch (error: any) {
            console.error('Gemini Blog Generation Error:', error);
            // Throw the actual error message so the UI can show "Quota exceeded" or whatever
            throw new Error(`Gemini Error: ${error.message || error}`);
        }
    }
};
