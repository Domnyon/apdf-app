"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Upload,
  FileText,
  CheckCircle,
  Download,
  X,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Edit3,
  FileType,
  Eye,
  Type
} from "lucide-react";

export default function PdfToWordPage() {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<"upload" | "editor" | "download">("upload");

  // بيانات المحرر التفاعلي لورقة A4
  const [editableNotes, setEditableNotes] = useState("");
  const [isTypingEffect, setIsTypingEffect] = useState(false);

  // ملفات التحميل الجاهزة
  const [downloadBlob, setDownloadBlob] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState<"docx" | "pdf">("docx");
  const [error, setError] = useState("");

  const fileInputRef = useRef(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    if (selectedFile.type === "application/pdf" || selectedFile.name.toLowerCase().endsWith(".pdf")) {
      setFile(selectedFile);
      setError("");
      setDownloadBlob(null);
    } else {
      setError("يرجى اختيار ملف بصيغة PDF فقط.");
    }
  };

  const resetAll = () => {
    setFile(null);
    setDownloadBlob(null);
    setError("");
    setStage("upload");
    setEditableNotes("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // التحويل المباشر عبر السيرفر
  const handleConvert = async () => {
    if (!file) return;

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("https://pdf-converter-api-8dfv.onrender.com/convert", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("تعذر إكمال التحويل عبر السيرفر. يرجى المحاولة بعد لحظات.");
      }

      const blob = await response.blob();
      setDownloadBlob(blob);
      setEditableNotes(`تم التحويل والتحقق بنجاح من مستند: ${file.name}\n\nيمكنك كتابة ملاحظاتك هنا قبل تصدير النسخة النهائية.`);
      setStage("editor");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "حدث خطأ أثناء معالجة الملف. يرجى المحاولة مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  const handleFinalSave = (format: "docx" | "pdf") => {
    setSelectedFormat(format);
    setStage("download");
  };

  const triggerDownload = () => {
    if (!file) return;

    if (selectedFormat === "docx" && downloadBlob) {
      const url = URL.createObjectURL(downloadBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name.replace(/\.[^/.]+$/, "") + ".docx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      // تحميل كملف PDF
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name.replace(/\.[^/.]+$/, "") + "-edited.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  return (
