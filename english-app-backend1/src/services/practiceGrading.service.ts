import PracticeItem from "../models/PracticeItem";

/**
 * 🧹 Chuẩn hoá chuỗi để so sánh linh hoạt
 * - trim, lowercase
 * - bỏ dấu câu, khoảng trắng thừa
 */
export const normalize = (s: string): string =>
  s
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:'"“”‘’]/g, "")
    .replace(/\s+/g, " ");

/**
 * 🤖 Tự động chấm điểm theo loại câu hỏi
 * @param item - Đề bài (PracticeItem)
 * @param payload - Câu trả lời người dùng
 * @returns boolean — đúng/sai
 */
export function gradeAnswer(item: any, payload: any): boolean {
  if (!item || payload == null) return false;

  switch (item.type) {
    /** ✅ Multiple Choice / Heading */
    case "mcq":
    case "heading": {
      const p = normalize(String(payload));
      const options = (item.options || []) as string[];
      
      // Convert answers từ chữ cái (A, B, C, D) sang text của option
      const corrects = (item.answers || []).map((a: string) => {
        const normalizedA = normalize(a);
        // Nếu answer là chữ cái đơn (a, b, c, d), convert thành option text
        if (/^[a-d]$/i.test(normalizedA.trim())) {
          const index = normalizedA.toLowerCase().charCodeAt(0) - 'a'.charCodeAt(0);
          if (index >= 0 && index < options.length) {
            return normalize(options[index]);
          }
        }
        // Nếu không phải chữ cái, giữ nguyên (đã là text)
        return normalizedA;
      });
      
      return corrects.includes(p);
    }

    /** ✅ True/False / Yes-No-NotGiven */
    case "truefalse":
    case "yesno_ng": {
      const correct = String(item.answerBool || "").toLowerCase();
      const user = String(payload || "").toLowerCase();
      return user === correct;
    }

    /** ✅ Gap fill (nhiều đáp án đúng, không phân biệt hoa thường) */
    case "gap": {
      const list: string[] = item.answers || [];
      const p = normalize(String(payload));
      return list.some((a) => {
        const normA = normalize(a);
        if (item.strict) return p === normA;
        return p === normA || normA.includes(p) || p.includes(normA);
      });
    }

    /** ✅ Matching */
    case "matching": {
      const expectedPairs = new Set(
        (item.pairs || []).map((p: any) => `${normalize(p.left)}::${normalize(p.right)}`)
      );
      const gotPairs = new Set(
        (payload || []).map((p: any[]) => `${normalize(p[0])}::${normalize(p[1])}`)
      );
      if (expectedPairs.size !== gotPairs.size) return false;
      for (const pair of expectedPairs) if (!gotPairs.has(pair)) return false;
      return true;
    }

    /** ⚙️ Default: Không chấm (writing/speaking hoặc type chưa hỗ trợ) */
    default:
      return false;
  }
}
