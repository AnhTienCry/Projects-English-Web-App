import { Request, Response } from 'express';
import Video from '../models/Video';
import { AuthRequest } from '../middleware/auth';
import { ISubtitleSegment, IWordDefinition } from '../models/Video';
import { YouTubeSubtitleService } from '../services/youtubeSubtitleService';
import { YouTubeStreamService } from '../services/youtubeStreamService'; 
import mongoose from 'mongoose';

/**
 * Helper function to format timestamp (seconds) to MM:SS format
 */
function formatTimestamp(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Helper function to format subtitle segments with formatted timestamps
 */
function formatSubtitleSegments(segments: ISubtitleSegment[]): any[] {
  if (!segments || !Array.isArray(segments)) {
    return [];
  }
  
  return segments.map(segment => ({
    ...segment,
    startTime: segment.startTime, // Keep original in seconds
    endTime: segment.endTime, // Keep original in seconds
    formattedStartTime: formatTimestamp(segment.startTime), // MM:SS format
    formattedEndTime: formatTimestamp(segment.endTime), // MM:SS format
    displayTime: formatTimestamp(segment.startTime), // Alias for easy access
    time: formatTimestamp(segment.startTime), // Another alias
  }));
}

/**
 * 🎥 Lấy tất cả video (Student & Teacher)
 */
export async function getAllVideos(req: Request, res: Response) {
  try {
    const videos = await Video.find({ isActive: true })
      .sort({ order: 1, createdAt: -1 })
      .lean();
    
    // ... (Giữ nguyên logic của bạn) ...
    
    const videosWithLessons = await Promise.all(
      videos.map(async (video: any) => {
        const isYouTube = video.videoUrl?.includes('youtube.com') || video.videoUrl?.includes('youtu.be');
        let videoWithLesson;
        if (video.lesson) {
          try {
            const Lesson = require('../models/Lesson').default;
            let lessonObjectId;
            if (typeof video.lesson === 'string') {
              lessonObjectId = new mongoose.Types.ObjectId(video.lesson);
            } else if (video.lesson.buffer && video.lesson.buffer.data) {
              const buffer = Buffer.from(video.lesson.buffer.data);
              lessonObjectId = new mongoose.Types.ObjectId(buffer);
            } else {
              lessonObjectId = video.lesson;
            }
            const lesson = await Lesson.findById(lessonObjectId).select('title level').lean();
            videoWithLesson = {
              ...video,
              lesson: lesson || null,
              subtitles: formatSubtitleSegments(video.subtitles || [])
            };
          } catch (error) {
            videoWithLesson = {
              ...video,
              lesson: null,
              subtitles: formatSubtitleSegments(video.subtitles || [])
            };
          }
        } else {
          videoWithLesson = {
            ...video,
            subtitles: formatSubtitleSegments(video.subtitles || [])
          };
        }
        return {
          ...videoWithLesson,
          isYouTube: isYouTube
        };
      })
    );
    
    return res.json(videosWithLessons);
  } catch (err) {
    console.error('getAllVideos error', err);
    return res.status(500).json({ error: { message: 'Failed to fetch videos' } });
  }
}

/**
 * 🎥 Lấy video theo ID
 */
export async function getVideoById(req: Request, res: Response) {
  try {
    // Tối ưu: Chỉ select fields cần thiết để giảm data transfer
    const video = await Video.findById(req.params.id)
      .select('title description videoUrl thumbnailUrl duration subtitles wordDefinitions lesson topic order isActive')
      .populate('lesson', 'title level')
      .lean();
    if (!video) return res.status(404).json({ error: { message: 'Video not found' } });
    const videoAny = video as any;
    const isYouTube = videoAny.videoUrl?.includes('youtube.com') || videoAny.videoUrl?.includes('youtu.be');
    const formattedVideo = {
      ...video,
      subtitles: formatSubtitleSegments(videoAny.subtitles || []),
      isYouTube: isYouTube
    };
    return res.json(formattedVideo);
  } catch (err) {
    console.error('getVideoById error', err);
    return res.status(500).json({ error: { message: 'Failed to fetch video' } });
  }
}

// Download video functionality has been removed

/**
 * 🎥 Tạo video mới (Teacher only)
 */
export async function createVideo(req: AuthRequest, res: Response) {
  try {
    const { title, description, lesson, topic, videoUrl, thumbnailUrl, duration, transcript, subtitles, order } = req.body;

    if (!title || !topic || !videoUrl) {
      return res.status(400).json({ error: { message: 'title, topic, and videoUrl are required' } });
    }

    // If topic is provided, get its lessonId from Topic model
    let finalLessonId = lesson;
    if (topic && !lesson) {
      const Topic = require('../models/Topic').default;
      const topicDoc = await Topic.findById(topic).lean();
      if (topicDoc && topicDoc.lessonId) {
        finalLessonId = typeof topicDoc.lessonId === 'object' 
          ? topicDoc.lessonId.toString() 
          : topicDoc.lessonId;
      }
    }

    const video = await Video.create({
      title,
      description,
      lesson: finalLessonId, // Include lesson if available
      topic,
      videoUrl,
      thumbnailUrl,
      duration,
      transcript,
      subtitles,
      order: order || 0
    });

    const fullVideo = await Video.findById(video._id)
      .populate('lesson', 'title level')
      .populate('topic', 'title')
      .lean();
    return res.status(201).json(fullVideo);
  } catch (err) {
    console.error('createVideo error', err);
    return res.status(500).json({ error: { message: 'Failed to create video' } });
  }
}

/**
 * 🎥 Cập nhật video (Teacher only)
 */
export async function updateVideo(req: AuthRequest, res: Response) {
  try {
    const { title, topic, videoUrl } = req.body;
    
    // Validate required fields nếu đang update
    if (title !== undefined && !title) {
      return res.status(400).json({ error: { message: 'title is required' } });
    }
    if (videoUrl !== undefined && !videoUrl) {
      return res.status(400).json({ error: { message: 'videoUrl is required' } });
    }
    
    // Validate topic ID format if provided
    if (topic && !mongoose.Types.ObjectId.isValid(topic)) {
      return res.status(400).json({ error: { message: 'Invalid topic ID format' } });
    }
    
    // Prepare update data
    const updateData: any = { ...req.body };
    if (updateData.topic) {
      // Validate topic exists
      const Topic = require('../models/Topic').default;
      const topicExists = await Topic.findById(updateData.topic);
      if (!topicExists) {
        return res.status(400).json({ error: { message: 'Topic not found' } });
      }
      
      // If topic is provided but no lesson, get lessonId from topic
      if (!updateData.lesson) {
        const topicDoc = await Topic.findById(updateData.topic).lean();
        if (topicDoc && topicDoc.lessonId) {
          updateData.lesson = typeof topicDoc.lessonId === 'object' 
            ? topicDoc.lessonId.toString() 
            : topicDoc.lessonId;
        }
      }
    }
    
    const updated = await Video.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true, runValidators: true }
    )
      .populate('lesson', 'title level')
      .populate('topic', 'title')
      .lean();
    
    if (!updated) return res.status(404).json({ error: { message: 'Video not found' } });
    return res.json(updated);
  } catch (err: any) {
    console.error('updateVideo error', err);
    
    // Handle validation errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: { message: err.message } });
    }
    
    return res.status(500).json({ error: { message: 'Failed to update video' } });
  }
}

