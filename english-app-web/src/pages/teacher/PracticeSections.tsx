import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { listSections } from "../../api/practiceApi";
import { ApiConfig } from "../../config/apiConfig";
import { Headphones, BookOpen, PenTool, Mic, Settings } from "lucide-react";

const sameOriginUrl = (u?: string) => {
  if (!u) return "";
  const base = ApiConfig.baseUrl.replace(/\/+$/, "");
  try {
    if (/^https?:\/\//i.test(u)) {
      const url = new URL(u);
      return `${base}${url.pathname}${url.search}${url.hash}`;
    }
    return `${base}${u.startsWith("/") ? u : `/${u}`}`;
  } catch {
    return `${base}${u.startsWith("/") ? u : `/${u}`}`;
  }
};

export default function PracticeSections() {
  const { setId = "" } = useParams();
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await listSections(setId);
        setSections(res.data || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [setId]);

  const items = useMemo(() => sections, [sections]);

  // Skill configuration với icons và màu sắc
  const getSkillConfig = (skill: string) => {
    const configs: Record<string, { icon: any; color: string; bgColor: string; textColor: string }> = {
      listening: {
        icon: Headphones,
        color: "blue",
        bgColor: "bg-blue-100",
        textColor: "text-blue-600",
      },
      reading: {
        icon: BookOpen,
        color: "green",
        bgColor: "bg-green-100",
        textColor: "text-green-600",
      },
      writing: {
        icon: PenTool,
        color: "purple",
        bgColor: "bg-purple-100",
        textColor: "text-purple-600",
      },
      speaking: {
        icon: Mic,
        color: "orange",
        bgColor: "bg-orange-100",
        textColor: "text-orange-600",
      },
    };
    return configs[skill] || { icon: Settings, color: "gray", bgColor: "bg-gray-100", textColor: "text-gray-600" };
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-green-100 p-2 rounded-lg">
            <Settings className="text-green-600" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Các kỹ năng của đề</h1>
            <p className="text-gray-600">Quản lý các kỹ năng: Listening, Reading, Writing, Speaking</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-700">Đang tải dữ liệu...</h2>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Settings className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-500 text-lg">Chưa có kỹ năng nào được tạo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {items.map((s: any) => {
            const audioSrc =
              s?.skill === "listening" && s?.audioUrl ? sameOriginUrl(s.audioUrl) : "";
            const config = getSkillConfig(s.skill);
            const Icon = config.icon;

            return (
              <div
                key={s._id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden"
              >
                {/* Header với icon và title */}
                <div className={`${config.bgColor} p-4`}>
                  <div className="flex items-center gap-3">
                    <div className={`${config.bgColor} p-2 rounded-lg border-2 border-white`}>
                      <Icon className={config.textColor} size={24} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 capitalize">
                        {s.title || s.skill}
                      </h3>
                      <p className="text-xs text-gray-600 capitalize">{s.skill}</p>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                  {/* 🎧 Preview audio cho Listening */}
                  {s.skill === "listening" && audioSrc && (
                    <div className="bg-gray-50 rounded-lg p-2">
                      <audio
                        className="w-full"
                        controls
                        preload="none"
                        crossOrigin="anonymous"
                        src={audioSrc}
                      />
                    </div>
                  )}

                  {/* Action Button */}
                  <Link
                    to={`/teacher/practice/sections/${s._id}/items`}
                    className={`flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg font-medium transition-colors ${
                      config.color === "blue"
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : config.color === "green"
                        ? "bg-green-600 hover:bg-green-700 text-white"
                        : config.color === "purple"
                        ? "bg-purple-600 hover:bg-purple-700 text-white"
                        : config.color === "orange"
                        ? "bg-orange-600 hover:bg-orange-700 text-white"
                        : "bg-gray-600 hover:bg-gray-700 text-white"
                    }`}
                  >
                    <Settings size={18} />
                    Quản lý câu hỏi
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Hint */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          <span className="font-semibold">💡 Gợi ý:</span> Listening có thể cập nhật audio + transcript trực tiếp trong trang câu hỏi.
        </p>
      </div>
    </div>
  );
}
