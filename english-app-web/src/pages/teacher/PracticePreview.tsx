import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getPracticeSet, getSection } from "../../api/practiceApi";

export default function PracticePreview() {
  const { setId = "" } = useParams();
  const [set, setSet] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const res = await getPracticeSet(setId);
      setSet(res.data);
      const arr = res.data.sections || [];
      // lấy kèm items mỗi section
      const withItems = await Promise.all(
        arr.map(async (s: any) => (await getSection(s._id)).data)
      );
      setSections(withItems);
    })();
  }, [setId]);

  if (!set) return <div className="p-6">Đang tải…</div>;

  // ---- helper: chuẩn hoá hiển thị đáp án theo type
  const fmtAnswer = (q: any) => {
    switch (q.type) {
      case "truefalse":
        return q.answerBool === "true" ? "True" : "False";
      case "yesno_ng":
        if (q.answerBool === "true") return "Yes";
        if (q.answerBool === "false") return "No";
        return "Not given";
      case "matching": {
        const pairs = q.pairs || [];
        // hỗ trợ cả {left,right} hoặc {leftId,rightId}
        return pairs
          .map((p: any) => `${p.left ?? p.leftId} → ${p.right ?? p.rightId}`)
          .join(" ; ");
      }
      default:
        return (q.answers || []).join(" , ");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{set.title}</h1>
        <p className="text-gray-600 uppercase">{set.examType}</p>
      </div>

      {sections.map((sec: any) => (
        <div key={sec._id} className="border rounded-xl p-4 bg-white shadow-sm space-y-3">
          <h2 className="font-semibold text-lg capitalize">{sec.title || sec.skill}</h2>

          {sec.audioUrl && <audio controls src={sec.audioUrl} className="w-full" />}

          {sec.transcript && (
            <details className="bg-gray-50 rounded p-2">
              <summary className="cursor-pointer text-sm text-gray-600">Transcript</summary>
              <pre className="whitespace-pre-wrap text-sm mt-2">{sec.transcript}</pre>
            </details>
          )}

          {(sec.items || []).map((q: any, idx: number) => (
            <div key={q._id || idx} className="border-t pt-3">
              <p className="font-medium">
                {idx + 1}. {q.prompt}
              </p>

              {/* MCQ / Heading options */}
              {Array.isArray(q.options) && q.options.length > 0 && (
                <ul className="list-disc ml-6">
                  {q.options.map((o: string, i: number) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
              )}

              {/* Reading snippet (có highlight [[...]]) */}
              {q.snippet && (
                <div
                  className="mt-2 p-2 bg-gray-50 rounded text-[15px]"
                  dangerouslySetInnerHTML={{
                    __html: q.snippet.replace(
                      /\[\[(.*?)\]\]/g,
                      `<mark class="bg-yellow-300">$1</mark>`
                    ),
                  }}
                />
              )}

              <p className="text-sm text-green-700 mt-2">
                <b>Answer:</b> {fmtAnswer(q)}
              </p>

              {q.explanation && (
                <p className="text-sm text-gray-600 mt-1">
                  <b>Note:</b> {q.explanation}
                </p>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
