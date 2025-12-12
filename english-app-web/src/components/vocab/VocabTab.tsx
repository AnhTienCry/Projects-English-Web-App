import React, { useState } from "react";
import { createVocab, deleteVocab } from "../../api/vocabApi";
import api from "../../api/http"; // ✅ thay vì axios

interface Vocab {
  _id?: string;
  word: string;
  meaning: string;
  example?: string;
}

interface VocabTabProps {
  topicId: string;
  vocabList: Vocab[];
  refresh: () => void;
}

const VocabTab: React.FC<VocabTabProps> = ({ topicId, vocabList, refresh }) => {
  const [form, setForm] = useState({ word: "", meaning: "", example: "" });
  const [bulkText, setBulkText] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createVocab({ ...form, topic: topicId });
      setForm({ word: "", meaning: "", example: "" });
      refresh();
    } catch (err) {
      console.error("createVocab error", err);
      alert("Không thể thêm từ vựng");
    }
  };

  const handleBulkAdd = async () => {
    if (!bulkText.trim()) return alert("Vui lòng nhập nội dung danh sách từ.");
    try {
      setLoading(true);

      const lines = bulkText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      const vocabItems = lines.map((line) => {
        const parts = line.split(/\t|,/).map((p) => p.trim());
        return {
          word: parts[0],
          meaning: parts[1] || "",
          example: parts[2] || "",
          topic: topicId,
        };
      });

      await api.post("/api/vocab/bulk", vocabItems); // ✅ gửi qua instance có token
      setBulkText("");
      refresh();
      alert(`✅ Đã thêm ${vocabItems.length} từ vựng`);
    } catch (err) {
      console.error("bulkCreateVocab error", err);
      alert("Không thể thêm danh sách từ vựng");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (vocabId: string) => {
    if (!window.confirm("Bạn có chắc muốn xóa từ này không?")) return;
    try {
      await deleteVocab(vocabId);
      refresh();
    } catch (err) {
      console.error("deleteVocab error", err);
      alert("Không thể xóa từ vựng");
    }
  };

  return (
    <div>
      {/* --- Form thêm từng từ --- */}
      <form onSubmit={handleAdd} className="flex flex-wrap gap-2 mb-4">
        <input
          value={form.word}
          onChange={(e) => setForm({ ...form, word: e.target.value })}
          placeholder="Từ"
          className="border p-2 rounded w-32"
          required
        />
        <input
          value={form.meaning}
          onChange={(e) => setForm({ ...form, meaning: e.target.value })}
          placeholder="Nghĩa"
          className="border p-2 rounded w-40"
          required
        />
        <input
          value={form.example}
          onChange={(e) => setForm({ ...form, example: e.target.value })}
          placeholder="Ví dụ"
          className="border p-2 rounded w-60"
        />
        <button
          type="submit"
          className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
        >
          Thêm
        </button>
        <button
          type="button"
          onClick={() => setShowBulk(!showBulk)}
          className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
        >
          {showBulk ? "Ẩn nhập nhanh" : "🧾 Nhập nhiều từ"}
        </button>
      </form>

      {/* --- Nhập nhiều từ --- */}
      {showBulk && (
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-1">
            Dán danh sách từ (mỗi dòng: <b>Từ - Nghĩa - Ví dụ</b>, phân tách
            bằng <b>tab</b> hoặc <b>,</b>)
          </p>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            className="border p-2 rounded w-full h-40 font-mono"
            placeholder={`Ví dụ:\nHello, Xin chào\nGoodbye, Tạm biệt\nThank you, Cảm ơn`}
          />
          <button
            onClick={handleBulkAdd}
            disabled={loading}
            className="mt-2 bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700"
          >
            {loading ? "Đang thêm..." : "Thêm tất cả"}
          </button>
        </div>
      )}

      {/* --- Danh sách từ --- */}
      <table className="w-full border-collapse border border-gray-200">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-3 py-2">#</th>
            <th className="border px-3 py-2 text-left">Từ</th>
            <th className="border px-3 py-2 text-left">Nghĩa</th>
            <th className="border px-3 py-2 text-left">Ví dụ</th>
            <th className="border px-3 py-2 text-center">Hành động</th>
          </tr>
        </thead>
        <tbody>
          {vocabList.map((v, i) => (
            <tr key={v._id || i} className="hover:bg-gray-50">
              <td className="border px-3 py-2 text-center">{i + 1}</td>
              <td className="border px-3 py-2">{v.word}</td>
              <td className="border px-3 py-2">{v.meaning}</td>
              <td className="border px-3 py-2 italic text-gray-600">
                {v.example}
              </td>
              <td className="border px-3 py-2 text-center">
                <button
                  onClick={() => handleDelete(v._id!)}
                  className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                >
                  Xóa
                </button>
              </td>
            </tr>
          ))}
          {vocabList.length === 0 && (
            <tr>
              <td
                colSpan={5}
                className="text-center text-gray-400 py-3 italic"
              >
                Chưa có từ vựng nào
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default VocabTab;
