import React, { useState, useEffect } from 'react';
import { TranslationAPI } from '../api/translation';
import type { TranslationResponse, SupportedLanguage } from '../api/translation';

interface TranslationProps {
  onClose?: () => void;
}

const Translation: React.FC<TranslationProps> = ({ onClose }) => {
  const [text, setText] = useState('');
  const [result, setResult] = useState('');
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('vi');
  const [isLoading, setIsLoading] = useState(false);
  const [languages, setLanguages] = useState<SupportedLanguage[]>([]);
  const [history, setHistory] = useState<TranslationResponse[]>([]);

  useEffect(() => {
    loadLanguages();
    loadHistory();
  }, []);

  const loadLanguages = async () => {
    try {
      const langs = await TranslationAPI.getSupportedLanguages();
      setLanguages(langs);
    } catch (error) {
      console.error('Error loading languages:', error);
    }
  };

  const loadHistory = async () => {
    try {
      const response = await TranslationAPI.getTranslationHistory({ limit: 10 });
      setHistory(response.translations);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const handleTranslate = async () => {
    if (!text.trim()) {
      alert('Vui lòng nhập văn bản cần dịch');
      return;
    }

    setIsLoading(true);
    try {
      let response: TranslationResponse;
      
      if (sourceLang === 'en' && targetLang === 'vi') {
        response = await TranslationAPI.translateEnToVi(text);
      } else if (sourceLang === 'vi' && targetLang === 'en') {
        response = await TranslationAPI.translateViToEn(text);
      } else {
        response = await TranslationAPI.translateCustom(text, sourceLang, targetLang);
      }

      setResult(response.translatedText);
      loadHistory(); // Reload history
    } catch (error) {
      console.error('Translation error:', error);
      alert('Lỗi dịch thuật: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const swapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Đã sao chép vào clipboard');
  };

  const getLanguageName = (code: string) => {
    const lang = languages.find(l => l.code === code);
    return lang?.name || code;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl">🌐</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Dịch Thuật</h1>
                <p className="text-gray-600">Dịch văn bản giữa các ngôn ngữ</p>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <span className="text-gray-500">✕</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Translation Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Language Selection */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Chọn ngôn ngữ</h2>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ngôn ngữ nguồn
                  </label>
                  <select
                    value={sourceLang}
                    onChange={(e) => setSourceLang(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="en">English</option>
                    <option value="vi">Tiếng Việt</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                    <option value="es">Español</option>
                    <option value="ja">日本語</option>
                    <option value="ko">한국어</option>
                    <option value="zh">中文</option>
                  </select>
                </div>
                
                <button
                  onClick={swapLanguages}
                  className="p-3 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
                  title="Đổi ngôn ngữ"
                >
                  <span className="text-blue-600">⇄</span>
                </button>
                
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ngôn ngữ đích
                  </label>
                  <select
                    value={targetLang}
                    onChange={(e) => setTargetLang(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="vi">Tiếng Việt</option>
                    <option value="en">English</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                    <option value="es">Español</option>
                    <option value="ja">日本語</option>
                    <option value="ko">한국어</option>
                    <option value="zh">中文</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Input Section */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Văn bản cần dịch</h2>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Nhập văn bản cần dịch..."
                className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <div className="flex justify-between items-center mt-4">
                <span className="text-sm text-gray-500">
                  {text.length}/5000 ký tự
                </span>
                <button
                  onClick={handleTranslate}
                  disabled={isLoading || !text.trim()}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Đang dịch...</span>
                    </>
                  ) : (
                    <>
                      <span>🌐</span>
                      <span>Dịch</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Result Section */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Kết quả dịch</h2>
                {result && (
                  <button
                    onClick={() => copyToClipboard(result)}
                    className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <span>📋</span>
                    <span>Sao chép</span>
                  </button>
                )}
              </div>
              <div className="min-h-32 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                {result ? (
                  <p className="text-gray-800 leading-relaxed">{result}</p>
                ) : (
                  <p className="text-gray-500 italic">Kết quả dịch sẽ hiển thị ở đây...</p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* History */}
            {history.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Lịch sử dịch thuật</h3>
                <div className="space-y-3">
                  {history.slice(0, 5).map((item, index) => (
                    <div
                      key={index}
                      className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => {
                        setText(item.originalText);
                        setResult(item.translatedText);
                        setSourceLang(item.sourceLanguage);
                        setTargetLang(item.targetLanguage);
                      }}
                    >
                      <div className="text-sm font-medium text-gray-800 truncate">
                        {item.originalText}
                      </div>
                      <div className="text-sm text-gray-600 truncate">
                        {item.translatedText}
                      </div>
                      <div className="text-xs text-gray-500">
                        {getLanguageName(item.sourceLanguage)} → {getLanguageName(item.targetLanguage)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Thao tác nhanh</h3>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    setText('');
                    setResult('');
                  }}
                  className="w-full p-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  🗑️ Xóa tất cả
                </button>
                <button
                  onClick={() => {
                    setText(result);
                    setResult('');
                    swapLanguages();
                  }}
                  className="w-full p-3 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
                >
                  🔄 Dịch ngược
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Translation;