/**
 * 🎥 Xóa video (Teacher only)
 */
export async function deleteVideo(req: AuthRequest, res: Response) {
  try {
    await Video.findByIdAndDelete(req.params.id);
    return res.status(204).send();
  } catch (err) {
    console.error('deleteVideo error', err);
    return res.status(500).json({ error: { message: 'Failed to delete video' } });
  }
}

/**
 * 🎥 Lấy video theo lesson
 */
export async function getVideosByLesson(req: Request, res: Response) {
  try {
    const { lessonId } = req.params;
    console.log('🔍 Looking for videos with lessonId:', lessonId);
    
    // Convert lessonId to ObjectId
    let objectId;
    try {
      // Handle different formats of lessonId
      if (typeof lessonId === 'string' && mongoose.Types.ObjectId.isValid(lessonId)) {
        objectId = new mongoose.Types.ObjectId(lessonId);
      } else if (lessonId && typeof lessonId === 'object' && (lessonId as any).buffer && (lessonId as any).buffer.data) {
        // Handle buffer format from .lean() queries
        const buffer = Buffer.from((lessonId as any).buffer.data);
        objectId = new mongoose.Types.ObjectId(buffer);
      } else {
        throw new Error('Invalid lessonId format');
      }
    } catch (error) {
      console.error('❌ Invalid lessonId:', lessonId, error);
      return res.status(400).json({ error: { message: 'Invalid lesson ID format' } });
    }
    
    const videos = await Video.find({ lesson: objectId, isActive: true })
      .sort({ order: 1 })
      .lean();
    
    console.log(`📹 Found ${videos.length} videos for lesson`);
    
    // Manually populate lesson data
    const videosWithLessons = await Promise.all(
      videos.map(async (video: any) => {
        // ... (Giữ nguyên logic của bạn) ...
        const isYouTube = video.videoUrl?.includes('youtube.com') || video.videoUrl?.includes('youtu.be');
        let videoWithLesson;
        if (video.lesson) {
          try {
            const Lesson = require('../models/Lesson').default;
            const lesson = await Lesson.findById(video.lesson).select('title level').lean();
            videoWithLesson = {
              ...video,
              lesson: lesson || null
            };
          } catch (error) {
            videoWithLesson = {
              ...video,
              lesson: null
            };
          }
        } else {
          videoWithLesson = video;
        }
        
        return {
          ...videoWithLesson,
          isYouTube: isYouTube
        };
      })
    );

    return res.json(videosWithLessons);
  } catch (err) {
    console.error('getVideosByLesson error', err);
    return res.status(500).json({ error: { message: 'Failed to fetch videos' } });
  }
}

