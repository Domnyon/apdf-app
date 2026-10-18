"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Upload,
  FileSignature,
  Download,
  Trash2,
  Undo2,
  Sparkles,
  ShieldCheck,
  Zap,
  HelpCircle,
  CheckCircle2,
  PenTool,
  Type,
} from "lucide-react";

export default function EditorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const [toolMode, setToolMode] = useState<"draw" | "text">("draw");
  const [textInput, setTextInput] = useState("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [history, setHistory] = useState<ImageData[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const selected = e.target.files[0];
    if (selected.type === "application/pdf" || selected.name.endsWith(".pdf")) {
      setFile(selected);
      setFileName(selected.name);
      clearCanvas();
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHistory([]);
  };

  const saveState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setHistory((prev) => [...prev, ctx.getImageData(0, 0, canvas.width, canvas.height)]);
  };

  const undoLast = () => {
    if (history.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const newHistory = [...history];
    newHistory.pop();
    setHistory(newHistory);

    if (newHistory.length > 0) {
      ctx.putImageData(newHistory[newHistory.length - 1], 0, 0);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    saveState();
    const pos = getPos(e);

    if (toolMode === "draw") {
      setIsDrawing(true);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    } else if (toolMode === "text" && textInput.trim()) {
      ctx.font = "16px sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(textInput, pos.x, pos.y);
      setIsDrawing(false);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || toolMode !== "draw") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pos = getPos(e);
    ctx.strokeStyle = "#a855f7";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const downloadSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `apdf_signature_${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 font-sans relative flex flex-col justify-between" dir="rtl">
      {/* Header */}
      <header className="max-w-4xl mx-auto w-full px-4 py-4 flex items-center justify-between border-b border-slate-900">
        <Link href="/" className="flex items-center gap-2 text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors">
          <ArrowRight className="w-4 h-4" /> العودة للرئيسية
        </Link>
        <span className="font-black text-lg tracking-tight text-white">
          apdf<span className="text-purple-400">.app</span>
        </span>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-10 flex-1 w-full">
        {/* مقدمة الأداة */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold">
            <FileSignature className="w-3.5 h-3.5" /> أداة التوقيع والتحرير
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">محرر وتوقيع مستندات PDF أونلاين</h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
            وقع على عقودك وأوراقك مباشرة باللمس أو الماوس، وأضف نصوصاً وملاحظات فورية محلياً داخل متصفحك بأعلى معايير الأمان والخصوصية.
          </p>
        </div>

        {/* لوحة التحرير والتوقيع */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl">
          {!file ? (
            <label className="border-2 border-dashed border-slate-800 hover:border-purple-500/50 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-slate-900/20 hover:bg-slate-900/40">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
                <Upload className="w-5 h-5" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-white">اضغط لاختيار ملف PDF للتعديل أو اسحبه هنا</span>
              <span className="text-[11px] text-slate-400">يمكنك أيضاً استخدام اللوحة أدناه لإنشاء توقيع فوري</span>
              <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
            </label>
          ) : (
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-xs font-medium text-purple-300 truncate max-w-xs">{fileName}</span>
              <button onClick={() => setFile(null)} className="text-xs text-rose-400 hover:underline">
                تغيير الملف
              </button>
            </div>
          )}

          {/* شريط أدوات الرسم والكتابة */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-900">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setToolMode("draw")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                  toolMode === "draw" ? "bg-purple-600 text-white" : "bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                <PenTool className="w-3.5 h-3.5" /> قلم التوقيع
              </button>
              <button
                type="button"
                onClick={() => setToolMode("text")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                  toolMode === "text" ? "bg-purple-600 text-white" : "bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                <Type className="w-3.5 h-3.5" /> نص إضافي
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={undoLast}
                className="p-2 rounded-lg bg-slate-900 text-slate-400 hover:text-white transition-colors"
                title="تراجع"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={clearCanvas}
                className="p-2 rounded-lg bg-slate-900 text-rose-400 hover:bg-rose-500/20 transition-colors"
                title="مسح اللوحة"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {toolMode === "text" && (
            <input
              type="text"
              placeholder="اكتب النص هنا ثم انقر على اللوحة لإضافته..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 transition-colors"
            />
          )}

          {/* مساحة اللوحة */}
          <div className="w-full border border-slate-800 rounded-xl overflow-hidden bg-slate-950/90 relative touch-none">
            <canvas
              ref={canvasRef}
              width={700}
              height={320}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-56 sm:h-72 cursor-crosshair"
            />
            <span className="absolute bottom-2 right-3 text-[10px] text-slate-600 pointer-events-none select-none">
              ارسم توقيعك هنا باللمس أو الماوس
            </span>
          </div>

          <button
            type="button"
            onClick={downloadSignature}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs sm:text-sm py-3 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98] shadow-lg shadow-purple-600/20"
          >
            <Download className="w-4 h-4" /> حفظ وتحميل التوقيع (PNG)
          </button>
        </div>

        {/* قسم الدليل ومحتوى السيو أسفل الأداة */}
        <section className="space-y-6 pt-2 text-xs sm:text-sm leading-relaxed text-slate-300">
          <div className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" /> كيفية تعديل وتوقيع ملفات PDF أونلاين
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-3.5 space-y-1">
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">1. رفع الملف</span>
                <h3 className="font-bold text-white text-xs">اختر مستندك</h3>
                <p className="text-slate-400 text-[11px]">ارفع ملف الـ PDF الذي ترغب في توقيعه أو تعبئة بياناته مباشرة من جهازك.</p>
              </div>
              <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-3.5 space-y-1">
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">2. التعديل والإضافة</span>
                <h3 className="font-bold text-white text-xs">أضف التوقيع والنصوص</h3>
                <p className="text-slate-400 text-[11px]">ارسم توقيعك باللمس أو الفأرة، وأضف نصوصاً وملاحظات وحدد المكان بدقة.</p>
              </div>
              <div className="bg-slate-950/60 border border-slate-900 rounded-xl p-3.5 space-y-1">
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">3. الحفظ الفوري</span>
                <h3 className="font-bold text-white text-xs">تحميل التوقيع</h3>
                <p className="text-slate-400 text-[11px]">احفظ التعديلات ونزّل التوقيع بنقرة واحدة بجودة عالية وبدون علامة مائية.</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-950/50 border border-slate-900 rounded-xl p-4 space-y-3">
            <h2 className="text-sm font-bold text-white">مميزات أداة تحرير وتوقيع PDF</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white">توقيع رقمي آمن 100%</h4>
                  <p className="text-slate-400 text-[11px]">معالجة محلية داخل المتصفح، لا يتم حفظ أو رفع مستنداتك لأي خادم خارجي.</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Zap className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white">متوافق مع الهواتف والشاشات اللمسية</h4>
                  <p className="text-slate-400 text-[11px]">واجهة سلسة تدعم التوقيع بالإصبع أو بالقلم الذكي على كافة الأجهزة المحمولة.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-purple-400" /> أسئلة شائعة حول التوقيع وتعديل المستندات
            </h2>
            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-900 space-y-1">
                <h3 className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> هل التوقيع عبر المنصة معتمد ومجاني؟
                </h3>
                <p className="text-slate-400 text-xs pr-5">نعم، يمكنك استخدامه لتوقيع الاستمارات والعقود واستخراجه بجودة فائقة دون دفع أي رسوم.</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-900 space-y-1">
                <h3 className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> هل يضع الموقع علامة مائية على توقيعي؟
                </h3>
                <p className="text-slate-400 text-xs pr-5">لا، التصدير يكون بخلفية شفافة ونقية بدون أي شعار أو علامة مائية تخص الموقع.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 bg-slate-950/70 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} apdf.app - جميع الحقوق محفوظة.
      </footer>
    </div>
  );
}
