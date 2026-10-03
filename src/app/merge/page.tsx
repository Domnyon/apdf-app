"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Layers,
  ArrowRight,
  UploadCloud,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Check,
  CheckCircle2,
  Download,
  RotateCcw,
  Sparkles,
  Loader2,
  FileText,
} from "lucide-react";
import { PDFDocument } from "pdf-lib";

interface PdfItem {
  id: string;
  file: File;
  name: string;
  thumbnailUrl: string | null;
  pageCount: number;
}

export default function MergePage() {
  const [pdfList, setPdfList] = useState<PdfItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // شاشة التحميل والبانر الإعلاني
  const [downloadReady, setDownloadReady] = useState(false);
  const [finalDownloadUrl, setFinalDownloadUrl] = useState<string | null>(null);
  const [outputFileName, setOutputFileName] = useState("apdf_merged.pdf");

  // تحميل مكتبة pdf.js ديناميكياً لتوليد المعاينة المصغرة
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

  // توليد صورة مصغرة للصفحة الأولى من كل ملف
  const generateThumbnail = async (file: File): Promise<{ thumb: string | null; pages: number }> => {
    try {
      const pdfjsLib = await getPdfJs();
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        cMapUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/",
        cMapPacked: true,
      });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);

      const viewport = page.getViewport({ scale: 0.5 });
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: ctx, viewport }).promise;
      return { thumb: canvas.toDataURL("image/jpeg", 0.8), pages: pdf.numPages };
    } catch {
      return { thumb: null, pages: 1 };
    }
  };

  // رفع ملفات جديدة وإضافتها للقائمة
  const handleAddFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setProcessing(true);
    setStatusMsg("جاري تجهيز وتوليد المعاينة المصغرة...");

    try {
      const newItems: PdfItem[] = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) continue;

        const { thumb, pages } = await generateThumbnail(file);
        newItems.push({
          id: `${Date.now()}_${i}_${Math.random()}`,
          file,
          name: file.name,
          thumbnailUrl: thumb,
          pageCount: pages,
        });
      }

      // تم تصحيح الفرد هنا لتجاوز فحص TypeScript بدقة
      setPdfList((prev) => [...prev, ...newItems]);
    } catch (err) {
      console.error(err);
      setStatusMsg("حدث خطأ أثناء قراءة الملفات.");
    } finally {
      setProcessing(false);
      setStatusMsg(null);
    }
  };

  // تقديم الملف للأمام (للأعلى)
  const moveItemUp = (index: number) => {
    if (index === 0) return;
    setPdfList((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[index - 1];
      updated[index - 1] = temp;
      return updated;
    });
  };

  // تأخير الملف للخلف (للأسفل)
  const moveItemDown = (index: number) => {
    if (index === pdfList.length - 1) return;
    setPdfList((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[index + 1];
      updated[index + 1] = temp;
      return updated;
    });
  };

  // حذف ملف من القائمة
  const removeItem = (id: string) => {
    setPdfList((prev) => prev.filter((item) => item.id !== id));
  };

  // تنفيذ عملية الدمج والتوجيه لشاشة التحميل والإعلانات
  const handleMergePdfs = async () => {
    if (pdfList.length < 2) return;

    setProcessing(true);
    setStatusMsg("جاري دمج الملفات بالترتيب المختار...");

    try {
      const mergedPdf = await PDFDocument.create();

      for (const item of pdfList) {
        const fileBuffer = await item.file.arrayBuffer();
        const pdfToCopy = await PDFDocument.load(fileBuffer);
        const copiedPages = await mergedPdf.copyPages(pdfToCopy, pdfToCopy.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([mergedBytes as unknown as BlobPart], { type: "application/pdf" });
      const downloadUrl = URL.createObjectURL(blob);

      setFinalDownloadUrl(downloadUrl);
      setOutputFileName(`apdf_merged_${Date.now()}.pdf`);
      setDownloadReady(true);
    } catch (err) {
      console.error(err);
      setStatusMsg("فشل دمج الملفات. يرجى التأكد من سلامة ملفات الـ PDF.");
    } finally {
      setProcessing(false);
      setStatusMsg(null);
    }
  };

  const handleReset = () => {
    setPdfList([]);
    setDownloadReady(false);
    setFinalDownloadUrl(null);
  };

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
            <Layers className="w-4 h-4" />
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
            {/* 📢 مربع البانر الإعلاني الموحد (AdSense / Sponsor Area) */}
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
                <h2 className="text-xl sm:text-2xl font-black text-white">تم دمج ملفاتك بنجاح!</h2>
                <p className="text-xs sm:text-sm text-slate-400">
                  تم ترتيب ودمج {pdfList.length} ملفات PDF في مستند واحد عالي الجودة.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <a
                  href={finalDownloadUrl}
                  download={outputFileName}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
                >
                  <Download className="w-5 h-5" /> اضغط هنا لتحميل الملف المدمج (PDF)
                </a>

                <button
                  onClick={handleReset}
                  className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center gap-2 border border-slate-800 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> دمج ملفات أخرى
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* واجهة دمج الـ PDF */
          <div className="space-y-6">
            <div className="text-center space-y-2 max-w-lg mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" /> دمج سريع وفوري
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                دمج ملفات <span className="text-purple-400">PDF</span>
              </h1>
              <p className="text-slate-400 text-xs">
                ارفع الملفات، رتب تسلسلها بسهولة باللمس، وادمجها في ملف واحد.
              </p>
            </div>

            {/* الحالة الأولى: لم يتم رفع أي ملف بعد */}
            {pdfList.length === 0 && (
              <div className="max-w-md mx-auto pt-4">
                <label className="border-2 border-dashed border-slate-800 hover:border-purple-500/60 rounded-3xl p-10 flex flex-col items-center justify-center cursor-pointer transition bg-slate-950/60 text-center shadow-xl group">
                  <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3 group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <span className="text-sm font-bold text-white mb-1">
                    اضغط هنا لاختيار ملفات الـ PDF
                  </span>
                  <span className="text-[11px] text-slate-500">
                    يمكنك اختيار ملف واحد أو عدة ملفات دفعة واحدة
                  </span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,application/pdf"
                    onChange={handleAddFiles}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            {/* الحالة الثانية: تم رفع ملف أو أكثر ويظهر زر (+) والترتيب */}
            {pdfList.length > 0 && (
              <div className="space-y-5">
                {/* شريط الإجراءات والتحكم */}
                <div className="flex items-center justify-between gap-2 bg-slate-950/90 border border-slate-800 p-3 rounded-2xl backdrop-blur-md">
                  <div className="flex items-center gap-2">
                    {/* زر (+) لإضافة ملفات إضافية */}
                    <label className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white shadow-md cursor-pointer transition">
                      <Plus className="w-4 h-4" /> إضافة ملف آخر (+)
                      <input
                        type="file"
                        multiple
                        accept=".pdf,application/pdf"
                        onChange={handleAddFiles}
                        className="hidden"
                      />
                    </label>

                    <span className="text-[11px] text-slate-400 font-bold hidden sm:inline">
                      المجموع: {pdfList.length} ملفات
                    </span>
                  </div>

                  {/* زر الدمج الرئيسي */}
                  <button
                    onClick={handleMergePdfs}
                    disabled={pdfList.length < 2 || processing}
                    className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-slate-950 px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition"
                  >
                    <Check className="w-4 h-4" /> دمج الملفات الآن
                  </button>
                </div>

                {/* شبكة عرض الملفات بالصور المصغرة وأزرار التقديم والتأخير */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {pdfList.map((item, index) => (
                    <div
                      key={item.id}
                      className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 flex flex-col justify-between gap-3 shadow-lg relative group"
                    >
                      {/* ترقيم الملف بوضوح */}
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[11px] font-black">
                          الملف رقم {index + 1}
                        </span>

                        <span className="text-[10px] text-slate-500 font-semibold">
                          {item.pageCount} صفحة
                        </span>
                      </div>

                      {/* المعاينة المصغرة للمستند */}
                      <div className="w-full h-36 bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800 relative">
                        {item.thumbnailUrl ? (
                          <img
                            src={item.thumbnailUrl}
                            alt={item.name}
                            className="max-h-full max-w-full object-contain pointer-events-none"
                          />
                        ) : (
                          <FileText className="w-10 h-10 text-slate-600" />
                        )}
                      </div>

                      {/* اسم الملف */}
                      <p className="text-xs font-bold text-slate-200 truncate" title={item.name}>
                        {item.name}
                      </p>

                      {/* شريط التحكم: تقديم، تأخير، وحذف */}
                      <div className="flex items-center justify-between border-t border-slate-800 pt-2">
                        <div className="flex items-center gap-1">
                          {/* زر التقديم (للأعلى / لليمين) */}
                          <button
                            onClick={() => moveItemUp(index)}
                            disabled={index === 0}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-purple-600 disabled:opacity-20 text-white transition"
                            title="تقديم الملف"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>

                          {/* زر التأخير (للأسفل / لليسار) */}
                          <button
                            onClick={() => moveItemDown(index)}
                            disabled={index === pdfList.length - 1}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-purple-600 disabled:opacity-20 text-white transition"
                            title="تأخير الملف"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* زر حذف الملف */}
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition"
                          title="حذف الملف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
