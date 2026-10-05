"use client";

import React, { useState } from "react";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Download, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function PdfToWordPage() {
  const [file, setFile] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultText, setResultText] = useState("");
  const [error, setError] = useState("");

  const handleFileChange = (e: React.ChangeEvent) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === "application/pdf" || selectedFile.type.startsWith("image/")) {
        setFile(selectedFile);
        setError("");
        setResultText("");
      } else {
        setError("يرجى رفع ملف بصيغة PDF أو صورة.");
      }
    }
  };

  const handleProcess = async () => {
    if (!file) {
      setError("الرجاء اختيار ملف أولاً.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append(
        "prompt",
        prompt || "استخرج كامل النص بدقة وحوله إلى تنسيق وورد متناسق ومضبوط باللغة العربية"
      );

      // نرسل الـ FormData مباشرة بدون وضع headers يدوية ليضبط المتصفح multipart/form-data تلقائياً
      const res = await fetch("/api/gemini-doc", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "فشل معالجة المستند.");
      }

      setResultText(data.resultText);
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء معالجة المستند.");
    } finally {
      setLoading(false);
    }
  };

  const downloadWordDocument = () => {
    if (!resultText) return;

    const header =
      "" +
      "Document" +
      "";
    const footer = "";
    const sourceHTML = header + `
