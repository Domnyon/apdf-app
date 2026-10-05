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
  Edit3,
  Check
} from "lucide-react";

export default function PdfToWordPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [progressStage, setProgressStage] = useState<string>("");
  
  const [pagesContent, setPagesContent] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<"upload" | "edit" | "download">("upload");
  const [error, setError] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

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
      setPagesContent([]);
      setCurrentStep("upload");
      setProgress(0);
    } else {
      setError("يرجى اختيار ملف بصيغة PDF فقط.");
    }
  };

  const resetAll = () => {
    setFile(null);
    setPagesContent([]);
    setCurrentStep("upload");
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const escapeHtml = (text: string) => {
    return text
      .split("&").join("&amp;")
      .split("<").join("&lt;")
      .split(">").join("&gt;");
  };

  const fixArabicString = (str: string): string => {
    if (!str) return "";
    const arabicRegex = /[\u0600-\u06FF]/;
    if (!arabicRegex.test(str)) return str;

    const tokens = str.split(" ").map((token) => {
      if (token === "هللا") return "الله";
      return token;
    });

    return tokens.join(" ");
  };

  const handleConvertLocally = async () => {
    if (!file) return;

    const pdfjsLib = (window as any)["pdfjs-dist/build/pdf"];
    if (!pdfjsLib) {
      setError("محرك التحويل قيد التجهيز في المتصفح، يرجى المحاولة بعد قليل.");
      return;
    }

    setLoading(true);
    setError("");
    setProgress(10);
    setProgressStage("جاري تفكيك صفحات الـ PDF وعزلها...");

    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const totalPages = pdf.numPages;

      let extractedPages: string[] = [];

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        setProgressStage("معالجة وتجهيز الصفحة " + pageNum + " من " + totalPages + "...");
        setProgress(Math.round((pageNum / totalPages) * 90));

        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        let lines: string[] = [];
        let currentLine = "";
        let lastY: number | null = null;

        textContent.items.forEach((item: any) => {
          const str = item.str;
          if (!str || str.trim().length === 0) return;

          const currentY = Math.round(item.transform[5]);

          if (lastY !== null && Math.abs(currentY - lastY) > 5) {
            if (currentLine.trim()) {
              lines.push(currentLine.trim());
            }
            currentLine = str;
          } else {
            currentLine += (currentLine ? " " : "") + str;
          }

          lastY = currentY;
        });

        if (currentLine.trim()) {
          lines.push(currentLine.trim());
        }

        let pageHtml = "";
        lines.forEach((line) => {
          let cleaned = fixArabicString(line);
          if (cleaned.includes("هللا")) {
            cleaned = cleaned.replace(/هللا/g, "الله");
          }
          pageHtml += '<p style="margin: 6px 0; font-size: 12pt; line-height: 1.8; direction: rtl; text-align: right;">' + escapeHtml(cleaned) + '</p>';
        });

        extractedPages.push(pageHtml || "<p>صفحة فارغة</p>");

        if (typeof page.cleanup === "function") {
          page.cleanup();
        }
      }

      setPagesContent(extractedPages);
      setProgress(100);
      setProgressStage("تم عزل كافة الصفحات بنجاح!");
      setCurrentStep("edit");

    } catch (err: any) {
      console.error(err);
      setError("تعذر تحويل الملف. يرجى التأكد من أن المستند غير تالف.");
    } finally {
      setLoading(false);
    }
  };

  const applyFormat = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
  };

  const confirmEditsAndGoToDownload = () => {
    const updatedPages = pageRefs.current.map((ref, idx) => {
      return ref ? ref.innerHTML : pagesContent[idx] || "";
    });
    setPagesContent(updatedPages);
    setCurrentStep("download");
  };

  const downloadWordDocument = () => {
    const sectionSeparator = '<br clear="all" style="page-break-before: always; mso-break-type: section-break; clear: both;" />';
    const mergedPagesHtml = pagesContent
      .map((content) => '<div class="word-single-page" style="page-break-inside: avoid;">' + content + '</div>')
      .join(sectionSeparator);

    const docTitle = file?.name || "document";
    const wordDocumentContent = 
      "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
      "xmlns:w='urn:schemas-microsoft-com:office:word' " +
      "xmlns='http://www.w3.org/TR/REC-html40'>" +
      "<head><meta charset='utf-8'><title>" + docTitle + "</title>" +
      "<style>" +
      "@page { size: 21cm 29.7cm; margin: 2cm; mso-page-orientation: portrait; }" +
      "body { font-family: 'Arial', 'Segoe UI', Tahoma, sans-serif; direction: rtl; text-align: right; line-height: 1.7; color: #111; }" +
      "p { margin: 6px 0; }" +
      "</style></head>" +
      "<body>" + mergedPagesHtml + "</body></html>";

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
      
      <header className="bg-white border-b border-gray-200 py-3.5 px-6 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-red-600 transition">
            <ArrowRight className="w-4 h-4" />
            العودة لجميع الأدوات
          </Link>
          <span className="text-xs font-bold uppercase tracking-wider text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
            نظام عزل ودمج الصفحات
          </span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
        
        {/* المرحلة 1: رفع الملف */}
        {currentStep === "upload" && !file && (
          <div className="w-full max-w-4xl text-center space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-4xl font-black text-[#161616]">
                تحويل PDF إلى WORD
              </h1>
              <p className="text-base text-gray-600 max-w-xl mx-auto">
                حوّل أي ملف PDF متعدد الصفحات مع عزل كل ورقة A4 وتعديلها بسهولة.
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
          </div>
        )}

        {currentStep === "upload" && file && (
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
                  onClick={resetAll}
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
                  <span>جاري تقسيم ومعالجة المستند...</span>
                </>
              ) : (
                <span>التحويل إلى WORD والفتح للتعديل</span>
              )}
            </button>
          </div>
        )}

        {/* المرحلة 2: تعديل كل ورقة مستقلة */}
        {currentStep === "edit" && (
          <div className="w-full max-w-4xl space-y-6 animate-in fade-in duration-300">
            
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-16 z-20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-800">
                    تم تقسيم المستند إلى {pagesContent.length} صفحات معزولة
                  </h2>
                  <p className="text-xs text-gray-500">كل صفحة مستقلة بذاتها، يمكنك تعديل أي نص قبل تأكيد الدمج والتحميل.</p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={resetAll}
                  className="px-4 py-3 text-sm text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition"
                >
                  إلغاء
                </button>
                <button
                  onClick={confirmEditsAndGoToDownload}
                  className="flex-1 sm:flex-none px-6 py-3 bg-[#E5322D] hover:bg-[#c92520] active:scale-95 text-white font-bold text-sm rounded-xl shadow-md transition flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>تأكيد ودمج المستند</span>
                </button>
              </div>
            </div>

            <div className="bg-[#334155] p-4 sm:p-8 rounded-2xl shadow-inner flex flex-col items-center">
              
              <div className="bg-white border border-gray-200 rounded-xl p-1.5 mb-8 shadow flex items-center gap-1 flex-wrap justify-center text-gray-700 sticky top-36 z-10">
                <button onClick={() => applyFormat("bold")} className="p-2 hover:bg-gray-100 rounded-lg transition" title="عريض">
                  <Bold className="w-4 h-4" />
                </button>
                <button onClick={() => applyFormat("italic")} className="p-2 hover:bg-gray-100 rounded-lg transition" title="مائل">
                  <Italic className="w-4 h-4" />
                </button>
                <button onClick={() => applyFormat("underline")} className="p-2 hover:bg-gray-100 rounded-lg transition" title="تسطير">
                  <Underline className="w-4 h-4" />
                </button>
                <div className="w-[1px] h-5 bg-gray-300 mx-1"></div>
                <button onClick={() => applyFormat("justifyRight")} className="p-2 hover:bg-gray-100 rounded-lg transition" title="يمين">
                  <AlignRight className="w-4 h-4" />
                </button>
                <button onClick={() => applyFormat("justifyCenter")} className="p-2 hover:bg-gray-100 rounded-lg transition" title="وسط">
                  <AlignCenter className="w-4 h-4" />
                </button>
                <button onClick={() => applyFormat("justifyLeft")} className="p-2 hover:bg-gray-100 rounded-lg transition" title="يسار">
                  <AlignLeft className="w-4 h-4" />
                </button>
              </div>

              <div className="w-full max-w-2xl space-y-8">
                {pagesContent.map((pageHtml, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-300 px-2 font-medium">
                      <span>ورقة A4 مستقلة</span>
                      <span className="bg-slate-700 px-2.5 py-1 rounded-full text-white">صفحة {index + 1} من {pagesContent.length}</span>
                    </div>

                    <div 
                      ref={(el) => { pageRefs.current[index] = el; }}
                      className="bg-white min-h-[700px] p-8 sm:p-12 shadow-2xl rounded-sm border border-gray-200 outline-none focus:ring-2 focus:ring-red-400 text-gray-900 leading-relaxed cursor-text"
                      contentEditable
                      suppressContentEditableWarning
                      dir="rtl"
                      dangerouslySetInnerHTML={{ __html: pageHtml }}
                      style={{
                        fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif",
                        direction: "rtl",
                        textAlign: "right"
                      }}
                    />
                  </div>
                ))}
              </div>

            </div>
          </div>
        )}

        {/* المرحلة 3: التحميل */}
        {currentStep === "download" && (
          <div className="w-full max-w-xl bg-white border border-gray-200 rounded-3xl p-8 sm:p-12 text-center shadow-sm space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-black text-gray-900">
                تم دمج وتجهيز ملف Word بنجاح!
              </h2>
              <p className="text-sm text-gray-500">
                تم دمج كافة الصفحات المنفصلة مع فواصل A4 رسمية، المستند جاهز للتحميل.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={downloadWordDocument}
                className="w-full sm:w-auto px-10 py-5 bg-[#E5322D] hover:bg-[#c92520] active:scale-95 text-white font-black text-xl rounded-2xl shadow-xl hover:shadow-2xl transition flex items-center justify-center gap-3 mx-auto"
              >
                <Download className="w-6 h-6 stroke-[2.5]" />
                <span>تحميل ملف WORD</span>
              </button>
            </div>

            <div className="pt-4 border-t border-gray-100 flex items-center justify-center gap-4">
              <button
                onClick={() => setCurrentStep("edit")}
                className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition font-medium"
              >
                <Edit3 className="w-4 h-4" />
                العودة للتعديل
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={resetAll}
                className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                تحويل ملف آخر
              </button>
            </div>
          </div>
        )}

      </main>

      <footer className="py-4 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} apdf-app — أدوات PDF احترافية وسريعة
      </footer>
    </div>
  );
}
