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
  Bold,
  Italic,
  Underline,
  AlignRight,
  AlignCenter,
  AlignLeft,
  Edit3,
  Check
} from "lucide-react";

export default function PdfToWordPage() {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStage, setProgressStage] = useState("");
  
  // حفظ الصفحات كمستندات منفصلة تماماً في الخلفية
  const [pagesContent, setPagesContent] = useState([]);
  const [currentStep, setCurrentStep] = useState<"upload" | "edit" | "download">("upload");
  const [error, setError] = useState("");

  const fileInputRef = useRef(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

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
      setPagesContent([]);
      setCurrentStep("upload");
      setProgress(0);
    } else {
      setError("يرجى اختيار ملف بصيغة PDF فقط.");
    }
  };

  const resetAll = () => {
    setFile(null);
    setPagesContent([]);
    setCurrentStep("upload");
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const escapeHtml = (text: string) => {
    return text
      .split("&").join("&")
      .split("<").join("<")
      .split(">").join(">");
  };

  const fixArabicString = (str: string): string => {
    if (!str) return "";
    const arabicRegex = /[\u0600-\u06FF]/;
    if (!arabicRegex.test(str)) return str;

    const tokens = str.split(" ").map((token) => {
      if (token === "هللا") return "الله";
      return token;
    });

    return tokens.join(" ");
  };

  const handleConvertLocally = async () => {
    if (!file) return;

    const pdfjsLib = (window as any)["pdfjs-dist/build/pdf"];
    if (!pdfjsLib) {
      setError("محرك التحويل قيد التجهيز في المتصفح، يرجى المحاولة بعد قليل.");
      return;
    }

    setLoading(true);
    setError("");
    setProgress(10);
    setProgressStage("جاري تفكيك صفحات الـ PDF وعزلها...");

    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const totalPages = pdf.numPages;

      let extractedPages: string[] = [];

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        setProgressStage(`معالجة وتجهيز الصفحة \({pageNum} من\){totalPages}...`);
        setProgress(Math.round((pageNum / totalPages) * 90));

        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        let lines: string[] = [];
        let currentLine = "";
        let lastY: number | null = null;

        textContent.items.forEach((item: any) => {
          const str = item.str;
          if (!str || str.trim().length === 0) return;

          const currentY = Math.round(item.transform[5]);

          if (lastY !== null && Math.abs(currentY - lastY) > 5) {
            if (currentLine.trim()) {
              lines.push(currentLine.trim());
            }
            currentLine = str;
          } else {
            currentLine += (currentLine ? " " : "") + str;
          }

          lastY = currentY;
        });

        if (currentLine.trim()) {
          lines.push(currentLine.trim());
        }

        let pageHtml = "";
        lines.forEach((line) => {
          let cleaned = fixArabicString(line);
          if (cleaned.includes("هللا")) {
            cleaned = cleaned.replace(/هللا/g, "الله");
          }
          pageHtml += `
