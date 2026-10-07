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
  FileType,
  Eye,
  Info
} from "lucide-react";

export default function PdfToWordPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [stage, setStage] = useState<"upload" | "preview" | "download">("upload");

  // معاينة الجوال والكمبيوتر عبر Canvas
  const [renderingPreview, setRenderingPreview] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ملف الـ Word المحول
  const [downloadBlob, setDownloadBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // رسم الصفحة الأولى مع تفعيل خطوط وخرائط الحروف العربية (CMap)
  useEffect(() => {
    let isCancelled = false;

    async function renderPdfThumbnail() {
      if (!file || stage !== "preview") return;

      setRenderingPreview(true);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfjsLib = await import("pdfjs-dist");
        
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

        const cMapUrl = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/cmaps/`;

        const loadingTask = pdfjsLib.getDocument({
          data: arrayBuffer,
          cMapUrl: cMapUrl,
          cMapPacked: true,
          enableXfa: true,
        });

        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);

        if (isCancelled || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const targetWidth = Math.min(window.innerWidth - 48, 794);
        const scale = (targetWidth / unscaledViewport.width) * (window.devicePixelRatio || 1);
        const viewport = page.getViewport({ scale });

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${targetWidth}px`;
        canvas.style.height = `${(viewport.height / scale) * (targetWidth / unscaledViewport.width)}px`;

        if (context) {
          await page.render({
            canvasContext: context,
            viewport: viewport,
          }).promise;
        }
      } catch (err) {
        console.error("فشل رسم المعاينة:", err);
      } finally {
        if (!isCancelled) setRenderingPreview(false);
      }
    }

    renderPdfThumbnail();

    return () => {
      isCancelled = true;
    };
  }, [file, stage]);

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
      setStage("preview");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "حدث خطأ أثناء معالجة الملف. يرجى المحاولة مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToDownload = () => {
    setStage("download");
  };

  const triggerDownload = () => {
    if (!file || !downloadBlob) return;

    const url = URL.createObjectURL(downloadBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name.replace(/\.[^/.]+$/, "") + ".docx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FD] flex flex-col font-sans" dir="rtl">
      <header className="bg-white border-b border-gray-200 py-3.5 px-4 sm:px-6 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-700 hover:text-red-600 transition">
            <ArrowRight className="w-4 h-4" />
            العودة لجميع الأدوات
          </Link>
          <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-red-600 bg-red-50 px-2.5 sm:px-3 py-1 rounded-full border border-red-100">
            <Sparkles className="w-3.5 h-3.5" />
            محرك Adobe الذكي لمستندات Office
          </span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-3 sm:p-8">
        {stage === "upload" && (
          <div className="w-full max-w-4xl text-center space-y-5 sm:space-y-6">
            {!file ? (
              <>
                <div className="space-y-2">
                  <h1 className="text-2xl sm:text-4xl font-black text-gray-900">
                    تحويل PDF إلى WORD
                  </h1>
                  <p className="text-xs sm:text-base text-gray-600 max-w-xl mx-auto px-2">
                    تحويل رسمي دقيق يحافظ على الخطوط العربية، الجداول، ومربعات النماذج مع معاينة مباشرة قبل التنزيل.
                  </p>
                </div>

                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`w-full max-w-3xl mx-auto border-2 border-dashed rounded-3xl p-8 sm:p-16 text-center transition-all bg-white shadow-sm flex flex-col items-center justify-center gap-4 sm:gap-5 ${
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
                    className="px-6 sm:px-8 py-4 sm:py-5 bg-[#E5322D] hover:bg-[#c92520] active:scale-95 text-white font-bold text-lg sm:text-xl rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center gap-3"
                  >
                    <Upload className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
                    <span>حدد ملف PDF</span>
                  </button>

                  <p className="text-xs sm:text-sm font-medium text-gray-500">
                    أو أسقط ملف الـ PDF هنا
                  </p>

                  <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200/80 px-3.5 py-2 rounded-xl text-amber-800 text-[11px] sm:text-xs font-semibold shadow-xs">
                    <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 shrink-0" />
                    <span>تنبيه: تأكد بأن يكون ملف PDF نصياً وليس صورة ممسوحة ضوئياً (Scanner).</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="w-full max-w-2xl mx-auto bg-white border border-gray-200 rounded-3xl p-5 sm:p-8 shadow-sm space-y-5 sm:space-y-6">
                <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-2xl p-4">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="text-right truncate">
                      <p className="font-bold text-gray-800 text-xs sm:text-sm truncate">{file.name}</p>
                      <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">
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

                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200/80 p-3 rounded-2xl text-amber-800 text-[11px] sm:text-xs font-medium text-right">
                  <Info className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>ملاحظة: لضمان دقة استخراج الكلمات وتنسيق الجداول، تأكد بأن الملف يحتوي على نصوص أصلية.</span>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-2xl text-xs sm:text-sm border border-red-100">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  onClick={handleConvert}
                  disabled={loading}
                  className="w-full py-3.5 sm:py-4 bg-[#E5322D] hover:bg-[#c92520] disabled:bg-gray-300 text-white font-bold text-base sm:text-lg rounded-2xl shadow-md transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>جاري المعالجة والمطابقة الفائقة...</span>
                    </>
                  ) : (
                    <span>تحويل والانتقال للمعاينة</span>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {stage === "preview" && (
          <div className="w-full max-w-4xl space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 text-gray-800 font-bold text-xs sm:text-sm">
                <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                <span>معاينة المستند (قياس A4)</span>
              </div>
              <button
                onClick={handleProceedToDownload}
                className="w-full sm:w-auto px-6 py-2.5 sm:py-3 bg-[#E5322D] hover:bg-[#c92520] text-white font-bold rounded-xl transition flex items-center justify-center gap-2 text-xs sm:text-sm shadow-md active:scale-95"
              >
                <FileType className="w-4 h-4" />
                حفظ بصيغة WORD (DOCX)
              </button>
            </div>

            <div className="flex justify-center overflow-auto py-2">
              <div className="w-full max-w-[794px] bg-white rounded-xl shadow-xl border border-gray-300 overflow-hidden relative flex flex-col items-center justify-center min-h-[400px]">
                {renderingPreview && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center gap-2 text-xs font-semibold text-gray-500 z-10">
                    <RefreshCw className="w-4 h-4 animate-spin text-red-600" />
                    <span>جاري تجهيز صورة المعاينة وضبط الحروف العربية...</span>
                  </div>
                )}
                <canvas ref={canvasRef} className="max-w-full h-auto block" />
              </div>
            </div>
          </div>
        )}

        {stage === "download" && (
          <div className="w-full max-w-xl bg-white border border-gray-200 rounded-3xl p-6 sm:p-12 text-center shadow-sm space-y-6">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-gray-900">
                مستندك جاهز للتحميل الآن!
              </h2>
              <p className="text-xs sm:text-sm text-gray-500">
                تم تحويل المستند بنجاح إلى ملف WORD (DOCX) مطابق للأصل.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={triggerDownload}
                className="w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 bg-[#E5322D] hover:bg-[#c92520] active:scale-95 text-white font-black text-lg sm:text-xl rounded-2xl shadow-xl hover:shadow-2xl transition flex items-center justify-center gap-3 mx-auto"
              >
                <Download className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
                <span>تحميل ملف WORD</span>
              </button>
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-center">
              <button
                onClick={resetAll}
                className="inline-flex items-center gap-2 text-xs sm:text-sm text-gray-600 hover:text-gray-900 transition font-medium"
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
