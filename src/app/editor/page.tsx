"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import {
  FileSignature,
  ArrowRight,
  UploadCloud,
  FileText,
  Files,
  Type,
  PenTool,
  Image as ImageIcon,
  RotateCcw,
  Check,
  Sparkles,
  Trash2,
  Loader2,
  Bold,
  Italic,
  MousePointerClick,
} from "lucide-react";
import { PDFDocument } from "pdf-lib";

interface CanvasItem {
  id: string;
  type: "text" | "image";
  content: string;
  percentX: number; // نسبة مئوية دقيقة من عرض الصورة
  percentY: number; // نسبة مئوية دقيقة من ارتفاع الصورة
  sizePx: number;
  color?: string;
  weight?: string;
  isItalic?: boolean;
}

export default function EditorPage() {
  const [mode, setMode] = useState<"single" | "multi" | null>(null);

  const [originalFile, setOriginalFile] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);

  const [activePageImage, setActivePageImage] = useState(null);
  const [items, setItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [activeTool, setActiveTool] = useState<"text_placement" | "signature" | "stamp" | null>(null);

  const previewWrapperRef = useRef(null);
  const sigCanvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const [processing, setProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  const selectedItem = items.find((it) => it.id === selectedItemId);

  const getPdfJs = async (): Promise => {
    if (typeof window === "undefined") return null;
    if ((window as any).pdfjsLib) return (window as any).pdfjsLib;

    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.onload = () => {
        const lib = (window as any).pdfjsLib;
        if (lib) {
          lib.GlobalWorkerOptions.workerSrc =
            "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
          resolve(lib);
        } else {
          reject(new Error("تعذر تحميل محرك العرض"));
        }
      };
      script.onerror = () => reject(new Error("فشل الاتصال بسكربت العرض"));
      document.head.appendChild(script);
    });
  };

  const renderPdfPageToImage = async (file: File, pageNum: number): Promise => {
    const pdfjsLib = await getPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      cMapUrl: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/",
      cMapPacked: true,
    });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(pageNum);

    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;
    return canvas.toDataURL("image/png");
  };

  const handleSingleUpload = async (e: React.ChangeEvent) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessing(true);
    setStatusMsg("جاري تجهيز المستند...");

    try {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () => {
          setActivePageImage(reader.result as string);
          setItems([]);
          setProcessing(false);
          setStatusMsg(null);
        };
        reader.readAsDataURL(file);
      } else {
        setOriginalFile(file);
        const imgData = await renderPdfPageToImage(file, 1);
        setActivePageImage(imgData);
        setItems([]);
      }
    } catch {
      setStatusMsg("حدث خطأ أثناء قراءة الملف.");
    } finally {
      setProcessing(false);
    }
  };

  const handleMultiUpload = async (e: React.ChangeEvent) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessing(true);
    setStatusMsg("جاري فحص المستند...");

    try {
      setOriginalFile(file);
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      setTotalPages(pdfDoc.getPageCount());
    } catch {
      setStatusMsg("ملف غير صالح.");
    } finally {
      setProcessing(false);
      setStatusMsg(null);
    }
  };

  const choosePageToEdit = async (pageIdx: number) => {
    if (!originalFile) return;
    setProcessing(true);
    setSelectedPageIndex(pageIdx);
    setStatusMsg(`جاري إعداد الصفحة ${pageIdx + 1}...`);

    try {
      const imgData = await renderPdfPageToImage(originalFile, pageIdx + 1);
      setActivePageImage(imgData);
      setItems([]);
    } catch {
      setStatusMsg("تعذر فتح الصفحة.");
    } finally {
      setProcessing(false);
      setStatusMsg(null);
    }
  };

  // التقاط مكان النقر على الصورة لإنشاء صندوق الكتابة في موضعه الدقيق
  const handlePageClickToPlaceText = (e: React.MouseEvent) => {
    if (activeTool !== "text_placement" || !previewWrapperRef.current) return;

    const rect = previewWrapperRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const percentX = Math.max(0, Math.min(0.9, clickX / rect.width));
    const percentY = Math.max(0, Math.min(0.9, clickY / rect.height));

    const newItem: CanvasItem = {
      id: Date.now().toString(),
      type: "text",
      content: "اكتب النص هنا...",
      percentX,
      percentY,
      sizePx: 22,
      color: "#000000",
      weight: "bold",
      isItalic: false,
    };

    setItems((prev) => [...prev, newItem]);
    setSelectedItemId(newItem.id);
    setActiveTool(null); // إنهاء وضع تحديد المكان
  };

  const updateSelectedItem = (updates: Partial) => {
    if (!selectedItemId) return;
    setItems((prev) =>
      prev.map((it) => (it.id === selectedItemId ? { ...it, ...updates } : it))
    );
  };

  const handleStampUpload = (e: React.ChangeEvent) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const newItem: CanvasItem = {
        id: Date.now().toString(),
        type: "image",
        content: reader.result as string,
        percentX: 0.2,
        percentY: 0.3,
        sizePx: 130,
      };
      setItems((prev) => [...prev, newItem]);
      setSelectedItemId(newItem.id);
      setActiveTool(null);
    };
    reader.readAsDataURL(file);
  };

  const saveSignature = () => {
    if (!sigCanvasRef.current) return;
    const dataUrl = sigCanvasRef.current.toDataURL("image/png");
    const newItem: CanvasItem = {
      id: Date.now().toString(),
      type: "image",
      content: dataUrl,
      percentX: 0.2,
      percentY: 0.4,
      sizePx: 140,
    };
    setItems((prev) => [...prev, newItem]);
    setSelectedItemId(newItem.id);
    setActiveTool(null);
  };

  const renderComposedImage = async (): Promise => {
    return new Promise((resolve) => {
      const bgImg = new Image();
      bgImg.src = activePageImage!;
      bgImg.onload = async () => {
        const offscreen = document.createElement("canvas");
        const naturalW = bgImg.naturalWidth || bgImg.width;
        const naturalH = bgImg.naturalHeight || bgImg.height;

        offscreen.width = naturalW;
        offscreen.height = naturalH;
        const ctx = offscreen.getContext("2d")!;

        ctx.drawImage(bgImg, 0, 0);

        const displayW = previewWrapperRef.current?.clientWidth || naturalW;
        const scaleMultiplier = naturalW / displayW;

        for (const itm of items) {
          const exactX = itm.percentX * naturalW;
          const exactY = itm.percentY * naturalH;
          const exactSize = itm.sizePx * scaleMultiplier;

          if (itm.type === "text") {
            const fontStyle = itm.isItalic ? "italic" : "normal";
            const fontWeightVal = itm.weight || "bold";
            ctx.font = `\({fontStyle}\){fontWeightVal} ${exactSize}px 'Cairo', sans-serif`;
            ctx.fillStyle = itm.color || "#000000";
            ctx.textBaseline = "top";
            ctx.textAlign = "left";

            ctx.fillText(itm.content, exactX, exactY);
          } else if (itm.type === "image") {
            const img = new Image();
            img.src = itm.content;
            await new Promise((r) => {
              img.onload = () => {
                const ratio = img.height / img.width;
                ctx.drawImage(img, exactX, exactY, exactSize, exactSize * ratio);
                r(null);
              };
            });
          }
        }
        resolve(offscreen.toDataURL("image/png"));
      };
    });
  };

  const handleCommitEdit = async () => {
    setProcessing(true);
    setStatusMsg("جاري حفظ التعديلات بدقة 100%...");

    try {
      const editedDataUrl = await renderComposedImage();
      let finalBlob: Blob;

      if (mode === "single" || !originalFile) {
        const newPdf = await PDFDocument.create();
        const imgBytes = await fetch(editedDataUrl).then((res) => res.arrayBuffer());
        const embedded = await newPdf.embedPng(imgBytes);
        const page = newPdf.addPage([embedded.width, embedded.height]);
        page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height });

        const bytes = await newPdf.save();
        finalBlob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });
      } else {
        const originalBytes = await originalFile.arrayBuffer();
        const pdfDoc = await PDFDocument.load(originalBytes);
        const imgBytes = await fetch(editedDataUrl).then((res) => res.arrayBuffer());
        const embedded = await pdfDoc.embedPng(imgBytes);

        const targetIdx = selectedPageIndex;
        const targetPage = pdfDoc.getPage(targetIdx);
        const { width, height } = targetPage.getSize();

        const newPage = pdfDoc.insertPage(targetIdx, [width, height]);
        newPage.drawImage(embedded, { x: 0, y: 0, width, height });
        pdfDoc.removePage(targetIdx + 1);

        const updatedBytes = await pdfDoc.save();
        finalBlob = new Blob([updatedBytes as unknown as BlobPart], { type: "application/pdf" });
      }

      const downloadLink = URL.createObjectURL(finalBlob);
      const a = document.createElement("a");
      a.href = downloadLink;
      a.download = `apdf_edited_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setActivePageImage(null);
      setSelectedItemId(null);
    } catch {
      setStatusMsg("حدث خطأ أثناء حفظ الملف.");
    } finally {
      setProcessing(false);
    }
  };

  return (
