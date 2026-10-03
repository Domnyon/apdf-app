"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  UploadCloud,
  FileText,
  FileImage,
  CheckCircle2,
  Download,
  RotateCcw,
  Sparkles,
  Loader2,
  FileArchive,
  ArrowLeftRight,
} from "lucide-react";
import { PDFDocument } from "pdf-lib";

interface UploadedAsset {
  file: File;
  name: string;
  type: "pdf" | "image";
  previewUrl: string;
  count: number;
  rawFiles?: File[];
}

export default function ConvertPage() {
  const [asset, setAsset] = useState<UploadedAsset | null>(null);
  const [processing, setProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // شاشة التحميل والبانر الإعلاني
  const [downloadReady, setDownloadReady] = useState(false);
  const [finalDownloadUrl, setFinalDownloadUrl] = useState<string | null>(null);
  const [outputFileName, setOutputFileName] = useState("apdf_converted");
  const [downloadNote, setDownloadNote] = useState("");

  // تحميل مكتبة pdf.js ديناميكياً
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

  // تحميل مكتبة JSZip لضغط الصور في مجلد ZIP
  const getJSZip = async (): Promise<any> => {
    if (typeof window === "undefined") return null;
    if ((window as any).JSZip) return (window as any).JSZip;

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
      script.onload = () => resolve((window as any).JSZip);
      script.onerror = () => reject(new Error("JSZip load error"));
      document.head.appendChild(script);
    });
  };

  // معالجة رفع الملف (PDF أو صورة)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setProcessing(true);
    setStatusMsg("جاري فحص وتجهيز الملف...");

    try {
      const firstFile = files[0];

      if (firstFile.type === "application/pdf" || firstFile.name.endsWith(".pdf")) {
        const pdfjsLib = await getPdfJs();
        const arrayBuffer = await firstFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({
          data: arrayBuffer,
          cMapUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/",
          cMapPacked: true,
        }).promise;

        // توليد صورة مصغرة للصفحة الأولى للعرض
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 0.5 });
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: ctx, viewport }).promise;
        const thumb = canvas.toDataURL("image/jpeg", 0.8);

        setAsset({
          file: firstFile,
          name: firstFile.name,
          type: "pdf",
          previewUrl: thumb,
          count: pdf.numPages,
        });
      } else {
        const rawFilesList = Array.from(files).filter((f) => f.type.startsWith("image/"));
        if (rawFilesList.length === 0) return;

        const firstPreview = URL.createObjectURL(rawFilesList[0]);
        setAsset({
          file: rawFilesList[0],
          name: rawFilesList.length === 1 ? rawFilesList[0].name : `${rawFilesList.length} صور مختارة`,
          type: "image",
          previewUrl: firstPreview,
          count: rawFilesList.length,
          rawFiles: rawFilesList,
        });
      }
    } catch (err) {
      console.error(err);
      setStatusMsg("حدث خطأ أثناء قراءة الملف.");
    } finally {
      setProcessing(false);
      setStatusMsg(null);
    }
  };

  // 1. تحويل الصور إلى ملف PDF
  const handleConvertToPdf = async () => {
    if (!asset) return;

    setProcessing(true);
    setStatusMsg("جاري إنشاء ملف الـ PDF...");

    try {
      if (asset.type === "pdf") {
        const url = URL.createObjectURL(asset.file);
        setFinalDownloadUrl(url);
        setOutputFileName(`apdf_${Date.now()}.pdf`);
        setDownloadNote("تم تجهيز ملف الـ PDF بنجاح.");
      } else {
        const pdfDoc = await PDFDocument.create();
        const imagesToProcess = asset.rawFiles || [asset.file];

        for (const imgFile of imagesToProcess) {
          const imgUrl = URL.createObjectURL(imgFile);
          const jpegBuffer = await convertImageToJpegBuffer(imgUrl);
          URL.revokeObjectURL(imgUrl);

          const embedded = await pdfDoc.embedJpg(jpegBuffer);
          const page = pdfDoc.addPage([embedded.width, embedded.height]);
          page.drawImage(embedded, {
            x: 0,
            y: 0,
            width: embedded.width,
            height: embedded.height,
          });
        }

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);

        setFinalDownloadUrl(url);
        setOutputFileName(`apdf_converted_${Date.now()}.pdf`);
        setDownloadNote(`تم تجميع ${imagesToProcess.length} صورة في ملف PDF واحد.`);
      }

      setDownloadReady(true);
    } catch (err) {
      console.error(err);
      setStatusMsg("حدث خطأ أثناء إنشاء ملف الـ PDF.");
    } finally {
      setProcessing(false);
      setStatusMsg(null);
    }
  };

  // 2. تحويل ملف PDF إلى صور متعددة وتجميعها في مجلد مضغوط ZIP
  const handleConvertToImages = async () => {
    if (!asset) return;

    setProcessing(true);
    setStatusMsg("جاري معالجة وتحويل الصفحات إلى صور...");

    try {
      if (asset.type === "pdf") {
        const pdfjsLib = await getPdfJs();
        const arrayBuffer = await asset.file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({
          data: arrayBuffer,
          cMapUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/",
          cMapPacked: true,
        }).promise;

        if (pdf.numPages === 1) {
          // صفحة واحدة فقط -> حفظها كصورة JPG مباشرة
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({ canvasContext: ctx, viewport }).promise;

          const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
          const blob = await fetch(dataUrl).then((r) => r.blob());
          const url = URL.createObjectURL(blob);

          setFinalDownloadUrl(url);
          setOutputFileName(`page_1_${Date.now()}.jpg`);
          setDownloadNote("تم تحويل صفحة الـ PDF إلى صورة JPG عالية الدقة.");
        } else {
          // ملف PDF متعدد الصفحات -> تحويل جميع الصفحات إلى صور وتجميعها في مجلد ZIP
          setStatusMsg(`جاري تحويل وتجميع ${pdf.numPages} صفحة في مجلد مضغوط...`);
          const JSZip = await getJSZip();
          const zip = new JSZip();

          for (let i = 1; i <= pdf.numPages; i++) {
            setStatusMsg(`جاري تحويل الصفحة ${i} من ${pdf.numPages} إلى صورة...`);
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await page.render({ canvasContext: ctx, viewport }).promise;

            const base64Data = canvas.toDataURL("image/jpeg", 0.92).split(",")[1];
            zip.file(`page_${i}.jpg`, base64Data, { base64: true });
          }

          setStatusMsg("جاري ضغط المجلد بصيغة ZIP...");
          const zipBlob = await zip.generateAsync({ type: "blob" });
          const url = URL.createObjectURL(zipBlob);

          setFinalDownloadUrl(url);
          setOutputFileName(`apdf_images_${Date.now()}.zip`);
          setDownloadNote(`تم تحويل كامل صفحات الـ PDF (${pdf.numPages} صفحات) إلى صور داخل مجلد مضغوط (ZIP).`);
        }
      } else {
        // إذا كان الملف المرفوع في الأصل صورة
        if (asset.count === 1) {
          const imgUrl = asset.previewUrl;
          const jpegBuffer = await convertImageToJpegBuffer(imgUrl);
          const blob = new Blob([jpegBuffer], { type: "image/jpeg" });
          const url = URL.createObjectURL(blob);

          setFinalDownloadUrl(url);
          setOutputFileName(`image_${Date.now()}.jpg`);
          setDownloadNote("تم تجهيز الصورة بصيغة JPG عالية الدقة.");
        } else {
          const JSZip = await getJSZip();
          const zip = new JSZip();
          const imagesToProcess = asset.rawFiles || [asset.file];

          for (let i = 0; i < imagesToProcess.length; i++) {
            const imgUrl = URL.createObjectURL(imagesToProcess[i]);
            const jpegBuffer = await convertImageToJpegBuffer(imgUrl);
            URL.revokeObjectURL(imgUrl);
            zip.file(`image_${i + 1}.jpg`, jpegBuffer);
          }

          const zipBlob = await zip.generateAsync({ type: "blob" });
          const url = URL.createObjectURL(zipBlob);

          setFinalDownloadUrl(url);
          setOutputFileName(`apdf_images_${Date.now()}.zip`);
          setDownloadNote(`تم تجميع ${imagesToProcess.length} صور في مجلد مضغوط (ZIP).`);
        }
      }

      setDownloadReady(true);
    } catch (err) {
      console.error(err);
      setStatusMsg("حدث خطأ أثناء تحويل وتجميع الصور.");
    } finally {
      setProcessing(false);
      setStatusMsg(null);
    }
  };

  const convertImageToJpegBuffer = async (url: string): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas error"));

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        canvas.toBlob(
          async (blob) => {
            if (blob) resolve(await blob.arrayBuffer());
            else reject(new Error("Blob error"));
          },
          "image/jpeg",
          0.92
        );
      };
      img.onerror = reject;
      img.src = url;
    });
  };

  const handleReset = () => {
    if (asset?.previewUrl && asset.type === "image") {
      URL.revokeObjectURL(asset.previewUrl);
    }
    setAsset(null);
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
            <ArrowLeftRight className="w-4 h-4" />
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
            {/* 📢 مربع البانر الإعلاني */}
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
                <h2 className="text-xl sm:text-2xl font-black text-white">تم التحويل بنجاح!</h2>
                <p className="text-xs sm:text-sm text-slate-400">{downloadNote}</p>
              </div>

              <div className="space-y-3 pt-2">
                <a
                  href={finalDownloadUrl}
                  download={outputFileName}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
                >
                  <Download className="w-5 h-5" /> اضغط هنا لتحميل {outputFileName.endsWith(".zip") ? "المجلد المضغوط (ZIP)" : outputFileName.endsWith(".pdf") ? "مستند الـ PDF" : "الصورة (JPG)"}
                </a>

                <button
                  onClick={handleReset}
                  className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center gap-2 border border-slate-800 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> تحويل ملف آخر
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* واجهة التحويل المركزية */
          <div className="space-y-6">
            <div className="text-center space-y-2 max-w-lg mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" /> تحويل فوري ودقيق
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                تحويل ملفات <span className="text-purple-400">PDF والصور</span>
              </h1>
              <p className="text-slate-400 text-xs">
                ارفع الملف، اختر صيغة التحويل، وحمّل النتيجة بضغطة زر واحدة.
              </p>
            </div>

            {/* 1. رفع الملف */}
            {!asset && (
              <div className="max-w-md mx-auto pt-4">
                <label className="border-2 border-dashed border-slate-800 hover:border-purple-500/60 rounded-3xl p-10 flex flex-col items-center justify-center cursor-pointer transition bg-slate-950/60 text-center shadow-xl group">
                  <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3 group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <span className="text-sm font-bold text-white mb-1">
                    اضغط هنا لاختيار ملف PDF أو صورة
                  </span>
                  <span className="text-[11px] text-slate-500">
                    يدعم ملفات PDF وصور JPG, PNG, WEBP
                  </span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,application/pdf,image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            {/* 2. عرض المعاينة وخيارات التحويل */}
            {asset && (
              <div className="max-w-md mx-auto space-y-5">
                <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                        {asset.type === "pdf" ? <FileText className="w-5 h-5" /> : <FileImage className="w-5 h-5" />}
                      </div>
                      <div className="text-right">
                        <h3 className="text-xs font-bold text-white max-w-[200px] truncate" title={asset.name}>
                          {asset.name}
                        </h3>
                        <span className="text-[10px] text-slate-400">
                          {asset.type === "pdf" ? `${asset.count} صفحات` : `${asset.count} صور`}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={handleReset}
                      className="text-slate-400 hover:text-rose-400 text-xs p-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50"
                      title="تغيير الملف"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* المعاينة المصغرة للملف المرفوع */}
                  <div className="w-full h-44 bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-800/80">
                    <img
                      src={asset.previewUrl}
                      alt="معاينة"
                      className="max-h-full max-w-full object-contain pointer-events-none"
                    />
                  </div>
                </div>

                {/* أزرار التحويل المباشرة */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-300 block text-center">
                    اختر نوع التحويل المطلوب:
                  </span>

                  {/* الزر الأول: تحويل إلى مستند PDF */}
                  <button
                    onClick={handleConvertToPdf}
                    disabled={processing}
                    className="w-full p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-purple-500/60 transition group flex items-center justify-between shadow-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-white block">تحويل الملف إلى مستند PDF</span>
                        <span className="text-[11px] text-slate-400">حفظ الملف بصيغة PDF واحدة جاهزة</span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-purple-400 transform rotate-180" />
                  </button>

                  {/* الزر الثاني: تحويل الملف إلى صور متعددة وتجميعها في مجلد مضغوط */}
                  <button
                    onClick={handleConvertToImages}
                    disabled={processing}
                    className="w-full p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/60 transition group flex items-center justify-between shadow-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                        <FileArchive className="w-5 h-5" />
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-white block">تحويل الملف إلى صور (مجلد مضغوط ZIP)</span>
                        <span className="text-[11px] text-slate-400">
                          {asset.type === "pdf" && asset.count > 1
                            ? `استخراج ${asset.count} صور ودمجها داخل مجلد ZIP`
                            : "استخراج الصور وتجميعها في مجلد مضغوط"}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-emerald-400 transform rotate-180" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
