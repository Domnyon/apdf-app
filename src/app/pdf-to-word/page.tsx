"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Upload, FileText, CheckCircle, Download, X, ArrowRight, RefreshCw, AlertCircle } from "lucide-react";

export default function PdfToWordPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [progressStage, setProgressStage] = useState<string>("");
  const [convertedDocBlob, setConvertedDocBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.async = true;
      script.onload = () => {
        const pdfjsLib = (window as any)["pdfjs-dist/build/pdf"];
        if (pdfjsLib) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        }
      };
      document.body.appendChild(script);
    }
  }, []);

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
      setConvertedDocBlob(null);
      setProgress(0);
    } else {
      setError("يرجى اختيار ملف بصيغة PDF فقط.");
    }
  };

  const removeFile = () => {
    setFile(null);
    setConvertedDocBlob(null);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const escapeHtml = (text: string) => {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  };

  const handleConvertLocally = async () => {
    if (!file) return;

    const pdfjsLib = (window as any)["pdfjs-dist/build/pdf"];
    if (!pdfjsLib) {
      setError("محرك التحويل قيد التجهيز في المتصفح، يرجى المحاولة بعد لحظات.");
      return;
    }

    setLoading(true);
    setError("");
    setProgress(10);
    setProgressStage("جاري قراءة صفحات المستند...");

    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const totalPages = pdf.numPages;

      let extractedHtmlPages = "";

      for (let i = 1; i <= totalPages; i++) {
        setProgressStage(`معالجة وتنسيق الصفحة ${i} من ${totalPages}...`);
        setProgress(Math.round((i / totalPages) * 85));

        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        let lastY: number | null = null;
        let pageHtml = '<div class="page" style="page-break-after: always; margin-bottom: 24px;">';
        let currentLine = "";

        textContent.items.forEach((item: any) => {
          const str = item.str || "";
          if (!str.trim()) return;

          const currentY = item.transform[5];
          if (lastY !== null && Math.abs(currentY - lastY) > 5) {
            if (currentLine.trim()) {
              pageHtml += `<p style="margin: 4px 0; font-size: 12pt;">${escapeHtml(currentLine)}</p>`;
            }
            currentLine = str;
          } else {
            currentLine += (currentLine ? " " : "") + str;
          }
          lastY = currentY;
        });

        if (currentLine.trim()) {
          pageHtml += `<p style="margin: 4px 0; font-size: 12pt;">${escapeHtml(currentLine)}</p>`;
        }

        pageHtml += '</div>';
        extractedHtmlPages += pageHtml;
      }

      setProgress(95);
      setProgressStage("تجهيز ملف Word...");

      const wordDocumentContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' 
              xmlns:w='urn:schemas-microsoft-com:office:word' 
              xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset='utf-8'>
          <title>${file.name}</title>
          <style>
            @page { size: A4; margin: 2.5cm 2cm; }
            body {
              font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
              direction: rtl;
              text-align: right;
              line-height: 1.6;
              color: #111;
            }
            p { margin: 6px 0; }
          </style>
        </head>
        <body>
          ${extractedHtmlPages || "<p>لم يتم العثور على نصوص قابلة للاستخراج في هذا المستند.</p>"}
        </body>
        </html>
      `;

      const blob = new Blob(["\ufeff", wordDocumentContent], {
        type: "application/msword;charset=utf-8",
      });

      setConvertedDocBlob(blob);
      setProgress(100);
      setProgressStage("اكتمل التحويل بنجاح!");
    } catch (err: any) {
      console.error(err);
      setError("تعذر تحويل الملف محلياً. تأكد أن الملف غير معطوب.");
    } finally {
      setLoading(false);
    }
  };

  const triggerDownload = () => {
    if (!convertedDocBlob) return;
    const url = URL.createObjectURL(convertedDocBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = (file?.name ? file.name.replace(/\.[^/.]+$/, "") : "converted") + ".doc";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#F5F5FA] flex flex-col font-sans" dir="rtl">
      <header className="bg-white border-b border-gray-200 py-3.5 px-6 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-red-600 transition">
            <ArrowRight className="w-4 h-4" />
            العودة لجميع الأدوات
          </Link>
          <span className="text-xs font-bold uppercase tracking-wider text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
            تحويل فوري بدون حدود
          </span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-4xl text-center space-y-3 mb-8">
          <h1 className="text-3xl sm:text-4xl font-black text-[#161616]">
            تحويل PDF إلى WORD
          </h1>
          <p className="text-base text-gray-600 max-w-xl mx-auto">
            حوّل ملفات PDF إلى مستندات Word قابلة للتعديل مباشرة في المتصفح وبدون انتظار.
          </p>
        </div>

        {!file && (
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`w-full max-w-3xl border-2 border-dashed rounded-3xl p-12 sm:p-20 text-center transition-all bg-white shadow-sm flex flex-col items-center justify-center gap-6 ${
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
        )}

        {file && !convertedDocBlob && (
          <div className="w-full max-w-2xl bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
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
                  onClick={removeFile}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                  title="إلغاء الملف"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {loading && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs font-semibold text-gray-600">
                  <span>{progressStage}</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#E5322D] transition-all duration-300 rounded-full"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-2xl text-sm border border-red-100">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              onClick={handleConvertLocally}
              disabled={loading}
              className="w-full py-4 bg-[#E5322D] hover:bg-[#c92520] disabled:bg-gray-300 text-white font-bold text-lg rounded-2xl shadow-md transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>جاري التحويل الفوري...</span>
                </>
              ) : (
                <span>التحويل إلى WORD الآن</span>
              )}
            </button>
          </div>
        )}

        {convertedDocBlob && (
          <div className="w-full max-w-xl bg-white border border-gray-200 rounded-3xl p-8 sm:p-12 text-center shadow-sm space-y-6">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-black text-gray-900">
                تم تحويل المستند بنجاح!
              </h2>
              <p className="text-sm text-gray-500">
                الملف جاهز للتحميل والتعديل في Microsoft Word.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={triggerDownload}
                className="w-full sm:w-auto px-10 py-5 bg-[#E5322D] hover:bg-[#c92520] active:scale-95 text-white font-black text-xl rounded-2xl shadow-xl hover:shadow-2xl transition flex items-center justify-center gap-3 mx-auto"
              >
                <Download className="w-6 h-6 stroke-[2.5]" />
                <span>تحميل ملف WORD</span>
              </button>
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-center">
              <button
                onClick={removeFile}
                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                تحويل ملف آخر
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="py-4 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} apdf-app — تحويل فوري محلي ومجاني بالكامل
      </footer>
    </div>
  );
}
