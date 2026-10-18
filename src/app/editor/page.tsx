"use client";

import React, { useState, useRef, useEffect } from "react";
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
  Type,
  PenTool,
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
    if (!e.target.files || e.target.files.length === 0) return;
    const selectedFile = e.target.files[0];
    if (selectedFile.type === "application/pdf" || selectedFile.name.endsWith(".pdf")) {
      setFile(selectedFile);
      setFileName(selectedFile.name);
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

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    saveState();
    setIsDrawing(true);

    const rect = canvas.getBoundingClientRect();
    const x = ("touches" in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ("touches" in e ? e.touches[0].clientY : e.clientY) - rect.top;

    if (toolMode === "draw") {
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else if (toolMode === "text" && textInput.trim()) {
      ctx.font = "16px sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(textInput, x, y);
      setIsDrawing(false);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || toolMode !== "draw") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ("touches" in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ("touches" in e ? e.touches[0].clientY : e.clientY) - rect.top;

    ctx.strokeStyle = "#a855f7";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineTo(x, y);
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
    link.download = `signature_${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 font-sans relative flex flex-col justify-between" dir="rtl">
      {/* Header */}
      <header className="max-w-4xl mx-auto w-full px-4 py-4 flex items-center justify-between border-b border-slate-900">
        <Link href="/" className="flex items-center gap-2 text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors">
          <ArrowRight className="w-4 h-4" /> العودة للرئيسية
        </Link>
        <span className="font-black text-lg tracking-tight text-white">apdf<span className="text-purple-400">.app</span></span>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-12 flex-1 w-full">
        {/* مقدمة الأداة */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold">
            <FileSignature className="w-3.5 h-3.5" /> أداة التوقيع والتحرير
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">محرر وتوقيع مستندات PDF أونلاين</h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
            وقع على عقودك وأوراقك مباشرة باللمس أو الماوس، وأضف نصوصاً وملاحظات فورية محلياً داخل متصفحك بأعلى معايير الأمان والخصوصية.
          </p>
        </div>

        {/* لوحة التحرير والتوقيع */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 sm:p-6 space-y-5 shadow-xl">
          {!file ? (
            <label className="border-2 border-dashed border-slate-800 hover:border-purple-500/50 rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors bg-slate-900/20 hover:bg-slate-900/40">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
                <Upload className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1">
                <span className="text-xs sm:text-sm font-bold text-white block">اضغط لاختيار ملف PDF للتعديل أو اسحبه هنا</span>
                <span className="text-[11px] text-slate-400 block">يمكنك أيضاً استخدام اللوحة أدناه لإنشاء توقيع فوري</span>
              </div>
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
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setToolMode("draw")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                  toolMode === "draw" ? "bg-purple-600 text-white" : "bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                <PenTool className="w-3.5 h-3.5" /> قلم التوقيع
              </button>
              <button
                onClick={() => setToolMode("text")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                  toolMode === "text" ? "bg-purple-600 text-white" : "bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                <Type className="w-3.5 h-3.5" /> نص إضافي
              </button>
