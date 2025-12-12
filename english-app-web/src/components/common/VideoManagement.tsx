import { useState, useEffect } from 'react';
import api from '../../api/http';

interface Video {
  id: string;
  title: string;
  description?: string;
  url: string;
  thumbnailUrl?: string;
  duration?: number;
  lessonId: string;
  order: number;
  isActive: boolean;
  lesson?: {
    id: string;
    title: string;
    level: string;
  };
}

export default function VideoManagement() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [duration, setDuration] = useState<number | ''>('');
  const [lessonId, setLessonId] = useState('');
  const [order, setOrder] = useState(0);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/api/videos');
      setVideos(data.videos);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to fetch videos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const videoData = {
        title,
        description,
        url,
        thumbnailUrl,
        duration: duration || null,
        lessonId,
        order
      };

      if (selectedVideo) {
        await api.put(`/api/videos/${selectedVideo.id}`, videoData);
      } else {
        await api.post('/api/videos', videoData);
      }

      resetForm();
      fetchVideos();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Failed to save video');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (video: Video) => {
    setSelectedVideo(video);
    setTitle(video.title);
    setDescription(video.description || '');
    setUrl(video.url);
    setThumbnailUrl(video.thumbnailUrl || '');
    setDuration(video.duration || '');
    setLessonId(video.lessonId);
    setOrder(video.order);
    setShowForm(true);
  };

  const handleDelete = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video?')) return;

    try {
      await api.delete(`/api/videos/${videoId}`);
      fetchVideos();
    } catch (err: any) {
      setError('Failed to delete video');
    }
  };

  const resetForm = () => {
    setSelectedVideo(null);
    setTitle('');
    setDescription('');
    setUrl('');
    setThumbnailUrl('');
    setDuration('');
    setLessonId('');
    setOrder(0);
    setShowForm(false);
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getVideoEmbedUrl = (url: string) => {
    // Convert YouTube watch URL to embed URL
    if (url.includes('youtube.com/watch')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    return url;
  };

  return (
    <div style={{ maxWidth: 1400, margin: '40px auto', fontFamily: 'system-ui', padding: '0 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
        <h1>Video Management</h1>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: 5,
            cursor: 'pointer'
          }}
        >
          + Add Video
        </button>
      </div>

      {error && (
        <div style={{ padding: 15, backgroundColor: '#f8d7da', color: '#721c24', borderRadius: 5, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {showForm ? (
        <div style={{ backgroundColor: '#f8f9fa', padding: 30, borderRadius: 10, marginBottom: 30 }}>
          <h2>{selectedVideo ? 'Edit Video' : 'Add New Video'}</h2>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                style={{ width: '100%', padding: 10, borderRadius: 5, border: '1px solid #ddd' }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: 10, borderRadius: 5, border: '1px solid #ddd' }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Video URL *</label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                placeholder="https://www.youtube.com/watch?v=..."
                style={{ width: '100%', padding: 10, borderRadius: 5, border: '1px solid #ddd' }}
              />
              <small style={{ color: '#666' }}>YouTube URL or direct video URL</small>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Thumbnail URL</label>
              <input
                type="text"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="https://..."
                style={{ width: '100%', padding: 10, borderRadius: 5, border: '1px solid #ddd' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 20 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Duration (seconds)</label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value ? parseInt(e.target.value) : '')}
                  placeholder="300"
                  style={{ width: '100%', padding: 10, borderRadius: 5, border: '1px solid #ddd' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Lesson ID *</label>
                <input
                  type="text"
                  value={lessonId}
                  onChange={(e) => setLessonId(e.target.value)}
                  required
                  placeholder="Enter lesson ID"
                  style={{ width: '100%', padding: 10, borderRadius: 5, border: '1px solid #ddd' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>Order</label>
                <input
                  type="number"
                  value={order}
                  onChange={(e) => setOrder(parseInt(e.target.value))}
                  min={0}
                  style={{ width: '100%', padding: 10, borderRadius: 5, border: '1px solid #ddd' }}
                />
              </div>
            </div>

            {url && (
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 10, fontWeight: 'bold' }}>Preview</label>
                <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden' }}>
                  <iframe
                    src={getVideoEmbedUrl(url)}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      border: 'none',
                      borderRadius: 10
                    }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '10px 30px',
                  backgroundColor: loading ? '#ccc' : '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: 5,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Saving...' : selectedVideo ? 'Update Video' : 'Add Video'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                style={{
                  padding: '10px 30px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: 5,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <div>
        <h2 style={{ marginBottom: 20 }}>All Videos</h2>
        {loading && videos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <p>Loading...</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {videos.map((video) => (
              <div
                key={video.id}
                style={{
                  backgroundColor: 'white',
                  borderRadius: 10,
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  transition: 'transform 0.2s'
                }}
              >
                {video.thumbnailUrl ? (
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    style={{ width: '100%', height: 180, objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: 180,
                      backgroundColor: '#e9ecef',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#6c757d'
                    }}
                  >
                    <span style={{ fontSize: 48 }}>🎥</span>
                  </div>
                )}
                <div style={{ padding: 20 }}>
                  <h3 style={{ marginBottom: 10, fontSize: 18 }}>{video.title}</h3>
                  <p style={{ color: '#666', fontSize: 14, marginBottom: 15 }}>
                    {video.description || 'No description'}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#666', marginBottom: 15 }}>
                    <span>⏱ {formatDuration(video.duration)}</span>
                    <span>📚 {video.lesson?.title || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={() => handleEdit(video)}
                      style={{
                        flex: 1,
                        padding: '8px 16px',
                        backgroundColor: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: 5,
                        cursor: 'pointer'
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(video.id)}
                      style={{
                        flex: 1,
                        padding: '8px 16px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: 5,
                        cursor: 'pointer'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {videos.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
            <p>No videos found. Click "Add Video" to create one.</p>
          </div>
        )}
      </div>
    </div>
  );
}








