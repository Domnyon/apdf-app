"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Download,
  FileText,
  HelpCircle,
  Loader2,
  Minimize2,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Zap,
} from "lucide-react";
import { PDFDocument } from "pdf-lib";

type CompressionLevel = "recommended" | "extreme" | "light";

interface CompressionPreset {
  id: CompressionLevel;
  label: string;
  quality: number;
  scale: number;
  description: string;
}

interface PdfViewport {
  width: number;
  height: number;
}

interface PdfPage {
  getViewport(options: { scale: number }): PdfViewport;
  render(options: {
    canvasContext: CanvasRenderingContext2D;
    viewport: PdfViewport;
  }): { promise: Promise<void> };
  cleanup(): void;
}

interface PdfDocument {
  numPages: number;
  getPage(pageNumber: number): Promise<PdfPage>;
  destroy(): Promise<void>;
}

interface PdfJsLibrary {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument(options: {
    data: ArrayBuffer;
    cMapUrl: string;
    cMapPacked: boolean;
  }): { promise: Promise<PdfDocument> };
}

declare global {
  interface Window {
    pdfjsLib?: PdfJsLibrary;
  }
}

const COMPRESSION_PRESETS: CompressionPreset[] = [
  {
    id: "recommended",
    label: "موصى به",
    quality: 0.7,
    scale: 1.5,
    description: "توازن ممتاز بين حجم الملف ووضوح الصفحات",
  },
  {
    id: "extreme",
    label: "ضغط شديد",
    quality: 0.5,
    scale: 1.2,
    description: "أصغر حجم ممكن مع جودة صورة أقل",
  },
  {
    id: "light",
    label: "ضغط خفيف",
    quality: 0.85,
    scale: 1.8,
    description: "جودة أعلى مع تقليل أقل لحجم الملف",
  },
];

