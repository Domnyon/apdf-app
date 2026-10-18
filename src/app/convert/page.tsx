"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  RefreshCw,
  ArrowRight,
  UploadCloud,
  FileImage,
  FileText,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  Zap,
  HelpCircle,
  Loader2,
  Sparkles,
  Download,
  Trash2,
  ArrowLeftRight,
} from "lucide-react";
import { PDFDocument } from "pdf-lib";

type ConvertDirection = "img-to-pdf" | "pdf-to-img";

interface ImageFileItem {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
}

export default function ConvertPage() {
  const [direction, setDirection] = useState<ConvertDirection>("img-to-pdf");
  const [selectedImages, setSelectedImages] = useState<ImageFileItem[]>([]);
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null);

  const [processing, setProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // شاشة النتيجة النهائية
  const [downloadReady, setDownloadReady] = useState(false);
  const [outputDownloadUrl, setOutputDownloadUrl] = useState<string | null>(null);
  const [outputFileName, setOutputFileName] = useState<string>("apdf_converted");
  const [isPdfOutput, setIsPdfOutput] = useState<boolean>(true);

  // تحميل مكتبة pdf.js في المتصفح فقط عند الحاجة
  const getPdfJs = async (): Promise<any> => {
    if (typeof window === "undefined") return null;
    if ((window as any).pdfjsLib) return (window as any).pdfjsLib;

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.onload = () => {
        const lib = (window as any).pdfjsLib;
        if (lib) {
          lib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
          resolve(lib);
        } else {
          reject(new Error("PDF engine error"));
        }
      };
      script.onerror = () => reject(new Error("CDN load error"));
      document.head.appendChild(script);
    });
  };

  // رفع الصور
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files).filter((f) => f.type.startsWith("image/"));
    const newItems: ImageFileItem[] = files.map((f) => ({
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      file: f,
      previewUrl: URL.createObjectURL(f),
      name: f.name,
    }));
    setSelectedImages((prev) => [...prev, ...newItems]);
    e.target.value = "";
  };

  const removeImage = (id: string) => {
    setSelectedImages((prev) => prev.filter((img) => img.id !== id));
  };

  // رفع الـ PDF
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"))) {
      setSelectedPdf(file);
    }
    e.target.value = "";
  };

  // تنفيذ تحويل الصور إلى PDF
  const convertImagesToPdf = async () => {
    if (selectedImages.length === 0) return;
    setProcessing(true);
    setStatusMsg("جاري تجميع الصور وإنشاء ملف PDF...");

    try {
      const pdfDoc = await PDFDocument.create();

      for (const item of selectedImages) {
        const arrayBuffer = await item.file.arrayBuffer();
        let embeddedImage;

        if (item.file.type === "image/png") {
          embeddedImage = await pdfDoc.embedPng(arrayBuffer);
        } else {
          // محاولة معالجة كـ JPG أولاً
          try {
            embeddedImage = await pdfDoc.embedJpg(arrayBuffer);
          } catch {
            // تحويل عبر Canvas إذا كانت الصيغة WebP أو نوع آخر
            const imgDataUrl = await new Promise<string>((resolve) => {
              const img = new Image();
              img.src = item.previewUrl;
              img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.naturalWidth || img.width;
                canvas.height = img.naturalHeight || img.height;
                const ctx = canvas.getContext("2d")!;
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL("image/jpeg", 0.95));
              };
            });
            const convertedBytes = await fetch(imgDataUrl).then((r) => r.arrayBuffer());
            embeddedImage = await pdfDoc.embedJpg(convertedBytes);
          }
        }

        const page = pdfDoc.addPage([embeddedImage.width, embeddedImage.height]);
        page.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: embeddedImage.width,
          height: embeddedImage.height,
        });
      }

      const pdfBytes = await pdfDoc.save();
      const finalBlob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
      const downloadUrl = URL.createObjectURL(finalBlob);

      setOutputDownloadUrl(downloadUrl);
      setOutputFileName(`images_to_pdf_${Date.now()}.pdf`);
      setIsPdfOutput(true);
      setDownloadReady(true);
    } catch {
      setStatusMsg("حدث خطأ أثناء تحويل الصور. يرجى تجربة صور أخرى.");
    } finally {
      setProcessing(false);
    }
  };

  // تنفيذ تحويل صفحة الـ PDF الأولى إلى صورة PNG
  const convertPdfToImages = async () => {
    if (!selectedPdf) return;
    setProcessing(true);
    setStatusMsg("جاري معالجة صفحات المستند واستخراج الصور...");

    try {
      const pdfjsLib = await getPdfJs();
      const arrayBuffer = await selectedPdf.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        cMapUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/",
        cMapPacked: true,
      });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);

      const viewport = page.getViewport({ scale: 2.0 });
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: ctx, viewport }).promise;
      const imgDataUrl = canvas.toDataURL("image/png");

      setOutputDownloadUrl(imgDataUrl);
      setOutputFileName(`pdf_page_1_${Date.now()}.png`);
      setIsPdfOutput(false);
      setDownloadReady(true);
    } catch {
      setStatusMsg("تعذر استخراج الصور من الملف.");
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setDownloadReady(false);
    setOutputDownloadUrl(null);
    setSelectedImages([]);
    setSelectedPdf(null);
  };

  return (
    <div
      className="min-h-screen bg-[#070b12] text-slate-100 font-sans selection:bg-purple-500 selection:text-white relative flex flex-col justify-between"
      dir="rtl"
    >
      <div className="absolute top-0 right-1/4 w-[500px] h-[350px] bg-purple-600/10 blur-[130px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="relative z-30 max-w-6xl mx-auto w-full px-4 py-4 flex items-center justify-between border-b border-slate-900">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800"
        >
          <ArrowRight className="w-4 h-4" />
          <span>الرئيسية</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="font-black text-lg tracking-tight text-white">
            apdf<span className="text-purple-400">.app</span>
          </span>
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
            <RefreshCw className="w-4 h-4" />
          </div>
        </div>
      </header>

      <main className="relative z-20 max-w-4xl mx-auto px-3 py-6 flex-1 w-full space-y-12">
        {processing && (
          <div className="fixed inset-0 z-50 bg-[#070b12]/80 backdrop-blur-md flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            <span className="text-sm font-bold text-white">{statusMsg || "جاري المعالجة..."}</span>
          </div>
        )}

        {/* شاشة التحميل والبانر الإعلاني عند الانتهاء */}
        {downloadReady && outputDownloadUrl ? (
          <div className="max-w-xl mx-auto space-y-6 pt-2 animate-in fade-in zoom-in-95 duration-200">
            {/* البانر الإعلاني */}
            <div className="w-full bg-slate-900/70 border border-dashed border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center text-center min-h-[120px] sm:min-h-[160px] relative overflow-hidden group">
              <span className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase mb-1">
                إعلان / Sponsored Ad
              </span>
              <div className="text-xs text-slate-400 flex flex-col items-center justify-center gap-1">
                <span className="font-bold text-slate-300">مساحة إعلانية جاهزة</span>
                <span className="text-[11px] text-slate-500">Google AdSense Responsive Banner</span>
              </div>
            </div>

            {/* بطاقة النتيجة وزر التحميل */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl relative">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <h2 className="text-xl sm:text-2xl font-black text-white">تم التحويل بنجاح!</h2>
                <p className="text-xs sm:text-sm text-slate-400">
                  {isPdfOutput
                    ? "تم تجميع الصور داخل ملف PDF عالي الجودة وجاهز للتحميل."
                    : "تم استخراج صفحات المستند كصور عالية الوضوح."}
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <a
                  href={outputDownloadUrl}
                  download={outputFileName}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
                >
                  <Download className="w-5 h-5" />
                  <span>تحميل الملف ({isPdfOutput ? "PDF" : "PNG"})</span>
                </a>

                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center gap-2 border border-slate-800 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>تحويل ملف آخر</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* واجهة الأداة الرئيسية */
          <div className="space-y-8">
            <div className="max-w-xl mx-auto text-center space-y-2 pt-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>تحويل فوري فائق السرعة</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                تحويل ملفات <span className="text-purple-400">PDF والصور</span>
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm">
                حوّل صورك إلى مستندات PDF منسقة أو استخرج صفحات PDF كصور واضحة بضغطة زر.
              </p>
            </div>

            {/* محول الاتجاه: من صورة إلى PDF أو العكس */}
            <div className="max-w-md mx-auto flex bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 gap-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setDirection("img-to-pdf");
                  handleReset();
                }}
                className={`flex-1 py-2.5 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition ${
                  direction === "img-to-pdf"
                    ? "bg-purple-600 text-white shadow-lg"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <FileImage className="w-4 h-4" />
                <span>تحويل صور إلى PDF</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setDirection("pdf-to-img");
                  handleReset();
                }}
                className={`flex-1 py-2.5 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition ${
                  direction === "pdf-to-img"
                    ? "bg-purple-600 text-white shadow-lg"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>تحويل PDF إلى صور</span>
              </button>
            </div>

            {/* مسار: تحويل الصور إلى PDF */}
            {direction === "img-to-pdf" && (
              <div className="max-w-2xl mx-auto space-y-6">
                <label className="border-2 border-dashed border-slate-800 hover:border-purple-500/60 rounded-3xl p-10 flex flex-col items-center justify-center cursor-pointer transition bg-slate-950/60 text-center shadow-xl group">
                  <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3 group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <span className="text-sm font-bold text-white mb-1">
                    اضغط لاختيار الصور (JPG, PNG, WebP)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    يمكنك تحديد عدة صور لدمجها في ملف PDF واحد
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>

                {selectedImages.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs px-1">
                      <span className="font-bold text-slate-300">
                        الصور المحددة ({selectedImages.length}):
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedImages([])}
                        className="text-rose-400 hover:text-rose-300 font-bold"
                      >
                        مسح الكل
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {selectedImages.map((img, idx) => (
                        <div
                          key={img.id}
                          className="relative group rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 aspect-square flex flex-col items-center justify-center"
                        >
                          <img
                            src={img.previewUrl}
                            alt={img.name}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute top-2 right-2 w-5 h-5 rounded-md bg-black/70 text-[10px] font-bold text-white flex items-center justify-center backdrop-blur-sm">
                            {idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeImage(img.id)}
                            className="absolute top-2 left-2 p-1.5 rounded-lg bg-rose-500/80 text-white hover:bg-rose-500 opacity-0 group-hover:opacity-100 transition"
                            title="حذف الصورة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={convertImagesToPdf}
                      disabled={processing}
                      className="w-full py-4 px-6 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-purple-600/20 active:scale-[0.99] transition-all"
                    >
                      <ArrowLeftRight className="w-4 h-4" />
                      <span>تحويل الصور إلى ملف PDF الآن</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* مسار: تحويل PDF إلى صور */}
            {direction === "pdf-to-img" && (
              <div className="max-w-2xl mx-auto space-y-6">
                {!selectedPdf ? (
                  <label className="border-2 border-dashed border-slate-800 hover:border-purple-500/60 rounded-3xl p-10 flex flex-col items-center justify-center cursor-pointer transition bg-slate-950/60 text-center shadow-xl group">
                    <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3 group-hover:scale-110 transition-transform">
                      <UploadCloud className="w-7 h-7" />
                    </div>
                    <span className="text-sm font-bold text-white mb-1">
                      اضغط لاختيار ملف PDF
                    </span>
                    <span className="text-[11px] text-slate-500">لاستخراج صفحاته كصور واضحة</span>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handlePdfUpload}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-purple-400" />
                        <span className="font-bold text-white">{selectedPdf.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedPdf(null)}
                        className="text-slate-400 hover:text-rose-400 flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>تغيير الملف</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={convertPdfToImages}
                      disabled={processing}
                      className="w-full py-4 px-6 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-purple-600/20 active:scale-[0.99] transition-all"
                    >
                      <FileText className="w-4 h-4" />
                      <span>استخراج أول صفحة كصورة PNG</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* محتوى السيو الشامل ودليل الاستخدام والأسئلة الشائعة */}
        <section className="space-y-8 pt-8 border-t border-slate-900 text-xs sm:text-sm leading-relaxed text-slate-300">
          <div className="space-y-4">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>كيفية تحويل PDF والصور بسرعة وسهولة</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="bg-slate-950/60 border border-slate-900 rounded-2xl p-4 space-y-2">
                <span className="text-xs font-black px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">
                  1. اختر النوع
                </span>
                <h3 className="font-bold text-white text-xs sm:text-sm">اختر الاتجاه المناسب</h3>
                <p className="text-slate-400 text-xs">
                  يمكنك تحويل الصور إلى PDF أو استخراج صور من ملف PDF بنقرة واحدة داخل واجهة سهلة الاستخدام.
                </p>
              </div>
              <div className="bg-slate-950/60 border border-slate-900 rounded-2xl p-4 space-y-2">
                <span className="text-xs font-black px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">
                  2. أضف الملفات
                </span>
                <h3 className="font-bold text-white text-xs sm:text-sm">حدد الصور أو PDF</h3>
                <p className="text-slate-400 text-xs">
                  قم بتحميل عدد من الصور أو ملف PDF واحد، ثم تابع إلى مرحلة التجميع أو الاستخراج مباشرة.
                </p>
              </div>
              <div className="bg-slate-950/60 border border-slate-900 rounded-2xl p-4 space-y-2">
                <span className="text-xs font-black px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">
                  3. حمل النتيجة
                </span>
                <h3 className="font-bold text-white text-xs sm:text-sm">تحميل الملف النهائي</h3>
                <p className="text-slate-400 text-xs">
                  عند انتهائك، سيظهر زر تحميل مباشر، مع نسخة PDF أو PNG جاهزة للاستعمال على الفور.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-950/50 border border-slate-900 rounded-2xl p-5 space-y-4">
            <h2 className="text-base font-bold text-white">مميزات أداة تحويل PDF والصور من apdf.app</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white">أمان كامل وخصوصية تامة</h4>
                  <p className="text-slate-400">
                    تتم المعالجة داخل المتصفح فقط، دون إرسال ملفاتك إلى خوادم خارجية أو حفظها خارج الجلسة الحالية.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Zap className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white">سرعة عالية وجودة قوية</h4>
                  <p className="text-slate-400">
                    تقليل وقت التحويل مع الحفاظ على جودة الصور والملفات المولدة، حتى عند التعامل مع ملفات متعددة.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-purple-400" />
              أسئلة شائعة حول التحويل
            </h2>
            <div className="space-y-2">
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-900 space-y-1">
                <h3 className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> هل يمكن تحويل عدة صور إلى PDF مرة واحدة؟
                </h3>
                <p className="text-slate-400 text-xs pr-5">
                  نعم، يمكنك اختيار العديد من الصور وتضمينها في ملف PDF واحد، مع الاحتفاظ بترتيبها كما تم اختيارها.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-900 space-y-1">
                <h3 className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> هل يمكن استخراج صورة من داخل PDF؟
                </h3>
                <p className="text-slate-400 text-xs pr-5">
                  نعم، يمكنك اختيار ملف PDF ومن ثم استخراج الصّفحة الأولى أو عرضها كصورة PNG عالية الدقة مباشرة.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-900 space-y-1">
                <h3 className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> هل ستبقى الجودة عالية بعد التحويل؟
                </h3>
                <p className="text-slate-400 text-xs pr-5">
                  نعم، الأداة تحافظ على جودة الصور والملفات المولدة، وتستخدم تحويلات دقيقة دون فقدان كبير في الوضوح.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
