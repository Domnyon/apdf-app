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
  const [docContentHtml, setDocContentHtml] = useState("");
  
  // مراحل العمل: upload -> edit -> download
  const [currentStep, setCurrentStep] = useState<"upload" | "edit" | "download">("upload");
  const [error, setError] = useState("");

  const fileInputRef = useRef(null);
  const editorRef = useRef(null);

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
      setDocContentHtml("");
      setCurrentStep("upload");
      setProgress(0);
    } else {
      setError("يرجى اختيار ملف بصيغة PDF فقط.");
    }
  };

  const resetAll = () => {
    setFile(null);
    setDocContentHtml("");
    setCurrentStep("upload");
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const escapeHtml = (text: string) => {
    return text.replace(/&/g, "&").replace(//g, ">");
  };

  // استخراج ذكي للنصوص يمنع التكرار ويحافظ على هيكل الأسطر
  const handleConvertLocally = async () => {
    if (!file) return;

    const pdfjsLib = (window as any)["pdfjs-dist/build/pdf"];
    if (!pdfjsLib) {
      setError("محرك التحويل قيد التجهيز في المتصفح، يرجى المحاولة بعد لحظات.");
      return;
    }

    setLoading(true);
    setError("");
    setProgress(15);
    setProgressStage("جاري تحليل ملف PDF واستخراج المحتوى بدقة...");

    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const totalPages = pdf.numPages;

      let fullDocumentHtml = "";

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        setProgressStage(`معالجة وتنسيق الصفحة \({pageNum} من\){totalPages}...`);
        setProgress(Math.round((pageNum / totalPages) * 85));

        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // تجميع العناصر حسب السطر الفعلي لمنع التكرار الناتج عن التموضع
        const linesMap = new Map();

        textContent.items.forEach((item: any) => {
          const str = item.str || "";
          if (!str.trim()) return;

          const y = Math.round(item.transform[5]);
          const x = item.transform[4];

          // تجميع الكلمات التي تقع على نفس الارتفاع تقريبا في نفس السطر
          let matchedY = Array.from(linesMap.keys()).find((lineY) => Math.abs(lineY - y) <= 4);
          if (matchedY === undefined) {
            matchedY = y;
            linesMap.set(matchedY, []);
          }
          linesMap.get(matchedY)!.push({ text: str, x });
        });

        // ترتيب الأسطر من الأعلى للأسفل
        const sortedY = Array.from(linesMap.keys()).sort((a, b) => b - a);

        let pageHtml = `
