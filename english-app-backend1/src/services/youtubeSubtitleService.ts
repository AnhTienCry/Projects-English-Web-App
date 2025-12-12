import axios from 'axios';
import { ISubtitleSegment } from '../models/Video';

export class YouTubeSubtitleService {
  /**
   * Lấy video ID từ YouTube URL
   */
  private static extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  /**
   * Lấy danh sách các track phụ đề có sẵn
   */
  private static async getAvailableCaptions(videoId: string): Promise<any[]> {
    try {
      // Sử dụng youtube-captions-scraper hoặc tương tự
      const response = await axios.get(`https://www.youtube.com/watch?v=${videoId}`);
      const html = response.data;
      
      // Parse HTML để tìm caption tracks
      const captionRegex = /"captionTracks":(\[.*?\])/;
      const match = html.match(captionRegex);
      
      if (match) {
        return JSON.parse(match[1]);
      }
      return [];
    } catch (error) {
      console.error('Error fetching captions:', error);
      return [];
    }
  }

  /**
   * Tải nội dung phụ đề từ URL
   */
  private static async fetchSubtitleContent(url: string): Promise<string> {
    try {
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching subtitle content:', error);
      throw error;
    }
  }

  /**
   * Parse SRT format thành subtitle segments
   */
  private static parseSRT(srtContent: string): ISubtitleSegment[] {
    const segments: ISubtitleSegment[] = [];
    const blocks = srtContent.trim().split('\n\n');

    for (const block of blocks) {
      const lines = block.trim().split('\n');
      if (lines.length >= 3) {
        const timeLine = lines[1];
        const text = lines.slice(2).join(' ');

        // Parse time format: 00:00:00,000 --> 00:00:05,000
        const timeMatch = timeLine.match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);
        
        if (timeMatch) {
          const startTime = YouTubeSubtitleService.parseTimeToSeconds(timeMatch[1]);
          const endTime = YouTubeSubtitleService.parseTimeToSeconds(timeMatch[2]);
          
          segments.push({
            startTime,
            endTime,
            text: text.replace(/<[^>]*>/g, ''), // Remove HTML tags
            translation: '' // Sẽ được dịch sau
          });
        }
      }
    }

    return segments;
  }

  /**
   * Parse VTT format thành subtitle segments
   */
  private static parseVTT(vttContent: string): ISubtitleSegment[] {
    const segments: ISubtitleSegment[] = [];
    const lines = vttContent.split('\n');
    let currentSegment: Partial<ISubtitleSegment> = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip header
      if (line === 'WEBVTT' || line === '') continue;
      
      // Time line
      if (line.includes('-->')) {
        const timeMatch = line.match(/(\d{2}:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3})/);
        if (timeMatch) {
          currentSegment.startTime = YouTubeSubtitleService.parseTimeToSeconds(timeMatch[1]);
          currentSegment.endTime = YouTubeSubtitleService.parseTimeToSeconds(timeMatch[2]);
        }
      }
      // Text line
      else if (currentSegment.startTime !== undefined && line !== '') {
        currentSegment.text = line.replace(/<[^>]*>/g, ''); // Remove HTML tags
        currentSegment.translation = '';
        
        segments.push(currentSegment as ISubtitleSegment);
        currentSegment = {};
      }
    }

    return segments;
  }

  /**
   * Convert time string to seconds
   */
  private static parseTimeToSeconds(timeStr: string): number {
    const parts = timeStr.replace(',', '.').split(':');
    const hours = parseInt(parts[0]);
    const minutes = parseInt(parts[1]);
    const seconds = parseFloat(parts[2]);
    
    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Dịch phụ đề sang tiếng Việt (sử dụng Google Translate API hoặc tương tự)
   */
  private static async translateSubtitles(segments: ISubtitleSegment[]): Promise<ISubtitleSegment[]> {
    // TODO: Implement translation service
    // Có thể sử dụng Google Translate API, Azure Translator, hoặc dịch vụ khác
    
    // Tạm thời return segments không có translation
    return segments.map(segment => ({
      ...segment,
      translation: '' // Sẽ được implement sau
    }));
  }

  /**
   * Main method: Lấy phụ đề từ YouTube URL
   */
  static async getSubtitlesFromYouTube(youtubeUrl: string): Promise<ISubtitleSegment[]> {
    try {
      // 1. Extract video ID
      const videoId = this.extractVideoId(youtubeUrl);
      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }

      // 2. Get available caption tracks
      const captionTracks = await this.getAvailableCaptions(videoId);
      
      // 3. Find English caption track
      const englishTrack = captionTracks.find(track => 
        track.languageCode === 'en' || 
        track.name?.simpleText?.toLowerCase().includes('english')
      );

      if (!englishTrack) {
        throw new Error('No English captions found for this video');
      }

      // 4. Fetch subtitle content
      const subtitleContent = await this.fetchSubtitleContent(englishTrack.baseUrl);
      
      // 5. Parse based on format
      let segments: ISubtitleSegment[];
      if (subtitleContent.includes('WEBVTT')) {
        segments = this.parseVTT(subtitleContent);
      } else {
        segments = this.parseSRT(subtitleContent);
      }

      // 6. Translate to Vietnamese (optional)
      segments = await this.translateSubtitles(segments);

      return segments;
    } catch (error) {
      console.error('Error getting YouTube subtitles:', error);
      throw error;
    }
  }

  /**
   * Extract keywords from subtitles for word definitions
   */
  static extractKeywords(segments: ISubtitleSegment[]): string[] {
    const allText = segments.map(s => s.text).join(' ');
    const words = allText.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3); // Only words longer than 3 characters

    // Remove duplicates and common words
    const commonWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'man', 'oil', 'sit', 'try', 'use', 'very', 'want', 'well', 'went', 'what', 'when', 'with', 'your'];
    
    return [...new Set(words)].filter(word => !commonWords.includes(word));
  }
}













