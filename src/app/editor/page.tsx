"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Upload, FileSignature, Download, Trash2, Sparkles, ShieldCheck } from "lucide-react";

export default function EditorPage() {
  const [fileName, setFileName] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFileName(f.name);
  };

  const clearCanvas = () => {
    const c = canvasRef.current;
    if (c) c.getContext("2d")?.clearRect(0, 0, c.width, c.height);
  };

  const getPos = (e: any) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: cx - r.left, y: cy - r.top };
  };

  const startDraw = (e: any) => {
    setIsDrawing(true);
    const p = getPos(e);
    const ctx = canvasRef.current?.getContext("2d");
    ctx?.beginPath();
    ctx?.moveTo(p.x, p.y);
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const p = getPos(e);
    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      ctx.strokeStyle = "#a855f7";
      ctx.lineWidth = 2.5;
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
  };

  const saveSig = () => {
    const c = canvasRef.current;
    if (!c) return;
    const a = document.createElement("a");
    a.href = c.toDataURL();
    a.download = "signature.png";
    a.click();
  };

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col justify-between" dir="rtl">
      <header className="max-w-4xl mx-auto w-full px-4 py-4 flex items-center justify-between border-b border-slate-900">
        <Link className="flex items-center gap-2 text-xs font-semibold text-purple-400" href="/">
          <ArrowRight className="w-4 h-4" /> الرئيسية
        </Link>
        <span className="font-black text-lg text-white">apdf<span className="text-purple-400">.app</span></span>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6 flex-1 w-full">
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-purple-500/10 text-purple-400 text-xs font-bold">
            <FileSignature className="w-3.5 h-3.5" /> أداة التوقيع
          </div>
          <h1 className="text-2xl font-black text-white">محرر وتوقيع مستندات PDF</h1>
          <p className="text-xs text-slate-400">وقع مستنداتك مجاناً وبأمان محلي تام دون خروجها من جهازك.</p>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-4">
          <label className="border-2 border-dashed border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center gap-1 cursor-pointer bg-slate-900/20">
            <Upload className="w-5 h-5 text-purple-400" />
            <span className="text-xs text-slate-300 font-bold">{fileName || "اختر ملف PDF أو وقع في اللوحة"}</span>
            <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
          </label>

          <div className="flex justify-between items-center text-xs">
            <span className="text-purple-400 font-bold">مساحة التوقيع:</span>
            <button onClick={clearCanvas} className="text-rose-400 flex items-center gap-1 hover:underline">
              <Trash2 className="w-3.5 h-3.5" /> مسح
            </button>
          </div>

          <div className="w-full border border-slate-800 rounded-xl overflow-hidden bg-slate-950 touch-none">
            <canvas
              ref={canvasRef}
              width={600}
              height={220}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={() => setIsDrawing(false)}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={() => setIsDrawing(false)}
              className="w-full h-48 cursor-crosshair"
            />
          </div>

          <button onClick={saveSig} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2">
            <Download className="w-4 h-4" /> حفظ وتحميل التوقيع
          </button>
        </div>

        <section className="bg-slate-950/50 border border-slate-900 rounded-xl p-4 space-y-3 text-xs text-slate-300">
          <h2 className="font-bold text-white flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-purple-400" /> دليل الاستخدام والأمان
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-slate-400">
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>معالجة محلية داخل المتصفح بنسبة 100% دون رفع ملفاتك.</span>
            </div>
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
              <span>متوافق بالكامل مع الشاشات اللمسية على الجوال والأجهزة اللوحية.</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-900 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} apdf.app - جميع الحقوق محفوظة.
      </footer>
    </div>
  );
}