/**
 * 🎥 Lấy video theo topic
 */
export async function getVideosByTopic(req: Request, res: Response) {
  try {
    const { topicId } = req.params;
    console.log('🔍 Looking for videos with topicId:', topicId);
    
    if (!mongoose.Types.ObjectId.isValid(topicId)) {
      return res.status(400).json({ error: { message: 'Invalid topic ID format' } });
    }
    
    const videos = await Video.find({ topic: topicId, isActive: true })
      .populate('topic', 'title')
      .populate('lesson', 'title level')
      .sort({ order: 1 })
      .lean();
    
    console.log(`📹 Found ${videos.length} videos for topic`);
    
    // Format subtitles with timestamps
    const formattedVideos = videos.map((video: any) => {
      const isYouTube = video.videoUrl?.includes('youtube.com') || video.videoUrl?.includes('youtu.be');
      return {
        ...video,
        subtitles: formatSubtitleSegments(video.subtitles || []),
        isYouTube: isYouTube
      };
    });

    return res.json(formattedVideos);
  } catch (err) {
    console.error('getVideosByTopic error', err);
    return res.status(500).json({ error: { message: 'Failed to fetch videos' } });
  }
}

/**
 * 🎥 Tìm kiếm video
 */
export async function searchVideos(req: Request, res: Response) {
  try {
    const { q, level } = req.query;
    let query: any = { isActive: true };

    if (q) {
      query.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } }
      ];
    }

    if (level) {
      query['lesson.level'] = level;
    }

    const videos = await Video.find(query)
      .populate('lesson', 'title level')
      .sort({ order: 1, createdAt: -1 })
      .lean();

    return res.json(videos);
  } catch (err) {
    console.error('searchVideos error', err);
    return res.status(500).json({ error: { message: 'Failed to search videos' } });
  }
}

