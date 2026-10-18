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
  RotateCcw,
  RotateCw,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Zap,
} from "lucide-react";
import { degrees, PDFDocument } from "pdf-lib";

interface PdfViewport {
  width: number;
  height: number;
}

interface PdfPage {
  rotate: number;
  getViewport(options: { scale: number }): PdfViewport;
  render(options: {
    canvasContext: CanvasRenderingContext2D;
    viewport: PdfViewport;
  }): { promise: Promise<void> };
  cleanup(): void;
}

interface PdfJsDocument {
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
  }): { promise: Promise<PdfJsDocument> };
}

interface RotationPage {
  pageNumber: number;
  thumbnailUrl: string;
  rotation: 0 | 90 | 180 | 270;
}

const PDF_JS_VERSION = "3.11.174";
const PDF_JS_BASE_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_JS_VERSION}`;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "حدث خطأ غير متوقع.";
}

let pdfJsLoadPromise: Promise<PdfJsLibrary> | null = null;

function isPdfJsLibrary(value: unknown): value is PdfJsLibrary {
  if (typeof value !== "object" || value === null) return false;

  const workerOptions = Reflect.get(value, "GlobalWorkerOptions");
  return (
    typeof Reflect.get(value, "getDocument") === "function" &&
    typeof workerOptions === "object" &&
    workerOptions !== null &&
    typeof Reflect.get(workerOptions, "workerSrc") === "string"
  );
}

function loadPdfJs(): Promise<PdfJsLibrary> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("مكتبة قراءة PDF متاحة في المتصفح فقط."));
  }

  const existingLibrary = Reflect.get(window, "pdfjsLib");
  if (isPdfJsLibrary(existingLibrary)) {
    return Promise.resolve(existingLibrary);
  }

  if (!pdfJsLoadPromise) {
    pdfJsLoadPromise = new Promise<PdfJsLibrary>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `${PDF_JS_BASE_URL}/pdf.min.js`;
      script.async = true;
      script.onload = () => {
        const library = Reflect.get(window, "pdfjsLib");
        if (!isPdfJsLibrary(library)) {
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

function rotateBy(rotation: RotationPage["rotation"], amount: 90 | -90): RotationPage["rotation"] {
  return (((rotation + amount + 360) % 360) as RotationPage["rotation"]);
}

export default function RotatePage() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<RotationPage[]>([]);
  const [processing, setProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [outputFileName, setOutputFileName] = useState("apdf_rotated.pdf");
  const [isDragging, setIsDragging] = useState(false);

  useEffect(
    () => () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    },
    [resultUrl]
  );

  const loadFile = async (newFile: File | undefined) => {
    if (!newFile) return;
    setErrorMsg(null);
    setResultUrl(null);
    setPages([]);

    if (
      newFile.type !== "application/pdf" &&
      !newFile.name.toLowerCase().endsWith(".pdf")
    ) {
      setFile(null);
      setErrorMsg("يرجى اختيار ملف PDF صالح.");
      return;
    }

    setProcessing(true);
    setStatusMsg("جاري قراءة صفحات المستند...");
    setProgress({ current: 0, total: 0 });
    let pdf: PdfJsDocument | null = null;

    try {
      const pdfJs = await loadPdfJs();
      const loadingTask = pdfJs.getDocument({
        data: await newFile.arrayBuffer(),
        cMapUrl: `${PDF_JS_BASE_URL}/cmaps/`,
        cMapPacked: true,
      });
      pdf = await loadingTask.promise;

      if (pdf.numPages === 0) {
        throw new Error("لا يحتوي ملف PDF على صفحات.");
      }

      const thumbnails: RotationPage[] = [];
      setProgress({ current: 0, total: pdf.numPages });

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        setStatusMsg(`جاري تحميل الصفحة ${pageNumber} من ${pdf.numPages}...`);
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 0.45 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("تعذر إنشاء لوحة معاينة الصفحات في المتصفح.");
        }

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        await page.render({ canvasContext: context, viewport }).promise;
        thumbnails.push({
          pageNumber,
          thumbnailUrl: canvas.toDataURL("image/jpeg", 0.82),
          rotation: 0,
        });
        page.cleanup();
        canvas.width = 0;
        canvas.height = 0;
        setProgress({ current: pageNumber, total: pdf.numPages });
      }

      setFile(newFile);
      setPages(thumbnails);
      setStatusMsg("");
    } catch (error) {
      setErrorMsg(`تعذر فتح ملف PDF: ${getErrorMessage(error)}`);
      setStatusMsg("");
    } finally {
      if (pdf) await pdf.destroy();
      setProcessing(false);
    }
  };

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    void loadFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    void loadFile(event.dataTransfer.files[0]);
  };

  const rotatePage = (pageNumber: number, amount: 90 | -90) => {
    setPages((currentPages) =>
      currentPages.map((page) =>
        page.pageNumber === pageNumber
          ? { ...page, rotation: rotateBy(page.rotation, amount) }
          : page
      )
    );
  };

  const rotateAll = (amount: 90 | -90) => {
    setPages((currentPages) =>
      currentPages.map((page) => ({
        ...page,
        rotation: rotateBy(page.rotation, amount),
      }))
    );
  };

  const resetRotations = () => {
    setPages((currentPages) =>
      currentPages.map((page) => ({ ...page, rotation: 0 }))
    );
  };

  const saveRotatedPdf = async () => {
    if (!file) return;
    setProcessing(true);
    setErrorMsg(null);
    setStatusMsg("جاري حفظ اتجاهات الصفحات...");

    try {
      const sourceBytes = await file.arrayBuffer();
      const pdfDocument = await PDFDocument.load(sourceBytes, {
        ignoreEncryption: true,
      });

      if (pdfDocument.getPageCount() !== pages.length) {
        throw new Error("تعذر مطابقة صفحات الملف مع المعاينات.");
      }

      pages.forEach((pageState, index) => {
        const pdfPage = pdfDocument.getPage(index);
        const originalRotation = pdfPage.getRotation().angle;
        const newRotation = ((originalRotation + pageState.rotation) % 360 + 360) % 360;
        pdfPage.setRotation(degrees(newRotation));
      });

      const savedBytes = await pdfDocument.save();
      const outputBuffer = new ArrayBuffer(savedBytes.byteLength);
      new Uint8Array(outputBuffer).set(savedBytes);
      const outputBlob = new Blob([outputBuffer], { type: "application/pdf" });
      setResultUrl(URL.createObjectURL(outputBlob));
      setOutputFileName(`${file.name.replace(/\.pdf$/i, "")}_rotated.pdf`);
      setStatusMsg("");
    } catch (error) {
      setErrorMsg(`تعذر حفظ الملف بعد التدوير: ${getErrorMessage(error)}`);
      setStatusMsg("");
    } finally {
      setProcessing(false);
    }
  };

  const resetTool = () => {
    setFile(null);
    setPages([]);
    setResultUrl(null);
    setOutputFileName("apdf_rotated.pdf");
    setProgress({ current: 0, total: 0 });
    setStatusMsg("");
    setErrorMsg(null);
  };

  const progressPercent =
    progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
  const hasRotation = pages.some((page) => page.rotation !== 0);

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
            <RotateCw className="h-4 w-4" />
          </div>
        </div>
      </header>

      <main className="relative z-20 mx-auto w-full max-w-5xl flex-1 space-y-12 px-3 py-8">
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

        <section className="mx-auto max-w-4xl space-y-7">
          <div className="space-y-2 text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>تدوير دقيق وسريع لصفحات PDF</span>
            </div>
            <h1 className="text-2xl font-black text-white sm:text-3xl">
              تدوير صفحات <span className="text-purple-400">PDF</span>
            </h1>
            <p className="text-xs leading-6 text-slate-400 sm:text-sm">
              عاين صفحات ملفك، دوّر الصفحات المطلوبة، ثم احفظ نسخة PDF بالاتجاه
              الصحيح.
            </p>
          </div>

          {resultUrl ? (
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
                    تم تدوير صفحات الملف بنجاح!
                  </h2>
                  <p className="text-xs text-slate-400 sm:text-sm">
                    ملف PDF الجديد جاهز للتنزيل.
                  </p>
                </div>
                <div className="space-y-3">
                  <a
                    href={resultUrl}
                    download={outputFileName}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-4 text-base font-black text-slate-950 shadow-xl shadow-emerald-500/20 transition-all hover:from-emerald-400 hover:to-teal-400 active:scale-95"
                  >
                    <Download className="h-5 w-5" />
                    <span>تحميل ملف PDF بعد التدوير</span>
                  </a>
                  <button
                    type="button"
                    onClick={resetTool}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-xs font-bold text-slate-300 transition hover:bg-slate-800"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>تدوير ملف آخر</span>
                  </button>
                </div>
              </div>
            </div>
          ) : !file ? (
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
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handleFileInput}
                  className="sr-only"
                  aria-label="اختيار ملف PDF"
                />
              </label>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <FileText className="h-6 w-6 shrink-0 text-purple-400" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-white">{file.name}</p>
                    <p className="text-xs text-slate-400">
                      {pages.length} صفحة
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={resetTool}
                  className="text-xs font-bold text-slate-400 transition hover:text-rose-400"
                >
                  تغيير الملف
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-950/80 p-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => rotateAll(90)}
                    className="flex items-center gap-2 rounded-xl bg-purple-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-purple-500"
                  >
                    <RotateCw className="h-4 w-4" />
                    <span>تدوير الكل يمين (+90°)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => rotateAll(-90)}
                    className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-300 transition hover:text-white"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>تدوير الكل يسار (-90°)</span>
                  </button>
                  <button
                    type="button"
                    onClick={resetRotations}
                    disabled={!hasRotation}
                    className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-400 transition hover:text-white disabled:opacity-40"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>إعادة التعيين</span>
                  </button>
                </div>
                <span className="text-xs text-slate-500">
                  {pages.filter((page) => page.rotation !== 0).length} صفحات معدلة
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {pages.map((page) => (
                  <div
                    key={page.pageNumber}
                    className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/80 p-3"
                  >
                    <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-xl bg-slate-900">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={page.thumbnailUrl}
                        alt={`معاينة الصفحة ${page.pageNumber}`}
                        className="max-h-full max-w-full object-contain transition-transform duration-200"
                        style={{ transform: `rotate(${page.rotation}deg)` }}
                      />
                    </div>
                    <span className="absolute left-5 top-5 rounded-full border border-slate-700 bg-slate-950/90 px-2 py-1 text-[10px] font-bold text-white">
                      {page.rotation}°
                    </span>
                    <span className="mt-2 block text-center text-xs font-bold text-slate-300">
                      صفحة {page.pageNumber}
                    </span>
                    <div className="mt-2 flex justify-center gap-2 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                      <button
                        type="button"
                        onClick={() => rotatePage(page.pageNumber, -90)}
                        aria-label={`تدوير الصفحة ${page.pageNumber} عكس عقارب الساعة`}
                        title="تدوير عكس عقارب الساعة"
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-purple-500 hover:text-white"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => rotatePage(page.pageNumber, 90)}
                        aria-label={`تدوير الصفحة ${page.pageNumber} مع عقارب الساعة`}
                        title="تدوير مع عقارب الساعة"
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-purple-500 hover:text-white"
                      >
                        <RotateCw className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={saveRotatedPdf}
                disabled={processing}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-purple-600 px-6 py-4 text-sm font-black text-white shadow-xl shadow-purple-600/20 transition-all hover:bg-purple-500 active:scale-[0.99] disabled:opacity-40"
              >
                <RotateCw className="h-4 w-4" />
                <span>حفظ ملف PDF بعد التدوير</span>
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
        </section>

        <section className="space-y-8 border-t border-slate-900 pt-8 text-xs leading-relaxed text-slate-300 sm:text-sm">
          <div className="space-y-4">
            <h2 className="flex items-center gap-2 text-base font-bold text-white sm:text-lg">
              <Sparkles className="h-4 w-4 text-purple-400" />
              <span>كيفية تدوير صفحات PDF أونلاين</span>
            </h2>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
              <div className="space-y-2 rounded-2xl border border-slate-900 bg-slate-950/60 p-4">
                <span className="rounded bg-purple-500/20 px-2 py-0.5 text-xs font-black text-purple-400">
                  1. ارفع الملف
                </span>
                <h3 className="text-xs font-bold text-white sm:text-sm">
                  اختر ملف PDF
                </h3>
                <p className="text-xs text-slate-400">
                  حمّل المستند من جهازك أو اسحبه إلى مربع الرفع لعرض جميع صفحاته.
                </p>
              </div>
              <div className="space-y-2 rounded-2xl border border-slate-900 bg-slate-950/60 p-4">
                <span className="rounded bg-purple-500/20 px-2 py-0.5 text-xs font-black text-purple-400">
                  2. دوّر الصفحات
                </span>
                <h3 className="text-xs font-bold text-white sm:text-sm">
                  عدّل صفحة أو المستند كاملاً
                </h3>
                <p className="text-xs text-slate-400">
                  استخدم أزرار التدوير لكل صفحة أو اختر تدوير جميع الصفحات يميناً
                  أو يساراً.
                </p>
              </div>
              <div className="space-y-2 rounded-2xl border border-slate-900 bg-slate-950/60 p-4">
                <span className="rounded bg-purple-500/20 px-2 py-0.5 text-xs font-black text-purple-400">
                  3. احفظ النتيجة
                </span>
                <h3 className="text-xs font-bold text-white sm:text-sm">
                  نزّل النسخة المعدلة
                </h3>
                <p className="text-xs text-slate-400">
                  عاين الزوايا المحددة ثم احفظ مستند PDF الجديد على جهازك.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-900 bg-slate-950/50 p-5">
            <h2 className="text-base font-bold text-white">
              مميزات أداة تدوير PDF من apdf.app
            </h2>
            <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-white">خصوصية وأمان</h3>
                  <p className="text-slate-400">
                    تتم معالجة المستند داخل متصفحك دون رفعه إلى خوادم خارجية.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Zap className="mt-0.5 h-4 w-4 shrink-0 text-purple-400" />
                <div>
                  <h3 className="font-bold text-white">تدوير مرن وسريع</h3>
                  <p className="text-slate-400">
                    دوّر صفحة واحدة أو جميع الصفحات، مع معاينة مباشرة لكل تغيير.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="flex items-center gap-2 text-base font-bold text-white">
              <HelpCircle className="h-4 w-4 text-purple-400" />
              أسئلة شائعة حول تدوير PDF
            </h2>
            <div className="space-y-2">
              <details className="rounded-xl border border-slate-900 bg-slate-950/60 p-4">
                <summary className="cursor-pointer list-none font-bold text-purple-300">
                  هل أستطيع تدوير صفحة واحدة فقط؟
                </summary>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  نعم، استخدم أزرار التدوير أسفل معاينة الصفحة المطلوبة. لن
                  تتغير اتجاهات الصفحات الأخرى.
                </p>
              </details>
              <details className="rounded-xl border border-slate-900 bg-slate-950/60 p-4">
                <summary className="cursor-pointer list-none font-bold text-purple-300">
                  هل يمكن تدوير جميع الصفحات دفعة واحدة؟
                </summary>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  نعم، استخدم زر تدوير الكل يميناً أو يساراً لتدوير جميع
                  الصفحات بمقدار 90 درجة.
                </p>
              </details>
              <details className="rounded-xl border border-slate-900 bg-slate-950/60 p-4">
                <summary className="cursor-pointer list-none font-bold text-purple-300">
                  هل يتم تعديل الملف الأصلي؟
                </summary>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  لا، يتم إنشاء نسخة جديدة بالاتجاهات المختارة ويظل ملفك الأصلي
                  كما هو.
                </p>
              </details>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}