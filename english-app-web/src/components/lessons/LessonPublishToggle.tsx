import React, { useState } from 'react';
import { publishLesson } from '../../api/lessonsApi';

interface Props {
  lessonId: string;
  isPublished: boolean;
  onToggle: () => void;
}

const LessonPublishToggle: React.FC<Props> = ({ lessonId, isPublished, onToggle }) => {
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    try {
      setLoading(true);
      console.log('🔄 Toggling publish status:', { lessonId, currentStatus: isPublished, newStatus: !isPublished });
      await publishLesson(lessonId, !isPublished);
      console.log('✅ Publish status updated successfully');
      onToggle();
    } catch (error: any) {
      console.error('❌ Error updating publish status:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Không thể cập nhật trạng thái xuất bản.';
      alert(`Lỗi: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      disabled={loading}
      onClick={handleToggle}
      className={`w-full px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
        isPublished
          ? 'bg-green-500 text-white hover:bg-green-600 hover:shadow-md active:scale-95'
          : 'bg-gray-400 text-white hover:bg-gray-500 hover:shadow-md active:scale-95'
      } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      title={isPublished ? 'Click để ẩn bài học' : 'Click để xuất bản bài học'}
    >
      {loading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
          <span>Đang cập nhật...</span>
        </>
      ) : isPublished ? (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span>Đã xuất bản</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
          <span>Chưa xuất bản</span>
        </>
      )}
    </button>
  );
};

export default LessonPublishToggle;
