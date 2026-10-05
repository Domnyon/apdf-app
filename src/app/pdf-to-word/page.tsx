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
  Bold,
  Italic,
  Underline,
  AlignRight,
  AlignCenter,
  AlignLeft,
  Edit3
} from "lucide-react";

export default function PdfToWordPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [progressStage, setProgressStage] = useState<string>("");
  const [docContentHtml, setDocContentHtml] = useState<string>("");
  const [isConverted, setIsConverted] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

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
      setDocContentHtml("");
      setIsConverted(false);
      setProgress(0);
    } else {
      setError("يرجى اختيار ملف بصيغة PDF فقط.");
    }
  };

  const removeFile = () => {
    setFile(null);
    setDocContentHtml("");
    setIsConverted(false);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const escapeHtml = (text: string) => {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
        let pageHtml = '<div class="page-container" style="margin-bottom: 25px;">';
        let currentLine = "";

        textContent.items.forEach((item: any) => {
          const str = item.str || "";
          if (!str.trim()) return;

          const currentY = item.transform[5];
          if (lastY !== null && Math.abs(currentY - lastY) > 5) {
            if (currentLine.trim()) {
              pageHtml += `<p style="margin: 6px 0; font-size: 11pt; line-height: 1.6;">${escapeHtml(currentLine)}</p>`;
            }
            currentLine = str;
          } else {
            currentLine += (currentLine ? " " : "") + str;
          }
          lastY = currentY;
        });

        if (currentLine.trim()) {
          pageHtml += `<p style="margin: 6px 0; font-size: 11pt; line-height: 1.6;">${escapeHtml(currentLine)}</p>`;
        }

        pageHtml += '</div>';
        extractedHtmlPages += pageHtml;
      }

      setProgress(100);
      setProgressStage("اكتمل التحويل بنجاح!");
      setDocContentHtml(extractedHtmlPages || "<p>اكتب أو عدل محتوى المستند هنا...</p>");
      setIsConverted(true);
    } catch (err: any) {
      console.error(err);
      setError("تعذر تحويل الملف محلياً. تأكد أن الملف غير معطوب.");
    } finally {
      setLoading(false);
    }
  };

  // أدوات التنسيق السريع في الورقة التفاعلية
  const applyFormat = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setDocContentHtml(editorRef.current.innerHTML);
    }
  };

  // توليد وتحميل ملف Word بعد التعديلات المباشرة
  const downloadWordDocument = () => {
    const finalContent = editorRef.current ? editorRef.current.innerHTML : docContentHtml;

    const wordDocumentContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' 
            xmlns:w='urn:schemas-microsoft-com:office:word' 
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${file?.name || "document"}</title>
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
        ${finalContent}
      </body>
      </html>
    `;

    const blob = new Blob(["\ufeff", wordDocumentContent], {
      type: "application/msword;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
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
      
      {/* شريط علوي */}
      <header className="bg-white border-b border-gray-200 py-3.5 px-6 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-red-600 transition">
            <ArrowRight className="w-4 h-4" />
            العودة لجميع الأدوات
          </Link>
          <span className="text-xs font-bold uppercase tracking-wider text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
            معاينة وتعديل مباشر
          </span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
        
        {/* عنوان الصفحة */}
        {!isConverted && (
          <div className="w-full max-w-4xl text-center space-y-3 mb-8">
            <h1 className="text-3xl sm:text-4xl font-black text-[#161616]">
              تحويل PDF إلى WORD
            </h1>
            <p className="text-base text-gray-600 max-w-xl mx-auto">
              حوّل ملفاتك إلى مستندات Word مع إمكانية مراجعتها والتعديل المباشر عليها قبل الحفظ.
            </p>
          </div>
        )}

        {/* 1. رفع الملف */}
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

        {/* 2. بطاقة الملف وزر التحويل */}
        {file && !isConverted && (
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
                  <span>جاري تحويل ومعالجة الملف...</span>
                </>
              ) : (
                <span>التحويل إلى WORD والفتح للتعديل</span>
              )}
            </button>
          </div>
        )}

        {/* 3. شاشة المعاينة المصغرة والتعديل المباشر قبل التنزيل */}
        {isConverted && (
          <div className="w-full max-w-4xl space-y-5 animate-in fade-in duration-300">
            
            {/* شريط الإجراءات والتحميل العلوي */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-800 flex items-center gap-1.5">
                    تم تجهيز المستند!
                    <span className="text-xs font-normal text-blue-600 flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-md">
                      <Edit3 className="w-3.5 h-3.5" />
                      يمكنك النقر والتعديل داخل الصفحة مباشرة
                    </span>
                  </h2>
                  <p className="text-xs text-gray-500">عدل أي نص داخل الورقة بالأسفل، ثم اضغط حفظ.</p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={removeFile}
                  className="px-4 py-3 text-sm text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition"
                >
                  ملف آخر
                </button>
                <button
                  onClick={downloadWordDocument}
                  className="flex-1 sm:flex-none px-6 py-3 bg-[#E5322D] hover:bg-[#c92520] active:scale-95 text-white font-bold text-base rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5 stroke-[2.5]" />
                  <span>تحميل ملف WORD</span>
                </button>
              </div>
            </div>

            {/* ورقة المستند (محاكاة صفحة Word A4 تفاعلية قابلة للتحرير) */}
            <div className="bg-[#4b5563] p-4 sm:p-8 rounded-2xl shadow-inner flex flex-col items-center">
              
              {/* شريط أدوات التنسيق السريع المكتبي */}
              <div className="bg-white/95 backdrop-blur border border-gray-200 rounded-xl p-1.5 mb-4 shadow-md flex items-center gap-1 flex-wrap justify-center text-gray-700">
                <button 
                  onClick={() => applyFormat("bold")} 
                  className="p-2 hover:bg-gray-100 rounded-lg transition" 
                  title="عريض (Bold)"
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => applyFormat("italic")} 
                  className="p-2 hover:bg-gray-100 rounded-lg transition" 
                  title="مائل (Italic)"
                >
                  <Italic className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => applyFormat("underline")} 
                  className="p-2 hover:bg-gray-100 rounded-lg transition" 
                  title="تسطير (Underline)"
                >
                  <Underline className="w-4 h-4" />
                </button>

                <div className="w-[1px] h-5 bg-gray-300 mx-1"></div>

                <button 
                  onClick={() => applyFormat("justifyRight")} 
                  className="p-2 hover:bg-gray-100 rounded-lg transition" 
                  title="محاذاة لليمين"
                >
                  <AlignRight className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => applyFormat("justifyCenter")} 
                  className="p-2 hover:bg-gray-100 rounded-lg transition" 
                  title="محاذاة للوسط"
                >
                  <AlignCenter className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => applyFormat("justifyLeft")} 
                  className="p-2 hover:bg-gray-100 rounded-lg transition" 
                  title="محاذاة لليسار"
                >
                  <AlignLeft className="w-4 h-4" />
                </button>
              </div>

              {/* صفحة الـ Word A4 المصغرة والتفاعلية */}
              <div 
                className="w-full max-w-2xl bg-white min-h-[750px] p-8 sm:p-14 shadow-2xl rounded-sm border border-gray-200 outline-none focus:ring-2 focus:ring-red-400 text-gray-900 leading-relaxed overflow-y-auto cursor-text"
                contentEditable
                suppressContentEditableWarning
                ref={editorRef}
                dangerouslySetInnerHTML={{ __html: docContentHtml }}
                onInput={(e) => setDocContentHtml(e.currentTarget.innerHTML)}
                style={{
                  fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif",
                  direction: "rtl",
                  textAlign: "right"
                }}
              />
            </div>

          </div>
        )}

      </main>

      <footer className="py-4 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} apdf-app — معاينة فورية وتحرير مباشر لملفات المستندات
      </footer>
    </div>
  );
}
