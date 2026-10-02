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
  Phone
} from "lucide-react";

interface Message {
  id: string;
  sender: "bot" | "user";
  text: string;
  downloadUrl?: string;
  timestamp: string;
}

export default function Home() {
  const [messages, setMessages] = useState([
    {
      id: "1",
      sender: "bot",
      text: "مرحباً بك في apdf.app! 📄 اختر إحدى الخدمات العلوية أو أرفق ملفك من زر المشبك واكتب طلبك وسيتولى النظام معالجته فوراً.",
      timestamp: "الآن",
    },
  ]);
  const [selectedAction, setSelectedAction] = useState("merge");
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const fileInputRef = useRef(null);

  const services = [
    { id: "merge", label: "دمج", icon: Layers, color: "text-emerald-400" },
    { id: "delete_pages", label: "حذف صفحات", icon: Scissors, color: "text-rose-400" },
    { id: "compress", label: "ضغط", icon: Minimize2, color: "text-amber-400" },
    { id: "sign", label: "توقيع", icon: PenTool, color: "text-blue-400" },
    { id: "write", label: "كتابة وتعديل", icon: FileText, color: "text-purple-400" },
  ];

  const handleFileChange = (e: React.ChangeEvent) => {
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
      text: inputText + (attachedFiles.length > 0 ? ` [مرفق: ${attachedFiles.map(f => f.name).join(", ")}]` : ""),
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
