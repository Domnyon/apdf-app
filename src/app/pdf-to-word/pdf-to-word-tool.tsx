"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Download,
  FileText,
  HelpCircle,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Zap,
} from "lucide-react";

const DOCX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function getResponseError(value: unknown): string | null {
  if (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "string"
  ) {
    return value.error;
  }
  return null;
}

export default function PdfToWordTool() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloadBlob, setDownloadBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectFile = (selectedFile: File | undefined) => {
    if (!selectedFile) return;
    setError(null);
    setDownloadBlob(null);

    if (
      selectedFile.type !== "application/pdf" &&
      !selectedFile.name.toLowerCase().endsWith(".pdf")
    ) {
      setFile(null);
      setError("يرجى اختيار ملف بصيغة PDF فقط.");
      return;
    }

    setFile(selectedFile);
  };

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    selectFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const handleConvert = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/pdf-to-word", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const responseBody: unknown = await response.json().catch(() => null);
        throw new Error(
          getResponseError(responseBody) ??
            "تعذر تحويل الملف. يرجى المحاولة مرة أخرى."
        );
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.toLowerCase().includes(DOCX_CONTENT_TYPE)) {
        throw new Error("استجابة التحويل ليست ملف Word صالحاً.");
      }

      const blob = await response.blob();
      const signature = new Uint8Array(await blob.slice(0, 2).arrayBuffer());
      if (blob.size === 0 || signature[0] !== 0x50 || signature[1] !== 0x4b) {
        throw new Error("ملف Word المستلم غير مكتمل أو تالف.");
      }

      setDownloadBlob(blob);
    } catch (conversionError: unknown) {
      console.error("PDF to Word conversion failed:", conversionError);
      setError(
        conversionError instanceof Error
          ? conversionError.message
          : "حدث خطأ أثناء تحويل الملف. يرجى المحاولة مرة أخرى."
      );
    } finally {
      setLoading(false);
    }
  };

  const triggerDownload = () => {
    if (!file || !downloadBlob) return;

    const url = URL.createObjectURL(downloadBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${file.name.replace(/\.pdf$/i, "") || "converted"}.docx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const reset = () => {
    setFile(null);
    setDownloadBlob(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div
      className="relative flex min-h-screen w-full max-w-full flex-col overflow-x-hidden bg-[#070b12] font-sans text-slate-100 selection:bg-purple-500 selection:text-white"
      dir="rtl"
    >
      <div className="pointer-events-none absolute right-1/4 top-0 h-[350px] w-[500px] max-w-full overflow-hidden rounded-full bg-purple-600/10 blur-[130px]" />

      <header className="relative z-30 mx-auto flex w-full max-w-6xl items-center justify-between border-b border-slate-900 px-4 py-4">
        <Link
          href="/"
          className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-400 transition hover:text-white"
        >
          <ArrowRight className="h-4 w-4" />
          <span>الرئيسية</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-lg font-black tracking-tight text-white">
            apdf<span className="text-purple-400">.app</span>
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 text-purple-400">
            <FileText className="h-4 w-4" />
          </div>
        </div>
      </header>

      <main className="relative z-20 mx-auto flex w-full max-w-4xl flex-1 flex-col space-y-12 px-3 py-8">
        {loading && (
          <div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-[#070b12]/85 p-5 text-center backdrop-blur-md"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-9 w-9 animate-spin text-purple-400" />
            <span className="text-sm font-bold text-white">
              جاري تحويل المستند ومعالجة النصوص العربية...
            </span>
          </div>
        )}

        <section className="mx-auto w-full max-w-2xl space-y-7">
          <div className="space-y-2 text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>تحويل PDF إلى Word بسهولة</span>
            </div>
            <h1 className="text-2xl font-black text-white sm:text-3xl">
              تحويل PDF إلى <span className="text-purple-400">Word</span>
            </h1>
            <p className="text-xs leading-6 text-slate-400 sm:text-sm">
              حوّل مستندات PDF إلى ملفات DOCX قابلة للتحرير مع الحفاظ على
              النصوص والتنسيق قدر الإمكان.
            </p>
          </div>

          {downloadBlob ? (
            <div className="space-y-6">
              <div className="flex min-h-[120px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/70 p-4 text-center sm:min-h-[160px]">
                <span className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  إعلان / Sponsored Ad
                </span>
                <div className="flex flex-col items-center gap-1 text-xs text-slate-400">
                  <span className="font-bold text-slate-300">مساحة إعلانية جاهزة</span>
                  <span className="text-[11px] text-slate-500">
                    Google AdSense Responsive Banner
                  </span>
                </div>
              </div>

              <div className="space-y-6 rounded-3xl border border-slate-800 bg-slate-950/80 p-6 text-center shadow-2xl sm:p-8">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-xl font-black text-white sm:text-2xl">
                    تم تحويل المستند بنجاح!
                  </h2>
                  <p className="break-words text-xs text-slate-400 sm:text-sm">
                    أصبح ملف Word جاهزاً للتنزيل:{" "}
                    {file?.name.replace(/\.pdf$/i, "") || "converted"}.docx
                  </p>
                </div>
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={triggerDownload}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-purple-600 px-6 py-4 text-base font-black text-white shadow-xl shadow-purple-600/20 transition-all hover:bg-purple-500 active:scale-95"
                  >
                    <Download className="h-5 w-5" />
                    <span>تحميل ملف Word (DOCX)</span>
                  </button>
                  <button
                    type="button"
                    onClick={reset}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-xs font-bold text-slate-300 transition hover:bg-slate-800"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>تحويل ملف آخر</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {!file ? (
                <div
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDragLeave={(event) => {
                    event.preventDefault();
                    setIsDragging(false);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    setIsDragging(false);
                    selectFile(event.dataTransfer.files[0]);
                  }}
                  className={`rounded-3xl border-2 border-dashed p-8 text-center shadow-xl transition sm:p-12 ${
                    isDragging
                      ? "border-purple-400 bg-purple-500/10"
                      : "border-slate-800 bg-slate-950/60 hover:border-purple-500/60"
                  }`}
                >
                  <label className="flex cursor-pointer flex-col items-center justify-center">
                    <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/10 text-purple-400">
                      <UploadCloud className="h-7 w-7" />
                    </span>
                    <span className="mb-1 text-sm font-bold text-white">
                      اسحب ملف PDF وأفلته هنا
                    </span>
                    <span className="text-[11px] text-slate-500">
                      أو اضغط لاختيار ملف من جهازك
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={handleFileInput}
                      className="sr-only"
                      aria-label="اختيار ملف PDF"
                    />
                  </label>
                </div>
              ) : (
                <div className="flex w-full min-w-0 items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <FileText className="h-6 w-6 shrink-0 text-purple-400" />
                    <div className="min-w-0 text-right">
                      <p className="break-all text-sm font-bold text-white">
                        {file.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {(file.size / (1024 * 1024)).toFixed(2)} ميجابايت
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={reset}
                    className="shrink-0 text-xs font-bold text-slate-400 transition hover:text-rose-400"
                  >
                    تغيير الملف
                  </button>
                </div>
              )}

              {error && (
                <p
                  className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs leading-5 text-rose-300"
                  role="alert"
                >
                  {error}
                </p>
              )}

              {file && (
                <button
                  type="button"
                  onClick={handleConvert}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-purple-600 px-6 py-4 text-sm font-black text-white shadow-xl shadow-purple-600/20 transition-all hover:bg-purple-500 active:scale-[0.99] disabled:opacity-40"
                >
                  <FileText className="h-4 w-4" />
                  <span>تحويل إلى Word الآن</span>
                </button>
              )}

              <p className="text-center text-[11px] leading-5 text-slate-500">
                تتطلب هذه الميزة معالجة سحابية مشفرة عبر Adobe PDF Services
                واتصال HTTPS/TLS. لا يحتفظ التطبيق بنسخة دائمة من الملف؛ أما
                الحذف والاحتفاظ لدى Adobe فيخضعان لسياسات الخدمة وشروطها.
              </p>
            </div>
          )}
        </section>

        <section className="w-full space-y-8 border-t border-slate-900 pt-8 text-xs leading-relaxed text-slate-300 sm:text-sm">
          <div className="space-y-4">
            <h2 className="flex items-center gap-2 text-base font-bold text-white sm:text-lg">
              <Sparkles className="h-4 w-4 text-purple-400" />
              <span>كيفية تحويل PDF إلى Word أونلاين</span>
            </h2>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
              <article className="space-y-2 rounded-2xl border border-slate-900 bg-slate-950/60 p-4">
                <span className="rounded bg-purple-500/20 px-2 py-0.5 text-xs font-black text-purple-400">
                  1. ارفع الملف
                </span>
                <h3 className="text-xs font-bold text-white sm:text-sm">
                  اختر مستند PDF
                </h3>
                <p className="text-xs text-slate-400">
                  اسحب الملف إلى مربع الرفع أو اختره من جهازك لبدء التحويل.
                </p>
              </article>
              <article className="space-y-2 rounded-2xl border border-slate-900 bg-slate-950/60 p-4">
                <span className="rounded bg-purple-500/20 px-2 py-0.5 text-xs font-black text-purple-400">
                  2. ابدأ التحويل
                </span>
                <h3 className="text-xs font-bold text-white sm:text-sm">
                  حوّل المستند إلى DOCX
                </h3>
                <p className="text-xs text-slate-400">
                  اضغط على زر التحويل لمعالجة النصوص والتنسيقات في المستند.
                </p>
              </article>
              <article className="space-y-2 rounded-2xl border border-slate-900 bg-slate-950/60 p-4">
                <span className="rounded bg-purple-500/20 px-2 py-0.5 text-xs font-black text-purple-400">
                  3. نزّل Word
                </span>
                <h3 className="text-xs font-bold text-white sm:text-sm">
                  احفظ الملف القابل للتحرير
                </h3>
                <p className="text-xs text-slate-400">
                  بعد اكتمال التحويل، نزّل نسخة DOCX وافتحها في محرر Word
                  المتوافق.
                </p>
              </article>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-900 bg-slate-950/50 p-5">
            <h2 className="text-base font-bold text-white">
              مميزات تحويل PDF إلى Word
            </h2>
            <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
              <div className="flex items-start gap-2.5">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-purple-400" />
                <div>
                  <h3 className="font-bold text-white">
                    الحفاظ على التنسيق والخطوط العربية
                  </h3>
                  <p className="text-slate-400">
                    يستخدم التصدير تخطيط PDF الأصلي للمحافظة على ترتيب النصوص
                    والتنسيق قدر الإمكان.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Zap className="mt-0.5 h-4 w-4 shrink-0 text-purple-400" />
                <div>
                  <h3 className="font-bold text-white">الجداول ومربعات النص</h3>
                  <p className="text-slate-400">
                    تتم معالجة عناصر المستند وتخطيطه عند إنشاء Word؛ وتعتمد
                    دقة النتيجة على بنية PDF والخطوط المضمنة فيه.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-white">الخصوصية والأمان</h3>
                  <p className="text-slate-400">
                    تتم المعالجة السحابية المشفرة عبر Adobe باستخدام HTTPS/TLS.
                    لا يحتفظ التطبيق بنسخة دائمة، بينما يخضع حذف الملفات
                    المؤقتة ومدة الاحتفاظ بها لسياسات Adobe وشروطها.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-white">تحميل DOCX مباشر</h3>
                  <p className="text-slate-400">
                    نزّل ملف Word الناتج مباشرة بعد اكتمال المعالجة.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="flex items-center gap-2 text-base font-bold text-white">
              <HelpCircle className="h-4 w-4 text-purple-400" />
              أسئلة شائعة حول تحويل PDF إلى Word
            </h2>
            <div className="space-y-2">
              <details className="rounded-xl border border-slate-900 bg-slate-950/60 p-4">
                <summary className="cursor-pointer list-none font-bold text-purple-300">
                  هل يدعم التحويل اللغة العربية؟
                </summary>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  يعالج Adobe النص الرقمي الموجود في PDF ويصدره إلى DOCX. قد
                  تختلف دقة اتجاه النص والخطوط بحسب المستند؛ أما صفحات الصور
                  الممسوحة فتتطلب OCR باللغة المناسبة، ودعم OCR العربي غير
                  متاح في إعدادات Adobe Export PDF المستخدمة هنا.
                </p>
              </details>
              <details className="rounded-xl border border-slate-900 bg-slate-950/60 p-4">
                <summary className="cursor-pointer list-none font-bold text-purple-300">
                  كيف يحافظ التحويل على الجداول ومربعات النص؟
                </summary>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  يعتمد التصدير على تخطيط PDF ومحتواه الرقمي لإنشاء DOCX. قد
                  تحتاج بعض الجداول أو مربعات النص المعقدة إلى تعديل بسيط بعد
                  التحويل لأن تنسيقات PDF وWord تختلف.
                </p>
              </details>
              <details className="rounded-xl border border-slate-900 bg-slate-950/60 p-4">
                <summary className="cursor-pointer list-none font-bold text-purple-300">
                  هل الأداة مجانية؟
                </summary>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  يمكنك استخدام واجهة التحويل دون رسوم من التطبيق. تتم معالجة
                  الملفات عبر Adobe PDF Services وتخضع الخدمة لحصص الاستخدام
                  وشروط Adobe.
                </p>
              </details>
              <details className="rounded-xl border border-slate-900 bg-slate-950/60 p-4">
                <summary className="cursor-pointer list-none font-bold text-purple-300">
                  هل يمكن تحويل PDF ممسوح ضوئياً؟
                </summary>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  قد تُحوّل الصفحات المصورة، لكن استخراج النص منها يعتمد على
                  التعرف الضوئي على الحروف. يلزم أن تكون الصفحة قابلة للقراءة
                  وأن تتوفر لغة OCR المناسبة.
                </p>
              </details>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
