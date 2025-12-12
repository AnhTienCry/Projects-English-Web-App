import { ApiConfig } from "../../config/apiConfig";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  listItems,
  addItem,
  updateItem,
  deleteItem,
  getSection,
  updateSection,
  uploadAudio,
} from "../../api/practiceApi";
import { Trash2 } from "lucide-react";

const absUrl = (u?: string) => {
  if (!u) return "";
  const base = ApiConfig.baseUrl.replace(/\/+$/, "");
  try {
    // Dù u là tuyệt đối hay tương đối, luôn lấy pathname rồi ghép với base
    const { pathname } = new URL(u, base);
    return `${base}${pathname}`;
  } catch {
    const path = u.startsWith("/") ? u : `/${u}`;
    return `${base}${path}`;
  }
};


type ItemForm = {
  order: number;
  type: "mcq" | "gap" | "truefalse" | "yesno_ng" | "matching" | "heading" | "speaking";
  prompt: string;
  options: string;
  answers: string;
  explanation?: string;
  strict?: boolean;
  pairs?: string;
  polarity?: "tf" | "yn";
  answerBool?: "true" | "false" | "not_given";
  snippet?: string;
};

export default function PracticeItems() {
  const { sectionId = "" } = useParams();
  const [section, setSection] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [snippet, setSnippet] = useState("");
  const snippetRef = useRef<HTMLTextAreaElement>(null);

  const [form, setForm] = useState<ItemForm>({
    order: 1,
    type: "mcq",
    prompt: "",
    options: "",
    answers: "",
    explanation: "",
  });
  
  // Tách options thành 4 input riêng cho MCQ và Heading
  const [options, setOptions] = useState({
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
  });

  // Mode thêm nhiều câu hỏi cùng lúc
  const [multiMode, setMultiMode] = useState(false);
  const [multiQuestions, setMultiQuestions] = useState<Array<{
    order: number;
    type: string;
    prompt: string;
    options: { optionA: string; optionB: string; optionC: string; optionD: string };
    answers: string;
    explanation: string;
  }>>([]);

  const fetchAll = async () => {
    const [sec, its] = await Promise.all([getSection(sectionId), listItems(sectionId)]);
    setSection(sec.data);
    setItems(its.data);
  };

  useEffect(() => {
    fetchAll();
  }, [sectionId]);

  useEffect(() => {
    setForm((f) => {
      if (f.type === "truefalse") return { ...f, polarity: "tf", answerBool: f.answerBool ?? "true" };
      if (f.type === "yesno_ng") return { ...f, polarity: "yn", answerBool: f.answerBool ?? "true" };
      return f;
    });
  }, [form.type]);

  const onAudioSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    try {
      const { url } = await uploadAudio(file);
      await updateSection(sectionId, { audioUrl: url });
      const sec = await getSection(sectionId);
      setSection(sec.data);
    } finally {
      setSaving(false);
    }
  };

  const onSaveTranscript = async () => {
    setSaving(true);
    try {
      await updateSection(sectionId, {
        transcript: section.transcript || "",
        transcriptMode: section.transcriptMode || "afterFirstEnd",
        maxReplay: Number(section.maxReplay || 2),
      });
      const sec = await getSection(sectionId);
      setSection(sec.data);
    } finally {
      setSaving(false);
    }
  };

  const handleHighlight = () => {
    const sel = window.getSelection()?.toString();
    if (!sel) return;
    setSnippet((prev) => prev.replace(sel, `[[${sel}]]`));
  };

  /* ---------- ADD ---------- */
  const onAdd = async () => {
    if (!form.prompt.trim()) return alert("Nhập câu hỏi");
    const payload: any = buildPayload(form, section.skill, snippet);
    await addItem(sectionId, payload);
    resetForm();
    const its = await listItems(sectionId);
    setItems(its.data);
  };

  /* ---------- ADD MULTIPLE ---------- */
  const onAddMultiple = async () => {
    if (multiQuestions.length === 0) {
      alert("Thêm ít nhất một câu hỏi");
      return;
    }

    try {
      // Tạo payload cho tất cả câu hỏi
      const payloads = multiQuestions.map((q) => {
        const tempForm: ItemForm = {
          order: q.order,
          type: q.type as any,
          prompt: q.prompt,
          options: "",
          answers: q.answers,
          explanation: q.explanation,
        };
        return buildPayload(tempForm, section.skill, snippet, q.options);
      });

      // Thêm tất cả câu hỏi cùng lúc
      await Promise.all(payloads.map((p) => addItem(sectionId, p)));
      
      // Reset form
      setMultiQuestions([]);
      setMultiMode(false);
      
      // Refresh danh sách
      const its = await listItems(sectionId);
      setItems(its.data);
      alert(`✅ Đã thêm ${payloads.length} câu hỏi thành công!`);
    } catch (err) {
      console.error(err);
      alert("Có lỗi xảy ra khi thêm câu hỏi");
    }
  };

  const addToMultiList = () => {
    if (!form.prompt.trim()) {
      alert("Nhập câu hỏi trước khi thêm vào danh sách");
      return;
    }
    
    const nextOrder = multiQuestions.length > 0 
      ? Math.max(...multiQuestions.map(q => q.order)) + 1
      : form.order;
    
    setMultiQuestions([
      ...multiQuestions,
      {
        order: nextOrder,
        type: form.type,
        prompt: form.prompt,
        options: { ...options },
        answers: form.answers,
        explanation: form.explanation || "",
      },
    ]);
    
    // Reset form nhưng giữ type và order
    setForm({
      ...form,
      prompt: "",
      answers: "",
      explanation: "",
    });
    setOptions({
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
    });
  };

  const removeFromMultiList = (index: number) => {
    setMultiQuestions(multiQuestions.filter((_, i) => i !== index));
  };

  /* ---------- EDIT ---------- */
  const onEdit = (item: any) => {
    setEditingId(item._id);
    const itemOptions = item.options || [];
    setForm({
      order: item.order,
      type: item.type,
      prompt: item.prompt,
      options: itemOptions.join("|"),
      answers: (item.answers || []).join("|"),
      explanation: item.explanation || "",
      strict: item.strict || false,
      pairs: (item.pairs || []).map((p: any) => `${p.left}:${p.right}`).join("|"),
      polarity: item.polarity,
      answerBool: item.answerBool,
      snippet: item.snippet,
    });
    // Parse options thành 4 input riêng
    setOptions({
      optionA: itemOptions[0] || "",
      optionB: itemOptions[1] || "",
      optionC: itemOptions[2] || "",
      optionD: itemOptions[3] || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onSaveEdit = async () => {
    if (!editingId) return;
    const payload: any = buildPayload(form, section.skill, snippet);
    await updateItem(editingId, payload);
    resetForm();
    setEditingId(null);
    const its = await listItems(sectionId);
    setItems(its.data);
  };

  /* ---------- DELETE ---------- */
  const onDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc muốn xóa câu hỏi này không?")) return;
    try {
      await deleteItem(id);
      const its = await listItems(sectionId);
      setItems(its.data);
    } catch (err) {
      alert("Không thể xóa câu hỏi.");
      console.error(err);
    }
  };

  const resetForm = () => {
    setForm({
      ...form,
      order: form.order + 1,
      prompt: "",
      options: "",
      answers: "",
      explanation: "",
    });
    setOptions({
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
    });
    setSnippet("");
  };

  const buildPayload = (f: ItemForm, skill: string, snip: string, customOptions?: { optionA: string; optionB: string; optionC: string; optionD: string }) => {
    const payload: any = {
      order: f.order,
      type: f.type,
      prompt: f.prompt,
      options: f.options ? f.options.split("|") : [],
      answers: f.answers ? f.answers.split("|") : [],
      explanation: f.explanation,
    };
    
    // Nếu là MCQ hoặc Heading, dùng options từ state riêng hoặc customOptions
    if (f.type === "mcq" || f.type === "heading") {
      const optsToUse = customOptions || options;
      const opts = [optsToUse.optionA, optsToUse.optionB, optsToUse.optionC, optsToUse.optionD]
        .filter((opt) => opt.trim() !== "");
      payload.options = opts;
    }
    
    if (skill === "reading") payload.snippet = snip || f.snippet || "";
    if (f.type === "truefalse" || f.type === "yesno_ng") {
      payload.polarity = f.type === "truefalse" ? "tf" : "yn";
      payload.answerBool = f.answerBool || "true";
    }
    if (f.type === "gap") payload.strict = !!f.strict;
    if (f.type === "matching")
      payload.pairs = (f.pairs || "")
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((p) => {
          const [l, r] = p.split(":");
          return { left: l?.trim(), right: r?.trim() };
        });
    return payload;
  };

  if (!section) return <div className="p-6">Đang tải…</div>;

  const isListening = section.skill === "listening";
  const isReading = section.skill === "reading";

  const answerChoices =
    form.type === "truefalse"
      ? [
          { value: "true", label: "True" },
          { value: "false", label: "False" },
        ]
      : form.type === "yesno_ng"
      ? [
          { value: "true", label: "Yes" },
          { value: "false", label: "No" },
          { value: "not_given", label: "Not given" },
        ]
      : [];

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">
        {section.title} — <span className="capitalize">{section.skill}</span>
      </h1>

      {/* AUDIO + TRANSCRIPT */}
      {isListening && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">🎧 Audio & Transcript</h2>
            {saving && <span className="text-sm text-gray-500">Đang lưu…</span>}
          </div>

          <div className="flex flex-col gap-2">
            <input type="file" accept="audio/*" onChange={onAudioSelected} />
            {section.audioUrl && (() => {
              const audioSrc = absUrl(section.audioUrl);        // chuẩn hoá thành URL tuyệt đối
              return (
                <audio
                  key={audioSrc}                                 // ép Audio reload khi URL đổi
                  className="w-full"
                  controls
                  preload="metadata"                             // tải nhẹ để nhanh hiển thị thời lượng
                  crossOrigin="anonymous"                        // cho CORS/Range (206) hoạt động
                  src={audioSrc}
                  onError={(e) => console.error("AUDIO ERROR", e, audioSrc)} // tiện debug
                />
              );
            })()}

          </div>

          <div className="grid md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <textarea
                rows={6}
                className="border rounded w-full p-2"
                placeholder="Transcript…"
                value={section.transcript || ""}
                onChange={(e) => setSection({ ...section, transcript: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm">Transcript mode</label>
              <select
                className="border rounded w-full p-2"
                value={section.transcriptMode || "afterFirstEnd"}
                onChange={(e) => setSection({ ...section, transcriptMode: e.target.value })}
              >
                <option value="never">never</option>
                <option value="afterFirstEnd">afterFirstEnd</option>
                <option value="always">always</option>
              </select>
              <label className="block text-sm mt-2">Max replay</label>
              <input
                type="number"
                className="border rounded w-full p-2"
                value={section.maxReplay ?? 2}
                onChange={(e) => setSection({ ...section, maxReplay: Number(e.target.value) })}
              />
              <button
                onClick={onSaveTranscript}
                className="mt-3 bg-blue-600 text-white px-3 py-2 rounded w-full"
              >
                Lưu cấu hình
              </button>
            </div>
          </div>
        </div>
      )}

      {/* READING SNIPPET */}
      {isReading && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
          <h2 className="font-semibold text-lg">📖 Snippet (đoạn chứa đáp án)</h2>
          <textarea
            ref={snippetRef}
            rows={8}
            className="border rounded w-full p-2 font-serif"
            placeholder="Dán đoạn văn vào đây…"
            value={snippet}
            onChange={(e) => setSnippet(e.target.value)}
          />
          <div className="flex items-center justify-between">
            <button onClick={handleHighlight} className="bg-green-600 text-white px-3 py-2 rounded">
              Highlight đoạn đã chọn
            </button>
            <small className="text-gray-500">
              Highlight sẽ bao bằng [[...]] và hiển thị màu vàng ở preview.
            </small>
          </div>
          <div
            className="bg-white border rounded p-3"
            dangerouslySetInnerHTML={{
              __html: (snippet || "").replace(/\[\[(.*?)\]\]/g, `<mark class="bg-yellow-300">$1</mark>`),
            }}
          />
        </div>
      )}

      {/* FORM ADD/EDIT */}
      <div className="bg-white border rounded-xl shadow p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">
            {editingId ? "✏️ Chỉnh sửa câu hỏi" : "🧩 Thêm câu hỏi"}
          </h2>
          {!editingId && (
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={multiMode}
                  onChange={(e) => {
                    setMultiMode(e.target.checked);
                    if (!e.target.checked) setMultiQuestions([]);
                  }}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">Thêm nhiều câu cùng lúc</span>
              </label>
            </div>
          )}
        </div>

        {/* Danh sách câu hỏi đã thêm trong multi mode */}
        {multiMode && multiQuestions.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-blue-900">
                Đã thêm {multiQuestions.length} câu hỏi vào danh sách
              </h3>
              <button
                onClick={onAddMultiple}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Lưu tất cả ({multiQuestions.length} câu)
              </button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {multiQuestions.map((q, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-blue-200 rounded p-3 flex items-start justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-blue-600">Câu {q.order}</span>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">{q.type.toUpperCase()}</span>
                    </div>
                    <p className="text-sm text-gray-800">{q.prompt}</p>
                    {q.answers && (
                      <p className="text-xs text-gray-600 mt-1">Đáp án: {q.answers}</p>
                    )}
                  </div>
                  <button
                    onClick={() => removeFromMultiList(idx)}
                    className="text-red-600 hover:text-red-800 ml-2"
                    title="Xóa khỏi danh sách"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-3">
          <input
            type="number"
            className="border rounded p-2"
            placeholder="Thứ tự"
            value={form.order}
            onChange={(e) => setForm({ ...form, order: +e.target.value })}
          />
          <select
            className="border rounded p-2"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as any })}
          >
            <option value="mcq">MCQ</option>
            <option value="gap">Gap</option>
            <option value="truefalse">True/False</option>
            <option value="yesno_ng">Yes/No/Not Given</option>
            <option value="matching">Matching</option>
            <option value="heading">Heading</option>
            <option value="speaking">Speaking</option>
          </select>

          <input
            className="border rounded p-2 md:col-span-2"
            placeholder="Câu hỏi / Prompt"
            value={form.prompt}
            onChange={(e) => setForm({ ...form, prompt: e.target.value })}
          />

          {(form.type === "mcq" || form.type === "heading") && (
            <>
              {/* 4 Options riêng biệt */}
              <div className="md:col-span-2 space-y-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Các lựa chọn
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">A</label>
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Nhập đáp án A"
                      value={options.optionA}
                      onChange={(e) => setOptions({ ...options, optionA: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">B</label>
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Nhập đáp án B"
                      value={options.optionB}
                      onChange={(e) => setOptions({ ...options, optionB: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">C</label>
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Nhập đáp án C"
                      value={options.optionC}
                      onChange={(e) => setOptions({ ...options, optionC: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">D</label>
                    <input
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Nhập đáp án D"
                      value={options.optionD}
                      onChange={(e) => setOptions({ ...options, optionD: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              {/* Answers */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Đáp án đúng
                </label>
                <input
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="VD: A, A|B (nhiều đáp án cách nhau bằng |)"
                  value={form.answers}
                  onChange={(e) => setForm({ ...form, answers: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Nhập các đáp án đúng, ví dụ: A hoặc A|B cho nhiều đáp án
                </p>
              </div>
            </>
          )}

          {form.type === "gap" && (
            <>
              <input
                className="border rounded p-2"
                placeholder="Answers (the website|website)"
                value={form.answers}
                onChange={(e) => setForm({ ...form, answers: e.target.value })}
              />
              <label className="flex gap-2 items-center text-sm">
                <input
                  type="checkbox"
                  checked={!!form.strict}
                  onChange={(e) => setForm({ ...form, strict: e.target.checked })}
                />
                Strict compare (phân biệt chính xác)
              </label>
            </>
          )}

          {(form.type === "truefalse" || form.type === "yesno_ng") && (
            <select
              className="border rounded p-2"
              value={form.answerBool || "true"}
              onChange={(e) => setForm({ ...form, answerBool: e.target.value as any })}
            >
              {answerChoices.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}

          {form.type === "matching" && (
            <input
              className="border rounded p-2 md:col-span-2"
              placeholder="Pairs: L1:R1|L2:R2|L3:R3"
              value={form.pairs || ""}
              onChange={(e) => setForm({ ...form, pairs: e.target.value })}
            />
          )}

          <input
            className="border rounded p-2 md:col-span-2"
            placeholder="Giải thích (optional)"
            value={form.explanation || ""}
            onChange={(e) => setForm({ ...form, explanation: e.target.value })}
          />

          {isReading && (
            <textarea
              className="border rounded p-2 md:col-span-2"
              rows={3}
              placeholder="(Optional) Snippet riêng cho câu này"
              value={form.snippet || ""}
              onChange={(e) => setForm({ ...form, snippet: e.target.value })}
            />
          )}

          {multiMode && !editingId ? (
            <button
              onClick={addToMultiList}
              className="text-white px-4 py-2 rounded md:col-span-2 bg-blue-600 hover:bg-blue-700"
            >
              ➕ Thêm vào danh sách
            </button>
          ) : (
            <button
              onClick={editingId ? onSaveEdit : onAdd}
              className={`text-white px-4 py-2 rounded md:col-span-2 ${
                editingId ? "bg-green-600" : "bg-blue-600"
              }`}
            >
              {editingId ? "💾 Cập nhật câu hỏi" : "➕ Lưu câu hỏi"}
            </button>
          )}

          {editingId && (
            <button
              onClick={() => {
                setEditingId(null);
                resetForm();
              }}
              className="text-gray-600 underline text-sm md:col-span-2"
            >
              Huỷ chỉnh sửa
            </button>
          )}
        </div>
      </div>

      {/* LIST */}
      <div className="bg-gray-50 border rounded-xl p-4">
        <h2 className="font-semibold mb-3">📋 Danh sách câu hỏi</h2>
        {items.length === 0 ? (
          <p className="text-gray-500">Chưa có câu hỏi nào.</p>
        ) : (
          <table className="min-w-full border bg-white rounded">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2">#</th>
                <th className="p-2 text-left">Prompt</th>
                <th className="p-2 text-left">Type</th>
                <th className="p-2 text-left">Answers</th>
                <th className="p-2 text-left">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {items.map((q) => (
                <tr key={q._id} className="border-t hover:bg-gray-50">
                  <td className="p-2">{q.order}</td>
                  <td className="p-2">{q.prompt}</td>
                  <td className="p-2">{q.type}</td>
                  <td className="p-2 text-green-700">
                    {["truefalse", "yesno_ng"].includes(q.type)
                      ? q.answerBool || ""
                      : (q.answers || []).join(", ")}
                  </td>
                  <td className="p-2">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => onEdit(q)}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors text-sm"
                        title="Sửa câu hỏi"
                      >
                        ✏️ Sửa
                      </button>
                      <button
                        onClick={() => onDelete(q._id)}
                        className="flex items-center gap-1 text-red-600 hover:text-red-800 transition-colors text-sm"
                        title="Xóa câu hỏi"
                      >
                        <Trash2 size={14} />
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
