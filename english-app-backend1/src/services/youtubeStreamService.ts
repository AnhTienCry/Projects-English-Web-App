/**
 * 🎬 YouTube Stream Extraction Service
 * Extract video stream URLs from YouTube videos
 */

// @ybd-project/ytdl-core - Fork mới đang được maintain tích cực (thay thế @distube/ytdl-core đã bị archived)
import YtdlCore from '@ybd-project/ytdl-core';
import axios from 'axios';

export class YouTubeStreamService {
  // Tạo instance YtdlCore để sử dụng (singleton pattern)
  private static ytdlInstance: YtdlCore | null = null;

  private static getYtdlInstance(): YtdlCore {
    if (!this.ytdlInstance) {
      this.ytdlInstance = new YtdlCore({
        hl: 'en',
        gl: 'US',
      });
    }
    return this.ytdlInstance;
  }

  /**
   * Helper function để parse quality number từ quality label
   * @ybd-project/ytdl-core: quality.label là YT_QualityLabel (string như "720p", "1080p")
   */
  private static getQualityNumber(format: any): number {
    const label = format.quality?.label || format.qualityLabel || '0p';
    const match = label.match(/(\d+)p/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Get stream URL from YouTube video
   * @param videoUrl YouTube video URL or ID
   * @returns Stream URL for video playback
   */
  static async getStreamUrl(videoUrl: string): Promise<string | null> {
    const maxRetries = 3;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Extract video ID if full URL provided
        const videoId = this.extractVideoId(videoUrl);
        if (!videoId) {
          console.error('❌ Invalid YouTube URL:', videoUrl);
          return null;
        }

        const fullUrl = `https://www.youtube.com/watch?v=${videoId}`;
        console.log(`📥 Fetching stream for: ${fullUrl} (attempt ${attempt}/${maxRetries})`);

        // Get video info with retry logic
        let info;
        try {
          const ytdl = this.getYtdlInstance();
          // Sử dụng getFullInfo() để lấy thông tin đầy đủ về video
          info = await ytdl.getFullInfo(fullUrl);
        } catch (getInfoError: any) {
          console.error(`❌ Error getting video info (attempt ${attempt}):`, getInfoError.message);
          lastError = getInfoError;
          
          // Nếu là lỗi "Could not extract functions", thử lại với delay
          if (getInfoError.message?.includes('Could not extract functions')) {
            if (attempt < maxRetries) {
              console.log(`⏳ ytdl-core extraction error, waiting ${attempt * 3} seconds before retry...`);
              await new Promise(resolve => setTimeout(resolve, attempt * 3000));
              continue;
            }
          }
          
          // Nếu là lỗi video không tồn tại hoặc private
          if (getInfoError.message?.includes('Video unavailable') || 
              getInfoError.message?.includes('Private video') ||
              getInfoError.message?.includes('Video does not exist')) {
            console.error('❌ Video is unavailable or private');
            return null;
          }
          
          // Retry với delay nếu chưa hết số lần thử
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, attempt * 2000));
            continue;
          }
          
          throw getInfoError;
        }

        // @ybd-project/ytdl-core trả về formats trong info.formats
        // Tìm format tốt nhất (video + audio combined)
        const formats = (info as any).formats || [];
        const muxedFormats = formats.filter((format: any) => 
          format.hasVideo && format.hasAudio && (format.container === 'mp4' || format.container === 'webm')
        );

        if (muxedFormats.length > 0) {
          // Sort by quality (highest first), prefer mp4
          muxedFormats.sort((a: any, b: any) => {
            // Prefer mp4 over webm
            if (a.container === 'mp4' && b.container !== 'mp4') return -1;
            if (a.container !== 'mp4' && b.container === 'mp4') return 1;
            
            // Sort by quality (highest first)
            const qualityA = this.getQualityNumber(a);
            const qualityB = this.getQualityNumber(b);
            return qualityB - qualityA;
          });

          const bestFormat = muxedFormats[0];
          const qualityLabel = bestFormat.quality?.label || bestFormat.qualityLabel || 'unknown';
          console.log(`✅ Found stream: ${qualityLabel} (${bestFormat.container})`);
          
          // Verify URL is accessible
          if (bestFormat.url && bestFormat.url.startsWith('http')) {
            return bestFormat.url;
          }
        }

