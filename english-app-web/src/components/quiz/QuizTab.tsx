import React, { useState } from "react";
import { createQuiz, deleteQuiz } from "../../api/quizApi";

interface Quiz {
  _id?: string;
  question: string;
  type: "multiple_choice" | "fill_blank" | "true_false" | "matching";
  options?: string[];
  correctAnswer: string | string[];
  explanation?: string;
}

interface QuizTabProps {
  topicId: string;
  quizList: Quiz[];
  refresh: () => void;
}

const QuizTab: React.FC<QuizTabProps> = ({ topicId, quizList, refresh }) => {
  const [form, setForm] = useState<Quiz>({
    question: "",
    type: "multiple_choice",
    options: [],
    correctAnswer: "",
  });
  const [optionText, setOptionText] = useState("");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createQuiz({
        topic: topicId,
        ...form,
      });
      setForm({
        question: "",
        type: "multiple_choice",
        options: [],
        correctAnswer: "",
      });
      setOptionText("");
      refresh();
    } catch (err) {
      console.error("createQuiz error", err);
      alert("Không thể thêm câu hỏi");
    }
  };

  /** 🧩 Xử lý thêm lựa chọn cho multiple choice */
  const addOption = () => {
    if (!optionText.trim()) return;
    setForm({ ...form, options: [...(form.options || []), optionText.trim()] });
    setOptionText("");
  };

  const removeOption = (index: number) => {
    setForm({
      ...form,
      options: form.options?.filter((_, i) => i !== index),
    });
  };

  return (
    <div>
      <form onSubmit={handleAdd} className="bg-gray-50 p-4 rounded mb-4">
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Loại câu hỏi</label>
          <select
            value={form.type}
            onChange={(e) =>
              setForm({ ...form, type: e.target.value as Quiz["type"] })
            }
            className="border p-2 rounded"
          >
            <option value="multiple_choice">Trắc nghiệm</option>
            <option value="fill_blank">Điền khuyết</option>
            <option value="true_false">Đúng / Sai</option>
            <option value="matching">Ghép cặp</option>
          </select>
        </div>

        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Câu hỏi</label>
          <textarea
            value={form.question}
            onChange={(e) => setForm({ ...form, question: e.target.value })}
            className="border p-2 rounded w-full"
            rows={2}
            required
          />
        </div>

        {/* Render theo loại quiz */}
        {form.type === "multiple_choice" && (
          <>
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">
                Lựa chọn
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  value={optionText}
                  onChange={(e) => setOptionText(e.target.value)}
                  placeholder="Nhập lựa chọn..."
                  className="border p-2 rounded flex-1"
                />
                <button
                  type="button"
                  onClick={addOption}
                  className="bg-blue-500 text-white px-3 rounded"
                >
                  +
                </button>
              </div>
              <ul>
                {(form.options || []).map((opt, i) => (
                  <li key={i} className="flex justify-between mb-1">
                    <span>{opt}</span>
                    <button
                      type="button"
                      onClick={() => removeOption(i)}
                      className="text-red-500"
                    >
                      X
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">
                Đáp án đúng
              </label>
              <input
                type="text"
                value={form.correctAnswer as string}
                onChange={(e) =>
                  setForm({ ...form, correctAnswer: e.target.value })
                }
                placeholder="Nhập chính xác một lựa chọn"
                className="border p-2 rounded w-full"
              />
            </div>
          </>
        )}

        {form.type === "fill_blank" && (
          <>
            <p className="text-sm text-gray-600 mb-2">
              Gợi ý: dùng dấu <b>___</b> để chỉ chỗ trống trong câu.
            </p>
            <label className="block text-sm font-medium mb-1">
              Đáp án đúng
            </label>
            <input
              value={form.correctAnswer as string}
              onChange={(e) =>
                setForm({ ...form, correctAnswer: e.target.value })
              }
              className="border p-2 rounded w-full"
              placeholder="Ví dụ: morning"
            />
          </>
        )}

        {form.type === "true_false" && (
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">
              Đáp án đúng
            </label>
            <select
              value={form.correctAnswer as string}
              onChange={(e) =>
                setForm({ ...form, correctAnswer: e.target.value })
              }
              className="border p-2 rounded"
            >
              <option value="">-- chọn --</option>
              <option value="true">Đúng</option>
              <option value="false">Sai</option>
            </select>
          </div>
        )}

        {form.type === "matching" && (
          <>
            <p className="text-sm text-gray-600 mb-2">
              Mỗi dòng là một cặp ghép đúng, phân tách bằng dấu <b>=</b>
              <br />
              Ví dụ: Cat = Con mèo
            </p>
            <textarea
              value={(form.correctAnswer as string) || ""}
              onChange={(e) =>
                setForm({ ...form, correctAnswer: e.target.value })
              }
              className="border p-2 rounded w-full h-24 font-mono"
            />
          </>
        )}

        <button
          type="submit"
          className="mt-4 bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700"
        >
          Thêm câu hỏi
        </button>
      </form>

      {/* Danh sách quiz */}
      <table className="w-full border-collapse border border-gray-200">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-3 py-2 text-left">#</th>
            <th className="border px-3 py-2 text-left">Câu hỏi</th>
            <th className="border px-3 py-2 text-left">Loại</th>
            <th className="border px-3 py-2 text-left">Đáp án đúng</th>
            <th className="border px-3 py-2 text-center">Hành động</th>
          </tr>
        </thead>
        <tbody>
          {quizList.map((q, i) => (
            <tr key={q._id || i}>
              <td className="border px-3 py-2">{i + 1}</td>
              <td className="border px-3 py-2">{q.question}</td>
              <td className="border px-3 py-2">{q.type}</td>
              <td className="border px-3 py-2 text-green-700">
                {Array.isArray(q.correctAnswer)
                  ? q.correctAnswer.join(", ")
                  : q.correctAnswer}
              </td>
              <td className="border px-3 py-2 text-center">
                <button
                  onClick={() => deleteQuiz(q._id!).then(refresh)}
                  className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                >
                  Xóa
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default QuizTab;
