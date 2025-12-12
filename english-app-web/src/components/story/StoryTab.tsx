import React, { useState, useEffect } from "react";
import { FileText, Plus, Trash2, Edit2 } from "lucide-react";
import { getStoryByTopicId, createStoryByTopicId, updateStoryByTopicId, deleteStoryByTopicId } from "../../api/storyAPI";
import api from "../../api/http";

interface Story {
  _id?: string;
  content: string;
  selectedVocabIds?: string[];
}

interface Vocabulary {
  _id: string;
  word: string;
  meaning: string;
}

interface StoryTabProps {
  topicId: string;
  story: Story | null;
  refresh: () => void;
}

const StoryTab: React.FC<StoryTabProps> = ({ topicId, story, refresh }) => {
  const [content, setContent] = useState("");
  const [selectedVocabIds, setSelectedVocabIds] = useState<string[]>([]);
  const [availableVocabs, setAvailableVocabs] = useState<Vocabulary[]>([]);
  const [loading, setLoading] = useState(false);
  const [showVocabSelector, setShowVocabSelector] = useState(false);

  useEffect(() => {
    if (story) {
      setContent(story.content || "");
      setSelectedVocabIds(story.selectedVocabIds || []);
    } else {
      setContent("");
      setSelectedVocabIds([]);
    }
    fetchVocabs();
  }, [story, topicId]);

  const fetchVocabs = async () => {
    try {
      const response = await api.get(`/api/vocab/topic/${topicId}`);
      setAvailableVocabs(response.data || []);
    } catch (err) {
      console.error("Failed to fetch vocabs:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      alert("Vui lòng nhập nội dung truyện");
      return;
    }

    try {
      setLoading(true);
      if (story?._id) {
        await updateStoryByTopicId(topicId, {
          content,
          selectedVocabIds,
        });
      } else {
        await createStoryByTopicId(topicId, {
          content,
          selectedVocabIds,
        });
      }
      alert("✅ Lưu truyện thành công!");
      refresh();
    } catch (err: any) {
      console.error("Save story error", err);
      alert(err.response?.data?.message || "Không thể lưu truyện");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!story?._id) return;
    if (!confirm("Bạn có chắc muốn xóa truyện này?")) return;

    try {
      await deleteStoryByTopicId(topicId);
      alert("✅ Đã xóa truyện!");
      refresh();
    } catch (err) {
      console.error("Delete story error", err);
      alert("Không thể xóa truyện");
    }
  };

  const toggleVocab = (vocabId: string) => {
    setSelectedVocabIds((prev) =>
      prev.includes(vocabId)
        ? prev.filter((id) => id !== vocabId)
        : [...prev, vocabId]
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Truyện Chêm</h3>
        {story && (
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
          >
            <Trash2 size={18} />
            Xóa truyện
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Nội dung truyện <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            rows={10}
            placeholder="Nhập nội dung truyện chêm..."
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium">
              Chọn từ vựng (tùy chọn)
            </label>
            <button
              type="button"
              onClick={() => setShowVocabSelector(!showVocabSelector)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {showVocabSelector ? "Ẩn" : "Hiển thị"} danh sách
            </button>
          </div>
          {showVocabSelector && (
            <div className="bg-gray-50 border rounded-lg p-4 max-h-60 overflow-y-auto">
              {availableVocabs.length === 0 ? (
                <p className="text-gray-500 text-sm">Chưa có từ vựng nào trong topic này</p>
              ) : (
                <div className="space-y-2">
                  {availableVocabs.map((vocab) => (
                    <label
                      key={vocab._id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={selectedVocabIds.includes(vocab._id)}
                        onChange={() => toggleVocab(vocab._id)}
                        className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                      />
                      <span className="text-sm">
                        <strong>{vocab.word}</strong> - {vocab.meaning}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
          {selectedVocabIds.length > 0 && (
            <p className="text-xs text-gray-600 mt-1">
              Đã chọn {selectedVocabIds.length} từ vựng
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg"
          >
            {loading ? "Đang lưu..." : story ? "Cập nhật" : "Tạo truyện"}
          </button>
          {story && (
            <button
              type="button"
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg"
            >
              Xóa
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default StoryTab;