const PDF_JS_VERSION = "3.11.174";
const PDF_JS_BASE_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_JS_VERSION}`;

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} بايت`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} كيلوبايت`;
  return `${(size / (1024 * 1024)).toFixed(2)} ميجابايت`;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "حدث خطأ غير متوقع.";
}

let pdfJsLoadPromise: Promise<PdfJsLibrary> | null = null;

function loadPdfJs(): Promise<PdfJsLibrary> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("مكتبة قراءة PDF متاحة في المتصفح فقط."));
  }

  if (window.pdfjsLib) {
    return Promise.resolve(window.pdfjsLib);
  }

  if (!pdfJsLoadPromise) {
    pdfJsLoadPromise = new Promise<PdfJsLibrary>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `${PDF_JS_BASE_URL}/pdf.min.js`;
      script.async = true;
      script.onload = () => {
        const library = window.pdfjsLib;
        if (!library) {
          pdfJsLoadPromise = null;
          reject(new Error("تعذر تهيئة مكتبة قراءة PDF."));
          return;
        }

        library.GlobalWorkerOptions.workerSrc = `${PDF_JS_BASE_URL}/pdf.worker.min.js`;
        resolve(library);
      };
      script.onerror = () => {
        pdfJsLoadPromise = null;
        reject(new Error("تعذر تحميل محرك قراءة PDF. تحقق من اتصال الإنترنت وحاول مجدداً."));
      };
      document.head.appendChild(script);
    });
  }

  return pdfJsLoadPromise;
}

export default function CompressPage() {
  const [file, setFile] = useState<File | null>(null);
  const [compressionLevel, setCompressionLevel] =
    useState<CompressionLevel>("recommended");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<number | null>(null);
  const [outputFileName, setOutputFileName] = useState("apdf_compressed.pdf");
  const [isDragging, setIsDragging] = useState(false);

  useEffect(
    () => () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    },
    [resultUrl]
  );

  const setPdfFile = (newFile: File | undefined) => {
    if (!newFile) return;
    setErrorMsg(null);
    setResultUrl(null);
    setResultSize(null);

    if (
      newFile.type !== "application/pdf" &&
      !newFile.name.toLowerCase().endsWith(".pdf")
    ) {
      setFile(null);
      setErrorMsg("يرجى اختيار ملف PDF صالح.");
      return;
    }

    setFile(newFile);
  };

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPdfFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    setPdfFile(event.dataTransfer.files[0]);
  };

  const compressPdf = async () => {
    if (!file) return;

    const preset =
      COMPRESSION_PRESETS.find((item) => item.id === compressionLevel) ??
      COMPRESSION_PRESETS[0];
    let pdf: PdfDocument | null = null;
    setProcessing(true);
    setErrorMsg(null);
    setProgress({ current: 0, total: 0 });
    setStatusMsg("جاري تجهيز المستند...");

    try {
      const pdfJs = await loadPdfJs();
      const pdfBytes = await file.arrayBuffer();
      const loadingTask = pdfJs.getDocument({
        data: pdfBytes,
        cMapUrl: `${PDF_JS_BASE_URL}/cmaps/`,
        cMapPacked: true,
      });
      pdf = await loadingTask.promise;

      if (pdf.numPages === 0) {
        throw new Error("لا يحتوي ملف PDF على صفحات قابلة للمعالجة.");
      }

      const outputPdf = await PDFDocument.create();
      setProgress({ current: 0, total: pdf.numPages });

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        setStatusMsg(`جاري ضغط الصفحة ${pageNumber} من ${pdf.numPages}...`);

        const sourcePage = await pdf.getPage(pageNumber);
        const originalViewport = sourcePage.getViewport({ scale: 1 });
        const renderViewport = sourcePage.getViewport({ scale: preset.scale });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("تعذر إنشاء لوحة معالجة الصور في المتصفح.");
        }

        canvas.width = Math.ceil(renderViewport.width);
        canvas.height = Math.ceil(renderViewport.height);
        await sourcePage.render({
          canvasContext: context,
          viewport: renderViewport,
        }).promise;

        const jpegBlob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error(`تعذر تحويل الصفحة ${pageNumber} إلى صورة.`));
            },
            "image/jpeg",
            preset.quality
          );
        });
        const jpegBytes = await jpegBlob.arrayBuffer();
        const embeddedImage = await outputPdf.embedJpg(jpegBytes);
        const outputPage = outputPdf.addPage([
          originalViewport.width,
          originalViewport.height,
        ]);
        outputPage.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: originalViewport.width,
          height: originalViewport.height,
        });

        sourcePage.cleanup();
        canvas.width = 0;
        canvas.height = 0;
        setProgress({ current: pageNumber, total: pdf.numPages });
      }

      setStatusMsg("جاري إنشاء ملف PDF المضغوط...");
      const compressedBytes = await outputPdf.save();
      const compressedBuffer = new ArrayBuffer(compressedBytes.byteLength);
      new Uint8Array(compressedBuffer).set(compressedBytes);
      const compressedBlob = new Blob([compressedBuffer], {
        type: "application/pdf",
      });
      const compressedUrl = URL.createObjectURL(compressedBlob);

      setResultUrl(compressedUrl);
      setResultSize(compressedBlob.size);
      setOutputFileName(
        `${file.name.replace(/\.pdf$/i, "")}_compressed.pdf`
      );
      setStatusMsg("");
    } catch (error) {
      setErrorMsg(`تعذر ضغط الملف: ${getErrorMessage(error)}`);
      setStatusMsg("");
    } finally {
      if (pdf) await pdf.destroy();
      setProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResultUrl(null);
    setResultSize(null);
    setProgress({ current: 0, total: 0 });
    setStatusMsg("");
    setErrorMsg(null);
    setCompressionLevel("recommended");
  };

  const savedPercent =
    file && resultSize !== null
      ? Math.round(((file.size - resultSize) / file.size) * 100)
      : 0;
  const progressPercent =
    progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <div
      className="relative flex min-h-screen w-full max-w-full flex-col justify-between overflow-x-hidden bg-[#070b12] font-sans text-slate-100 selection:bg-purple-500 selection:text-white"
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
            <Minimize2 className="h-4 w-4" />
          </div>
        </div>
      </header>

      <main className="relative z-20 mx-auto w-full max-w-4xl flex-1 space-y-12 px-3 py-8">
        {processing && (
          <div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-[#070b12]/85 p-5 backdrop-blur-md"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-9 w-9 animate-spin text-purple-400" />
            <span className="text-sm font-bold text-white">{statusMsg}</span>
            {progress.total > 0 && (
              <div className="w-full max-w-sm space-y-2">
                <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-purple-500 transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-center text-xs text-slate-400">
                  {progress.current} / {progress.total}
                </p>
              </div>
            )}
          </div>
        )}

        <section className="mx-auto max-w-2xl space-y-7">
          <div className="space-y-2 text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>ضغط سريع وآمن داخل المتصفح</span>
            </div>
            <h1 className="text-2xl font-black text-white sm:text-3xl">
              ضغط ملفات <span className="text-purple-400">PDF</span>
            </h1>
            <p className="text-xs leading-6 text-slate-400 sm:text-sm">
              قلل حجم ملف PDF واختر مستوى الضغط المناسب، ثم نزّل النسخة الجديدة
              مباشرة.
            </p>
          </div>

          {resultUrl && file && resultSize !== null ? (
            <div className="space-y-6">
              <div className="relative flex min-h-[120px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-slate-800 bg-slate-900/70 p-4 text-center sm:min-h-[160px]">
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
                    تم ضغط الملف بنجاح!
                  </h2>
                  <p className="text-xs text-slate-400 sm:text-sm">
                    انتهت معالجة جميع صفحات المستند.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                    <p className="mb-1 text-xs text-slate-400">الحجم الأصلي</p>
                    <p className="font-bold text-white">{formatFileSize(file.size)}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                    <p className="mb-1 text-xs text-slate-400">الحجم الجديد</p>
                    <p className="font-bold text-white">{formatFileSize(resultSize)}</p>
                  </div>
                  <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-4">
                    <p className="mb-1 text-xs text-purple-300">
                      {savedPercent >= 0 ? "نسبة التوفير" : "تغير الحجم"}
                    </p>
                    <p className="font-black text-purple-300">
                      {savedPercent > 0
                        ? `-${savedPercent}%`
                        : savedPercent < 0
                          ? `+${Math.abs(savedPercent)}%`
                          : "0%"}
                    </p>
                  </div>
                </div>

                {resultSize >= file.size && (
                  <p className="text-xs leading-5 text-amber-300">
                    هذا الملف كان مضغوطاً مسبقاً؛ قد تكون النسخة الجديدة أكبر
                    قليلاً بسبب إعادة ترميز الصفحات.
                  </p>
                )}

                <div className="space-y-3">
                  <a
                    href={resultUrl}
                    download={outputFileName}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4 text-base font-black text-slate-950 shadow-xl shadow-emerald-500/20 transition-all hover:from-emerald-400 hover:to-teal-400 active:scale-95"
                  >
                    <Download className="h-5 w-5" />
                    <span>تحميل ملف PDF المضغوط</span>
                  </a>
                  <button
                    type="button"
                    onClick={reset}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-xs font-bold text-slate-300 transition hover:bg-slate-800"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>ضغط ملف آخر</span>
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
                  onDrop={handleDrop}
                  className={`rounded-3xl border-2 border-dashed p-8 text-center shadow-xl transition sm:p-12 ${
                    isDragging
                      ? "border-purple-400 bg-purple-500/10"
                      : "border-slate-800 bg-slate-950/60 hover:border-purple-500/60"
                  }`}
                >
                  <label className="flex cursor-pointer flex-col items-center justify-center">
                    <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/10 text-purple-400 transition-transform hover:scale-110">
                      <UploadCloud className="h-7 w-7" />
                    </span>
                    <span className="mb-1 text-sm font-bold text-white">
                      اسحب ملف PDF وأفلته هنا
                    </span>
                    <span className="text-[11px] text-slate-500">
                      أو اضغط لاختيار ملف من جهازك
                    </span>
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={handleFileInput}
                      className="sr-only"
                      aria-label="اختيار ملف PDF"
                    />
                  </label>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <FileText className="h-6 w-6 shrink-0 text-purple-400" />
                    <div className="min-w-0 text-right">
                      <p className="truncate text-sm font-bold text-white">{file.name}</p>
                      <p className="text-xs text-slate-400">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={reset}
                    className="text-xs font-bold text-slate-400 transition hover:text-rose-400"
                  >
                    تغيير الملف
                  </button>
                </div>
              )}

              {file && (
                <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 sm:p-5">
                  <h2 className="text-sm font-bold text-white">اختر مستوى الضغط</h2>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {COMPRESSION_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setCompressionLevel(preset.id)}
                        aria-pressed={compressionLevel === preset.id}
                        className={`rounded-xl border p-3 text-right transition ${
                          compressionLevel === preset.id
                            ? "border-purple-500 bg-purple-500/10"
                            : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                        }`}
                      >
                        <span className="block text-sm font-bold text-white">
                          {preset.label} ({Math.round(preset.quality * 100)}%)
                        </span>
                        <span className="mt-1 block text-[11px] leading-5 text-slate-400">
                          {preset.description}
                        </span>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={compressPdf}
                    disabled={processing}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-purple-600 px-6 py-4 text-sm font-black text-white shadow-xl shadow-purple-600/20 transition-all hover:bg-purple-500 active:scale-[0.99] disabled:opacity-40"
                  >
                    <Minimize2 className="h-4 w-4" />
                    <span>ضغط ملف PDF الآن</span>
                  </button>
                </div>
              )}

              {errorMsg && (
                <p
                  className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs leading-5 text-rose-300"
                  role="alert"
                >
                  {errorMsg}
                </p>
              )}
              <p className="text-center text-[11px] leading-5 text-slate-500">
                تتم معالجة الملفات داخل متصفحك. للحفاظ على حجم الملف، يتم تحويل
                صفحات PDF إلى صور؛ لذلك قد لا يبقى النص قابلاً للتحديد أو البحث.
              </p>
            </div>
          )}
        </section>

        <section className="space-y-8 border-t border-slate-900 pt-8 text-xs leading-relaxed text-slate-300 sm:text-sm">
          <div className="space-y-4">
            <h2 className="flex items-center gap-2 text-base font-bold text-white sm:text-lg">
              <Sparkles className="h-4 w-4 text-purple-400" />
              <span>كيفية ضغط ملف PDF أونلاين</span>
            </h2>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
              <div className="space-y-2 rounded-2xl border border-slate-900 bg-slate-950/60 p-4">
                <span className="rounded bg-purple-500/20 px-2 py-0.5 text-xs font-black text-purple-400">
                  1. ارفع المستند
                </span>
                <h3 className="text-xs font-bold text-white sm:text-sm">
                  اختر ملف PDF أو اسحبه
                </h3>
                <p className="text-xs text-slate-400">
                  حدد ملف PDF من جهازك أو اسحبه إلى مربع الرفع لبدء التجهيز.
                </p>
              </div>
              <div className="space-y-2 rounded-2xl border border-slate-900 bg-slate-950/60 p-4">
                <span className="rounded bg-purple-500/20 px-2 py-0.5 text-xs font-black text-purple-400">
                  2. حدد الجودة
                </span>
                <h3 className="text-xs font-bold text-white sm:text-sm">
                  اختر مستوى الضغط المناسب
                </h3>
                <p className="text-xs text-slate-400">
                  اختر الضغط الشديد لتقليل الحجم أو الضغط الخفيف للحفاظ على تفاصيل أوضح.
                </p>
              </div>
              <div className="space-y-2 rounded-2xl border border-slate-900 bg-slate-950/60 p-4">
                <span className="rounded bg-purple-500/20 px-2 py-0.5 text-xs font-black text-purple-400">
                  3. نزّل النتيجة
                </span>
                <h3 className="text-xs font-bold text-white sm:text-sm">
                  قارن الحجم واحفظ الملف
                </h3>
                <p className="text-xs text-slate-400">
                  راجع الحجم الجديد ونسبة التوفير، ثم نزّل النسخة المضغوطة مباشرة.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-900 bg-slate-950/50 p-5">
            <h2 className="text-base font-bold text-white">
              مميزات أداة ضغط PDF من apdf.app
            </h2>
            <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-white">خصوصية وأمان</h3>
                  <p className="text-slate-400">
                    تتم معالجة المستند محلياً في متصفحك دون رفعه إلى خادم أو تخزينه على الإنترنت.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Zap className="mt-0.5 h-4 w-4 shrink-0 text-purple-400" />
                <div>
                  <h3 className="font-bold text-white">اختيارات مرنة</h3>
                  <p className="text-slate-400">
                    مستويات ضغط متعددة تساعدك على اختيار التوازن الأنسب بين حجم الملف ووضوح الصفحات.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="flex items-center gap-2 text-base font-bold text-white">
              <HelpCircle className="h-4 w-4 text-purple-400" />
              أسئلة شائعة حول ضغط PDF
            </h2>
            <div className="space-y-2">
              <details className="rounded-xl border border-slate-900 bg-slate-950/60 p-4">
                <summary className="cursor-pointer list-none font-bold text-purple-300">
                  ما الفرق بين مستويات الضغط؟
                </summary>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  الضغط الشديد يستخدم جودة 50% لتقليل الحجم أكثر، والموصى به
                  يستخدم 70% كتوازن عام، أما الخفيف فيستخدم 85% للحفاظ على وضوح أعلى.
                </p>
              </details>
              <details className="rounded-xl border border-slate-900 bg-slate-950/60 p-4">
                <summary className="cursor-pointer list-none font-bold text-purple-300">
                  هل يتم رفع ملفي إلى الإنترنت؟
                </summary>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  لا، تتم قراءة الملف وتحويل صفحاته داخل المتصفح، ولا يتم إرساله إلى خوادمنا.
                </p>
              </details>
              <details className="rounded-xl border border-slate-900 bg-slate-950/60 p-4">
                <summary className="cursor-pointer list-none font-bold text-purple-300">
                  هل سيبقى النص قابلاً للتحديد بعد الضغط؟
                </summary>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  للحفاظ على أحجام أصغر، يعاد بناء الصفحات كصور داخل PDF؛ لذلك
                  لن يكون النص قابلاً للتحديد أو البحث في النسخة المضغوطة.
                </p>
              </details>
              <details className="rounded-xl border border-slate-900 bg-slate-950/60 p-4">
                <summary className="cursor-pointer list-none font-bold text-purple-300">
                  لماذا قد يكون الملف الناتج أكبر أحياناً؟
                </summary>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  إذا كان الملف الأصلي مضغوطاً مسبقاً أو يحتوي على صفحات بسيطة
                  جداً، فقد ينتج عن تحويل الصفحات إلى صور ملف أكبر.
                </p>
              </details>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}