/**
 * 📝 Thêm phụ đề cho video
 */
export async function addSubtitles(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { subtitles }: { subtitles: ISubtitleSegment[] } = req.body;

    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({ error: { message: 'Video not found' } });
    }

    video.subtitles = subtitles;
    await video.save();

    return res.json({ 
      message: 'Subtitles added successfully',
      subtitles: video.subtitles 
    });
  } catch (err) {
    console.error('addSubtitles error', err);
    return res.status(500).json({ error: { message: 'Failed to add subtitles' } });
  }
}

/**
 * 📚 Thêm định nghĩa từ cho video
 */
export async function addWordDefinition(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const wordDefinition: IWordDefinition = req.body;

    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({ error: { message: 'Video not found' } });
    }

    // Check if word already exists
    const existingWordIndex = video.wordDefinitions?.findIndex(
      (wd: any) => wd.word.toLowerCase() === wordDefinition.word.toLowerCase()
    );

    if (existingWordIndex !== undefined && existingWordIndex >= 0) {
      // Update existing word definition
      video.wordDefinitions![existingWordIndex] = wordDefinition;
    } else {
      // Add new word definition
      if (!video.wordDefinitions) {
        video.wordDefinitions = [];
      }
      video.wordDefinitions.push(wordDefinition);
    }

    await video.save();

    return res.json({ 
      message: 'Word definition added successfully',
      wordDefinition 
    });
  } catch (err) {
    console.error('addWordDefinition error', err);
    return res.status(500).json({ error: { message: 'Failed to add word definition' } });
  }
}

/**
 * 🔍 Lấy định nghĩa từ
 */
export async function getWordDefinition(req: AuthRequest, res: Response) {
  try {
    const { word } = req.params;
    
    // Search for word in all videos
    const videos = await Video.find({
      'wordDefinitions.word': { $regex: new RegExp(`^${word}$`, 'i') }
    }).select('wordDefinitions');

    let wordDefinition = null;
    
    for (const video of videos) {
      if (video.wordDefinitions) {
        const found = video.wordDefinitions.find(
          (wd: any) => wd.word.toLowerCase() === word.toLowerCase()
        );
        if (found) {
          wordDefinition = found;
          break;
        }
      }
    }

    if (!wordDefinition) {
      return res.status(404).json({ error: { message: 'Word not found' } });
    }

    return res.json({ wordDefinition });
  } catch (err) {
    console.error('getWordDefinition error', err);
    return res.status(500).json({ error: { message: 'Failed to get word definition' } });
  }
}

/**
 * 🎬 Lấy phụ đề từ YouTube URL
 */
export async function getYouTubeSubtitles(req: AuthRequest, res: Response) {
  try {
    const { youtubeUrl } = req.body;

    if (!youtubeUrl) {
      return res.status(400).json({ error: { message: 'YouTube URL is required' } });
    }

    // Lấy phụ đề từ YouTube
    const subtitles = await YouTubeSubtitleService.getSubtitlesFromYouTube(youtubeUrl);
    
    // Extract keywords for word definitions
    const keywords = YouTubeSubtitleService.extractKeywords(subtitles);

    return res.json({
      subtitles,
      keywords,
      message: 'Subtitles extracted successfully'
    });
  } catch (err) {
    console.error('getYouTubeSubtitles error', err);
    return res.status(500).json({ error: { message: 'Failed to extract YouTube subtitles' } });
  }
}

/**
 * 🎬 Tạo video từ YouTube URL với phụ đề tự động
 */
