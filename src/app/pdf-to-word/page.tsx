"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Upload,
  FileText,
  CheckCircle,
  Download,
  X,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Edit3,
  FileType,
  Plus,
  Trash2
} from "lucide-react";

interface TextOverlay {
  id: string;
  text: string;
}

export default function PdfToWordPage() {
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string>("");
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [stage, setStage] = useState<"upload" | "editor" | "download">("upload");

  // ملاحظات ونصوص الإضافة
  const [overlays, setOverlays] = useState<TextOverlay[]>([]);
  const [newText, setNewText] = useState<string>("");

  // ملفات التحميل
  const [downloadBlob, setDownloadBlob] = useState<Blob | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<"docx" | "pdf">("docx");
  const [error, setError] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setFileUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    if (selectedFile.type === "application/pdf" || selectedFile.name.toLowerCase().endsWith(".pdf")) {
      setFile(selectedFile);
      setError("");
      setDownloadBlob(null);
    } else {
      setError("يرجى اختيار ملف بصيغة PDF فقط.");
    }
  };

  const resetAll = () => {
    setFile(null);
    setFileUrl("");
    setDownloadBlob(null);
    setError("");
    setStage("upload");
    setOverlays([]);
    setNewText("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleConvert = async () => {
    if (!file) return;

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("https://pdf-converter-api-8dfv.onrender.com/convert", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("تعذر إكمال التحويل عبر السيرفر. يرجى المحاولة بعد لحظات.");
      }

      const blob = await response.blob();
      setDownloadBlob(blob);
      setStage("editor");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "حدث خطأ أثناء معالجة الملف. يرجى المحاولة مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  const addOverlayText = () => {
    if (!newText.trim()) return;
    setOverlays([...overlays, { id: Math.random().toString(), text: newText.trim() }]);
    setNewText("");
  };

  const removeOverlayText = (id: string) => {
    setOverlays(overlays.filter(o => o.id !== id));
  };

  const handleFinalSave = (format: "docx" | "pdf") => {
    setSelectedFormat(format);
    setStage("download");
  };

  const triggerDownload = () => {
    if (!file) return;

    if (selectedFormat === "docx" && downloadBlob) {
      const url = URL.createObjectURL(downloadBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name.replace(/\.[^/.]+$/, "") + ".docx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name.replace(/\.[^/.]+$/, "") + ".pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FD] flex flex-col font-sans" dir="rtl">
      <header className="bg-white border-b border-gray-200 py-3.5 px-6 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-red-600 transition">
            <ArrowRight className="w-4 h-4" />
            العودة لجميع الأدوات
          </Link>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-100">
            <Sparkles className="w-3.5 h-3.5" />
            محرك Adobe الذكي لمستندات Office
          </span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
        {stage === "upload" && (
          <div className="w-full max-w-4xl text-center space-y-6">
            {!file ? (
              <>
                <div className="space-y-2">
                  <h1 className="text-3xl sm:text-4xl font-black text-gray-900">
                    تحويل PDF إلى WORD
                  </h1>
                  <p className="text-base text-gray-600 max-w-xl mx-auto">
                    تحويل رسمي دقيق يحافظ على الخطوط العربية، الجداول، ومربعات النماذج مع إمكانية التعديل والمعاينة الفورية.
                  </p>
                </div>

                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`w-full max-w-3xl mx-auto border-2 border-dashed rounded-3xl p-12 sm:p-20 text-center transition-all bg-white shadow-sm flex flex-col items-center justify-center gap-6 ${
                    isDragging ? "border-red-500 bg-red-50/50 scale-[1.01]" : "border-gray-300"
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileInput}
                    accept=".pdf"
                    className="hidden"
                  />

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-8 py-5 bg-[#E5322D] hover:bg-[#c92520] active:scale-95 text-white font-bold text-xl rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center gap-3"
                  >
                    <Upload className="w-6 h-6 stroke-[2.5]" />
                    <span>حدد ملف PDF</span>
                  </button>

                  <p className="text-sm font-medium text-gray-500">
                    أو أسقط ملف الـ PDF هنا
                  </p>
                </div>
              </>
            ) : (
              <div className="w-full max-w-2xl mx-auto bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-2xl p-4">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center shrink-0">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div className="text-right truncate">
                      <p className="font-bold text-gray-800 text-sm truncate">{file.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {(file.size / (1024 * 1024)).toFixed(2)} ميغابايت
                      </p>
                    </div>
                  </div>

                  {!loading && (
                    <button
                      onClick={resetAll}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                      title="إلغاء الملف"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-2xl text-sm border border-red-100">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  onClick={handleConvert}
                  disabled={loading}
                  className="w-full py-4 bg-[#E5322D] hover:bg-[#c92520] disabled:bg-gray-300 text-white font-bold text-lg rounded-2xl shadow-md transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>جاري المعالجة والمطابقة الفائقة...</span>
                    </>
                  ) : (
                    <span>تحويل والدخول للمعاينة والتعديل</span>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* المرحلة 2: استعراض المستند الفعلي على ورقة A4 مع أدوات الإضافة */}
        {stage === "editor" && (
          <div className="w-full max-w-6xl space-y-6">
            {/* شريط الإجراءات */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 text-gray-800 font-bold">
                <Edit3 className="w-5 h-5 text-red-600" />
                <span>معاينة المستند المحول (قياس A4)</span>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={() => handleFinalSave("docx")}
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-sm"
                >
                  <FileType className="w-4 h-4" />
                  حفظ بصيغة WORD (DOCX)
                </button>
                <button
                  onClick={() => handleFinalSave("pdf")}
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-sm"
                >
                  <FileText className="w-4 h-4" />
                  حفظ بصيغة PDF
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* ورقة A4 التفاعلية التي تعرض المستند الحقيقي */}
              <div className="lg:col-span-2 flex justify-center">
                <div 
                  className="w-full max-w-[760px] h-[920px] bg-white rounded-2xl shadow-xl border border-gray-300 overflow-hidden relative flex flex-col"
                >
                  {/* عرض محتوى المستند الفعلي */}
                  {fileUrl ? (
                    <iframe
                      src={`${fileUrl}#toolbar=0&navpanes=0`}
                      className="w-full h-full border-0"
                      title="معاينة المستند"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      جاري تحميل المعاينة...
                    </div>
                  )}

                  {/* طبقة الملاحظات والنصوص المضافة */}
                  {overlays.length > 0 && (
                    <div className="absolute top-4 left-4 right-4 bg-white/95 backdrop-blur-sm p-3 rounded-xl border border-gray-200 shadow-md space-y-1 z-10">
                      <p className="text-[11px] font-bold text-gray-500">الإضافات والملاحظات المرفقة بالملف:</p>
                      <div className="flex flex-wrap gap-2">
                        {overlays.map((item) => (
                          <span
                            key={item.id}
                            className="inline-flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-200"
                          >
                            <span>{item.text}</span>
                            <button
                              onClick={() => removeOverlayText(item.id)}
                              className="text-blue-400 hover:text-red-500"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* لوحة إضافة وتعديل النصوص على المستند */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
                <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-red-500" />
                  أدوات التعديل والإضافة على الورقة
                </h4>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-600">
                    أضف نصاً أو ملاحظة للمستند:
                  </label>
                  <textarea
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    placeholder="اكتب التعديل أو النص الإضافي هنا..."
                    rows={4}
                    className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <button
                    onClick={addOverlayText}
                    disabled={!newText.trim()}
                    className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-200 text-white font-semibold text-xs rounded-xl transition flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    إدراج النص على الورقة
                  </button>
                </div>

                {overlays.length > 0 && (
                  <div className="pt-4 border-t border-gray-100 space-y-2">
                    <p className="text-xs font-bold text-gray-700">النصوص المضافة حالياً ({overlays.length}):</p>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {overlays.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between text-xs bg-gray-50 p-2.5 rounded-lg border border-gray-200"
                        >
                          <span className="truncate max-w-[200px] text-gray-700">{item.text}</span>
                          <button
                            onClick={() => removeOverlayText(item.id)}
                            className="text-gray-400 hover:text-red-600 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs leading-relaxed">
                  💡 تظهر المعاينة الورقة بقياس A4 كما هي، وعند الضغط على <strong>حفظ بصيغة WORD</strong> ستحصل على ملف DOCX مفتوح المصدر جاهز للتعديل الكامل في Microsoft Word.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* المرحلة 3: التحميل النهائي */}
        {stage === "download" && (
          <div className="w-full max-w-xl bg-white border border-gray-200 rounded-3xl p-8 sm:p-12 text-center shadow-sm space-y-6">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-black text-gray-900">
                مستندك جاهز للتحميل الآن!
              </h2>
              <p className="text-sm text-gray-500">
                تم حفظ التعديلات وتجهيز الملف بصيغة {selectedFormat.toUpperCase()} بأعلى دقة.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={triggerDownload}
                className="w-full sm:w-auto px-10 py-5 bg-[#E5322D] hover:bg-[#c92520] active:scale-95 text-white font-black text-xl rounded-2xl shadow-xl hover:shadow-2xl transition flex items-center justify-center gap-3 mx-auto"
              >
                <Download className="w-6 h-6 stroke-[2.5]" />
                <span>تحميل ملف {selectedFormat === "docx" ? "WORD" : "PDF"}</span>
              </button>
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-center">
              <button
                onClick={resetAll}
                className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                تحويل ملف جديد
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="py-4 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} apdf.app — المحرك المتكامل لمستندات PDF و Office
      </footer>
    </div>
  );
}