        // Fallback: Get any format with video
        const videoFormats = formats.filter((format: any) => format.hasVideo && format.url);
        if (videoFormats.length > 0) {
          videoFormats.sort((a: any, b: any) => {
            const qualityA = this.getQualityNumber(a);
            const qualityB = this.getQualityNumber(b);
            return qualityB - qualityA;
          });
          
          const bestVideoFormat = videoFormats[0];
          const qualityLabel = bestVideoFormat.quality?.label || bestVideoFormat.qualityLabel || 'unknown';
          console.log(`⚠️  Using video-only stream: ${qualityLabel}`);
          
          if (bestVideoFormat.url && bestVideoFormat.url.startsWith('http')) {
            return bestVideoFormat.url;
          }
        }

        console.error('❌ No suitable format found with valid URL');
        return null;

      } catch (error: any) {
        console.error(`❌ Error getting stream URL (attempt ${attempt}/${maxRetries}):`, error.message || error);
        lastError = error;
        
        // Nếu không phải lỗi có thể retry, return null ngay
        if (error.message?.includes('Video unavailable') || 
            error.message?.includes('Private video') ||
            error.message?.includes('Video does not exist')) {
          console.error('❌ Video is unavailable or private');
          return null;
        }
        
        // Retry với delay nếu chưa hết số lần thử
        if (attempt < maxRetries) {
          const delay = attempt * 3000; // 3s, 6s, 9s
          console.log(`⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    console.error('❌ Failed to get stream URL after all retries:', lastError?.message || 'Unknown error');
    return null;
  }

  /**
   * Extract video ID from YouTube URL
   */
  private static extractVideoId(url: string): string | null {
    // If already an ID (11 characters)
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
      return url;
    }

    // Extract from URL
    const match = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (match) {
      return match[1];
    }

    // Try short URL format (youtu.be/...)
    const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (shortMatch) {
      return shortMatch[1];
    }

    return null;
  }

  /**
   * Get video info (title, duration, thumbnail)
   * Uses @ybd-project/ytdl-core first, falls back to oEmbed/HTML scraping if it fails
   */
  static async getVideoInfo(videoUrl: string) {
    const videoId = this.extractVideoId(videoUrl);
    if (!videoId) return null;

    // Try @ybd-project/ytdl-core first
    try {
      const fullUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const ytdl = this.getYtdlInstance();
      const info = await ytdl.getFullInfo(fullUrl);

      // @ybd-project/ytdl-core có cấu trúc khác một chút
      const videoDetails = (info as any).videoDetails || info;
      const thumbnails = videoDetails.thumbnails || [];
      const author = videoDetails.author || videoDetails.ownerChannelName || { name: '' };

      return {
        title: videoDetails.title || '',
        duration: parseInt(videoDetails.lengthSeconds || videoDetails.length_seconds || '0'),
        thumbnail: thumbnails.length > 0 ? thumbnails[thumbnails.length - 1].url : `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        author: typeof author === 'string' ? author : (author.name || ''),
        viewCount: parseInt(videoDetails.viewCount || videoDetails.view_count || '0'),
      };
    } catch (error) {
      console.warn('⚠️  @ybd-project/ytdl-core failed, trying fallback method:', error);
      
      // Fallback: Use oEmbed API and HTML scraping
      return await this.getVideoInfoFallback(videoId, videoUrl);
    }
  }

  /**
   * Fallback method to get video info without ytdl-core
   * Uses YouTube oEmbed API and HTML scraping
   */
  private static async getVideoInfoFallback(videoId: string, videoUrl: string) {
    try {
      // Method 1: Try YouTube oEmbed API (no API key needed)
      try {
        const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;
        const oEmbedResponse = await axios.get(oEmbedUrl, { 
          timeout: 5000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        if (oEmbedResponse.data) {
          const oEmbed = oEmbedResponse.data;
          // oEmbed doesn't provide duration, so try to scrape it from HTML
          let duration = 0;
          try {
            const htmlResponse = await axios.get(videoUrl, {
              timeout: 5000,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            });
            duration = await this.scrapeDuration(videoId, htmlResponse.data);
          } catch (durationError) {
            console.warn('⚠️  Could not scrape duration, keeping 0');
          }
          
          return {
            title: oEmbed.title || '',
            duration: duration,
            thumbnail: oEmbed.thumbnail_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            author: oEmbed.author_name || '',
            viewCount: 0, // oEmbed doesn't provide view count
          };
        }
      } catch (oEmbedError) {
        console.warn('⚠️  oEmbed failed, trying HTML scraping:', oEmbedError);
      }

      // Method 2: Scrape HTML page for metadata
      return await this.scrapeVideoInfo(videoId, videoUrl);
      
    } catch (error) {
      console.error('❌ All fallback methods failed:', error);
      // Last resort: return basic info with thumbnail (always works)
      return {
        title: '',
        duration: 0,
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        author: '',
        viewCount: 0,
      };
    }
  }

  /**
   * Scrape video info from YouTube HTML page
   */
  private static async scrapeVideoInfo(videoId: string, videoUrl: string) {
    try {
      const response = await axios.get(videoUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
      });

      const html = response.data;
      
      // Extract title from JSON-LD or meta tags
      let title = '';
      const titleMatch = html.match(/<title>([^<]+)<\/title>/);
      if (titleMatch) {
        title = titleMatch[1].replace(' - YouTube', '').trim();
      }

      // Try to extract from JSON-LD
      const jsonLdMatch = html.match(/"name":\s*"([^"]+)"/);
      if (jsonLdMatch && jsonLdMatch[1]) {
        title = jsonLdMatch[1];
      }

      // Extract duration
      const duration = await this.scrapeDuration(videoId, html);

      // Extract author
      let author = '';
      const authorMatch = html.match(/"author":\s*"([^"]+)"/);
      if (authorMatch) {
        author = authorMatch[1];
      }

      return {
        title: title,
        duration: duration,
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        author: author,
        viewCount: 0,
      };
    } catch (error) {
      console.error('❌ HTML scraping failed:', error);
      // Return minimal info
      return {
        title: '',
        duration: 0,
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        author: '',
        viewCount: 0,
      };
    }
  }

  /**
   * Scrape video duration from YouTube page
   */
  private static async scrapeDuration(videoId: string, html?: string): Promise<number> {
    try {
      if (html) {
        // Try to find duration in the HTML
        const durationMatch = html.match(/"duration":"PT(\d+)H(\d+)M(\d+)S"/) || 
                             html.match(/"lengthSeconds":"(\d+)"/) ||
                             html.match(/"approxDurationMs":"(\d+)"/);
        
        if (durationMatch) {
          if (durationMatch.length === 4) {
            // PT format: PT1H2M3S
            const hours = parseInt(durationMatch[1] || '0');
            const minutes = parseInt(durationMatch[2] || '0');
            const seconds = parseInt(durationMatch[3] || '0');
            return hours * 3600 + minutes * 60 + seconds;
          } else if (durationMatch[1]) {
            // seconds or milliseconds
            const value = parseInt(durationMatch[1]);
            // If it's in milliseconds (large number), convert to seconds
            return value > 1000000 ? Math.floor(value / 1000) : value;
          }
        }
      }

      // If HTML not provided or parsing failed, try oEmbed
      const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const oEmbedResponse = await axios.get(oEmbedUrl, { timeout: 5000 });
      
      // oEmbed doesn't have duration, so return 0
      return 0;
    } catch (error) {
      console.warn('⚠️  Could not scrape duration:', error);
      return 0;
    }
  }
}