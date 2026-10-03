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
  X,
} from "lucide-react";
import { PDFDocument } from "pdf-lib";

interface CanvasItem {
  id: string;
  type: "text" | "image";
  content: string;
  percentX: number;
  percentY: number;
  color?: string;
  sizePx: number;
}

export default function EditorPage() {
  const [mode, setMode] = useState<"single" | "multi" | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [selectedPageIndex, setSelectedPageIndex] = useState<number>(0);

  const [activePageImage, setActivePageImage] = useState<string | null>(null);
  const [items, setItems] = useState<CanvasItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // نافذة إدخال النص للجوال
  const [showTextInputModal, setShowTextInputModal] = useState(false);
  const [rawText, setRawText] = useState("");
  const [selectedColor, setSelectedColor] = useState("#000000");

  const [activeTool, setActiveTool] = useState<"signature" | "stamp" | null>(null);
  const previewWrapperRef = useRef<HTMLDivElement | null>(null);
  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const [processing, setProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

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
    setStatusMsg("جاري تجهيز المستند...");

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
    } catch {
      setStatusMsg("حدث خطأ أثناء قراءة الملف.");
    } finally {
      setProcessing(false);
    }
  };

  const handleMultiUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessing(true);
    setStatusMsg("جاري فحص المستند...");

    try {
      setOriginalFile(file);
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      setTotalPages(pdfDoc.getPageCount());
    } catch {
      setStatusMsg("ملف غير صالح.");
    } finally {
      setProcessing(false);
      setStatusMsg(null);
    }
  };

  const choosePageToEdit = async (pageIdx: number) => {
    if (!originalFile) return;
    setProcessing(true);
    setSelectedPageIndex(pageIdx);
    setStatusMsg(`جاري إعداد الصفحة ${pageIdx + 1}...`);

    try {
      const imgData = await renderPdfPageToImage(originalFile, pageIdx + 1);
      setActivePageImage(imgData);
      setItems([]);
    } catch {
      setStatusMsg("تعذر فتح الصفحة.");
    } finally {
      setProcessing(false);
      setStatusMsg(null);
    }
  };

  // تأكيد إدراج النص بعد كتابته واختيار لونه
  const handleConfirmTextInsert = () => {
    if (!rawText.trim()) return;

    const newItem: CanvasItem = {
      id: Date.now().toString(),
      type: "text",
      content: rawText,
      percentX: 0.3,
      percentY: 0.4,
      sizePx: 22,
      color: selectedColor,
    };

    setItems((prev) => [...prev, newItem]);
    setSelectedItemId(newItem.id);
    setRawText("");
    setShowTextInputModal(false);
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
        percentX: 0.35,
        percentY: 0.4,
        sizePx: 120,
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
      percentX: 0.35,
      percentY: 0.5,
      sizePx: 130,
    };
    setItems((prev) => [...prev, newItem]);
    setSelectedItemId(newItem.id);
    setActiveTool(null);
  };

  // دمج التعديلات وطباعتها بنسب مئوية دقيقة
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

        const displayW = previewWrapperRef.current?.clientWidth || naturalW;
        const scaleMultiplier = naturalW / displayW;

        for (const itm of items) {
          const exactX = itm.percentX * naturalW;
          const exactY = itm.percentY * naturalH;
          const exactSize = itm.sizePx * scaleMultiplier;

          if (itm.type === "text") {
            ctx.font = `bold ${exactSize}px 'Cairo', sans-serif`;
            ctx.fillStyle = itm.color || "#000000";
            ctx.textBaseline = "top";
            ctx.textAlign = "left";

            ctx.fillText(itm.content, exactX, exactY);
          } else if (itm.type === "image") {
            const img = new Image();
            img.src = itm.content;
            await new Promise((r) => {
              img.onload = () => {
                const ratio = img.height / img.width;
                ctx.drawImage(img, exactX, exactY, exactSize, exactSize * ratio);
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
    setStatusMsg("جاري حفظ التعديلات بدقة...");

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
      a.download = `apdf_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setActivePageImage(null);
      setSelectedItemId(null);
    } catch {
      setStatusMsg("حدث خطأ أثناء حفظ الملف.");
    } finally {
      setProcessing(false);
    }
  };

  // دالة موحدة لتحريك العناصر باللمس والماوس معاً
  const handleStartMove = (
    clientX: number,
    clientY: number,
    itemId: string,
    initialPercentX: number,
    initialPercentY: number
  ) => {
    setSelectedItemId(itemId);
    const container = previewWrapperRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const startX = clientX;
    const startY = clientY;

    const moveHandler = (moveX: number, moveY: number) => {
      const deltaX = moveX - startX;
      const deltaY = moveY - startY;

      const newPercentX = Math.max(0, Math.min(0.92, initialPercentX + deltaX / rect.width));
      const newPercentY = Math.max(0, Math.min(0.95, initialPercentY + deltaY / rect.height));

      setItems((prev) =>
        prev.map((it) =>
          it.id === itemId
            ? { ...it, percentX: newPercentX, percentY: newPercentY }
            : it
        )
      );
    };

    const onMouseMove = (moveEv: MouseEvent) => moveHandler(moveEv.clientX, moveEv.clientY);
    const onTouchMove = (touchEv: TouchEvent) => {
      if (touchEv.touches.length > 0) {
        moveHandler(touchEv.touches[0].clientX, touchEv.touches[0].clientY);
      }
    };

    const cleanup = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", cleanup);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", cleanup);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", cleanup);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", cleanup);
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
            <FileSignature className="w-4 h-4" />
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

        {/* 1. اختيار المسار */}
        {!mode && (
          <div className="max-w-xl mx-auto text-center space-y-6 pt-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" /> محرر الجوال السريع
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                تعديل وتوقيع <span className="text-purple-400">المستندات</span>
              </h1>
              <p className="text-slate-400 text-xs">
                اختر نوع المستند للبدء:
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-right">
              <button
                onClick={() => setMode("single")}
                className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-purple-500/60 transition flex flex-col justify-between h-[160px]"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white mb-0.5">صفحة واحدة أو صورة</h3>
                  <p className="text-[11px] text-slate-400">تعديل فوري على شهادة أو فاتورة</p>
                </div>
              </button>

              <button
                onClick={() => setMode("multi")}
                className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-emerald-500/60 transition flex flex-col justify-between h-[160px]"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Files className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white mb-0.5">مستند متعدد الصفحات</h3>
                  <p className="text-[11px] text-slate-400">اختيار صفحة محددة لتعديلها واستبدالها</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* 2. رفع الملف */}
        {mode && !activePageImage && totalPages === 0 && (
          <div className="max-w-md mx-auto space-y-4 pt-4">
            <button
              onClick={() => {
                setMode(null);
                setOriginalFile(null);
              }}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" /> تغيير نوع المستند
            </button>

            <label className="border-2 border-dashed border-slate-800 hover:border-purple-500/60 rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition bg-slate-950/60 text-center shadow-xl group">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3">
                <UploadCloud className="w-7 h-7" />
              </div>
              <span className="text-sm font-bold text-white mb-1">
                {mode === "single" ? "اختر صورة أو ملف PDF" : "اختر ملف PDF متعدد الصفحات"}
              </span>
              <span className="text-[11px] text-slate-500">من ألبوم الصور أو ملفات الجهاز</span>
              <input
                type="file"
                accept={mode === "single" ? ".pdf,image/*" : ".pdf"}
                onChange={mode === "single" ? handleSingleUpload : handleMultiUpload}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* 3. شبكة الصفحات */}
        {mode === "multi" && !activePageImage && totalPages > 0 && (
          <div className="space-y-4">
            <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl">
              <h2 className="text-sm font-bold text-white">صفحات المستند ({totalPages})</h2>
              <p className="text-[11px] text-slate-400">المس أي صفحة لبدء الكتابة والتوقيع عليها:</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => choosePageToEdit(i)}
                  className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-purple-500 transition flex flex-col items-center justify-center gap-1.5"
                >
                  <FileText className="w-6 h-6 text-slate-500" />
                  <span className="text-xs font-bold text-slate-200">صفحة {i + 1}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 4. مساحة التعديل المخصصة للجوال */}
        {activePageImage && (
          <div className="space-y-4">
            {/* شريط الإجراءات العلوي السريع */}
            <div className="flex items-center justify-between gap-2 bg-slate-950/90 border border-slate-800 p-2.5 rounded-2xl backdrop-blur-md">
              <div className="flex items-center gap-1.5">
                {/* زر كتابة نص فوري */}
                <button
                  onClick={() => setShowTextInputModal(true)}
                  className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 bg-purple-600 hover:bg-purple-500 text-white shadow-md transition"
                >
                  <Type className="w-3.5 h-3.5" /> كتابة نص
                </button>

                <button
                  onClick={() => setActiveTool(activeTool === "signature" ? null : "signature")}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 border transition ${
                    activeTool === "signature"
                      ? "bg-purple-500 text-slate-950 border-purple-400"
                      : "bg-slate-900 text-slate-300 border-slate-800"
                  }`}
                >
                  <PenTool className="w-3.5 h-3.5" /> توقيع
                </button>

                <label className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 border bg-slate-900 text-slate-300 border-slate-800 cursor-pointer">
                  <ImageIcon className="w-3.5 h-3.5" /> ختم
                  <input type="file" accept="image/*" onChange={handleStampUpload} className="hidden" />
                </label>
              </div>

              {/* زر الحفظ المباشر */}
              <button
                onClick={handleCommitEdit}
                disabled={processing}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1 shadow-lg shadow-emerald-500/20"
              >
                <Check className="w-3.5 h-3.5" /> حفظ PDF
              </button>
            </div>

            {/* نافذة الجوال المنبثقة لكتابة النص واختيار لونه */}
            {showTextInputModal && (
              <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl p-5 space-y-4 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Type className="w-4 h-4 text-purple-400" /> اكتب النص المطلوب:
                    </span>
                    <button
                      onClick={() => setShowTextInputModal(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <input
                    type="text"
                    autoFocus
                    placeholder="اكتب اسمك، ملاحظة، أو تاريخ..."
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 text-right"
                  />

                  {/* اختيار اللون السريع بلمسة واحدة */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-400">لون الكتابة:</span>
                    <div className="flex items-center gap-2">
                      {[
                        { color: "#000000", label: "أسود" },
                        { color: "#1e40af", label: "أزرق" },
                        { color: "#b91c1c", label: "أحمر" },
                        { color: "#ffffff", label: "أبيض" },
                      ].map((c) => (
                        <button
                          key={c.color}
                          type="button"
                          onClick={() => setSelectedColor(c.color)}
                          style={{ backgroundColor: c.color }}
                          className={`w-8 h-8 rounded-full border-2 transition ${
                            selectedColor === c.color ? "border-purple-400 scale-110 shadow-md" : "border-slate-600"
                          }`}
                          title={c.label}
                        />
                      ))}
                      <input
                        type="color"
                        value={selectedColor}
                        onChange={(e) => setSelectedColor(e.target.value)}
                        className="w-8 h-8 rounded-full cursor-pointer bg-transparent border-0"
                        title="لون مخصص"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleConfirmTextInsert}
                    disabled={!rawText.trim()}
                    className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold py-2.5 rounded-xl text-xs transition"
                  >
                    إدراج النص على المستند
                  </button>
                </div>
              </div>
            )}

            {/* لوحة التوقيع */}
            {activeTool === "signature" && (
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
                <span className="text-xs font-bold text-slate-300">ارسم توقيعك بإصبعك أدناه:</span>
                <canvas
                  ref={sigCanvasRef}
                  width={350}
                  height={130}
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
                  onTouchStart={(e) => {
                    const canvas = sigCanvasRef.current;
                    if (!canvas) return;
                    const rect = canvas.getBoundingClientRect();
                    const touch = e.touches[0];
                    const ctx = canvas.getContext("2d");
                    if (!ctx) return;
                    setIsDrawing(true);
                    ctx.beginPath();
                    ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
                  }}
                  onTouchMove={(e) => {
                    if (!isDrawing) return;
                    const canvas = sigCanvasRef.current;
                    if (!canvas) return;
                    const rect = canvas.getBoundingClientRect();
                    const touch = e.touches[0];
                    const ctx = canvas.getContext("2d");
                    if (!ctx) return;
                    ctx.strokeStyle = "#000000";
                    ctx.lineWidth = 2.5;
                    ctx.lineCap = "round";
                    ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
                    ctx.stroke();
                  }}
                  onTouchEnd={() => setIsDrawing(false)}
                  className="bg-white border border-slate-700 rounded-xl cursor-crosshair w-full max-w-[350px] touch-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveSignature}
                    className="bg-purple-500 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold"
                  >
                    اعتماد
                  </button>
                  <button
                    onClick={() => {
                      const ctx = sigCanvasRef.current?.getContext("2d");
                      ctx?.clearRect(0, 0, 350, 130);
                    }}
                    className="bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg text-xs"
                  >
                    مسح
                  </button>
                </div>
              </div>
            )}

            {/* مساحة المستند بنظام التتش والتحريك باللمس الحر بدون حدود */}
            <div
              onClick={() => setSelectedItemId(null)}
              className="relative border border-slate-800 rounded-2xl overflow-hidden bg-slate-950 flex justify-center items-center p-2 min-h-[450px]"
            >
              <div
                ref={previewWrapperRef}
                style={{ direction: "ltr" }}
                className="relative inline-block select-none shadow-2xl"
              >
                <img
                  src={activePageImage}
                  alt="الصفحة"
                  className="max-w-full max-h-[75vh] block rounded-lg pointer-events-none"
                />

                {items.map((item) => {
                  const isSelected = selectedItemId === item.id;
                  return (
                    <div
                      key={item.id}
                      style={{
                        left: `${item.percentX * 100}%`,
                        top: `${item.percentY * 100}%`,
                        position: "absolute",
                        touchAction: "none",
                      }}
                      className="cursor-move select-none active:scale-105 transition-transform"
                      // السحب بالماوس
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        handleStartMove(e.clientX, e.clientY, item.id, item.percentX, item.percentY);
                      }}
                      // السحب باللمس على الجوال
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        if (e.touches.length > 0) {
                          handleStartMove(
                            e.touches[0].clientX,
                            e.touches[0].clientY,
                            item.id,
                            item.percentX,
                            item.percentY
                          );
                        }
                      }}
                    >
                      {item.type === "text" ? (
                        <span
                          style={{
                            fontSize: `${item.sizePx}px`,
                            color: item.color || "#000000",
                          }}
                          className="font-black whitespace-nowrap block leading-tight px-1 drop-shadow-sm select-none"
                        >
                          {item.content}
                        </span>
                      ) : (
                        <img
                          src={item.content}
                          alt="عنصر"
                          style={{ width: `${item.sizePx}px` }}
                          className="pointer-events-none block"
                        />
                      )}

                      {/* زر الحذف السريع بلمسة واحدة */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setItems((prev) => prev.filter((i) => i.id !== item.id));
                        }}
                        className="absolute -top-3 -right-3 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow"
                      >
                        <Trash2 className="w-3 h-3" />
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
