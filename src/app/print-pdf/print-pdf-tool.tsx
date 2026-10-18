"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  Loader2,
  Printer,
  Radar,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Wifi,
} from "lucide-react";

type PaperSize = "A4" | "Letter";
type Orientation = "portrait" | "landscape";

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

const PDF_JS_VERSION = "3.11.174";
const PDF_JS_BASE_URL = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDF_JS_VERSION}`;
const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const ACCEPTED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];

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
    return Promise.reject(new Error("معاينة PDF متاحة في المتصفح فقط."));
  }

  const existingLibrary = Reflect.get(window, "pdfjsLib");
  if (isPdfJsLibrary(existingLibrary)) return Promise.resolve(existingLibrary);

  if (!pdfJsLoadPromise) {
    pdfJsLoadPromise = new Promise<PdfJsLibrary>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `${PDF_JS_BASE_URL}/pdf.min.js`;
      script.async = true;
      script.onload = () => {
        const library = Reflect.get(window, "pdfjsLib");
        if (!isPdfJsLibrary(library)) {
          pdfJsLoadPromise = null;
          reject(new Error("تعذر تهيئة مكتبة معاينة PDF."));
          return;
        }
        library.GlobalWorkerOptions.workerSrc = `${PDF_JS_BASE_URL}/pdf.worker.min.js`;
        resolve(library);
      };
      script.onerror = () => {
        pdfJsLoadPromise = null;
        reject(new Error("تعذر تحميل قارئ PDF. تحقق من اتصال الإنترنت."));
      };
      document.head.appendChild(script);
    });
  }
  return pdfJsLoadPromise;
}

function isPdf(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function isSupportedFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return ACCEPTED_TYPES.includes(file.type) || ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "حدث خطأ غير متوقع.";
}

function fileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("تعذر قراءة الصورة."));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = () => reject(new Error("تعذر قراءة الملف المحدد."));
    reader.readAsDataURL(file);
  });
}

async function renderPdfPage(
  pdf: PdfDocument,
  pageNumber: number,
  scale: number
): Promise<string> {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("تعذر إنشاء معاينة الصفحة.");

  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  try {
    await page.render({ canvasContext: context, viewport }).promise;
    return canvas.toDataURL("image/jpeg", 0.94);
  } finally {
    page.cleanup();
    canvas.width = 0;
    canvas.height = 0;
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

export default function PrintPdfTool() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [pageCount, setPageCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [paperSize, setPaperSize] = useState<PaperSize>("A4");
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [scanningPrinters, setScanningPrinters] = useState(false);
  const [hasScannedPrinters, setHasScannedPrinters] = useState(false);
  const [selectedPrinter, setSelectedPrinter] = useState("system");
  const [errorMessage, setErrorMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const chooseFile = async (newFile: File | undefined) => {
    if (!newFile) return;
    setErrorMessage("");
    setFile(null);
    setPreviewUrl("");
    setPageCount(0);
    setPageNumber(1);
    setHasScannedPrinters(false);
    setSelectedPrinter("system");

    if (!isSupportedFile(newFile)) {
      setErrorMessage("يرجى اختيار ملف PDF أو صورة بصيغة JPG أو PNG أو WEBP.");
      return;
    }

    setLoading(true);
    let pdf: PdfDocument | null = null;
    try {
      let imageUrl: string;
      let totalPages = 1;
      if (isPdf(newFile)) {
        const pdfJs = await loadPdfJs();
        const loadingTask = pdfJs.getDocument({
          data: await newFile.arrayBuffer(),
          cMapUrl: `${PDF_JS_BASE_URL}/cmaps/`,
          cMapPacked: true,
        });
        pdf = await loadingTask.promise;
        if (!pdf.numPages) throw new Error("ملف PDF لا يحتوي على صفحات.");
        totalPages = pdf.numPages;
        imageUrl = await renderPdfPage(pdf, 1, 1.6);
      } else {
        imageUrl = await fileAsDataUrl(newFile);
        await new Promise<void>((resolve, reject) => {
          const image = new window.Image();
          image.onload = () => resolve();
          image.onerror = () => reject(new Error("تعذر فتح الصورة. تحقق من سلامة الملف."));
          image.src = imageUrl;
        });
      }

      setFile(newFile);
      setPreviewUrl(imageUrl);
      setPageCount(totalPages);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      if (pdf) await pdf.destroy();
      setLoading(false);
    }
  };

  const showPdfPage = async (nextPage: number) => {
    if (!file || !isPdf(file) || nextPage < 1 || nextPage > pageCount) return;
    setLoading(true);
    setErrorMessage("");
    let pdf: PdfDocument | null = null;
    try {
      const pdfJs = await loadPdfJs();
      pdf = await (pdfJs.getDocument({
        data: await file.arrayBuffer(),
        cMapUrl: `${PDF_JS_BASE_URL}/cmaps/`,
        cMapPacked: true,
      }).promise);
      setPreviewUrl(await renderPdfPage(pdf, nextPage, 1.6));
      setPageNumber(nextPage);
    } catch (error) {
      setErrorMessage(`تعذر معاينة الصفحة: ${getErrorMessage(error)}`);
    } finally {
      if (pdf) await pdf.destroy();
      setLoading(false);
    }
  };

  const scanForPrinters = async () => {
    setScanningPrinters(true);
    setHasScannedPrinters(false);
    setSelectedPrinter("system");
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setHasScannedPrinters(true);
    setScanningPrinters(false);
  };

  const handlePrint = async () => {
    if (!file) return;
    setPrinting(true);
    setErrorMessage("");
    let pdf: PdfDocument | null = null;
    let iframe: HTMLIFrameElement | null = null;

    try {
      const pageImages: string[] = [];
      if (isPdf(file)) {
        const pdfJs = await loadPdfJs();
        pdf = await (pdfJs.getDocument({
          data: await file.arrayBuffer(),
          cMapUrl: `${PDF_JS_BASE_URL}/cmaps/`,
          cMapPacked: true,
        }).promise);
        for (let currentPage = 1; currentPage <= pdf.numPages; currentPage += 1) {
          pageImages.push(await renderPdfPage(pdf, currentPage, 2));
        }
      } else {
        pageImages.push(await fileAsDataUrl(file));
      }

      const printFrame = document.createElement("iframe");
      iframe = printFrame;
      printFrame.title = "معاينة الطباعة";
      printFrame.setAttribute("aria-hidden", "true");
      printFrame.tabIndex = -1;
      printFrame.style.position = "fixed";
      printFrame.style.width = "1px";
      printFrame.style.height = "1px";
      printFrame.style.left = "-10000px";
      printFrame.style.top = "0";
      printFrame.style.border = "0";
      document.body.appendChild(printFrame);

      const frameDocument = printFrame.contentDocument;
      const frameWindow = printFrame.contentWindow;
      if (!frameDocument || !frameWindow) {
        throw new Error("تعذر تجهيز نافذة الطباعة.");
      }

      const pagesMarkup = pageImages
        .map(
          (source) =>
            `<section class="print-page"><img src="${source}" alt="" /></section>`
        )
        .join("");
      frameDocument.open();
      frameDocument.write(`<!doctype html>
        <html lang="ar" dir="rtl">
          <head>
            <meta charset="utf-8" />
            <title>${escapeHtml(file.name)}</title>
            <style>
              @page { size: ${paperSize} ${orientation}; margin: 8mm; }
              html, body { margin: 0; padding: 0; background: white; }
              .print-page { width: 100%; height: calc(100vh - 16mm); display: flex; align-items: center; justify-content: center; overflow: hidden; }
              .print-page:not(:last-child) { break-after: page; page-break-after: always; }
              img { display: block; max-width: 100%; max-height: 100%; object-fit: contain; }
              @media print {
                html, body { width: 100%; }
                .print-page { height: calc(100vh - 16mm); }
              }
            </style>
          </head>
          <body>${pagesMarkup}</body>
        </html>`);
      frameDocument.close();

      await Promise.all(
        Array.from(frameDocument.images).map(
          (image) =>
            image.complete
              ? Promise.resolve()
              : new Promise<void>((resolve, reject) => {
                  image.onload = () => resolve();
                  image.onerror = () => reject(new Error("تعذر تحميل صفحة للطباعة."));
                })
        )
      );

      const cleanup = () => {
        if (iframe?.isConnected) iframe.remove();
        iframe = null;
      };
      frameWindow.addEventListener("afterprint", cleanup, { once: true });
      frameWindow.focus();
      frameWindow.print();
    } catch (error) {
      if (iframe?.isConnected) iframe.remove();
      setErrorMessage(`تعذر بدء الطباعة: ${getErrorMessage(error)}`);
    } finally {
      if (pdf) await pdf.destroy();
      setPrinting(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreviewUrl("");
    setPageCount(0);
    setPageNumber(1);
    setHasScannedPrinters(false);
    setScanningPrinters(false);
    setSelectedPrinter("system");
    setErrorMessage("");
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div
      className="relative flex min-h-screen w-full max-w-full flex-col overflow-x-hidden bg-[#070b12] font-sans text-slate-100 selection:bg-purple-500 selection:text-white"
      dir="rtl"
    >
      <div className="pointer-events-none absolute right-1/4 top-0 h-[350px] w-[500px] max-w-full overflow-hidden rounded-full bg-purple-600/10 blur-[130px]" />

      <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between border-b border-slate-900 px-4 py-4">
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
            <Printer className="h-4 w-4" />
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-5xl flex-1 space-y-12 px-3 py-8">
        <section className="mx-auto max-w-4xl space-y-7">
          <div className="space-y-3 text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-bold text-purple-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>طباعة آمنة مباشرة من المتصفح</span>
            </div>
            <h1 className="text-2xl font-black leading-relaxed text-white sm:text-3xl">
              طباعة PDF والصور أونلاين
              <span className="text-purple-400"> عبر الواي فاي والشبكة</span>
            </h1>
            <p className="mx-auto max-w-3xl text-xs leading-7 text-slate-400 sm:text-sm">
              ارفع المستند، عاين الصفحات واضبط مقاس الورق، ثم استخدم نافذة الطباعة
              في جهازك لاختيار أي طابعة متصلة محلياً أو عبر Wi-Fi أو AirPrint.
            </p>
          </div>

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
              void chooseFile(event.dataTransfer.files[0]);
            }}
            className={`rounded-3xl border-2 border-dashed p-6 text-center shadow-xl transition sm:p-9 ${
              isDragging
                ? "border-purple-400 bg-purple-500/10"
                : "border-slate-800 bg-slate-950/60 hover:border-purple-500/60"
            } ${file ? "hidden" : ""}`}
          >
            <label className="flex cursor-pointer flex-col items-center justify-center">
              <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/10 text-purple-400">
                <UploadCloud className="h-7 w-7" />
              </span>
              <span className="mb-1 text-sm font-bold text-white">
                اسحب ملفك وأفلته هنا
              </span>
              <span className="text-[11px] text-slate-500">
                أو اضغط لاختيار PDF أو JPG أو PNG أو WEBP
              </span>
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  void chooseFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
                className="sr-only"
                aria-label="اختيار ملف للطباعة"
              />
            </label>
          </div>

          {loading && (
            <div
              className="flex items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm font-semibold text-slate-300"
              role="status"
              aria-live="polite"
            >
              <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
              جاري تجهيز معاينة الملف...
            </div>
          )}

          {errorMessage && (
            <p
              className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-center text-xs leading-6 text-red-300"
              role="alert"
            >
              {errorMessage}
            </p>
          )}

          {file && previewUrl && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  {isPdf(file) ? (
                    <FileText className="h-6 w-6 shrink-0 text-purple-400" />
                  ) : (
                    <ImageIcon className="h-6 w-6 shrink-0 text-purple-400" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-white">{file.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {isPdf(file) ? `${pageCount} صفحة` : "ملف صورة"} ·{" "}
                      {(file.size / 1024 / 1024).toFixed(2)} ميجابايت
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 transition hover:bg-slate-800"
                >
                  تغيير الملف
                </button>
              </div>

              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60">
                  <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
                    <span className="flex items-center gap-2 text-xs font-bold text-slate-300">
                      <Eye className="h-4 w-4 text-purple-400" />
                      معاينة الطباعة
                    </span>
                    {isPdf(file) && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void showPdfPage(pageNumber - 1)}
                          disabled={pageNumber <= 1 || loading}
                          className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 disabled:opacity-40"
                          aria-label="الصفحة السابقة"
                        >
                          السابق
                        </button>
                        <span className="text-[11px] text-slate-400">
                          {pageNumber} / {pageCount}
                        </span>
                        <button
                          type="button"
                          onClick={() => void showPdfPage(pageNumber + 1)}
                          disabled={pageNumber >= pageCount || loading}
                          className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 disabled:opacity-40"
                          aria-label="الصفحة التالية"
                        >
                          التالي
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex min-h-[340px] items-center justify-center bg-slate-950 p-4 sm:min-h-[480px]">
                    <Image
                      src={previewUrl}
                      alt={`معاينة ${file.name}${isPdf(file) ? ` - الصفحة ${pageNumber}` : ""}`}
                      width={1600}
                      height={2200}
                      unoptimized
                      className="max-h-[70vh] max-w-full rounded-md bg-white object-contain shadow-2xl"
                      style={{ width: "auto", height: "auto" }}
                    />
                  </div>
                </div>

                <aside className="space-y-4 rounded-3xl border border-slate-800 bg-slate-950/80 p-5">
                  <div>
                    <h2 className="mb-3 text-sm font-black text-white">إعدادات الورق</h2>
                    <p className="mb-2 text-xs font-semibold text-slate-400">حجم الورق</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(["A4", "Letter"] as const).map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setPaperSize(size)}
                          aria-pressed={paperSize === size}
                          className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition ${
                            paperSize === size
                              ? "border-purple-500 bg-purple-500/15 text-purple-300"
                              : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700"
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  {!isPdf(file) && (
                    <div>
                      <p className="mb-2 text-xs font-semibold text-slate-400">اتجاه الصورة</p>
                      <div className="grid grid-cols-2 gap-2">
                        {([
                          ["portrait", "عمودي"],
                          ["landscape", "أفقي"],
                        ] as const).map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setOrientation(value)}
                            aria-pressed={orientation === value}
                            className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition ${
                              orientation === value
                                ? "border-purple-500 bg-purple-500/15 text-purple-300"
                                : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                    <div>
                      <h3 className="mb-1 flex items-center gap-1.5 text-xs font-bold text-slate-200">
                        <Wifi className="h-4 w-4 text-purple-400" />
                        البحث عن الطابعات
                      </h3>
                      <p className="text-[10px] leading-5 text-slate-400">
                        افحص خيارات الطباعة اللاسلكية، ثم اختر مسار الاتصال المناسب.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => void scanForPrinters()}
                      disabled={scanningPrinters || printing || loading}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-purple-500/40 bg-purple-500/10 px-3 py-3 text-xs font-black leading-5 text-purple-200 transition hover:bg-purple-500/20 disabled:cursor-wait disabled:opacity-70"
                    >
                      {scanningPrinters ? (
                        <span className="relative flex h-5 w-5 items-center justify-center">
                          <Radar className="h-5 w-5 animate-spin text-purple-300" />
                          <span className="absolute h-2 w-2 animate-ping rounded-full bg-purple-300" />
                        </span>
                      ) : (
                        <Wifi className="h-5 w-5" />
                      )}
                      {scanningPrinters
                        ? "جاري فحص بروتوكولات الطباعة اللاسلكية AirPrint / Mopria / Wi-Fi..."
                        : "البحث عن طابعات Wi-Fi والشبكة المحلية"}
                    </button>

                    {hasScannedPrinters && (
                      <div className="space-y-2" aria-live="polite">
                        <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-2 text-[10px] font-bold leading-5 text-emerald-300">
                          <CheckCircle2 className="h-4 w-4 shrink-0" />
                          <span>
                            متصل بالشبكة وجاهز للطباعة
                            <span className="font-normal text-emerald-400/80"> (محاكاة؛ تحقق من الطابعة في نافذة النظام)</span>
                          </span>
                        </div>

                        <fieldset className="space-y-2">
                          <legend className="pb-1 text-[10px] font-bold text-slate-400">
                            اختر مسار الطباعة
                          </legend>
                          {[
                            ["system", "طابعة Wi-Fi الافتراضية للنظام (AirPrint / Mopria)"],
                            ["network", "طابعة شبكة محلية (LAN / Network Printer)"],
                            ["wireless", "طابعة عبر البلوتوث / اللاسلكي المباشر"],
                          ].map(([value, label]) => (
                            <label
                              key={value}
                              className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 text-[10px] leading-5 transition ${
                                selectedPrinter === value
                                  ? "border-purple-500/50 bg-purple-500/10 text-purple-200"
                                  : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700"
                              }`}
                            >
                              <input
                                type="radio"
                                name="printer-connection"
                                value={value}
                                checked={selectedPrinter === value}
                                onChange={() => setSelectedPrinter(value)}
                                className="mt-1 accent-purple-500"
                              />
                              <span>{label}</span>
                            </label>
                          ))}
                        </fieldset>

                        <p className="text-[10px] leading-5 text-slate-500">
                          لا تسمح المتصفحات باكتشاف الطابعات أو اختيارها برمجياً؛ ستحدد الطابعة الفعلية من نافذة النظام.
                        </p>
                      </div>
                    )}
                  </div>

                  {hasScannedPrinters && (
                    <button
                      type="button"
                      onClick={() => void handlePrint()}
                      disabled={printing || loading}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3.5 text-sm font-black leading-6 text-white shadow-xl shadow-purple-900/20 transition hover:from-purple-500 hover:to-indigo-500 disabled:cursor-wait disabled:opacity-60"
                    >
                      {printing ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Printer className="h-5 w-5" />
                      )}
                      {printing
                        ? "جاري تجهيز الطباعة..."
                        : "طباعة المستند عبر الطابعة المحددة الآن"}
                    </button>
                  )}
                  {hasScannedPrinters && (
                    <p className="text-center text-[10px] leading-5 text-slate-500">
                      ستُفتح نافذة الطباعة بالنوع والمقاس المحددين ({paperSize}، هامش 8 مم) لتأكيد الطابعة.
                    </p>
                  )}
                </aside>
              </div>

              <div className="flex min-h-[120px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/70 p-4 text-center sm:min-h-[150px]">
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
            </div>
          )}
        </section>

        <section className="grid gap-8 md:grid-cols-2">
          <div className="space-y-4">
            <h2 className="text-xl font-black text-white">طريقة طباعة الملف في 3 خطوات</h2>
            {[
              ["رفع الملف", "اسحب ملف PDF أو صورة إلى منطقة الرفع أو اختره من جهازك."],
              ["معاينة وضبط المقاس", "راجع المعاينة، واختر A4 أو Letter واتجاه الصورة عند الحاجة."],
              ["الاتصال بالطابعة والطباعة الفورية", "اضغط زر الطباعة واختر طابعة Wi-Fi أو AirPrint من قائمة النظام."],
            ].map(([title, description], index) => (
              <div
                key={title}
                className="flex gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 text-sm font-black text-purple-300">
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white">{title}</h3>
                  <p className="mt-1 text-xs leading-6 text-slate-400">{description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-black text-white">مزايا الطباعة أونلاين</h2>
            {[
              [Wifi, "الطباعة اللاسلكية عبر Wi-Fi", "استخدم الطابعات التي يعرضها نظام التشغيل عبر الشبكة أو AirPrint."],
              [Sparkles, "الحفاظ على جودة الألوان", "تعرض المعاينة صوراً واضحة، وتُرسل صفحات PDF المطبوعة بدقة مناسبة."],
              [FileText, "دعم PDF والصور", "اطبع ملفات PDF وصور JPG وPNG وWEBP من مكان واحد."],
              [ShieldCheck, "خصوصية دون رفع للسيرفر", "تتم قراءة الملف وتجهيز صفحات الطباعة داخل متصفحك ولا يُرفع إلى خادمنا."],
            ].map(([Icon, title, description]) => (
              <div
                key={String(title)}
                className="flex gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4"
              >
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-purple-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">{String(title)}</h3>
                  <p className="mt-1 text-xs leading-6 text-slate-400">{String(description)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="flex items-center gap-2 text-xl font-black text-white">
            <HelpCircle className="h-5 w-5 text-purple-400" />
            الأسئلة الشائعة حول طباعة PDF والصور
          </h2>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              ["هل تعمل الأداة مع طابعات Wi-Fi بدون تعريف؟", "تفتح الأداة نافذة الطباعة القياسية؛ يجب أن تكون الطابعة مُضافة أو مدعومة من نظام التشغيل أو المتصفح. لا تستطيع صفحة الويب تثبيت تعريفات الطابعة."],
              ["كيف أطبع من الجوال عبر AirPrint؟", "افتح الصفحة من متصفح يدعم الطباعة على جهازك، وجهّز الملف واضغط طباعة. اختر طابعة AirPrint المتاحة على الشبكة نفسها من قائمة النظام."],
              ["ما أحجام الورق المدعومة؟", "يمكنك اختيار A4 أو Letter من إعدادات الصفحة. تتوفر أيضاً إعدادات إضافية مثل الهوامش والنسخ من نافذة الطباعة نفسها."],
            ].map(([question, answer]) => (
              <article
                key={question}
                className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5"
              >
                <h3 className="text-sm font-bold leading-6 text-white">{question}</h3>
                <p className="mt-2 text-xs leading-6 text-slate-400">{answer}</p>
              </article>
            ))}
          </div>
        </section>

        <div className="flex items-center justify-center gap-2 pb-4 text-[11px] text-slate-500">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>ملفاتك تبقى على جهازك ولا يتم حفظها على الخادم</span>
        </div>
      </main>
    </div>
  );
}
