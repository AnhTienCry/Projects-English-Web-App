import { useState, useEffect, useRef } from 'react';
import { X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../../api/http';

interface Lesson {
  _id: string;
  title: string;
}

interface Topic {
  _id: string;
  title: string;
  lessonId?: string | {
    _id: string;
    title: string;
    level?: number;
  };
}

interface SubtitleSegment {
  startTime: number;
  endTime: number;
  text: string;
  translation?: string;
}

interface Video {
  _id: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  lesson?: {
    _id: string;
    title: string;
  };
  topic?: {
    _id: string;
    title: string;
    lessonId?: string | {
      _id: string;
      title: string;
      level?: number;
    };
  };
  duration?: number;
  subtitles?: SubtitleSegment[];
  isActive: boolean;
}

interface CreateVideoModalProps {
  onClose: () => void;
  onSuccess: () => void;
  editVideo?: Video | null;
}

export default function CreateVideoModal({ onClose, onSuccess, editVideo }: CreateVideoModalProps) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedLesson, setSelectedLesson] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    videoUrl: '',
    thumbnailUrl: '',
    lesson: '',
    topic: '',
    duration: 0,
    isActive: true
  });
  const [subtitleText, setSubtitleText] = useState('');
  const [loading, setLoading] = useState(false);
  const [detectingInfo, setDetectingInfo] = useState(false);
  const [videoInfoError, setVideoInfoError] = useState<string | null>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  // Convert seconds to time string
  const secondsToTimeString = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toFixed(3).padStart(6, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${secs.toFixed(3).padStart(6, '0')}`;
    }
  };

  // Convert subtitle segments to text format
  const segmentsToText = (segments: SubtitleSegment[]): string => {
    return segments.map(seg => 
      `[${secondsToTimeString(seg.startTime)} --> ${secondsToTimeString(seg.endTime)}]  ${seg.text}`
    ).join('\n');
  };

  // Fetch lessons when modal opens
  useEffect(() => {
    fetchLessons();
    if (editVideo) {
      // Try to get lessonId from video.lesson first
      let lessonId = editVideo.lesson?._id || '';
      
      // If video doesn't have lesson but has topic, try to get lessonId from topic
      if (!lessonId && editVideo.topic) {
        // First try from topic.lessonId (if populated from backend)
        if (editVideo.topic.lessonId) {
          lessonId = typeof editVideo.topic.lessonId === 'string' 
            ? editVideo.topic.lessonId 
            : editVideo.topic.lessonId._id || '';
        }
      }
      
      // Fetch topics for the lesson if lesson exists
      if (lessonId) {
        setSelectedLesson(lessonId);
        fetchTopicsByLesson(lessonId).then(() => {
          setFormData({
            title: editVideo.title,
            description: editVideo.description || '',
            videoUrl: editVideo.videoUrl,
            thumbnailUrl: editVideo.thumbnailUrl || '',
            lesson: lessonId,
            topic: editVideo.topic?._id || '',
            duration: editVideo.duration || 0,
            isActive: editVideo.isActive
          });
          
          // Load subtitles if available
          if (editVideo.subtitles && editVideo.subtitles.length > 0) {
            setSubtitleText(segmentsToText(editVideo.subtitles));
          } else {
            setSubtitleText('');
          }
        });
      } else {
        // No lesson, fetch all topics
        fetchAllTopics();
        setFormData({
          title: editVideo.title,
          description: editVideo.description || '',
          videoUrl: editVideo.videoUrl,
          thumbnailUrl: editVideo.thumbnailUrl || '',
          lesson: '',
          topic: editVideo.topic?._id || '',
          duration: editVideo.duration || 0,
          isActive: editVideo.isActive
        });
        
        // Load subtitles if available
        if (editVideo.subtitles && editVideo.subtitles.length > 0) {
          setSubtitleText(segmentsToText(editVideo.subtitles));
        } else {
          setSubtitleText('');
        }
      }
    } else {
      // Creating new video, fetch all topics initially
      fetchAllTopics();
    }
  }, [editVideo]);

  // Auto-detect video info when YouTube URL changes
  useEffect(() => {
    const detectVideoInfo = async () => {
      if (!formData.videoUrl || formData.videoUrl.includes('youtube.com') === false && formData.videoUrl.includes('youtu.be') === false) {
        return;
      }

      // Debounce: wait 1 second after user stops typing
      const timer = setTimeout(async () => {
        setDetectingInfo(true);
        setVideoInfoError(null);

        try {
          const { data } = await api.post('/api/videos/youtube/info', {
            youtubeUrl: formData.videoUrl
          });

          if (data) {
            const updates: any = {};
            
            // Always update thumbnail if available
            if (data.thumbnailUrl) {
              updates.thumbnailUrl = data.thumbnailUrl;
            }
            
            // Update duration if available
            if (data.duration && data.duration > 0) {
              updates.duration = data.duration;
            }
            
            // Update title if not already set
            if (data.title && !formData.title) {
              updates.title = data.title;
            }
            
            setFormData(prev => ({
              ...prev,
              ...updates
            }));
            
            // Only show error if we got absolutely nothing
            if (!data.thumbnailUrl && !data.duration) {
              setVideoInfoError('Không thể lấy thông tin video từ YouTube. Vui lòng nhập thủ công.');
            } else {
              setVideoInfoError(null);
            }
          }
        } catch (err: any) {
          console.error('Error detecting video info:', err);
          // Even on error, try to extract video ID and show thumbnail
          const videoIdMatch = formData.videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
          if (videoIdMatch) {
            const videoId = videoIdMatch[1];
            const fallbackThumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
            setFormData(prev => ({
              ...prev,
              thumbnailUrl: fallbackThumbnail
            }));
            setVideoInfoError('Không thể lấy thông tin đầy đủ, nhưng đã hiển thị thumbnail.');
          } else {
            setVideoInfoError('Không thể lấy thông tin video từ YouTube. Vui lòng kiểm tra URL.');
          }
        } finally {
          setDetectingInfo(false);
        }
      }, 1000);

      return () => clearTimeout(timer);
    };

    detectVideoInfo();
  }, [formData.videoUrl]);

  const fetchLessons = async () => {
    try {
      const { data } = await api.get('/api/lessons');
      setLessons(data || []);
    } catch (err) {
      console.error('Failed to fetch lessons:', err);
    }
  };

  const fetchAllTopics = async () => {
    try {
      const { data } = await api.get('/api/topics');
      setTopics(data || []);
    } catch (err) {
      console.error('Failed to fetch topics:', err);
      setTopics([]);
    }
  };
  
  const fetchTopicsByLesson = async (lessonId: string) => {
    if (!lessonId) {
      // If no lesson selected, show all topics
      fetchAllTopics();
      return;
    }
    
    try {
      const { data } = await api.get(`/api/topics/${lessonId}`);
      setTopics(data || []);
      return data || [];
    } catch (err) {
      console.error('Failed to fetch topics:', err);
      // Fallback to all topics if fetch by lesson fails
      fetchAllTopics();
      return [];
    }
  };
  
  const handleLessonChange = (lessonId: string) => {
    setSelectedLesson(lessonId);
    setFormData(prev => ({ ...prev, lesson: lessonId, topic: '' })); // Reset topic when lesson changes
    // Filter topics by lesson to ensure they match
    if (lessonId) {
      fetchTopicsByLesson(lessonId);
    } else {
      fetchAllTopics();
    }
  };

  // Parse subtitle text to segments
  const parseSubtitleText = (text: string) => {
    const segments: Array<{ startTime: number; endTime: number; text: string }> = [];
    const lines = text.trim().split('\n');

    for (const line of lines) {
      if (!line.trim()) continue;

      // Match format: [00:12.520 --> 00:13.520]  I never get up before 8.45.
      const match = line.match(/\[(\d{2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})\]\s*(.+)/);
      
      if (match) {
        const [, startTimeStr, endTimeStr, subtitleText] = match;
        
        // Convert time to seconds
        const timeToSeconds = (timeStr: string): number => {
          const parts = timeStr.split(':');
          if (parts.length === 3) {
            // HH:MM:SS.mmm
            const hours = parseInt(parts[0]);
            const minutes = parseInt(parts[1]);
            const seconds = parseFloat(parts[2]);
            return hours * 3600 + minutes * 60 + seconds;
          } else if (parts.length === 2) {
            // MM:SS.mmm
            const minutes = parseInt(parts[0]);
            const seconds = parseFloat(parts[1]);
            return minutes * 60 + seconds;
          }
          return 0;
        };

        segments.push({
          startTime: timeToSeconds(startTimeStr),
          endTime: timeToSeconds(endTimeStr),
          text: subtitleText.trim()
        });
      }
    }

    return segments;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate topic is required
      if (!formData.topic) {
        alert('Vui lòng chọn chủ đề (Topic)');
        setLoading(false);
        return;
      }

      // If topic is selected, get its lessonId and include both in payload
      let lessonId: string | undefined = formData.lesson || selectedLesson || undefined;
      if (formData.topic && !lessonId) {
        // Find topic in topics list to get its lessonId
        const selectedTopic = topics.find(t => t._id === formData.topic);
        if (selectedTopic && selectedTopic.lessonId) {
          lessonId = typeof selectedTopic.lessonId === 'object' 
            ? selectedTopic.lessonId._id 
            : selectedTopic.lessonId;
        }
      }

      const submitData: any = {
        title: formData.title,
        description: formData.description,
        videoUrl: formData.videoUrl,
        thumbnailUrl: formData.thumbnailUrl,
        duration: formData.duration,
        isActive: formData.isActive,
      };

      // Include both lesson and topic if available
      if (lessonId) {
        submitData.lesson = lessonId;
      }
      if (formData.topic) {
        submitData.topic = formData.topic;
      }

      // Parse subtitles if provided
      if (subtitleText.trim()) {
        const parsedSubtitles = parseSubtitleText(subtitleText);
        if (parsedSubtitles.length > 0) {
          submitData.subtitles = parsedSubtitles;
        }
      }

      if (editVideo) {
        await api.put(`/api/videos/${editVideo._id}`, submitData);
        alert('✅ Cập nhật video thành công!');
      } else {
        await api.post('/api/videos', submitData);
        alert('✅ Tạo video mới thành công!');
      }
      onSuccess();
    } catch (err: any) {
      console.error('Video submit error:', err);
      const errorMessage = err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Có lỗi xảy ra khi lưu video';
      alert('Lỗi: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">
            {editVideo ? 'Chỉnh sửa video' : 'Thêm video mới'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tiêu đề <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nhập tiêu đề video"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mô tả
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nhập mô tả video"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              YouTube URL <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                ref={urlInputRef}
                type="url"
                required
                value={formData.videoUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, videoUrl: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                placeholder="https://www.youtube.com/watch?v=..."
              />
              {detectingInfo && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Loader2 className="animate-spin text-blue-600" size={20} />
                </div>
              )}
            </div>
            {videoInfoError && (
              <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
                <AlertCircle size={16} />
                <span>{videoInfoError}</span>
              </div>
            )}
            {formData.duration > 0 && !detectingInfo && (
              <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 size={16} />
                <span>Đã tự động lấy thời lượng: {Math.floor(formData.duration / 60)}:{String(Math.floor(formData.duration % 60)).padStart(2, '0')}</span>
              </div>
            )}
            {formData.thumbnailUrl && !detectingInfo && (
              <div className="mt-2">
                <img 
                  src={formData.thumbnailUrl} 
                  alt="Video thumbnail" 
                  className="w-full h-32 object-cover rounded-lg border border-gray-200"
                />
              </div>
            )}
          </div>

          {/* Lesson and Topic */}
          <div className="grid grid-cols-2 gap-4">
            {/* Lesson */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bài học <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={selectedLesson || formData.lesson}
                onChange={(e) => handleLessonChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">-- Chọn bài học --</option>
                {lessons.map(lesson => (
                  <option key={lesson._id} value={lesson._id}>
                    {lesson.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Topic */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chủ đề <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.topic}
                onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
                disabled={!selectedLesson && !formData.lesson}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">-- Chọn chủ đề --</option>
                {topics.map(topic => (
                  <option key={topic._id} value={topic._id}>
                    {topic.title}
                  </option>
                ))}
              </select>
              {(!selectedLesson && !formData.lesson) && (
                <p className="text-xs text-gray-500 mt-1">Vui lòng chọn bài học trước</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Thêm subtitle
            </label>
            <textarea
              value={subtitleText}
              onChange={(e) => setSubtitleText(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              placeholder={`Nhập subtitle với định dạng:\n[00:12.520 --> 00:13.520]  I never get up before 8.45.\n[00:13.520 --> 00:14.520]  8.45?\n[00:14.520 --> 00:15.520]  That's late.`}
              rows={8}
            />
            <p className="mt-1 text-xs text-gray-500">
              Định dạng: <code className="bg-gray-100 px-1 rounded">[HH:MM:SS.mmm {'-->'} HH:MM:SS.mmm]  Text</code>
            </p>
            {subtitleText && (
              <div className="mt-2 text-xs text-gray-600">
                Đã parse: {parseSubtitleText(subtitleText).length} subtitle segments
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
              Video hoạt động
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (editVideo ? 'Đang cập nhật...' : 'Đang tạo...') : (editVideo ? 'Cập nhật video' : 'Tạo video')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

