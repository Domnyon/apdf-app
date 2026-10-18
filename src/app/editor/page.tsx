"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Upload, FileSignature, Download, Trash2, Undo2, Sparkles, ShieldCheck, Zap } from "lucide-react";

export default function EditorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
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

  const undoLast = () => {
    if (history.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const newHist = [...history];
    newHist.pop();
    setHistory(newHist);
    if (newHist.length > 0) {
      ctx.putImageData(newHist[newHist.length - 1], 0, 0);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const cx = "touches" in e ? e.touches[0].clientX : e.clientX;
    const cy = "touches" in e ? e.touches[0].clientY : e.clientY;
    return { x: cx - rect.left, y: cy - rect.top };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setHistory((prev) => [...prev, ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    setIsDrawing(true);
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
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

  const stopDrawing = () => setIsDrawing(false);

  const downloadSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `signature_${Date.now()}.png`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col justify-between" dir="rtl">
      <header className="max-w-4xl mx-auto w-full px-4 py-4 flex items-center justify-between border-b border-slate-900">
        <Link href="/" className="flex items-center gap-2 text-xs font-semibold text-purple-400">
          <ArrowRight className="w-4 h-4" /> الرئيسية
        </Link>
        <span className="font-black text-lg text-white">apdf<span className="text-purple-400">.app</span></span>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8 flex-1 w-full">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-bold">
            <FileSignature className="w-3.5 h-3.5" /> أداة التوقيع
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">محرر وتوقيع مستندات PDF</h1>
          <p className="text-xs text-slate-400">وقع مستنداتك محلياً عبر المتصفح بأمان وخصوصية كاملة.</p>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
          {!file ? (
            <label className="border-2 border-dashed border-slate-800 hover:border-purple-500/50 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-900/20">
              <Upload className="w-6 h-6 text-purple-400" />
              <span className="text-xs font-bold text-white">اختر ملف PDF أو وقع في اللوحة مباشرة</span>
              <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
            </label>
          ) : (
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-xs text-purple-300 truncate">{fileName}</span>
              <button onClick={() => setFile(null)} className="text-xs text-rose-400">تغيير</button>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-slate-900 pt-2">
            <span className="text-xs text-purple-400 font-bold">لوحة التوقيع الحر</span>
            <div className="flex gap-2">
              <button onClick={undoLast} className="p-2 rounded-lg bg-slate-900 text-slate-400 hover:text-white" title="تراجع">
                <Undo2 className="w-3.5 h-3
