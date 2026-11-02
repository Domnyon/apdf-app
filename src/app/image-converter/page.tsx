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
    img.crossOrigin = 'anonymous';
    img.src = imagePreview;

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          alert('تعذر تشغيل معالج الصور');
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
            } else {
              alert('فشلت معالجة الصورة');
            }
            setIsProcessing(false);
          },
          mimeType,
          qualityFactor
        );
      } catch (err) {
        console.error(err);
        setIsProcessing(false);
      }
    };

    img.onerror = () => {
      alert('خطأ في تحميل الصورة');
      setIsProcessing(false);
    };
  };

  const formatFileSize = (bytes: number) => {
    return (bytes / 1024).toFixed(1) + ' KB';
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8 selection:bg-blue-600 selection:text-white">
      <div className="max-w-4xl mx-auto space-y-12">
        <nav className="flex items-center gap-2 text-sm text-slate-400">
          <Link href="/" className="hover:text-blue-400 transition-colors">
            الرئيسية
          </Link>
          <span>/</span>
          <span className="text-slate-200">محول صيغ الصور</span>
        </nav>

        <header className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-3xl mb-2 text-blue-400 shadow-lg shadow-blue-500/5">
            🔄
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            محول صيغ الصور الذكي أونلاين
          </h1>
          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-400">
            حول صورك مجاناً بين صيغ JPG و PNG و WebP محلياً داخل متصفحك بسرعة فائقة وبأعلى دقة ودون رفع أي ملف إلى السيرفر.
          </p>
        </header>

        <section className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-sm space-y-8">
          {!imagePreview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-2xl p-10 sm:p-14 text-center cursor-pointer transition-all bg-slate-950/40 hover:bg-blue-950/10 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center text-2xl group-hover:scale-110 group-hover:bg-blue-600/20 text-blue-400 transition-all">
                📁
              </div>
              <p className="text-lg font-semibold text-white mb-1">
                اختر صورة أو اسحبها وأفلتها هنا
              </p>
              <p className="text-sm text-slate-400">
                يدعم صيغ JPG, PNG, WebP وغيرها
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                <div className="relative w-32 h-32 rounded-xl overflow-hidden bg-slate-800 border border-slate-700 flex-shrink-0">
                  <img
                    src={imagePreview}
                    alt="معاينة الصورة"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex-1 text-center sm:text-right space-y-1">
                  <h3 className="font-bold text-white text-base truncate max-w-xs sm:max-w-md">
                    {selectedFile?.name}
                  </h3>
                  <p className="text-sm text-slate-400">
                    الحجم الأصلي: {selectedFile && formatFileSize(selectedFile.size)}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setImagePreview(null);
                      setDownloadUrl(null);
                    }}
                    className="text-xs text-rose-400 hover:text-rose-300 transition-colors pt-2 block"
                  >
                    إلغاء واختيار صورة أخرى
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-300">
                    اختر الصيغة المستهدفة:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['png', 'jpeg', 'webp'] as const).map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => {
                          setOutputFormat(fmt);
                          setDownloadUrl(null);
                        }}
                        className={`py-2.5 rounded-xl text-sm font-bold border transition-all ${
                          outputFormat === fmt
                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/30'
                            : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {fmt.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {outputFormat !== 'png' ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <label className="font-medium text-slate-300">
                        جودة الصورة المخرجة:
                      </label>
                      <span className="font-bold text-blue-400">{quality}%</span>
                    </div>
                    <input
                      type="range"
                      min="30"
                      max="100"
                      value={quality}
                      onChange={(e) => {
                        setQuality(Number(e.target.value));
                        setDownloadUrl(null);
                      }}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 mt-2"
                    />
                  </div>
                ) : (
                  <div className="flex items-center text-xs text-slate-400 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                    ℹ️ صيغة PNG توفر أعلى جودة ثابتة دون فقدان في التفاصيل وبدعم كامل للخلفيات الشفافة.
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-end gap-4">
                {!downloadUrl ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      convertImage();
                    }}
                    disabled={isProcessing}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-50"
                  >
                    {isProcessing ? 'جاري التحويل والمعالجة...' : 'تحويل الصورة الآن'}
                  </button>
                ) : (
                  <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 bg-emerald-950/30 border border-emerald-500/30 p-4 rounded-xl">
                    <div className="text-sm">
                      <span className="text-emerald-400 font-bold">✓ تم التحويل بنجاح!</span>
                      <span className="text-slate-400 mr-2 text-xs">الحجم الجديد: {convertedSize}</span>
                    </div>
                    <a
                      href={downloadUrl}
                      download={`converted-${Date.now()}.${outputFormat === 'jpeg' ? 'jpg' : outputFormat}`}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-center text-sm transition-all shadow-lg shadow-emerald-600/20"
                    >
                      تحميل الصورة المُحوّلة
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
            <span className="text-2xl">🔒</span>
            <h3 className="font-bold text-white text-base">أمان وخصوصية 100%</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              تتم عملية التحويل مباشرة عبر محرك المتصفح على جهازك الشخصي دون رفع صورك إلى أي خادم خارجي.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
            <span className="text-2xl">⚡</span>
            <h3 className="font-bold text-white text-base">سرعة فائقة وجودة متقدمة</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              تحويل لحظي للأبعاد الكاملة يحافظ على أدق تفاصيل الألوان والظلال بدقة عالية.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
            <span className="text-2xl">📱</span>
            <h3 className="font-bold text-white text-base">متوافق مع كل الأجهزة</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              يعمل بسلاسة تامة على متصفحات الهواتف الذكية والأجهزة اللوحية وأجهزة الكمبيوتر.
            </p>
          </div>
        </section>

        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-bold text-white">كيفية استخدام محول الصور:</h2>
          <ol className="list-decimal list-inside space-y-2.5 text-sm sm:text-base text-slate-300 leading-relaxed">
            <li>اختر ملف الصورة المراد تحويله من جهازك.</li>
            <li>حدد صيغة الإخراج المرغوبة من الخيارات (PNG, JPG, أو WebP).</li>
            <li>اضبط شريط الجودة حسب رغبتك لتقليل الحجم أو الحفاظ على أعلى نقاء.</li>
            <li>اضغط على زر <strong>تحويل الصورة الآن</strong>، ثم حمل الملف مباشرة.</li>
          </ol>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white">الأسئلة الشائعة</h2>
          <div className="space-y-3">
            <details className="group bg-slate-900/60 border border-slate-800 rounded-xl p-4 cursor-pointer">
              <summary className="font-semibold text-slate-200 group-hover:text-blue-400 transition-colors list-none flex justify-between items-center">
                <span>ما هي أفضل صيغة لاختيارها عند التحويل؟</span>
                <span className="text-blue-500 font-bold transition-transform group-open:rotate-180">↓</span>
              </summary>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed border-t border-slate-800 pt-3">
                اختر <strong>PNG</strong> للحفاظ على خلفية شفافة وتفاصيل دقيقة، أو <strong>JPG</strong> للصور العامة، أو <strong>WebP</strong> لأفضل ضغط وسرعة للمواقع.
              </p>
            </details>

            <details className="group bg-slate-900/60 border border-slate-800 rounded-xl p-4 cursor-pointer">
              <summary className="font-semibold text-slate-200 group-hover:text-blue-400 transition-colors list-none flex justify-between items-center">
                <span>هل يتم تخزين صوري على الموقع؟</span>
                <span className="text-blue-500 font-bold transition-transform group-open:rotate-180">↓</span>
              </summary>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed border-t border-slate-800 pt-3">
                نهائياً، المعالجة تتم محلياً بالكامل عبر HTML5 Canvas داخل متصفحك دون إرسال البيانات لأي خادم.
              </p>
            </details>
          </div>
        </section>
      </div>
    </main>
  );
}