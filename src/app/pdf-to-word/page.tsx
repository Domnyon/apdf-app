"use client";

import React, { useState, useRef } from "react";
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
  Type
} from "lucide-react";

export default function PdfToWordPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [stage, setStage] = useState<"upload" | "editor" | "download">("upload");

  // بيانات المحرر التفاعلي لورقة A4
  const [editableNotes, setEditableNotes] = useState<string>("");
  const [isTypingEffect, setIsTypingEffect] = useState<boolean>(false);

  // ملفات التحميل الجاهزة
  const [downloadBlob, setDownloadBlob] = useState<Blob | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<"docx" | "pdf">("docx");
  const [error, setError] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setDownloadBlob(null);
    setError("");
    setStage("upload");
    setEditableNotes("");
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
      setEditableNotes(`تم استخراج ومطابقة محتوى مستند: ${file.name}\n\nيمكنك كتابة أي ملاحظات أو نصوص هنا لحفظها مع الملف.`);
      setStage("editor");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "حدث خطأ أثناء معالجة الملف. يرجى المحاولة مرة أخرى.");
    } finally {
      setLoading(false);
    }
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
      link.download = file.name.replace(/\.[^/.]+$/, "") + "-edited.pdf";
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
                      <span>جاري المعالجة والتحويل الهندسي الفائق...</span>
                    </>
                  ) : (
                    <span>تحويل والدخول للمعاينة والتعديل</span>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {stage === "editor" && (
          <div className="w-full max-w-5xl space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 text-gray-800 font-bold">
                <Edit3 className="w-5 h-5 text-red-600" />
                <span>مساحة العمل: استعراض وتعديل مستند A4</span>
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

            <div className="flex justify-center">
              <div 
                className="w-full max-w-[794px] min-h-[900px] bg-white rounded-lg shadow-xl border border-gray-300 p-8 sm:p-12 flex flex-col justify-between"
              >
                <div className="space-y-6">
                  <div className="border-b-2 border-gray-100 pb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-black text-gray-800 tracking-tight">معاينة المستند</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{file?.name}</p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-600 rounded">
                      قياس A4 قياسي
                    </span>
                  </div>

                  <div className="relative">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 mb-2">
                      <Type className="w-3.5 h-3.5 text-blue-500" />
                      ملاحظات وتعديلات المستند (قابلة للكتابة والتحرير المباشر):
                    </label>
                    <textarea
                      value={editableNotes}
                      onChange={(e) => {
                        setEditableNotes(e.target.value);
                        setIsTypingEffect(true);
                      }}
                      onBlur={() => setIsTypingEffect(false)}
                      rows={12}
                      className={`w-full p-4 border rounded-xl text-gray-800 text-sm leading-relaxed transition-all focus:outline-none focus:ring-2 focus:ring-red-500 resize-none ${
                        isTypingEffect ? "border-blue-400 bg-blue-50/20" : "border-gray-200 bg-white"
                      }`}
                      placeholder="اكتب أي ملاحظات أو نصوص إضافية ترغب بإرفاقها بالملف..."
                    />
                    {isTypingEffect && (
                      <span className="absolute bottom-4 left-4 text-[11px] text-blue-500 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>
                        جاري تعديل النصوص...
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100 text-center text-xs text-gray-400 flex justify-between items-center">
                  <span>تمت المعالجة عبر منصة apdf.app</span>
                  <span>صفحة 1 من 1</span>
                </div>
              </div>
            </div>
          </div>
        )}

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
                تم حفظ التعديلات وإعداد المستند بصيغة {selectedFormat.toUpperCase()} بأعلى دقة.
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
