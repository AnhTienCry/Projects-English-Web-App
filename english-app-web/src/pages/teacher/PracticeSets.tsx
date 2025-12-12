import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  listPracticeSets,
  createPracticeSet,
  deletePracticeSet,
} from "../../api/practiceApi";
import axios from "axios";
import { message } from "antd";
import { BookOpen, Plus, Eye, FileText, Trash2, Settings, RefreshCw } from "lucide-react";

export default function PracticeSets() {
  const [sets, setSets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ examType: "ielts", title: "" });
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterExamType, setFilterExamType] = useState<string>("all"); // "all" | "ielts" | "toeic"
  const nav = useNavigate();

  /** --- CRUD SET --- */
  const fetchData = async () => {
    setLoading(true);
    const res = await listPracticeSets();
    setSets(res.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    fetchSubmissions();
  }, []);

  const onCreate = async () => {
    if (!form.title.trim()) return alert("Nhập tên đề (VD: Đề 1)");
    const res = await createPracticeSet(form as any);
    nav(`/teacher/practice/${res.data.id}/sections`);
  };

  const onDelete = async (id: string) => {
    if (!window.confirm("Xóa đề này?")) return;
    await deletePracticeSet(id);
    fetchData();
  };

  /** --- Lấy danh sách bài nộp gần đây --- */
  const fetchSubmissions = async () => {
    try {
      setLoadingSubs(true);
      const res = await axios.get("/api/v2/practice/submissions", {
        params: { skill: "" },
      });
      setSubmissions(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSubs(false);
    }
  };

  /** --- Xóa bài nộp --- */
  const onDeleteSubmission = async (id: string) => {
    if (!window.confirm("Bạn có chắc muốn xóa bài nộp này không?")) return;
    
    setDeletingId(id);
    try {
      await axios.delete(`/api/v2/practice/submissions/${id}`);
      message.success("✅ Đã xóa bài nộp thành công");
      fetchSubmissions();
    } catch (err: any) {
      console.error(err);
      message.error(err.response?.data?.message || "Không thể xóa bài nộp.");
    } finally {
      setDeletingId(null);
    }
  };

  /** --- Filter sets theo examType --- */
  const filteredSets = filterExamType === "all" 
    ? sets 
    : sets.filter((s) => s.examType === filterExamType);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-green-100 p-2 rounded-lg">
                <BookOpen className="text-green-600" size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Practice Sets</h1>
                <p className="text-gray-600">Quản lý các bộ đề luyện tập IELTS và TOEIC</p>
              </div>
            </div>
          </div>   
        </div>
      </div>

      {/* Filter và Create Form */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Filter by Exam Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Lọc theo kỳ thi
            </label>
            <select
              value={filterExamType}
              onChange={(e) => setFilterExamType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="all">🌐 Toàn bộ</option>
              <option value="ielts">IELTS</option>
              <option value="toeic">TOEIC</option>
            </select>
          </div>
        </div>

        {/* Create Form */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Tạo đề mới</h3>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kỳ thi
              </label>
              <select
                value={form.examType}
                onChange={(e) =>
                  setForm({ ...form, examType: e.target.value as any })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="ielts">IELTS</option>
                <option value="toeic">TOEIC</option>
              </select>
            </div>
            <div className="flex-1 min-w-[250px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tên đề
              </label>
              <input
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="VD: Đề 1, IELTS Test 1..."
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <button
              onClick={onCreate}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors font-medium"
            >
              <Plus size={18} />
              Tạo đề
            </button>
          </div>
        </div>
      </div>

      {/* --- Danh sách đề --- */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-700">Đang tải dữ liệu...</h2>
          </div>
        </div>
      ) : filteredSets.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <BookOpen className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-500 text-lg">
            {filterExamType === "all" 
              ? "Chưa có đề nào. Hãy tạo đề mới để bắt đầu!" 
              : `Chưa có đề ${filterExamType.toUpperCase()} nào.`}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tên đề
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kỳ thi
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ngày tạo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSets.map((s) => (
                  <tr key={s._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{s.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        s.examType === "ielts" 
                          ? "bg-blue-100 text-blue-800" 
                          : "bg-purple-100 text-purple-800"
                      }`}>
                        {s.examType.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(s.createdAt).toLocaleDateString("vi-VN", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-3">
                        <Link
                          to={`/teacher/practice/${s._id}/sections`}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
                          title="Quản lý kỹ năng"
                        >
                          <Settings size={16} />
                          <span>Kỹ năng</span>
                        </Link>
                        <Link
                          to={`/teacher/practice/preview/${s._id}`}
                          className="flex items-center gap-1 text-green-600 hover:text-green-800 transition-colors"
                          title="Xem trước"
                        >
                          <Eye size={16} />
                          <span>Xem trước</span>
                        </Link>
                        <Link
                          to={`/teacher/practice/submissions?setId=${s._id}`}
                          className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 transition-colors"
                          title="Xem bài nộp"
                        >
                          <FileText size={16} />
                          <span>Bài nộp</span>
                        </Link>
                        <button
                          onClick={() => onDelete(s._id)}
                          className="flex items-center gap-1 text-red-600 hover:text-red-800 transition-colors"
                          title="Xóa đề"
                        >
                          <Trash2 size={16} />
                          <span>Xóa</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- Bài nộp gần đây --- */}
      <div className="mt-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-100 p-2 rounded-lg">
                <FileText className="text-indigo-600" size={20} />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Bài nộp gần đây</h2>
            </div>
            <button
              onClick={fetchSubmissions}
              className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-sm font-medium transition-colors"
            >
              <RefreshCw size={16} />
              Làm mới
            </button>
          </div>

          {loadingSubs ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto text-gray-400 mb-2" size={32} />
              <p className="text-gray-500">Chưa có bài nộp nào.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Học viên
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Đề
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kỹ năng
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Điểm
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ngày nộp
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hành động
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {submissions.slice(0, 5).map((s) => (
                    <tr key={s._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {s.userId?.nickname || "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {s.setId?.title || "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {s.sectionId?.skill?.toUpperCase() || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        <span className="font-medium">{s.score}/{s.total}</span>
                        {s.analytics?.accuracy && (
                          <span className="text-gray-500 text-xs ml-2">
                            ({(s.analytics.accuracy * 100).toFixed(0)}%)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {new Date(s.createdAt).toLocaleString("vi-VN")}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-3">
                          <Link
                            to={`/teacher/practice/submission/${s._id}`}
                            className="text-indigo-600 hover:text-indigo-800 transition-colors"
                          >
                            Xem chi tiết
                          </Link>
                          <button
                            onClick={() => onDeleteSubmission(s._id)}
                            disabled={deletingId === s._id}
                            className="flex items-center gap-1 text-red-600 hover:text-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Xóa bài nộp"
                          >
                            {deletingId === s._id ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                                <span>Đang xóa...</span>
                              </>
                            ) : (
                              <>
                                <Trash2 size={14} />
                                <span>Xóa</span>
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