export async function createVideoFromYouTube(req: AuthRequest, res: Response) {
  try {
    const { title, description, lessonId, youtubeUrl, thumbnailUrl } = req.body;

    if (!youtubeUrl || !lessonId) {
      return res.status(400).json({ error: { message: 'YouTube URL and lesson ID are required' } });
    }

    // Lấy phụ đề từ YouTube
    const subtitles = await YouTubeSubtitleService.getSubtitlesFromYouTube(youtubeUrl);
    
    // Extract keywords
    const keywords = YouTubeSubtitleService.extractKeywords(subtitles);

    // Tạo video mới
    const video = new Video({
      title: title || 'YouTube Video',
      description: description || '',
      lesson: lessonId,
      videoUrl: youtubeUrl,
      thumbnailUrl: thumbnailUrl || '',
      subtitles: subtitles,
      wordDefinitions: [], // Sẽ được thêm sau
      isActive: true
    });

    await video.save();

    return res.json({
      video,
      keywords,
      message: 'Video created with YouTube subtitles successfully'
    });
  } catch (err) {
    console.error('createVideoFromYouTube error', err);
    return res.status(500).json({ error: { message: 'Failed to create video from YouTube' } });
  }
}

/**
 * 🎬 GET YOUTUBE STREAM URL
 * Extract playable stream URL from YouTube video (for mobile app)
 */
export async function getYouTubeStreamUrl(req: Request, res: Response) {
  try {
    const { youtubeUrl } = req.body;

    if (!youtubeUrl) {
      return res.status(400).json({ error: { message: 'YouTube URL is required' } });
    }

    console.log(`🎬 Extracting stream URL for: ${youtubeUrl}`);

    // Get stream URL from YouTube
    const streamUrl = await YouTubeStreamService.getStreamUrl(youtubeUrl);

    if (!streamUrl) {
      return res.status(404).json({ error: { message: 'Could not extract stream URL from YouTube' } });
    }

    return res.json({
      streamUrl,
      message: 'Stream URL extracted successfully'
    });
  } catch (err) {
    console.error('getYouTubeStreamUrl error', err);
    return res.status(500).json({ error: { message: 'Failed to extract stream URL' } });
  }
}

/**
 * 🎬 GET YOUTUBE VIDEO INFO
 * Get video metadata (duration, thumbnail, title) from YouTube URL
 */
export async function getYouTubeVideoInfo(req: AuthRequest, res: Response) {
  try {
    const { youtubeUrl } = req.body;

    if (!youtubeUrl) {
      return res.status(400).json({ error: { message: 'YouTube URL is required' } });
    }

    console.log(`🎬 Fetching video info for: ${youtubeUrl}`);

    // Extract video ID first for fallback thumbnail
    const extractVideoId = (url: string): string | null => {
      const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /youtube\.com\/watch\?.*v=([^&\n?#]+)/
      ];
      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
      }
      return null;
    };

    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      return res.status(400).json({ error: { message: 'Invalid YouTube URL' } });
    }

    // Get video info (duration, thumbnail, title)
    const videoInfo = await YouTubeStreamService.getVideoInfo(youtubeUrl);

    // Always provide thumbnail even if videoInfo fails
    const thumbnailUrl = videoInfo?.thumbnail || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

    if (!videoInfo) {
      // Return minimal info with thumbnail
      return res.json({
        duration: 0,
        thumbnailUrl: thumbnailUrl,
        title: '',
        author: '',
        videoId: videoId,
        message: 'Partial info retrieved (thumbnail only). Could not fetch full video info.'
      });
    }

    return res.json({
      duration: videoInfo.duration || 0, // in seconds
      thumbnailUrl: thumbnailUrl,
      title: videoInfo.title || '',
      author: videoInfo.author || '',
      videoId: videoId,
      message: 'Video info extracted successfully'
    });
  } catch (err) {
    console.error('getYouTubeVideoInfo error', err);
    return res.status(500).json({ error: { message: 'Failed to fetch video info' } });
  }
}