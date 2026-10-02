"use client";

import React, { useState, useRef } from "react";
import {
  FileText,
  Paperclip,
  Send,
  Layers,
  Scissors,
  Minimize2,
  PenTool,
  CheckCircle,
  Menu,
  X,
  Download,
  Loader2,
  Info,
  Shield,
  Phone,
} from "lucide-react";

interface Message {
  id: string;
  sender: "bot" | "user";
  text: string;
  downloadUrl?: string;
  timestamp: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "bot",
      text: "مرحباً بك في apdf.app! 📄 اختر إحدى الخدمات العلوية أو أرفق ملفك من زر المشبك واكتب طلبك وسيتولى النظام معالجته فوراً.",
      timestamp: "الآن",
    },
  ]);
  const [selectedAction, setSelectedAction] = useState<string>("merge");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const services = [
    { id: "merge", label: "دمج", icon: Layers, color: "text-emerald-400" },
    { id: "delete_pages", label: "حذف صفحات", icon: Scissors, color: "text-rose-400" },
    { id: "compress", label: "ضغط", icon: Minimize2, color: "text-amber-400" },
    { id: "sign", label: "توقيع", icon: PenTool, color: "text-blue-400" },
    { id: "write", label: "كتابة وتعديل", icon: FileText, color: "text-purple-400" },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const chosen = Array.from(e.target.files);
      setAttachedFiles((prev) => [...prev, ...chosen]);
    }
  };

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!inputText.trim() && attachedFiles.length === 0) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: inputText + (attachedFiles.length > 0 ? ` [مرفق: ${attachedFiles.map((f) => f.name).join(", ")}]` : ""),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("action", selectedAction);
      formData.append("prompt", inputText);
      attachedFiles.forEach((file) => {
        formData.append("files", file);
      });

      const res = await fetch("/api/process-pdf", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "تعذر معالجة الملف.");
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        text: `تمت المعالجة بنجاح! جاهز للتنزيل:`,
        downloadUrl: downloadUrl,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMsg]);
      setAttachedFiles([]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "bot",
          text: `⚠️ تنبيه: ${err.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans" dir="rtl">
      {/* 1. الشريط العلوي مع القائمة المنسدلة */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-900/80 backdrop-blur z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-black text-slate-950 shadow-lg shadow-emerald-500/20">
            A
          </div>
          <div>
            <span className="font-bold text-lg text-white">apdf<span className="text-emerald-400">.app</span></span>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {menuOpen && (
            <div className="absolute left-0 mt-2 w-52 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-2 z-50">
              <a href="#about" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white">
                <Info className="w-4 h-4 text-emerald-400" /> عن المنصة
              </a>
              <a href="#privacy" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white">
                <Shield className="w-4 h-4 text-blue-400" /> سياسة الخصوصية
              </a>
              <a href="#contact" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white">
                <Phone className="w-4 h-4 text-purple-400" /> تواصل معنا
              </a>
            </div>
          )}
        </div>
      </header>

      {/* 2. أزرار الخدمات العلوية */}
      <section className="flex items-center gap-2 px-6 py-2.5 bg-slate-900/40 border-b border-slate-800 overflow-x-auto">
        <span className="text-xs text-slate-400 ml-2 font-medium">الخدمة:</span>
        {services.map((srv) => {
          const Icon = srv.icon;
          const isActive = selectedAction === srv.id;
          return (
            <button
              key={srv.id}
              onClick={() => setSelectedAction(srv.id)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition border ${
                isActive
                  ? "bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-sm"
                  : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${srv.color}`} />
              <span>{srv.label}</span>
            </button>
          );
        })}
      </section>

      {/* 3. نافذة الشات والمحادثة */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 max-w-4xl w-full mx-auto">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.sender === "bot" && (
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <CheckCircle className="w-4 h-4" />
              </div>
            )}
            <div
              className={`max-w-md md:max-w-lg rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.sender === "user"
                  ? "bg-emerald-600 text-slate-950 font-medium rounded-tl-none shadow"
                  : "bg-slate-900 border border-slate-800 text-slate-200 rounded-tr-none"
              }`}
            >
              <p>{msg.text}</p>
              {msg.downloadUrl && (
                <a
                  href={msg.downloadUrl}
                  download="processed_document.pdf"
                  className="mt-3 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2 px-4 rounded-xl text-xs transition shadow-md"
                >
                  <Download className="w-4 h-4" /> اضغط هنا لتحميل الملف المعالج
                </a>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            <span>جاري المعالجة محلياً عبر الخادم...</span>
          </div>
        )}
      </main>

      {/* 4. حقل الإدخال مع زر المشبك */}
      <footer className="p-4 bg-slate-900/90 border-t border-slate-800">
        <div className="max-w-4xl mx-auto space-y-2">
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachedFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-300">
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="truncate max-w-xs">{f.name}</span>
                  <button onClick={() => removeFile(i)} className="text-slate-400 hover:text-rose-400">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 focus-within:border-emerald-500 rounded-2xl px-3 py-2 transition">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf"
              multiple={selectedAction === "merge"}
              className="hidden"
            />
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800/80 rounded-xl transition"
              title="إرفاق ملف PDF"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="اكتب طلبك هنا، أو أرفق الملف واضغط إرسال..."
              className="flex-1 bg-transparent border-0 outline-none text-sm text-slate-100 placeholder-slate-500 px-2"
            />

            <button
              type="button"
              onClick={handleSend}
              disabled={loading}
              className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 p-2.5 rounded-xl font-medium transition flex items-center justify-center shadow"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
