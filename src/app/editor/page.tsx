"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import {
  FileSignature,
  ArrowRight,
  UploadCloud,
  FileText,
  Files,
  Type,
  PenTool,
  Image as ImageIcon,
  RotateCcw,
  Check,
  Sparkles,
  Trash2,
  Loader2,
  Bold,
  Italic,
  AlignRight,
  AlignCenter,
  AlignLeft,
  Plus,
} from "lucide-react";
import { PDFDocument } from "pdf-lib";

interface CanvasItem {
  id: string;
  type: "text" | "image";
  content: string;
  x: number; // إحداثيات بالنسبة للصورة المعروضة
  y: number;
  size: number;
  color?: string;
  weight?: string;
  isItalic?: boolean;
  align?: "right" | "center" | "left";
}

export default function EditorPage() {
  const [mode, setMode] = useState<"single" | "multi" | null>(null);

  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [selectedPageIndex, setSelectedPageIndex] = useState<number>(0);

  const [activePageImage, setActivePageImage] = useState<string | null>(null);
  const [items, setItems] = useState<CanvasItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<"signature" | "stamp" | null>(null);

  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewImgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const [processing, setProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const selectedItem = items.find((it) => it.id === selectedItemId);

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
          reject(new Error("تعذر تحميل محرك العرض"));
        }
      };
      script.onerror = () => reject(new Error("فشل الاتصال بسكربت العرض"));
      document.head.appendChild(script);
    });
  };

  const renderPdfPageToImage = async (file: File, pageNum: number): Promise<string> => {
    const pdfjsLib = await getPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      cMapUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/",
      cMapPacked: true,
    });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(pageNum);

    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;
    return canvas.toDataURL("image/png");
  };

  const handleSingleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessing(true);
    setStatusMsg("جاري تحميل ومعالجة المستند...");

    try {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () => {
          setActivePageImage(reader.result as string);
          setItems([]);
          setProcessing(false);
          setStatusMsg(null);
        };
        reader.readAsDataURL(file);
      } else {
        setOriginalFile(file);
        const imgData = await renderPdfPageToImage(file, 1);
        setActivePageImage(imgData);
        setItems([]);
      }
    } catch (err) {
      console.error(err);
      setStatusMsg("حدث خطأ أثناء قراءة الملف. يرجى تجربة ملف آخر.");
    } finally {
      setProcessing(false);
    }
  };

  const handleMultiUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessing(true);
    setStatusMsg("جاري قراءة صفحات المستند...");

    try {
      setOriginalFile(file);
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      setTotalPages(pdfDoc.getPageCount());
    } catch (err) {
      console.error(err);
      setStatusMsg("فشل فتح الملف. تأكد أنه ملف PDF سليم.");
    } finally {
      setProcessing(false);
      setStatusMsg(null);
    }
  };

  const choosePageToEdit = async (pageIdx: number) => {
    if (!originalFile) return;
    setProcessing(true);
    setSelectedPageIndex(pageIdx);
    setStatusMsg(`جاري تجهيز الصفحة رقم ${pageIdx + 1}...`);

    try {
      const imgData = await renderPdfPageToImage(originalFile, pageIdx + 1);
      setActivePageImage(imgData);
      setItems([]);
    } catch (err) {
      console.error(err);
      setStatusMsg("تعذر عرض هذه الصفحة.");
    } finally {
      setProcessing(false);
      setStatusMsg(null);
    }
  };

  // إضافة نص مباشر بدون أي حدود
  const addNewTextDirectly = () => {
    const newItem: CanvasItem = {
      id: Date.now().toString(),
      type: "text",
      content: "اكتب النص هنا...",
      x: 50,
      y: 50,
      size: 24,
      color: "#000000",
      weight: "bold",
      isItalic: false,
      align: "right",
    };
    setItems((prev) => [...prev, newItem]);
    setSelectedItemId(newItem.id);
  };

  const updateSelectedItem = (updates: Partial<CanvasItem>) => {
    if (!selectedItemId) return;
    setItems((prev) =>
      prev.map((it) => (it.id === selectedItemId ? { ...it, ...updates } : it))
    );
  };

  const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const newItem: CanvasItem = {
        id: Date.now().toString(),
        type: "image",
        content: reader.result as string,
        x: 60,
        y: 60,
        size: 140,
      };
      setItems((prev) => [...prev, newItem]);
      setSelectedItemId(newItem.id);
      setActiveTool(null);
    };
    reader.readAsDataURL(file);
  };

  const saveSignature = () => {
    if (!sigCanvasRef.current) return;
    const dataUrl = sigCanvasRef.current.toDataURL("image/png");
    const newItem: CanvasItem = {
      id: Date.now().toString(),
      type: "image",
      content: dataUrl,
      x: 60,
      y: 80,
      size: 160,
    };
    setItems((prev) => [...prev, newItem]);
    setSelectedItemId(newItem.id);
    setActiveTool(null);
  };

  // دمج التعديلات مع تثبيت الموضع بنسبة 100% بالملي
  const renderComposedImage = async (): Promise<string> => {
    return new Promise((resolve) => {
      const bgImg = new Image();
      bgImg.src = activePageImage!;
      bgImg.onload = async () => {
        const offscreen = document.createElement("canvas");
        const naturalW = bgImg.naturalWidth || bgImg.width;
        const naturalH = bgImg.naturalHeight || bgImg.height;

        offscreen.width = naturalW;
        offscreen.height = naturalH;
        const ctx = offscreen.getContext("2d")!;

        ctx.drawImage(bgImg, 0, 0);

        const displayW = previewImgRef.current?.clientWidth || naturalW;
        const displayH = previewImgRef.current?.clientHeight || naturalH;
        const scaleX = naturalW / displayW;
        const scaleY = naturalH / displayH;

        for (const itm of items) {
          const targetX = itm.x * scaleX;
          const targetY = itm.y * scaleY;
          const targetSize = itm.size * scaleX;

          if (itm.type === "text") {
            const fontStyle = itm.isItalic ? "italic" : "normal";
            const fontWeightVal = itm.weight || "bold";
            ctx.font = `${fontStyle} ${fontWeightVal} ${targetSize}px 'Cairo', sans-serif`;
            ctx.fillStyle = itm.color || "#000000";
            ctx.textBaseline = "top";
            ctx.textAlign = "right"; // دائماً يمين لثبات الإحداثيات العربية

            ctx.fillText(itm.content, targetX, targetY);
          } else if (itm.type === "image") {
            const img = new Image();
            img.src = itm.content;
            await new Promise((r) => {
              img.onload = () => {
                const ratio = img.height / img.width;
                ctx.drawImage(img, targetX, targetY, targetSize, targetSize * ratio);
                r(null);
              };
            });
          }
        }
        resolve(offscreen.toDataURL("image/png"));
      };
    });
  };

  const handleCommitEdit = async () => {
    setProcessing(true);
    setStatusMsg("جاري حفظ التعديلات في نفس الموضع المختار تماماً...");

    try {
      const editedDataUrl = await renderComposedImage();
      let finalBlob: Blob;

      if (mode === "single" || !originalFile) {
        const newPdf = await PDFDocument.create();
        const imgBytes = await fetch(editedDataUrl).then((res) => res.arrayBuffer());
        const embedded = await newPdf.embedPng(imgBytes);
        const page = newPdf.addPage([embedded.width, embedded.height]);
        page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height });

        const bytes = await newPdf.save();
        finalBlob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
      } else {
        const originalBytes = await originalFile.arrayBuffer();
        const pdfDoc = await PDFDocument.load(originalBytes);
        const imgBytes = await fetch(editedDataUrl).then((res) => res.arrayBuffer());
        const embedded = await pdfDoc.embedPng(imgBytes);

        const targetIdx = selectedPageIndex;
        const targetPage = pdfDoc.getPage(targetIdx);
        const { width, height } = targetPage.getSize();

        const newPage = pdfDoc.insertPage(targetIdx, [width, height]);
        newPage.drawImage(embedded, { x: 0, y: 0, width, height });
        pdfDoc.removePage(targetIdx + 1);

        const updatedBytes = await pdfDoc.save();
        finalBlob = new Blob([updatedBytes as unknown as BlobPart], { type: "application/pdf" });
      }

      const downloadLink = URL.createObjectURL(finalBlob);
      const a = document.createElement("a");
      a.href = downloadLink;
      a.download = `apdf_edited_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setActivePageImage(null);
      setSelectedItemId(null);
    } catch (err) {
      console.error(err);
      setStatusMsg("حدث خطأ أثناء حفظ المستند.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 font-sans selection:bg-purple-500 selection:text-white relative" dir="rtl">
      <div className="absolute top-0 right-1/4 w-[500px] h-[350px] bg-purple-600/10 blur-[130px] rounded-full pointer-events-none" />

      {/* الهيدر */}
      <header className="relative z-30 max-w-6xl mx-auto px-6 py-6 flex items-center justify-between border-b border-slate-900">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800"
        >
          <ArrowRight className="w-4 h-4" /> العودة للرئيسية
        </Link>
        <div className="flex items-center gap-2.5">
          <span className="font-extrabold text-xl tracking-tight text-white">
            apdf<span className="text-purple-400">.app</span>
          </span>
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
            <FileSignature className="w-4 h-4" />
          </div>
        </div>
      </header>

      <main className="relative z-20 max-w-5xl mx-auto px-4 py-8">
        {processing && (
          <div className="fixed inset-0 z-50 bg-[#070b12]/80 backdrop-blur-md flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            <span className="text-sm font-bold text-white">{statusMsg || "جاري المعالجة..."}</span>
          </div>
        )}

        {/* 1. اختيار المسار */}
        {!mode && (
          <div className="max-w-2xl mx-auto text-center space-y-8 pt-8">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" /> محرر تفاعلي ذكي
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-white">
                كتابة، توقيع، <span className="text-purple-400">وختم المستندات</span>
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm">
                اختر نوع المستند الذي ترغب في تعديله وتوقيعه بسهولة وسرعة:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-right">
              <button
                onClick={() => setMode("single")}
                className="p-6 rounded-[24px] bg-slate-950/80 border border-slate-800 hover:border-purple-500/60 transition group hover:shadow-[0_0_30px_rgba(168,85,247,0.15)] flex flex-col justify-between h-[200px]"
              >
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white mb-1">مستند أو صورة (صفحة 1)</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    تعديل فوري وسريع على شهادة، فاتورة، أو مستند من صفحة واحدة.
                  </p>
                </div>
              </button>

              <button
                onClick={() => setMode("multi")}
                className="p-6 rounded-[24px] bg-slate-950/80 border border-slate-800 hover:border-emerald-500/60 transition group hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] flex flex-col justify-between h-[200px]"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                  <Files className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white mb-1">مستند متعدد الصفحات</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    استعراض جميع الصفحات واختيار أي صفحة لتوقيعها واستبدالها تلقائياً.
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* 2. رفع الملف */}
        {mode && !activePageImage && totalPages === 0 && (
          <div className="max-w-xl mx-auto space-y-6 pt-6">
            <button
              onClick={() => {
                setMode(null);
                setOriginalFile(null);
              }}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> تغيير نوع المستند
            </button>

            <label className="border-2 border-dashed border-slate-800 hover:border-purple-500/60 rounded-[28px] p-12 flex flex-col items-center justify-center cursor-pointer transition bg-slate-950/60 text-center shadow-xl group">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
                <UploadCloud className="w-8 h-8" />
              </div>
              <span className="text-base font-bold text-white mb-1">
                {mode === "single" ? "اختر صورة أو ملف PDF صفحة واحدة" : "اختر ملف PDF متعدد الصفحات"}
              </span>
              <span className="text-xs text-slate-500">يتم تحميل ومعالجة الملف فورياً على جهازك</span>
              <input
                type="file"
                accept={mode === "single" ? ".pdf,image/*" : ".pdf"}
                onChange={mode === "single" ? handleSingleUpload : handleMultiUpload}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* 3. شاشة اختيار الصفحة للمستند المتعدد */}
        {mode === "multi" && !activePageImage && totalPages > 0 && (
          <div className="space-y-6">
            <div className="bg-slate-950/70 border border-slate-800 p-5 rounded-2xl">
              <h2 className="text-base font-bold text-white">صفحات المستند ({totalPages} صفحة)</h2>
              <p className="text-xs text-slate-400">اضغط على رقم الصفحة التي ترغب بتوقيعها أو تعديلها:</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => choosePageToEdit(i)}
                  className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-purple-500 hover:bg-purple-950/20 transition flex flex-col items-center justify-center gap-2 group"
                >
                  <FileText className="w-8 h-8 text-slate-500 group-hover:text-purple-400 transition" />
                  <span className="text-sm font-bold text-slate-200">صفحة {i + 1}</span>
                  <span className="text-[11px] text-purple-400 opacity-0 group-hover:opacity-100 transition">
                    اضغط للتعديل
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 4. مساحة التعديل والكانفاس مع الكتابة المباشرة بدون أي حدود */}
        {activePageImage && (
          <div className="space-y-5">
            {/* شريط الإجراءات الرئيسي */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/90 border border-slate-800 p-4 rounded-2xl backdrop-blur-md">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={addNewTextDirectly}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border bg-purple-600 hover:bg-purple-500 text-white transition shadow-lg shadow-purple-600/20"
                >
                  <Plus className="w-4 h-4" /> إضافة نص على الصفحة
                </button>

                <button
                  onClick={() => setActiveTool(activeTool === "signature" ? null : "signature")}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition ${
                    activeTool === "signature"
                      ? "bg-purple-500 text-slate-950 border-purple-400"
                      : "bg-slate-900 text-slate-300 border-slate-800 hover:border-purple-500/50"
                  }`}
                >
                  <PenTool className="w-4 h-4" /> رسم توقيع
                </button>

                <label className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border bg-slate-900 text-slate-300 border-slate-800 hover:border-purple-500/50 cursor-pointer transition">
                  <ImageIcon className="w-4 h-4" /> إضافة ختم / صورة
                  <input type="file" accept="image/*" onChange={handleStampUpload} className="hidden" />
                </label>
              </div>

              {/* زر الحفظ */}
              <button
                onClick={handleCommitEdit}
                disabled={processing}
                className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-slate-950 px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer"
              >
                <Check className="w-4 h-4" />
                حفظ وتحميل المستند (PDF)
              </button>
            </div>

            {/* شريط المؤثرات للنص المختار */}
            {selectedItem && selectedItem.type === "text" && (
              <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-wrap items-center gap-3">
                <span className="text-xs font-bold text-purple-400 flex items-center gap-1">
                  <Type className="w-3.5 h-3.5" /> تنسيق النص:
                </span>

                <input
                  type="color"
                  value={selectedItem.color || "#000000"}
                  onChange={(e) => updateSelectedItem({ color: e.target.value })}
                  className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                  title="لون الخط"
                />

                <select
                  value={selectedItem.size}
                  onChange={(e) => updateSelectedItem({ size: Number(e.target.value) })}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white"
                >
                  <option value={16}>16px</option>
                  <option value={20}>20px</option>
                  <option value={24}>24px</option>
                  <option value={30}>30px</option>
                  <option value={36}>36px</option>
                  <option value={48}>48px</option>
                  <option value={60}>60px</option>
                </select>

                <div className="flex border border-slate-700 rounded-xl overflow-hidden bg-slate-950">
                  <button
                    type="button"
                    onClick={() => updateSelectedItem({ weight: "normal" })}
                    className={`px-2.5 py-1 text-xs font-semibold ${selectedItem.weight === "normal" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"}`}
                  >
                    عادي
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSelectedItem({ weight: "bold" })}
                    className={`px-2.5 py-1 text-xs font-bold ${selectedItem.weight === "bold" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"}`}
                  >
                    <Bold className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSelectedItem({ weight: "900" })}
                    className={`px-2.5 py-1 text-xs font-black ${selectedItem.weight === "900" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"}`}
                  >
                    عريض+
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => updateSelectedItem({ isItalic: !selectedItem.isItalic })}
                  className={`p-1.5 border border-slate-700 rounded-xl ${selectedItem.isItalic ? "bg-purple-600 text-white" : "bg-slate-950 text-slate-400 hover:text-white"}`}
                  title="مائل"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>

                <div className="flex border border-slate-700 rounded-xl overflow-hidden bg-slate-950">
                  <button
                    type="button"
                    onClick={() => updateSelectedItem({ align: "right" })}
                    className={`p-1.5 ${selectedItem.align === "right" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"}`}
                  >
                    <AlignRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSelectedItem({ align: "center" })}
                    className={`p-1.5 ${selectedItem.align === "center" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"}`}
                  >
                    <AlignCenter className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSelectedItem({ align: "left" })}
                    className={`p-1.5 ${selectedItem.align === "left" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"}`}
                  >
                    <AlignLeft className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => {
                    setItems((prev) => prev.filter((i) => i.id !== selectedItem.id));
                    setSelectedItemId(null);
                  }}
                  className="mr-auto text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 bg-rose-500/10 px-2.5 py-1.5 rounded-xl border border-rose-500/20"
                >
                  <Trash2 className="w-3.5 h-3.5" /> حذف النص
                </button>
              </div>
            )}

            {/* لوحة التوقيع الحي */}
            {activeTool === "signature" && (
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                <span className="text-xs font-bold text-slate-300">ارسم توقيعك في المساحة أدناه:</span>
                <canvas
                  ref={sigCanvasRef}
                  width={400}
                  height={150}
                  onMouseDown={(e) => {
                    const ctx = sigCanvasRef.current?.getContext("2d");
                    if (!ctx) return;
                    setIsDrawing(true);
                    ctx.beginPath();
                    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
                  }}
                  onMouseMove={(e) => {
                    if (!isDrawing) return;
                    const ctx = sigCanvasRef.current?.getContext("2d");
                    if (!ctx) return;
                    ctx.strokeStyle = "#000000";
                    ctx.lineWidth = 2.5;
                    ctx.lineCap = "round";
                    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
                    ctx.stroke();
                  }}
                  onMouseUp={() => setIsDrawing(false)}
                  className="bg-white border border-slate-700 rounded-xl cursor-crosshair w-full max-w-[400px]"
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveSignature}
                    className="bg-purple-500 hover:bg-purple-600 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold"
                  >
                    اعتماد التوقيع
                  </button>
                  <button
                    onClick={() => {
                      const ctx = sigCanvasRef.current?.getContext("2d");
                      ctx?.clearRect(0, 0, 400, 150);
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs"
                  >
                    مسح
                  </button>
                </div>
              </div>
            )}

            {/* مساحة الكانفاس والكتابة بدون أي حدود نهائياً */}
            <div
              onClick={() => setSelectedItemId(null)}
              className="relative border border-slate-800 rounded-2xl overflow-hidden bg-slate-950 flex justify-center items-center p-4 min-h-[500px]"
            >
              <div
                ref={containerRef}
                className="relative inline-block select-none shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <img
                  ref={previewImgRef}
                  src={activePageImage}
                  alt="الصفحة للتعديل"
                  className="max-w-full max-h-[75vh] block rounded-lg pointer-events-none"
                />

                {items.map((item) => {
                  const isSelected = selectedItemId === item.id;
                  return (
                    <div
                      key={item.id}
                      style={{ left: `${item.x}px`, top: `${item.y}px` }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedItemId(item.id);
                      }}
                      // لا توجد أي حدود ملونة أو بنفسجية إطلاقاً
                      className="absolute bg-transparent rounded select-none cursor-move group"
                      onMouseDown={(e) => {
                        if ((e.target as HTMLElement).tagName === "INPUT") return;
                        setSelectedItemId(item.id);

                        const startX = e.clientX - item.x;
                        const startY = e.clientY - item.y;

                        const onMove = (moveEv: MouseEvent) => {
                          setItems((prev) =>
                            prev.map((it) =>
                              it.id === item.id
                                ? { ...it, x: moveEv.clientX - startX, y: moveEv.clientY - startY }
                                : it
                            )
                          );
                        };

                        const onUp = () => {
                          window.removeEventListener("mousemove", onMove);
                          window.removeEventListener("mouseup", onUp);
                        };

                        window.addEventListener("mousemove", onMove);
                        window.addEventListener("mouseup", onUp);
                      }}
                    >
                      {item.type === "text" ? (
                        <input
                          type="text"
                          value={item.content}
                          onChange={(e) =>
                            setItems((prev) =>
                              prev.map((it) =>
                                it.id === item.id ? { ...it, content: e.target.value } : it
                              )
                            )
                          }
                          style={{
                            fontSize: `${item.size}px`,
                            color: item.color,
                            fontWeight: item.weight || "bold",
                            fontStyle: item.isItalic ? "italic" : "normal",
                            textAlign: item.align || "right",
                            width: `${Math.max(120, item.content.length * (item.size * 0.72))}px`,
                          }}
                          // خلفية شفافة وبدون أي بوردر أو أوتلاين
                          className="bg-transparent border-0 outline-none p-0 m-0 leading-none cursor-text shadow-none"
                        />
                      ) : (
                        <img
                          src={item.content}
                          alt="عنصر"
                          style={{ width: `${item.size}px` }}
                          className="pointer-events-none block"
                        />
                      )}

                      {/* مقبض تغيير الحجم يظهر فقط عند الوقوف على العنصر */}
                      <div
                        className="absolute -bottom-2 -left-2 w-3.5 h-3.5 bg-white/80 hover:bg-white rounded-full border border-black cursor-nwse-resize shadow opacity-0 group-hover:opacity-100 transition"
                        title="اسحب لتغيير الحجم"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          const startX = e.clientX;
                          const initialSize = item.size;

                          const onResize = (moveEv: MouseEvent) => {
                            const delta = startX - moveEv.clientX;
                            const newSize = Math.max(14, Math.min(600, initialSize + delta));
                            setItems((prev) =>
                              prev.map((it) => (it.id === item.id ? { ...it, size: newSize } : it))
                            );
                          };

                          const onResizeEnd = () => {
                            window.removeEventListener("mousemove", onResize);
                            window.removeEventListener("mouseup", onResizeEnd);
                          };

                          window.addEventListener("mousemove", onResize);
                          window.addEventListener("mouseup", onResizeEnd);
                        }}
                      />

                      {/* زر الحذف السريع */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setItems((prev) => prev.filter((i) => i.id !== item.id));
                          if (selectedItemId === item.id) setSelectedItemId(null);
                        }}
                        className="absolute -top-3 -right-3 w-4 h-4 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
