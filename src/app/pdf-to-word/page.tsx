"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Upload, FileText, CheckCircle, Download, X, ArrowRight, RefreshCw, AlertCircle } from "lucide-react";

export default function PdfToWordPage() {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStage, setProgressStage] = useState("");
  const [convertedDocBlob, setConvertedDocBlob] = useState(null);
  const [error, setError] = useState("");

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.async = true;
      script.onload = () => {
        const pdfjsLib = (window as any)["pdfjs-dist/build/pdf"];
        if (pdfjsLib) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        }
      };
      document.body.appendChild(script);
    }
  }, []);

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
      setConvertedDocBlob(null);
      setProgress(0);
    } else {
      setError("يرجى اختيار ملف بصيغة PDF فقط.");
    }
  };

  const removeFile = () => {
    setFile(null);
    setConvertedDocBlob(null);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const escapeHtml = (text: string) => {
    return text.replace(/&/g, "&").replace(//g, ">");
  };

  const handleConvertLocally = async () => {
    if (!file) return;

    const pdfjsLib = (window as any)["pdfjs-dist/build/pdf"];
    if (!pdfjsLib) {
      setError("محرك التحويل قيد التجهيز في المتصفح، يرجى المحاولة بعد لحظات.");
      return;
    }

    setLoading(true);
    setError("");
    setProgress(10);
    setProgressStage("جاري قراءة صفحات المستند...");

    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const totalPages = pdf.numPages;

      let extractedHtmlPages = "";

      for (let i = 1; i <= totalPages; i++) {
        setProgressStage(`معالجة وتنسيق الصفحة \({i} من\){totalPages}...`);
        setProgress(Math.round((i / totalPages) * 85));

        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        let lastY: number | null = null;
        let pageHtml = `
