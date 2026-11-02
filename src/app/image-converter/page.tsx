'use client';

import React, { useState, useRef } from 'react';
import type { Metadata } from 'next';

type SupportedFormat = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/x-icon';

interface ImageFile {
  id: string;
  file: File;
  previewUrl: string;
  name: string;
  size: number;
  originalFormat: string;
}

export default function ImageConverterPage() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [targetFormat, setTargetFormat] = useState<SupportedFormat>('image/png');
  const [quality, setQuality] = useState<number>(0.92);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // استلام واختيار الصور
  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newItems: ImageFile[] = Array.from(files)
      .filter((file) => file.type.startsWith('image/'))
      .map((file) => ({
        id: Math.random().toString(36).substring(7),
        file,
        previewUrl: URL.createObjectURL(file),
        name: file.name.substring(0, file.name.lastIndexOf('.')) || file.name,
        size: file.size,
        originalFormat: file.type.replace('image/', '').toUpperCase() || 'UNKNOWN',
      }));

    setImages((prev) => [...prev, ...newItems]);
  };

  // حذف صورة معينة
  const removeImage = (id: string) => {
    setImages((prev) => {
      const item = prev.find((img) => img.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((img) => img.id !== id);
    });
  };

  // تفريغ القائمة
  const clearAll = () => {
    images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    setImages([]);
  };

  // تحويل صورة واحدة عبر الـ Canvas
  const processImageConversion = (imageItem: ImageFile, format: SupportedFormat, imgQuality: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('فشل الوصول لسياق الرسم'));

        // في حال التحويل إلى JPG، نضع خلفية بيضاء لتفادي السواد في الشفافية
        if (format === 'image/jpeg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.drawImage(img, 0, 0);

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('فشل استخراج ملف الصورة'));
          },
          format,
          imgQuality
        );
      };
      img.onerror = () => reject(new Error('تعذر تحميل الصورة'));
      img.src = imageItem.previewUrl;
    });
  };

  // زر التحميل المباشر للكل
  const handleConvertAll = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);

    try {
      for (const item of images) {
        const convertedBlob = await processImageConversion(item, targetFormat, quality);
        const ext = targetFormat === 'image/jpeg' ? 'jpg' : targetFormat.replace('image/', '');
        const downloadUrl = URL.createObjectURL(convertedBlob);

        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `${item.name}_converted.${ext}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
      }
    } catch (error) {
      console.error('خطأ أثناء المعالجة:', error);
      alert('حدث خطأ أثناء معالجة بعض الصور، تأكد من سلامة الملفات.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4" dir="rtl">
      <div className="max-w-4xl mx-auto">
        {/* الترويسة والشعار التعريفي */}
        <div className="text-center mb-10">
          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full mb-3">
            ⚡ سريع ومجاني • معالجة كاملة داخل جهازك
          </span>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-3">
            محول صيغ الصور الذكي
          </h1>
          <p className="text-gray-600 text-base max-w-xl mx-auto">
            حول صورك بين مختلف الصيغ (JPG, PNG, WebP) بأعلى دقة وتحكم كامل في الجودة دون رفع أي صورة إلى الإنترنت.
          </p>
        </div>

        {/* صندوق السحب والإفلات */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFiles(e.dataTransfer.files);
          }}
          className="border-2 border-dashed border-blue-400 hover:border-blue-600 bg-white hover:bg-blue-50/30 rounded-2xl p-10 text-center cursor-pointer transition-all shadow-sm"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <div className="text-5xl mb-3">🔄</div>
          <p className="text-lg font-bold text-gray-800 mb-1">
            اضغط لاختيار الصور أو اسحبها هنا
          </p>
          <p className="text-xs text-gray-400">
            يدعم جميع صيغ الصور (PNG, JPG, JPEG, WEBP, BMP)
          </p>
        </div>

        {/* لوحة خيارات التحويل والملفات */}
        {images.length > 0 && (
          <div className="mt-8 bg-white border rounded-2xl p-6 shadow-sm">
            {/* شريط الإعدادات */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b">
              <div className="flex items-center gap-3">
                <label className="text-sm font-bold text-gray-700">التحويل إلى صيغة:</label>
                <select
                  value={targetFormat}
                  onChange={(e) => setTargetFormat(e.target.value as SupportedFormat)}
                  className="border rounded-lg px-3 py-2 text-sm font-semibold text-gray-800 bg-gray-50 focus:outline-blue-500"
                >
                  <option value="image/png">PNG (خلفية شفافة)</option>
                  <option value="image/jpeg">JPG / JPEG (حجم أصغر)</option>
                  <option value="image/webp">WebP (مثالي للمواقع)</option>
                </select>
              </div>

              {targetFormat !== 'image/png' && (
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700">الجودة:</label>
                  <input
                    type="range"
                    min="0.5"
                    max="1"
                    step="0.05"
                    value={quality}
                    onChange={(e) => setQuality(parseFloat(e.target.value))}
                    className="w-24 accent-blue-600"
                  />
                  <span className="text-xs font-bold text-gray-500">{Math.round(quality * 100)}%</span>
                </div>
              )}

              <button
                onClick={clearAll}
                className="text-xs text-red-600 hover:text-red-800 font-bold mr-auto"
              >
                مسح الكل ({images.length})
              </button>
            </div>

            {/* قائمة الصور */}
            <div className="divide-y max-h-72 overflow-y-auto my-4">
              {images.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={item.previewUrl}
                      alt={item.name}
                      className="w-12 h-12 rounded-lg object-cover border bg-gray-100"
                    />
                    <div className="truncate">
                      <p className="text-sm font-bold text-gray-800 truncate">{item.name}</p>
                      <p className="text-xs text-gray-400">
                        {item.originalFormat} • {formatSize(item.size)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeImage(item.id)}
                    className="text-gray-400 hover:text-red-600 p-1 rounded transition-colors"
                    title="حذف"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* زر البدء والتحميل */}
            <button
              onClick={handleConvertAll}
              disabled={isProcessing}
              className="w-full mt-2 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isProcessing ? 'جاري التحويل والحفظ محلياً...' : `تحويل وتحميل كل الصور (${images.length})`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
