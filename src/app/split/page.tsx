"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Scissors,
  ArrowRight,
  UploadCloud,
  Trash2,
  RotateCcw,
  Check,
  CheckCircle2,
  Download,
  Sparkles,
  Loader2,
  FileText,
  RotateCw,
} from "lucide-react";
import { PDFDocument } from "pdf-lib";

interface PagePreviewItem {
  pageIndex: number; // رقم الصفحة الفعلي بدءاً من 0
  pageNumber: number; // رقم الصفحة للعرض بدءاً من 1
  thumbnailUrl: string | null;
  isDeleted: boolean; // هل تم حذف الصفحة من قبل العميل
}

export default function SplitPage() {
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [pagesList, setPagesList] = useState<PagePreviewItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // شاشة التحميل والبانر الإعلاني
  const [downloadReady, setDownloadReady] = useState(false);
  const [finalDownloadUrl, setFinalDownloadUrl] = useState<string | null>(null);
  const [outputFileName, setOutputFileName] = useState("apdf_cut.pdf");

  // تحميل محرك pdf.js ديناميكياً
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

  // رفع الملف وقراءة واستخراج صور مصغرة لكافة الصفحات
  const handleUploadPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessing(true);
    setStatusMsg("جاري فحص المستند واستخراج الصفحات...");

    try {
      setOriginalFile(file);
      const pdfjsLib = await getPdfJs();
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        cMapUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/",
        cMapPacked: true,
      });
      const pdf = await loadingTask.promise;
      const count = pdf.numPages;

      const items: PagePreviewItem[] = [];

      for (let i = 1; i <= count; i++) {
        setStatusMsg(`جاري توليد معاينة الصفحة ${i} من ${count}...`);
        try {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 0.45 });
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({ canvasContext: ctx, viewport }).promise;
          const thumb = canvas.toDataURL("image/jpeg", 0.75);

          items.push({
            pageIndex: i - 1,
            pageNumber: i,
            thumbnailUrl: thumb,
            isDeleted: false,
          });
        } catch {
          items.push({
            pageIndex: i - 1,
            pageNumber: i,
            thumbnailUrl: null,
            isDeleted: false,
          });
        }
      }

      setPagesList(items);
    } catch (err) {
      console.error(err);
      setStatusMsg("حدث خطأ أثناء قراءة صفحات المستند.");
    } finally {
      setProcessing(false);
      setStatusMsg(null);
    }
  };

  // تبديل حالة حذف/استعادة الصفحة
  const toggleDeletePage = (index: number) => {
    setPagesList((prev) =>
      prev.map((p, idx) => (idx === index ? { ...p, isDeleted: !p.isDeleted } : p))
    );
  };

  // حفظ المستند بالصفحات المتبقية فقط
  const handleSaveTrimmedPdf = async () => {
    if (!originalFile) return;

    // الصفحات التي أبقاها العميل
    const pagesToKeep = pagesList.filter((p) => !p.isDeleted);

    if (pagesToKeep.length === 0) {
      alert("يرجى الإبقاء على صفحة واحدة على الأقل في المستند!");
      return;
    }

    setProcessing(true);
    setStatusMsg("جاري تجهيز وقص المستند بالصفحات المختارة...");

    try {
      const originalBytes = await originalFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(originalBytes);
      const newPdf = await PDFDocument.create();

      const pageIndicesToCopy = pagesToKeep.map((p) => p.pageIndex);
      const copiedPages = await newPdf.copyPages(pdfDoc, pageIndicesToCopy);
      copiedPages.forEach((page) => newPdf.addPage(page));

      const newPdfBytes = await newPdf.save();
      const blob = new Blob([newPdfBytes as unknown as BlobPart], { type: "application/pdf" });
      const downloadUrl = URL.createObjectURL(blob);

      setFinalDownloadUrl(downloadUrl);
      setOutputFileName(`apdf_cut_${Date.now()}.pdf`);
      setDownloadReady(true);
    } catch (err) {
      console.error(err);
      setStatusMsg("حدث خطأ أثناء بناء المستند الجديد.");
    } finally {
      setProcessing(false);
      setStatusMsg(null);
    }
  };

  const handleReset = () => {
    setOriginalFile(null);
    setPagesList([]);
    setDownloadReady(false);
    setFinalDownloadUrl(null);
  };

  const remainingPagesCount = pagesList.filter((p) => !p.isDeleted).length;

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 font-sans selection:bg-purple-500 selection:text-white relative" dir="rtl">
      <div className="absolute top-0 right-1/4 w-[500px] h-[350px] bg-purple-600/10 blur-[130px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="relative z-30 max-w-6xl mx-auto px-4 py-4 flex items-center justify-between border-b border-slate-900">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800"
        >
          <ArrowRight className="w-4 h-4" /> الرئيسية
        </Link>
        <div className="flex items-center gap-2">
          <span className="font-black text-lg tracking-tight text-white">
            apdf<span className="text-purple-400">.app</span>
          </span>
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
            <Scissors className="w-4 h-4" />
          </div>
        </div>
      </header>

      <main className="relative z-20 max-w-4xl mx-auto px-3 py-6">
        {processing && (
          <div className="fixed inset-0 z-50 bg-[#070b12]/80 backdrop-blur-md flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            <span className="text-sm font-bold text-white">{statusMsg || "جاري المعالجة..."}</span>
          </div>
        )}

        {/* 🌟 شاشة التحميل والبانر الإعلاني الموحدة 🌟 */}
        {downloadReady && finalDownloadUrl ? (
          <div className="max-w-xl mx-auto space-y-6 pt-2 animate-in fade-in zoom-in-95 duration-200">
            {/* 📢 مربع البانر الإعلاني الموحد */}
            <div className="w-full bg-slate-900/70 border border-dashed border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center text-center min-h-[120px] sm:min-h-[160px] relative overflow-hidden group">
              <span className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase mb-1">
                إعلان / Sponsored Ad
              </span>
              <div className="text-xs text-slate-400 flex flex-col items-center justify-center gap-1">
                <span className="font-bold text-slate-300">مساحة إعلانية جاهزة</span>
                <span className="text-[11px] text-slate-500">Google AdSense Responsive Banner</span>
              </div>
            </div>

            {/* بطاقة التهنئة وزر التحميل */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl relative">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <h2 className="text-xl sm:text-2xl font-black text-white">تم تجهيز المستند وقص الصفحات!</h2>
                <p className="text-xs sm:text-sm text-slate-400">
                  تم حذف الصفحات غير المرغوبة وحفظ المستند بعدد ({remainingPagesCount}) صفحة جاهزة للتحميل.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <a
                  href={finalDownloadUrl}
                  download={outputFileName}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
                >
                  <Download className="w-5 h-5" /> اضغط هنا لتحميل المستند الجديد (PDF)
                </a>

                <button
                  onClick={handleReset}
                  className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center gap-2 border border-slate-800 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> قص ملف آخر
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* واجهة قص الصفحات */
          <div className="space-y-6">
            <div className="text-center space-y-2 max-w-lg mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" /> قص وحذف الصفحات
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                قص واستخراج صفحات <span className="text-purple-400">PDF</span>
              </h1>
              <p className="text-slate-400 text-xs">
                اختر الملف، احذف الصفحات غير المرغوبة بلمسة واحدة، واحفظ المستند النهائي.
              </p>
            </div>

            {/* الحالة الأولى: لم يتم اختيار أي ملف بعد */}
            {pagesList.length === 0 && (
              <div className="max-w-md mx-auto pt-4">
                <label className="border-2 border-dashed border-slate-800 hover:border-purple-500/60 rounded-3xl p-10 flex flex-col items-center justify-center cursor-pointer transition bg-slate-950/60 text-center shadow-xl group">
                  <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3 group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <span className="text-sm font-bold text-white mb-1">
                    اضغط هنا لاختيار ملف الـ PDF
                  </span>
                  <span className="text-[11px] text-slate-500">
                    سيتم عرض جميع صفحات الملف لحذف ما تريد منها
                  </span>
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleUploadPdf}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            {/* الحالة الثانية: تم فتح الملف وتظهر كافة صفحاته المصغرة */}
            {pagesList.length > 0 && (
              <div className="space-y-5">
                {/* شريط الإجراءات والتحكم السريع */}
                <div className="flex items-center justify-between gap-2 bg-slate-950/90 border border-slate-800 p-3 rounded-2xl backdrop-blur-md">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleReset}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> اختيار ملف آخر
                    </button>

                    <span className="text-[11px] text-slate-400 font-bold hidden sm:inline">
                      المتبقي: <span className="text-emerald-400">{remainingPagesCount}</span> من أصل {pagesList.length} صفحة
                    </span>
                  </div>

                  {/* زر الحفظ النهائي */}
                  <button
                    onClick={handleSaveTrimmedPdf}
                    disabled={remainingPagesCount === 0 || processing}
                    className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-slate-950 px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition cursor-pointer"
                  >
                    <Check className="w-4 h-4" /> حفظ المستند الجديد ({remainingPagesCount})
                  </button>
                </div>

                {/* شبكة استعراض الصفحات بالصور المصغرة */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                  {pagesList.map((item, index) => (
                    <div
                      key={item.pageIndex}
                      onClick={() => toggleDeletePage(index)}
                      className={`rounded-2xl p-3 flex flex-col justify-between gap-2.5 shadow-lg relative cursor-pointer select-none transition-all ${
                        item.isDeleted
                          ? "bg-rose-950/20 border-2 border-dashed border-rose-500/40 opacity-45 grayscale"
                          : "bg-slate-900/90 border border-slate-800 hover:border-purple-500/60"
                      }`}
                    >
                      {/* رأس البطاقة مع الترقيم وزر الإجراء */}
                      <div className="flex items-center justify-between pb-1">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            item.isDeleted
                              ? "bg-rose-500/20 text-rose-400 line-through"
                              : "bg-purple-500/20 text-purple-400"
                          }`}
                        >
                          صفحة {item.pageNumber}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDeletePage(index);
                          }}
                          className={`p-1.5 rounded-lg text-xs font-bold transition ${
                            item.isDeleted
                              ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950"
                              : "bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white"
                          }`}
                          title={item.isDeleted ? "استعادة الصفحة" : "حذف الصفحة"}
                        >
                          {item.isDeleted ? (
                            <RotateCw className="w-3.5 h-3.5" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {/* المعاينة المصغرة للصفحة */}
                      <div className="w-full h-36 bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800/80 relative">
                        {item.thumbnailUrl ? (
                          <img
                            src={item.thumbnailUrl}
                            alt={`صفحة ${item.pageNumber}`}
                            className="max-h-full max-w-full object-contain pointer-events-none"
                          />
                        ) : (
                          <FileText className="w-10 h-10 text-slate-600" />
                        )}

                        {/* شريط توضيحي فوق الصفحة المحذوفة */}
                        {item.isDeleted && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <span className="text-[11px] font-black text-rose-400 bg-rose-950/80 px-2 py-1 rounded-md border border-rose-500/40">
                              تم الاستبعاد
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="text-center">
                        <span className="text-[10px] text-slate-400">
                          {item.isDeleted ? "اضغط للاستعادة" : "اضغط للحذف"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
