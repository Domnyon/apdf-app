'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';

export default function ImageConverterPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [outputFormat, setOutputFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [quality, setQuality] = useState<number>(90);
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [convertedSize, setConvertedSize] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setDownloadUrl(null);
      setConvertedSize(null);
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const convertImage = () => {
    if (!selectedFile || !imagePreview) return;
    setIsProcessing(true);

    const img = new Image();
    img.src = imagePreview;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        setIsProcessing(false);
        return;
      }

      if (outputFormat === 'jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0);

      const mimeType = `image/${outputFormat}`;
      const qualityFactor = outputFormat === 'png' ? undefined : quality / 100;

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            setDownloadUrl(url);
            setConvertedSize((blob.size / 1024).toFixed(1) + ' KB');
          }
          setIsProcessing(false);
        },
        mimeType,
        qualityFactor
      );
    };
  };

  const formatFileSize = (bytes: number) => {
    return (bytes / 1024).toFixed(1) + ' KB';
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8 selection:bg-blue-600 selection:text-white">
      <div className="max-w-4xl mx-auto space-y-12">
        
        {/* شريط المسار والرجوع */}
        <nav className="flex items-center gap-2 text-sm text-slate-400">
          <Link href="/" className="hover:text-blue-400 transition-colors">
            الرئيسية
          </Link>
          <span>/</span>
          <span className="text-slate-200">محول صيغ الصور</span>
        </nav>

        {/* رأس الأداة */}
        <header className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-3xl mb-2 text-blue-400 shadow-lg shadow-blue-500/5">
            🔄
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            محول صيغ الصور الذكي أونلاين
          </h1>
          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-400">
            حول صورك مجاناً بين صيغ JPG و PNG و WebP محلياً داخل متصفحك بسرعة فائقة، وبأعلى دقة ودون رفع أي ملف إلى السيرفر.
          </p>
        </header>

        {/* مساحة العمل وبطاقة الأداة */}
