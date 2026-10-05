"use client";

import React, { useState } from "react";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Download, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function PdfToWordPage() {
  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultText, setResultText] = useState("");
  const [error, setError] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === "application/pdf" || selectedFile.type.startsWith("image/")) {
        setFile(selectedFile);
        setError("");
        setResultText("");
      } else {
        setError("يرجى رفع ملف بصيغة PDF أو صورة.");
      }
    }
  };

  const handleProcess = async () => {
    if (!file) {
      setError("الرجاء اختيار ملف أولاً.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append(
        "prompt",
        prompt || "استخرج كامل النص بدقة وحوله إلى تنسيق وورد متناسق ومضبوط باللغة العربية"
      );

      const res = await fetch("/api/gemini-doc", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "فشل معالجة المستند.");
      }

      setResultText(data.resultText);
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء معالجة المستند.");
    } finally {
      setLoading(false);
    }
  };

  const downloadWordDocument = () => {
    if (!resultText) return;

    const htmlContent = 
      "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>" +
      "<head><meta charset='utf-8'><title>Document</title>" +
      "<style>body { font-family: Arial, sans-serif; direction: rtl; text-align: right; }</style></head><body>" +
      "<div style='white-space: pre-wrap; font-size: 14pt; line-height: 1.6;'>" +
      resultText.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") +
      "</div></body></html>";

    const blob = new Blob(["\ufeff", htmlContent], {
      type: "application/msword;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = (file?.name ? file.name.replace(/\.[^/.]+$/, "") : "document") + ".doc";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 py-10 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition">
          <ArrowRight className="w-4 h-4" />
          العودة للرئيسية
        </Link>

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold text-slate-800">تحويل PDF إلى Word (ذكاء اصطناعي)</h1>
          <p className="text-sm text-slate-600">
            استخراج فوري وفائق الدقة للنصوص وتنسيقها في مستند Word يدعم العربية بالكامل بواسطة Gemini AI.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-8 cursor-pointer hover:bg-slate-50 transition">
            <Upload className="w-10 h-10 text-blue-600 mb-2" />
            <span className="font-medium text-slate-700">
              {file ? file.name : "اضغط لاختيار ملف PDF أو اسحبه إلى هنا"}
            </span>
            <span className="text-xs text-slate-500 mt-1">يدعم ملفات PDF والصور</span>
            <input type="file" accept=".pdf,image/*" onChange={handleFileChange} className="hidden" />
          </label>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">تعليمات إضافية للذكاء الاصطناعي (اختياري):</label>
            <input
              type="text"
              placeholder="مثال: لخص النقاط الأساسية فقط، أو احتفظ بالجداول كما هي"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handleProcess}
            disabled={!file || loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>جاري استخراج ومعالجة النص بواسطة Gemini...</span>
              </>
            ) : (
              <>
                <FileText className="w-5 h-5" />
                <span>بدء التحويل الآن</span>
              </>
            )}
          </button>
        </div>

        {resultText && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>تم التحويل بنجاح!</span>
              </div>
              <button
                onClick={downloadWordDocument}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition"
              >
                <Download className="w-4 h-4" />
                تحميل كملف Word
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-800 font-mono whitespace-pre-wrap max-h-96 overflow-y-auto leading-relaxed text-right" dir="rtl">
              {resultText}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
