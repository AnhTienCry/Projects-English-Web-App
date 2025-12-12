import React, { useState, useEffect } from "react";
import { Video as VideoIcon, Plus, Trash2, Play, Edit2 } from "lucide-react";
import api from "../../api/http";

interface Video {
  _id?: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  order?: number;
}

interface VideoTabProps {
  topicId: string;
  videoList: Video[];
  refresh: () => void;
}

const VideoTab: React.FC<VideoTabProps> = ({ topicId, videoList, refresh }) => {
  const [form, setForm] = useState<Video>({
    title: "",
    description: "",
    videoUrl: "",
    thumbnailUrl: "",
    duration: 0,
    order: 0,
  });
  const [showForm, setShowForm] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (editingVideo?._id) {
        await api.put(`/api/videos/${editingVideo._id}`, {
          ...form,
          topic: topicId,
        });
      } else {
        await api.post("/api/videos", {
          ...form,
          topic: topicId,
        });
      }
      setForm({
        title: "",
        description: "",
        videoUrl: "",
        thumbnailUrl: "",
        duration: 0,
        order: 0,
      });
      setShowForm(false);
      setEditingVideo(null);
      refresh();
    } catch (err) {
      console.error("Save video error", err);
      alert("Không thể lưu video");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa video này?")) return;
    try {
      await api.delete(`/api/videos/${id}`);
      refresh();
    } catch (err) {
      console.error("Delete video error", err);
      alert("Không thể xóa video");
    }
  };

  const handleEdit = (video: Video) => {
    setEditingVideo(video);
    setForm({
      title: video.title || "",
      description: video.description || "",
      videoUrl: video.videoUrl || "",
      thumbnailUrl: video.thumbnailUrl || "",
      duration: video.duration || 0,
      order: video.order || 0,
    });
    setShowForm(true);
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Danh sách Video</h3>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingVideo(null);
            setForm({
              title: "",
              description: "",
              videoUrl: "",
              thumbnailUrl: "",
              duration: 0,
              order: 0,
            });
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          <Plus size={18} />
          {showForm ? "Đóng" : "Thêm Video"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-lg mb-4">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Tiêu đề *</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mô tả</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Video URL *</label>
                <input
                  type="url"
                  required
                  value={form.videoUrl}
                  onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Thumbnail URL</label>
                <input
                  type="url"
                  value={form.thumbnailUrl}
                  onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Thời lượng (giây)</label>
                <input
                  type="number"
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Thứ tự</label>
                <input
                  type="number"
                  value={form.order}
                  onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
              >
                {editingVideo ? "Cập nhật" : "Thêm"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingVideo(null);
                }}
                className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded"
              >
                Hủy
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {videoList.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Chưa có video nào</p>
        ) : (
          videoList.map((video) => (
            <div
              key={video._id}
              className="bg-white border rounded-lg p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3 flex-1">
                {video.thumbnailUrl ? (
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="w-24 h-16 object-cover rounded"
                  />
                ) : (
                  <div className="w-24 h-16 bg-gray-200 rounded flex items-center justify-center">
                    <VideoIcon size={24} className="text-gray-400" />
                  </div>
                )}
                <div className="flex-1">
                  <h4 className="font-semibold">{video.title}</h4>
                  {video.description && (
                    <p className="text-sm text-gray-600 line-clamp-1">{video.description}</p>
                  )}
                  <div className="flex gap-4 text-xs text-gray-500 mt-1">
                    <span>⏱️ {formatDuration(video.duration)}</span>
                    <span>📊 Order: {video.order}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(video)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => handleDelete(video._id!)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default VideoTab;































