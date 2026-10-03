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
  Download,
  RotateCcw,
  Check,
  Sparkles,
  Trash2,
} from "lucide-react";
import { PDFDocument } from "pdf-lib";

interface CanvasItem {
  id: string;
  type: "text" | "image";
  content: string; // نص أو Base64 للصورة/التوقيع
  x: number;
  y: number;
  size: number;
  color?: string;
}

export default function EditorPage() {
  const [mode, setMode] = useState<"single" | "multi" | null>(null);

  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [pdfDocProxy, setPdfDocProxy] = useState<any>(null);
  const [pageThumbnails, setPageThumbnails] = useState<string[]>([]);
  const [selectedPageIndex, setSelectedPageIndex] = useState<number | null>(null);

  const [activePageImage, setActivePageImage] = useState<string | null>(null);

  const [items, setItems] = useState<CanvasItem[]>([]);
  const [activeTool, setActiveTool] = useState<"text" | "signature" | "stamp" | null>(null);

  const [textInput, setTextInput] = useState("");
  const [textColor, setTextColor] = useState("#ffffff");
  const [textSize, setTextSize] = useState(24);

  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // تحميل صفحات الـ PDF كصور مصغرة
  const loadPdfThumbnails = async (file: File) => {
    setProcessing(true);
    try {
      const pdfjsLib = await import("pdfjs-dist/build/pdf.min.mjs" as any);
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

      const arrayBuffer = await file.arrayBuffer();
      const loadedPdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setPdfDocProxy(loadedPdf);

      const thumbs: string[] = [];
      for (let i = 1; i <= loadedPdf.numPages; i++) {
        const page = await loadedPdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.5 });
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: ctx, viewport }).promise;
        thumbs.push(canvas.toDataURL("image/jpeg"));
      }
      setPageThumbnails(thumbs);
    } catch (err) {
      console.error("فشل قراءة صفحات PDF:", err);
    } finally {
      setProcessing(false);
    }
  };

  // فتح صفحة محددة داخل الكانفاس
  const openPageInEditor = async (pageIdx: number) => {
    setSelectedPageIndex(pageIdx);
    setProcessing(true);
    try {
      const page = await pdfDocProxy.getPage(pageIdx + 1);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: ctx, viewport }).promise;
      setActivePageImage(canvas.toDataURL("image/jpeg"));
      setItems([]);
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  // رفع صفحة واحدة أو صورة
  const handleSingleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        setActivePageImage(reader.result as string);
        setItems([]);
      };
      reader.readAsDataURL(file);
    } else if (file.type === "application/pdf") {
      setOriginalFile(file);
      loadPdfThumbnails(file).then(() => {
        openPageInEditor(0);
      });
    }
  };

  // رفع ملف متعدد الصفحات
  const handleMultiUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOriginalFile(file);
    loadPdfThumbnails(file);
  };

  // إضافة نص
  const addTextItem = () => {
    if (!textInput.trim()) return;
    setItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        type: "text",
        content: textInput,
        x: 60,
        y: 80,
        size: textSize,
        color: textColor,
      },
    ]);
    setTextInput("");
    setActiveTool(null);
  };

  // رفع ختم أو صورة
  const handleStampUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setItems((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          type: "image",
          content: reader.result as string,
          x: 60,
          y: 60,
          size: 140,
        },
      ]);
      setActiveTool(null);
    };
    reader.readAsDataURL(file);
  };

  // حفظ التوقيع اليدوي
  const saveSignature = () => {
    if (!sigCanvasRef.current) return;
    const dataUrl = sigCanvasRef.current.toDataURL("image/png");
    setItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        type: "image",
        content: dataUrl,
        x: 60,
        y: 120,
        size: 160,
      },
    ]);
    setActiveTool(null);
  };

  // دمج التعديلات وتوليد الصورة النهائية
  const renderComposedImage = async (): Promise<string> => {
    return new Promise((resolve) => {
      const bgImg = new Image();
      bgImg.src = activePageImage!;
      bgImg.onload = async () => {
        const offscreen = document.createElement("canvas");
        offscreen.width = bgImg.width;
        offscreen.height = bgImg.height;
        const ctx = offscreen.getContext("2d")!;

        ctx.drawImage(bgImg, 0, 0);

        for (const itm of items) {
          if (itm.type === "text") {
            ctx.font = `${itm.size}px Cairo, sans-serif`;
            ctx.fillStyle = itm.color || "#ffffff";
            ctx.fillText(itm.content, itm.x, itm.y);
          } else if (itm.type === "image") {
            const img = new Image();
            img.src = itm.content;
            await new Promise((r) => {
              img.onload = () => {
                ctx.drawImage(img, itm.x, itm.y, itm.size, (img.height / img.width) * itm.size);
                r(null);
              };
            });
          }
        }
        resolve(offscreen.toDataURL("image/jpeg", 0.95));
      };
    });
  };

  // اعتماد التعديل واستبدال الصفحة
  const handleCommitEdit = async () => {
    setProcessing(true);
    try {
      const editedDataUrl = await renderComposedImage();

      if (mode === "single" || !originalFile) {
        const newPdf = await PDFDocument.create();
        const imgBytes = await fetch(editedDataUrl).then((res) => res.arrayBuffer());
        const embedded = await newPdf.embedJpg(imgBytes);
        const page = newPdf.addPage([embedded.width, embedded.height]);
        page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height });

        const bytes = await newPdf.save();
        const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
        setDownloadUrl(URL.createObjectURL(blob));
        setActivePageImage(null);
        return;
      }

      const originalBytes = await originalFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(originalBytes);
      const imgBytes = await fetch(editedDataUrl).then((res) => res.arrayBuffer());
      const embedded = await pdfDoc.embedJpg(imgBytes);

      const targetIdx = selectedPageIndex ?? 0;
      const targetPage = pdfDoc.getPage(targetIdx);
      const { width, height } = targetPage.getSize();

      const newPage = pdfDoc.insertPage(targetIdx, [width, height]);
      newPage.drawImage(embedded, { x: 0, y: 0, width, height });
      pdfDoc.removePage(targetIdx + 1);

      const updatedBytes = await pdfDoc.save();
      const blob = new Blob([updatedBytes as unknown as BlobPart], { type: "application/pdf" });
      setDownloadUrl(URL.createObjectURL(blob));

      const updatedThumbs = [...pageThumbnails];
      updatedThumbs[targetIdx] = editedDataUrl;
      setPageThumbnails(updatedThumbs);
      setActivePageImage(null);
    } catch (err) {
      console.error("فشل استبدال الصفحة وحفظ الملف:", err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 font-sans selection:bg-purple-500 selection:text-white relative" dir="rtl">
      <div className="absolute top-0 right-1/4 w-[500px] h-[350px] bg-purple-600/10 blur-[130px] rounded-full pointer-events-none" />

      {/* الهيدر العلوي */}
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
        {/* اختيار المسار */}
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

        {/* رفع الملف */}
        {mode && !activePageImage && pageThumbnails.length === 0 && (
          <div className="max-w-xl mx-auto space-y-6 pt-6">
            <button
              onClick={() => setMode(null)}
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

        {/* شبكة عرض الصفحات */}
        {mode === "multi" && !activePageImage && pageThumbnails.length > 0 && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-950/70 border border-slate-800 p-5 rounded-2xl">
              <div>
                <h2 className="text-base font-bold text-white">صفحات المستند ({pageThumbnails.length})</h2>
                <p className="text-xs text-slate-400">اضغط على أي صفحة للدخول للمحرر وتوقيعها أو ختمها</p>
              </div>

              {downloadUrl && (
                <a
                  href={downloadUrl}
                  download="apdf_edited_full.pdf"
                  className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-5 py-3 rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-500/20"
                >
                  <Download className="w-4 h-4" /> تحميل المستند المكتمل كاملاً
                </a>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {pageThumbnails.map((thumb, idx) => (
                <div
                  key={idx}
                  onClick={() => openPageInEditor(idx)}
                  className="relative group cursor-pointer bg-slate-900 border border-slate-800 hover:border-purple-500 rounded-2xl overflow-hidden p-2 transition flex flex-col items-center"
                >
                  <img src={thumb} alt={`صفحة ${idx + 1}`} className="w-full h-auto rounded-lg shadow-md" />
                  <span className="mt-2 text-xs font-bold text-slate-400 group-hover:text-purple-400">
                    صفحة {idx + 1}
                  </span>
                  <div className="absolute inset-0 bg-purple-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition rounded-2xl text-xs font-bold text-white gap-1.5">
                    <FileSignature className="w-4 h-4" /> تعديل وتوقيع
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* المحرر التفاعلي */}
        {activePageImage && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 border border-slate-800 p-4 rounded-2xl backdrop-blur-md">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTool(activeTool === "text" ? null : "text")}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition ${
                    activeTool === "text"
                      ? "bg-purple-500 text-slate-950 border-purple-400"
                      : "bg-slate-900 text-slate-300 border-slate-800 hover:border-purple-500/50"
                  }`}
                >
                  <Type className="w-4 h-4" /> كتابة نص
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

              <button
                onClick={handleCommitEdit}
                disabled={processing}
                className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-slate-950 px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition"
              >
                <Check className="w-4 h-4" />
                {mode === "multi" ? "اعتماد الصفحة والعودة للمستند" : "حفظ وتحميل المستند"}
              </button>
            </div>

            {/* أدوات النص */}
            {activeTool === "text" && (
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  placeholder="اكتب النص هنا..."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white flex-1 focus:outline-none focus:border-purple-500"
                />
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-10 h-10 rounded-xl cursor-pointer bg-transparent border-0"
                  title="لون النص"
                />
                <select
                  value={textSize}
                  onChange={(e) => setTextSize(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value={18}>صغير (18px)</option>
                  <option value={24}>متوسط (24px)</option>
                  <option value={32}>كبير (32px)</option>
                  <option value={42}>عريض جداً (42px)</option>
                </select>
                <button
                  onClick={addTextItem}
                  className="bg-purple-500 hover:bg-purple-600 text-slate-950 px-4 py-2 rounded-xl text-xs font-bold"
                >
                  إدراج
                </button>
              </div>
            )}

            {/* لوحة رسم التوقيع */}
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
                    ctx.strokeStyle = "#ffffff";
                    ctx.lineWidth = 2.5;
                    ctx.lineCap = "round";
                    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
                    ctx.stroke();
                  }}
                  onMouseUp={() => setIsDrawing(false)}
                  className="bg-slate-950 border border-slate-700 rounded-xl cursor-crosshair w-full max-w-[400px]"
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

            {/* مساحة الكانفاس والعناصر المتحركة والقابلة للتكبير بالسحب */}
            <div className="relative border border-slate-800 rounded-2xl overflow-hidden bg-slate-950 flex justify-center items-center p-4">
              <div className="relative inline-block select-none shadow-2xl">
                <img src={activePageImage} alt="الصفحة للتعديل" className="max-w-full max-h-[75vh] block rounded-lg" />

                {items.map((item) => (
                  <div
                    key={item.id}
                    style={{ left: item.x, top: item.y }}
                    className="absolute border-2 border-dashed border-purple-400 bg-purple-950/40 p-1.5 rounded-lg group select-none cursor-move"
                    onMouseDown={(e) => {
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
                      <span
                        style={{ fontSize: `${item.size}px`, color: item.color }}
                        className="font-bold block leading-none pointer-events-none"
                      >
                        {item.content}
                      </span>
                    ) : (
                      <img
                        src={item.content}
                        alt="عنصر"
                        style={{ width: `${item.size}px` }}
                        className="pointer-events-none block"
                      />
                    )}

                    {/* مقبض تغيير الحجم بالسحب في الركن السفلي */}
                    <div
                      className="absolute -bottom-2 -left-2 w-4 h-4 bg-purple-400 hover:bg-white rounded-full border-2 border-slate-900 cursor-nwse-resize shadow-md"
                      title="اسحب لتغيير الحجم"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        const startX = e.clientX;
                        const initialSize = item.size;

                        const onResize = (moveEv: MouseEvent) => {
                          const delta = startX - moveEv.clientX;
                          const newSize = Math.max(16, Math.min(600, initialSize + delta));
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
                      }}
                      className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow"
                      title="حذف العنصر"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
