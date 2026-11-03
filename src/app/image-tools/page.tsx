'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronDown,
  Download,
  LoaderCircle,
  LockKeyhole,
  Minimize2,
  RotateCcw,
  Sparkles,
  Upload,
  WandSparkles,
  Zap,
} from 'lucide-react';

type Operation = 'compress' | 'remove-background';
type CompressionMode = 'smart' | 'target' | 'quality';
type ImageFile = {
  file: File;
  url: string;
};
type ImageResult = {
  blob: Blob;
  url: string;
  fileName: string;
  operation: Operation;
};

const ACCEPTED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} كيلوبايت`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} ميجابايت`;
}

function getSavingsPercent(original: number, result: number) {
  if (original <= 0) return 0;
  return Math.round(((original - result) / original) * 100);
}

const buttonClass =
  'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50';

export default function ImageToolsPage() {
  const [selectedImage, setSelectedImage] = useState<ImageFile | null>(null);
  const [result, setResult] = useState<ImageResult | null>(null);
  const [operation, setOperation] = useState<Operation>('compress');
  const [compressionMode, setCompressionMode] = useState<CompressionMode>('smart');
  const [targetKB, setTargetKB] = useState(200);
  const [quality, setQuality] = useState(80);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlsRef = useRef(new Set<string>());

  useEffect(
    () => () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current.clear();
    },
    []
  );

  const createObjectUrl = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    objectUrlsRef.current.add(url);
    return url;
  };

  const releaseObjectUrl = (url: string | null | undefined) => {
    if (!url || !objectUrlsRef.current.has(url)) return;
    URL.revokeObjectURL(url);
    objectUrlsRef.current.delete(url);
  };

  const clearResult = () => {
    releaseObjectUrl(result?.url);
    setResult(null);
    setNotice('');
  };

  const chooseImage = (file?: File) => {
    if (!file) return;
    if (!ACCEPTED_TYPES.has(file.type)) {
      setError('الصيغ المدعومة هي PNG وJPG وWEBP فقط.');
      return;
    }
    if (file.size === 0) {
      setError('الملف المحدد فارغ. اختر صورة أخرى.');
      return;
    }

    setError('');
    setNotice('');
    clearResult();
    releaseObjectUrl(selectedImage?.url);
    setSelectedImage({ file, url: createObjectUrl(file) });
  };

  const reset = () => {
    releaseObjectUrl(selectedImage?.url);
    setSelectedImage(null);
    clearResult();
    setError('');
    setProgress(0);
    setProgressLabel('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const runCompression = async (file: File) => {
    const imageCompression = (await import('browser-image-compression')).default;
    const fileSizeMB = file.size / (1024 * 1024);
    const maxSizeMB =
      compressionMode === 'target'
        ? targetKB / 1024
        : compressionMode === 'smart'
          ? Math.max(Math.min(fileSizeMB * 0.8, 2), 0.1)
          : Math.max(fileSizeMB, 0.1);

    setProgress(0);
    setProgressLabel('يجري ضغط الصورة محليًا...');
    const compressedFile = await imageCompression(file, {
      maxSizeMB,
      maxWidthOrHeight: 2560,
      useWebWorker: true,
      maxIteration: 12,
      initialQuality: compressionMode === 'quality' ? quality / 100 : 0.88,
      alwaysKeepResolution: compressionMode === 'quality',
      fileType: 'image/jpeg',
      onProgress: (value) => setProgress(Math.round(value)),
    });

    const imageResult: ImageResult = {
      blob: compressedFile,
      url: createObjectUrl(compressedFile),
      fileName: `${file.name.replace(/\.[^.]+$/, '')}-compressed.jpg`,
      operation: 'compress',
    };
    setResult(imageResult);

    if (compressionMode === 'target' && compressedFile.size > targetKB * 1024) {
      setNotice(
        `حجم النتيجة ${formatBytes(compressedFile.size)}، وهو أعلى من الهدف ${targetKB} كيلوبايت. جرّب جودة أقل أو هدفًا أكبر.`
      );
    }
  };

  const runBackgroundRemoval = async (file: File) => {
    const { removeBackground } = await import('@imgly/background-removal');
    setProgress(0);
    setProgressLabel('تهيئة نموذج الذكاء الاصطناعي...');
    const transparentImage = await removeBackground(file, {
      output: { format: 'image/png' },
      progress: (key, current, total) => {
        const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
        setProgress(Math.min(percentage, 100));
        setProgressLabel(
          key.toLowerCase().includes('fetch') || key.toLowerCase().includes('download')
            ? 'تحميل نموذج الذكاء الاصطناعي للاستخدام المحلي...'
            : 'يجري تحليل الصورة وإزالة الخلفية...'
        );
      },
    });

    const imageResult: ImageResult = {
      blob: transparentImage,
      url: createObjectUrl(transparentImage),
      fileName: `${file.name.replace(/\.[^.]+$/, '')}-no-background.png`,
      operation: 'remove-background',
    };
    setResult(imageResult);
    setProgress(100);
    setProgressLabel('اكتملت إزالة الخلفية.');
  };

  const processImage = async () => {
    if (!selectedImage || isProcessing) return;
    setIsProcessing(true);
    setError('');
    setNotice('');
    clearResult();
    try {
      if (operation === 'compress') {
        await runCompression(selectedImage.file);
      } else {
        await runBackgroundRemoval(selectedImage.file);
      }
    } catch (processingError) {
      console.error('تعذرت معالجة الصورة:', processingError);
      setError(
        operation === 'remove-background'
          ? 'تعذرت إزالة الخلفية. تأكد من اتصالك لتنزيل نموذج الذكاء الاصطناعي ثم أعد المحاولة.'
          : 'تعذر ضغط الصورة. جرّب صورة أخرى أو خفّض دقة الصورة.'
      );
      setProgressLabel('');
    } finally {
      setIsProcessing(false);
    }
  };

  const savings = result && selectedImage
    ? getSavingsPercent(selectedImage.file.size, result.blob.size)
    : 0;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 selection:bg-blue-600 selection:text-white sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl space-y-10">
        <nav className="flex items-center gap-2 text-sm text-slate-400">
          <Link href="/" className="transition-colors hover:text-blue-400">
            الرئيسية
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-slate-200">تحسين الصور الذكي</span>
        </nav>

        <header className="space-y-4 text-center">
          <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10 text-violet-300 shadow-lg shadow-violet-950/20">
            <WandSparkles size={30} />
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            أدوات تحسين الصور الذكية
            <span className="mt-2 block text-2xl text-blue-300 sm:text-3xl">
              ضغط وإزالة الخلفية مجاناً
            </span>
          </h1>
          <p className="mx-auto max-w-3xl text-sm leading-7 text-slate-400 sm:text-base">
            قلل حجم صورك أو أزل خلفيتها باستخدام الذكاء الاصطناعي. تتم معالجة الصور على جهازك
            ولا تُرفع إلى خوادمنا؛ وقد يُنزّل المتصفح نموذج الذكاء الاصطناعي عند أول استخدام.
          </p>
        </header>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 shadow-2xl sm:p-8">
          {!selectedImage ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                chooseImage(event.dataTransfer.files[0]);
              }}
              className={`flex min-h-72 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition ${
                isDragging
                  ? 'border-blue-400 bg-blue-500/10'
                  : 'border-slate-700 bg-slate-950/50 hover:border-blue-500 hover:bg-blue-950/10'
              }`}
            >
              <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300">
                <Upload size={30} />
              </span>
              <span className="text-lg font-bold text-white">اسحب الصورة إلى هنا</span>
              <span className="mt-2 text-sm text-slate-400">أو انقر لاختيار صورة من جهازك</span>
              <span className="mt-4 rounded-lg border border-slate-800 px-3 py-1.5 text-xs text-slate-500">
                PNG · JPG · WEBP
              </span>
            </button>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <section className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-white">الصورة الأصلية</h2>
                    <p className="mt-1 max-w-64 truncate text-xs text-slate-400">
                      {selectedImage.file.name}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-blue-500 hover:text-white"
                  >
                    تغيير الصورة
                  </button>
                </div>
                <div className="flex min-h-64 items-center justify-center overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element -- Local object URL preview stays in the browser. */}
                  <img
                    src={selectedImage.url}
                    alt="معاينة الصورة الأصلية"
                    className="max-h-80 max-w-full rounded-lg object-contain"
                  />
                </div>
                <p className="text-sm text-slate-400">
                  الحجم الأصلي: <strong className="text-slate-200">{formatBytes(selectedImage.file.size)}</strong>
                </p>
                {result && (
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                    <h3 className="mb-3 text-sm font-bold text-slate-200">مقارنة الحجم</h3>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-slate-400">بعد المعالجة</span>
                      <strong className="text-white">{formatBytes(result.blob.size)}</strong>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-800 pt-3 text-sm">
                      <span className="text-slate-400">
                        {savings >= 0 ? 'نسبة التوفير' : 'الزيادة بالحجم'}
                      </span>
                      <span className={savings >= 0 ? 'font-bold text-emerald-300' : 'font-bold text-amber-300'}>
                        {savings >= 0 ? `${savings}%` : `${Math.abs(savings)}%`}
                      </span>
                    </div>
                  </div>
                )}
              </section>

              <section className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOperation('compress');
                      clearResult();
                      setError('');
                    }}
                    className={`rounded-2xl border p-4 text-right transition ${
                      operation === 'compress'
                        ? 'border-blue-500/70 bg-blue-500/10 shadow-lg shadow-blue-950/20'
                        : 'border-slate-800 bg-slate-950/50 hover:border-slate-600'
                    }`}
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300">
                      <Minimize2 size={20} />
                    </span>
                    <span className="mt-3 block font-bold text-white">ضغط وتصغير الحجم</span>
                    <span className="mt-1 block text-xs leading-5 text-slate-400">
                      تحكم بالحجم أو جودة الصورة
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOperation('remove-background');
                      clearResult();
                      setError('');
                    }}
                    className={`rounded-2xl border p-4 text-right transition ${
                      operation === 'remove-background'
                        ? 'border-violet-500/70 bg-violet-500/10 shadow-lg shadow-violet-950/20'
                        : 'border-slate-800 bg-slate-950/50 hover:border-slate-600'
                    }`}
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
                      <Sparkles size={20} />
                    </span>
                    <span className="mt-3 block font-bold text-white">إزالة الخلفية بالذكاء الاصطناعي</span>
                    <span className="mt-1 block text-xs leading-5 text-slate-400">
                      تفريغ الخلفية وتنزيل PNG شفاف
                    </span>
                  </button>
                </div>

                {operation === 'compress' && (
                  <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                    <fieldset>
                      <legend className="mb-3 text-sm font-bold text-slate-200">طريقة الضغط</legend>
                      <div className="grid grid-cols-3 gap-2">
                        {(
                          [
                            ['smart', 'ذكي'],
                            ['target', 'حجم محدد'],
                            ['quality', 'يدوي'],
                          ] as const
                        ).map(([mode, label]) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setCompressionMode(mode)}
                            className={`rounded-lg border px-2 py-2 text-xs font-semibold transition ${
                              compressionMode === mode
                                ? 'border-blue-500 bg-blue-500/10 text-blue-200'
                                : 'border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                    {compressionMode === 'target' && (
                      <div className="space-y-3">
                        <label htmlFor="target-size" className="block text-sm text-slate-300">
                          الحجم الأقصى المطلوب
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {[100, 200, 500].map((size) => (
                            <button
                              key={size}
                              type="button"
                              onClick={() => setTargetKB(size)}
                              className={`rounded-lg border px-3 py-2 text-sm transition ${
                                targetKB === size
                                  ? 'border-blue-500 bg-blue-500/10 text-blue-200'
                                  : 'border-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              {size} KB
                            </button>
                          ))}
                        </div>
                        <label className="block text-xs text-slate-400" htmlFor="target-size">
                          أو أدخل هدفًا مخصصًا: {targetKB} كيلوبايت
                        </label>
                        <input
                          id="target-size"
                          type="range"
                          min="50"
                          max="2000"
                          step="10"
                          value={targetKB}
                          onChange={(event) => setTargetKB(Number(event.target.value))}
                          className="w-full accent-blue-500"
                        />
                        <p className="text-xs leading-5 text-slate-500">
                          الحجم المستهدف تقريبي ويتأثر بأبعاد الصورة ومحتواها. سنعرض الحجم الفعلي بعد الضغط.
                        </p>
                      </div>
                    )}
                    {compressionMode === 'quality' && (
                      <label className="block text-sm text-slate-300">
                        جودة الصورة: <strong className="text-blue-200">{quality}%</strong>
                        <input
                          type="range"
                          min="20"
                          max="100"
                          step="5"
                          value={quality}
                          onChange={(event) => setQuality(Number(event.target.value))}
                          className="mt-3 w-full accent-blue-500"
                        />
                      </label>
                    )}
                    {compressionMode === 'smart' && (
                      <p className="text-xs leading-5 text-slate-400">
                        ضغط تلقائي متوازن يقلل الحجم مع الحفاظ على جودة مناسبة.
                      </p>
                    )}
                  </div>
                )}

                {operation === 'remove-background' && (
                  <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4 text-sm leading-6 text-slate-300">
                    تتم إزالة الخلفية على جهازك. في أول مرة قد يستغرق تنزيل النموذج بعض الوقت،
                    ثم يُخزّن المتصفح موارده للاستخدام اللاحق.
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => void processImage()}
                  disabled={isProcessing}
                  className={`${buttonClass} w-full ${
                    operation === 'compress'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/40 hover:bg-blue-500'
                      : 'bg-gradient-to-l from-violet-600 to-blue-600 text-white shadow-lg shadow-violet-950/40 hover:brightness-110'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <LoaderCircle size={18} className="animate-spin" />
                      جارٍ التنفيذ...
                    </>
                  ) : operation === 'compress' ? (
                    <>
                      <Minimize2 size={18} />
                      بدء ضغط الصورة
                    </>
                  ) : (
                    <>
                      <WandSparkles size={18} />
                      تفريغ وإزالة الخلفية فوراً
                    </>
                  )}
                </button>

                {isProcessing && (
                  <div
                    className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/70 p-4"
                    role="status"
                    aria-live="polite"
                  >
                    <div className="flex items-center justify-between gap-3 text-xs text-slate-300">
                      <span>{progressLabel}</span>
                      <span dir="ltr">{progress}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-l from-blue-500 to-violet-500 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {error && (
                  <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-sm leading-6 text-rose-300">
                    <AlertCircle size={17} className="mt-1 shrink-0" />
                    {error}
                  </p>
                )}
                {notice && (
                  <p role="status" className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-sm leading-6 text-amber-200">
                    {notice}
                  </p>
                )}

                {result && (
                  <div className="space-y-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                    <div className="flex items-center gap-2 text-sm font-bold text-emerald-200">
                      <Check size={18} />
                      اكتملت المعالجة — {formatBytes(result.blob.size)}
                    </div>
                    <div
                      className={`flex min-h-56 items-center justify-center overflow-hidden rounded-xl border border-slate-800 p-3 ${
                        result.operation === 'remove-background'
                          ? 'bg-[linear-gradient(45deg,#1e293b_25%,transparent_25%),linear-gradient(-45deg,#1e293b_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#1e293b_75%),linear-gradient(-45deg,transparent_75%,#1e293b_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0]'
                          : 'bg-slate-950'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- Local processed image blob preview. */}
                      <img
                        src={result.url}
                        alt="معاينة الصورة بعد المعالجة"
                        className="max-h-80 max-w-full rounded-lg object-contain"
                      />
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <a
                        href={result.url}
                        download={result.fileName}
                        className={`${buttonClass} bg-emerald-600 text-white hover:bg-emerald-500`}
                      >
                        <Download size={18} />
                        تحميل الصورة المحسنة
                      </a>
                      <button
                        type="button"
                        onClick={reset}
                        className={`${buttonClass} border border-slate-700 bg-slate-950 text-slate-200 hover:border-slate-500`}
                      >
                        <RotateCcw size={17} />
                        معالجة صورة أخرى
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => chooseImage(event.target.files?.[0])}
            className="hidden"
          />
          {error && !selectedImage && (
            <p role="alert" className="mt-4 text-center text-sm text-rose-300">
              {error}
            </p>
          )}
        </section>

        <section className="grid gap-4 sm:grid-cols-3" aria-label="مميزات الأداة">
          {[
            { icon: Zap, title: 'سرعة فائقة', desc: 'معالجة مباشرة من متصفحك' },
            { icon: Sparkles, title: 'ذكاء اصطناعي محلي', desc: 'إزالة الخلفية على جهازك' },
            { icon: LockKeyhole, title: 'بدون حد يومي للصور', desc: 'خصوصية بلا رفع إلى خوادمنا' },
          ].map(({ icon: Icon, title, desc }) => (
            <article key={title} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <Icon size={20} className="text-blue-300" />
              <h2 className="mt-3 font-bold text-white">{title}</h2>
              <p className="mt-1 text-sm text-slate-400">{desc}</p>
            </article>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-7">
          <h2 className="text-xl font-bold text-white">كيفية الاستخدام</h2>
          <ol className="mt-5 grid gap-4 sm:grid-cols-3">
            {[
              'ارفع صورة PNG أو JPG أو WEBP من جهازك.',
              'اختر ضغط الصورة أو إزالة الخلفية واضبط الخيارات.',
              'ابدأ المعالجة، قارن النتيجة ثم حمّلها.',
            ].map((step, index) => (
              <li key={step} className="flex gap-3 rounded-xl bg-slate-950/70 p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/15 font-bold text-blue-200">
                  {index + 1}
                </span>
                <span className="text-sm leading-6 text-slate-300">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white">الأسئلة الشائعة</h2>
          {[
            {
              question: 'كيف أقلل حجم الصورة إلى أقل من 100 كيلوبايت لمنصة أبشر؟',
              answer:
                'ارفع الصورة، اختر «ضغط وتصغير الحجم» ثم «حجم محدد» وحدد 100 KB. يختلف الحجم النهائي حسب أبعاد الصورة ومحتواها؛ إذا تجاوز النتيجة الهدف، جرّب صورة أصغر أو هدفًا أعلى.',
            },
            {
              question: 'هل خدمة إزالة خلفية الصور مجانية وبدون علامة مائية؟',
              answer:
                'لا نضيف علامة مائية إلى النتيجة. إزالة الخلفية تتم في المتصفح، ويُنزل المتصفح نموذج المعالجة عند أول استخدام. استخدام مكتبة المعالجة يخضع لشروط ترخيصها.',
            },
            {
              question: 'هل بياناتي وصوري آمنة؟',
              answer:
                'ملف الصورة يُقرأ ويُعالج داخل متصفحك ولا يُرفع إلى خوادمنا. عند أول استخدام لإزالة الخلفية، قد تُنزّل موارد النموذج من مزوده وتُخزّن مؤقتًا في المتصفح.',
            },
          ].map(({ question, answer }) => (
            <details key={question} className="group rounded-xl border border-slate-800 bg-slate-900/60">
              <summary className="flex cursor-pointer list-none items-center gap-3 p-4 font-semibold text-slate-200 [&::-webkit-details-marker]:hidden">
                <span className="flex-1">{question}</span>
                <ChevronDown size={18} className="shrink-0 text-slate-400 transition group-open:rotate-180" />
              </summary>
              <p className="border-t border-slate-800 px-4 py-4 text-sm leading-7 text-slate-400">
                {answer}
              </p>
            </details>
          ))}
        </section>

        <footer className="flex flex-col items-center justify-between gap-3 border-t border-slate-800 pt-6 text-xs text-slate-500 sm:flex-row">
          <span className="inline-flex items-center gap-2">
            <LockKeyhole size={14} />
            خصوصيتك أولويتنا — لا نرفع صورك
          </span>
          <Link href="/" className="inline-flex items-center gap-1 transition hover:text-blue-300">
            <ArrowLeft size={14} />
            جميع أدوات APDF
          </Link>
        </footer>
      </div>
    </main>
  );
}
