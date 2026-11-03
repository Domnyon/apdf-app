'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowDown,
  ChevronDown,
  Download,
  FileArchive,
  Image as ImageIcon,
  LoaderCircle,
  LockKeyhole,
  Minimize2,
  RotateCcw,
  Trash2,
  Upload,
  Zap,
} from 'lucide-react';

type CompressionMode = 'smart' | 'target' | 'quality';
type OutputFormat = 'webp' | 'original';
type ImageItem = {
  id: number;
  file: File;
  previewUrl: string;
  width: number;
  height: number;
  result?: Blob;
  resultUrl?: string;
  resultName?: string;
  resultWidth?: number;
  resultHeight?: number;
  status: 'ready' | 'processing' | 'done' | 'error';
  progress: number;
  error?: string;
};

const ACCEPTED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const PRESET_TARGETS = [100, 200, 500];

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} كيلوبايت`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} ميجابايت`;
}

function getSavingsPercent(original: number, result: number) {
  if (original <= 0) return 0;
  return Math.round(((original - result) / original) * 100);
}

function getExtension(type: string) {
  if (type === 'image/jpeg') return 'jpg';
  if (type === 'image/png') return 'png';
  return 'webp';
}

const buttonClass =
  'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50';

export default function ImageToolsPage() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [compressionMode, setCompressionMode] = useState<CompressionMode>('smart');
  const [targetKB, setTargetKB] = useState(200);
  const [quality, setQuality] = useState(85);
  const [resizeEnabled, setResizeEnabled] = useState(false);
  const [maxDimension, setMaxDimension] = useState(1920);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('webp');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [batchProgress, setBatchProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nextIdRef = useRef(1);
  const processingRef = useRef(false);
  const objectUrlsRef = useRef(new Set<string>());
  const activeImage = images.find((image) => image.id === activeId) ?? null;
  const finishedImages = images.filter((image) => image.status === 'done' && image.resultUrl);

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

  const releaseObjectUrl = (url?: string) => {
    if (!url || !objectUrlsRef.current.has(url)) return;
    URL.revokeObjectURL(url);
    objectUrlsRef.current.delete(url);
  };

  const addImages = async (files: FileList | File[]) => {
    const validFiles: File[] = [];
    const issues: string[] = [];

    for (const file of Array.from(files)) {
      if (!ACCEPTED_TYPES.has(file.type)) {
        issues.push(`${file.name}: الصيغة غير مدعومة.`);
      } else if (file.size === 0) {
        issues.push(`${file.name}: الملف فارغ.`);
      } else {
        validFiles.push(file);
      }
    }

    setUploadError(issues.join(' '));
    if (validFiles.length === 0) return;

    const readableImages: ImageItem[] = [];
    for (const file of validFiles) {
      const id = nextIdRef.current++;
      const previewUrl = createObjectUrl(file);
      try {
        const bitmap = await createImageBitmap(file);
        const { width, height } = bitmap;
        bitmap.close();
        readableImages.push({
          id,
          file,
          previewUrl,
          width,
          height,
          status: 'ready',
          progress: 0,
        });
      } catch {
        releaseObjectUrl(previewUrl);
        issues.push(`تعذر فتح الصورة ${file.name}.`);
      }
    }
    setUploadError(issues.join(' '));

    if (readableImages.length > 0) {
      setImages((current) => [...current, ...readableImages]);
      setActiveId((current) => current ?? readableImages[0].id);
      setBatchProgress('');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (image: ImageItem) => {
    releaseObjectUrl(image.previewUrl);
    releaseObjectUrl(image.resultUrl);
    const remaining = images.filter((item) => item.id !== image.id);
    if (activeId === image.id) setActiveId(remaining[0]?.id ?? null);
    setImages(remaining);
  };

  const clearAll = () => {
    images.forEach((image) => {
      releaseObjectUrl(image.previewUrl);
      releaseObjectUrl(image.resultUrl);
    });
    setImages([]);
    setActiveId(null);
    setUploadError('');
    setBatchProgress('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const compressImage = async (image: ImageItem): Promise<boolean> => {
    setImages((current) =>
      current.map((item) =>
        item.id === image.id ? { ...item, status: 'processing', progress: 0, error: undefined } : item
      )
    );

    try {
      const imageCompression = (await import('browser-image-compression')).default;
      const originalSizeMB = image.file.size / (1024 * 1024);
      const maxSizeMB =
        compressionMode === 'target'
          ? targetKB / 1024
          : compressionMode === 'smart'
            ? Math.max(Math.min(originalSizeMB * 0.8, 2), 0.05)
            : Math.max(originalSizeMB, 0.05);
      const fileType =
        outputFormat === 'original'
          ? image.file.type
          : 'image/webp';
      const options = {
        maxSizeMB,
        ...(resizeEnabled ? { maxWidthOrHeight: maxDimension } : {}),
        useWebWorker: true,
        maxIteration: 15,
        initialQuality: compressionMode === 'smart' ? 0.88 : quality / 100,
        alwaysKeepResolution: compressionMode === 'quality' && !resizeEnabled,
        libURL: '/vendor/browser-image-compression.js',
        fileType,
        onProgress: (progress: number) => {
          setImages((current) =>
            current.map((item) =>
              item.id === image.id ? { ...item, progress: Math.round(progress) } : item
            )
          );
        },
      };

      const compressedFile = await imageCompression(image.file, options);
      const targetMet =
        compressionMode !== 'target' || compressedFile.size <= targetKB * 1024;
      if (
        compressionMode === 'target' &&
        !targetMet &&
        compressedFile.size >= image.file.size &&
        !resizeEnabled
      ) {
        throw new Error('تعذر بلوغ الحجم المستهدف دون زيادة حجم الصورة.');
      }
      const shouldKeepOriginal =
        compressedFile.size >= image.file.size &&
        !resizeEnabled &&
        (compressionMode !== 'target' || targetMet);
      const outputFile = shouldKeepOriginal ? image.file : compressedFile;
      const outputBitmap = await createImageBitmap(outputFile);
      const resultWidth = outputBitmap.width;
      const resultHeight = outputBitmap.height;
      outputBitmap.close();
      const extension = getExtension(outputFile.type);
      const resultName = `${image.file.name.replace(/\.[^.]+$/, '')}-compressed.${extension}`;
      const resultUrl = createObjectUrl(outputFile);

      setImages((current) =>
        current.map((item) =>
          item.id === image.id
            ? {
                ...item,
                result: outputFile,
                resultUrl,
                resultName,
                resultWidth,
                resultHeight,
                status: 'done',
                progress: 100,
              }
            : item
        )
      );
      return true;
    } catch (error) {
      console.error(`تعذر ضغط الصورة ${image.file.name}:`, error);
      setImages((current) =>
        current.map((item) =>
          item.id === image.id
            ? {
                ...item,
                status: 'error',
                error: 'تعذر ضغط هذه الصورة. جرّب صورة أخرى أو خفّض أبعادها.',
              }
            : item
        )
      );
      return false;
    }
  };

  const processImages = async (selectedImages: ImageItem[]) => {
    if (processingRef.current || selectedImages.length === 0) return;
    processingRef.current = true;
    setIsProcessing(true);
    setUploadError('');

    let completed = 0;
    let failed = 0;
    for (const image of selectedImages) {
      setBatchProgress(`ضغط الصورة ${completed + 1} من ${selectedImages.length}...`);
      if (!(await compressImage(image))) failed += 1;
      completed += 1;
    }

    setBatchProgress(
      `اكتمل ضغط ${completed - failed} من ${completed} صور.` +
        (failed > 0 ? ` تعذر ضغط ${failed} صور.` : '')
    );
    setIsProcessing(false);
    processingRef.current = false;
  };

  const downloadZip = async () => {
    if (finishedImages.length === 0 || isZipping) return;
    setIsZipping(true);
    setUploadError('');
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const fileNames = new Map<string, number>();
      finishedImages.forEach((image) => {
        if (!image.result) return;
        const name = image.resultName || 'compressed-image.webp';
        const count = fileNames.get(name) ?? 0;
        fileNames.set(name, count + 1);
        const uniqueName =
          count === 0
            ? name
            : `${name.replace(/\.[^.]+$/, '')}-${count + 1}.${getExtension(image.result.type)}`;
        zip.file(uniqueName, image.result);
      });
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = createObjectUrl(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'apdf-compressed-images.zip';
      link.click();
      window.setTimeout(() => releaseObjectUrl(url), 1000);
    } catch (error) {
      console.error('تعذر تجهيز ملف الصور المضغوطة:', error);
      setUploadError('تعذر إنشاء ملف ZIP. يمكنك تنزيل الصور كلٌّ على حدة.');
    } finally {
      setIsZipping(false);
    }
  };

  const resetCompression = () => {
    images.forEach((image) => releaseObjectUrl(image.resultUrl));
    setImages((current) =>
      current.map((image) => ({
        ...image,
        result: undefined,
        resultUrl: undefined,
        resultName: undefined,
        status: 'ready',
        progress: 0,
        error: undefined,
      }))
    );
    setBatchProgress('');
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 selection:bg-blue-600 selection:text-white sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl space-y-10">
        <nav className="flex items-center gap-2 text-sm text-slate-400">
          <Link href="/" className="transition-colors hover:text-blue-400">
            الرئيسية
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-slate-200">ضاغط الصور</span>
        </nav>

        <header className="space-y-4 text-center">
          <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-300 shadow-lg shadow-blue-950/20">
            <Minimize2 size={30} />
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            ضاغط الصور الذكي
            <span className="mt-2 block text-2xl text-blue-300 sm:text-3xl">
              تصغير حجم صورك بجودة ممتازة
            </span>
          </h1>
          <p className="mx-auto max-w-3xl text-sm leading-7 text-slate-400 sm:text-base">
            اضغط صورة واحدة أو مجموعة صور دفعة واحدة، وحدد الحجم أو الجودة والأبعاد المناسبة.
            تتم المعالجة بالكامل داخل متصفحك ولا تُرفع صورك إلى أي خادم.
          </p>
        </header>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 shadow-2xl sm:p-8">
          {images.length === 0 ? (
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
                void addImages(event.dataTransfer.files);
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
              <span className="text-lg font-bold text-white">اسحب صورة أو عدة صور إلى هنا</span>
              <span className="mt-2 text-sm text-slate-400">أو انقر لاختيار ملفات من جهازك</span>
              <span className="mt-4 rounded-lg border border-slate-800 px-3 py-1.5 text-xs text-slate-500">
                PNG · JPG · WEBP
              </span>
            </button>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-white">صورك المحددة ({images.length})</h2>
                  <p className="mt-1 text-xs text-slate-400">
                    المعالجة متسلسلة للمحافظة على أداء الجهاز
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                    className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-blue-500 hover:text-white disabled:opacity-50"
                  >
                    إضافة صور
                  </button>
                  <button
                    type="button"
                    onClick={clearAll}
                    disabled={isProcessing}
                    className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    إزالة الكل
                  </button>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                <div className="space-y-3">
                  <div className="max-h-[34rem] space-y-2 overflow-y-auto pe-1">
                    {images.map((image) => (
                      <article
                        key={image.id}
                        className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                          activeId === image.id
                            ? 'border-blue-500/60 bg-blue-500/5'
                            : 'border-slate-800 bg-slate-950/50'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setActiveId(image.id)}
                          className="flex min-w-0 flex-1 items-center gap-3 text-right"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element -- Local uploaded image preview. */}
                          <img
                            src={image.previewUrl}
                            alt=""
                            className="h-14 w-14 shrink-0 rounded-lg bg-slate-900 object-contain"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-semibold text-slate-200">
                              {image.file.name}
                            </span>
                            <span className="mt-1 block text-[11px] text-slate-500">
                              {formatBytes(image.file.size)} · {image.width} × {image.height}
                            </span>
                            {image.status === 'done' && image.result && (
                              <span className="mt-1 block text-[11px] text-emerald-300">
                                بعد الضغط: {formatBytes(image.result.size)}
                              </span>
                            )}
                            {image.status === 'processing' && (
                              <span className="mt-1 block text-[11px] text-blue-300">
                                جارٍ الضغط {image.progress}%
                              </span>
                            )}
                          </span>
                        </button>
                        {image.status === 'done' && image.resultUrl && (
                          <a
                            href={image.resultUrl}
                            download={image.resultName}
                            aria-label={`تنزيل ${image.file.name}`}
                            className="rounded-lg p-2 text-emerald-300 transition hover:bg-emerald-500/10"
                          >
                            <Download size={17} />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(image)}
                          disabled={isProcessing}
                          aria-label={`إزالة ${image.file.name}`}
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="space-y-5">
                  {activeImage && (
                    <>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                          <h3 className="text-sm font-bold text-slate-200">قبل الضغط</h3>
                          <p className="mt-2 text-xs text-slate-400">
                            {formatBytes(activeImage.file.size)} · {activeImage.width} × {activeImage.height} px
                          </p>
                          <div className="mt-3 flex h-48 items-center justify-center overflow-hidden rounded-xl border border-slate-800 bg-slate-950 p-2">
                            {/* eslint-disable-next-line @next/next/no-img-element -- Local uploaded image preview. */}
                            <img
                              src={activeImage.previewUrl}
                              alt={`الصورة الأصلية: ${activeImage.file.name}`}
                              className="max-h-full max-w-full object-contain"
                            />
                          </div>
                        </div>
                        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                          <h3 className="text-sm font-bold text-slate-200">بعد الضغط</h3>
                          {activeImage.result && activeImage.resultUrl ? (
                            <>
                              <p className="mt-2 text-xs text-emerald-300">
                                {formatBytes(activeImage.result.size)}
                                {' · '}
                                {activeImage.resultWidth} × {activeImage.resultHeight} px
                              </p>
                              <div className="mt-3 flex h-48 items-center justify-center overflow-hidden rounded-xl border border-slate-800 bg-slate-950 p-2">
                                {/* eslint-disable-next-line @next/next/no-img-element -- Local compressed image preview. */}
                                <img
                                  src={activeImage.resultUrl}
                                  alt={`الصورة المضغوطة: ${activeImage.file.name}`}
                                  className="max-h-full max-w-full object-contain"
                                />
                              </div>
                              <p className="mt-2 text-xs text-emerald-300">
                                {getSavingsPercent(activeImage.file.size, activeImage.result.size) >= 0
                                  ? `توفير ${getSavingsPercent(activeImage.file.size, activeImage.result.size)}%`
                                  : `زيادة ${Math.abs(getSavingsPercent(activeImage.file.size, activeImage.result.size))}%`}
                              </p>
                              {compressionMode === 'target' &&
                                activeImage.result.size > targetKB * 1024 && (
                                  <p className="mt-2 text-xs leading-5 text-amber-300">
                                    لم تصل الصورة إلى {targetKB} KB؛ جرّب تقليل الأبعاد أو رفع الحجم المستهدف.
                                  </p>
                                )}
                            </>
                          ) : (
                            <div className="mt-3 flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
                              <ArrowDown size={20} className="mb-2 text-slate-600" />
                              ستظهر النتيجة هنا
                            </div>
                          )}
                        </div>
                      </div>

                      {activeImage.status === 'error' && activeImage.error && (
                        <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-sm text-rose-300">
                          <AlertCircle size={17} className="mt-0.5 shrink-0" />
                          {activeImage.error}
                        </p>
                      )}

                      {activeImage.status === 'processing' && (
                        <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/70 p-4" role="status" aria-live="polite">
                          <div className="flex items-center justify-between text-xs text-slate-300">
                            <span>ضغط الصورة محليًا...</span>
                            <span dir="ltr">{activeImage.progress}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                            <div
                              className="h-full rounded-full bg-blue-500 transition-all"
                              style={{ width: `${activeImage.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  <div className="space-y-5 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 sm:p-5">
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
                        <span className="block text-sm text-slate-300">الحجم الأقصى المستهدف</span>
                        <div className="grid grid-cols-3 gap-2">
                          {PRESET_TARGETS.map((size) => (
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
                        <label htmlFor="target-size" className="block text-xs text-slate-400">
                          حجم مخصص بالكيلوبايت
                        </label>
                        <input
                          id="target-size"
                          type="number"
                          min="30"
                          max="5000"
                          step="10"
                          value={targetKB}
                          onChange={(event) =>
                            setTargetKB(
                              Math.min(
                                5000,
                                Math.max(30, Number(event.target.value) || 30)
                              )
                            )
                          }
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                        />
                        <p className="text-xs leading-5 text-slate-500">
                          الحجم النهائي تقريبي ويتأثر بالصورة وأبعادها. إذا لم تصل النتيجة للهدف، قلل الأبعاد أو ارفع الهدف.
                        </p>
                      </div>
                    )}

                    {compressionMode === 'quality' && (
                      <label className="block text-sm text-slate-300">
                        جودة الضغط: <strong className="text-blue-200">{quality}%</strong>
                        <input
                          type="range"
                          min="10"
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
                        ضغط متوازن تلقائيًا لخفض الحجم مع الحفاظ على جودة مناسبة.
                      </p>
                    )}

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 block text-sm text-slate-300">صيغة النتيجة</span>
                        <select
                          value={outputFormat}
                          onChange={(event) => setOutputFormat(event.target.value as OutputFormat)}
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                        >
                          <option value="webp">WebP — حجم أصغر</option>
                          <option value="original">الاحتفاظ بصيغة الأصل</option>
                        </select>
                      </label>
                      <div className="rounded-xl border border-slate-800 p-3">
                        <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-slate-300">
                          <span>تصغير الأبعاد</span>
                          <input
                            type="checkbox"
                            checked={resizeEnabled}
                            onChange={(event) => setResizeEnabled(event.target.checked)}
                            className="h-4 w-4 accent-blue-500"
                          />
                        </label>
                        {resizeEnabled && (
                          <label className="mt-3 block text-xs text-slate-400">
                            أقصى عرض أو ارتفاع: {maxDimension} px
                            <input
                              type="number"
                              min="320"
                              max="4096"
                              step="64"
                              value={maxDimension}
                              onChange={(event) =>
                                setMaxDimension(
                                  Math.min(
                                    4096,
                                    Math.max(320, Number(event.target.value) || 320)
                                  )
                                )
                              }
                              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
                            />
                            <input
                              type="range"
                              min="320"
                              max="4096"
                              step="64"
                              value={maxDimension}
                              onChange={(event) => setMaxDimension(Number(event.target.value))}
                              className="mt-2 w-full accent-blue-500"
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    <p className="flex items-center gap-2 text-xs text-slate-500">
                      <LockKeyhole size={14} className="shrink-0 text-emerald-400" />
                      لا تُرفع الصور إلى الخادم؛ الضغط يتم في متصفحك.
                    </p>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() =>
                          activeImage && void processImages([activeImage])
                        }
                        disabled={!activeImage || isProcessing}
                        className={`${buttonClass} bg-blue-600 text-white shadow-lg shadow-blue-950/40 hover:bg-blue-500`}
                      >
                        {activeImage?.status === 'processing' ? (
                          <LoaderCircle size={18} className="animate-spin" />
                        ) : (
                          <Minimize2 size={18} />
                        )}
                        ضغط الصورة المحددة
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void processImages(
                            images.filter((image) => image.status !== 'done')
                          )
                        }
                        disabled={isProcessing || images.every((image) => image.status === 'done')}
                        className={`${buttonClass} border border-slate-700 bg-slate-900 text-slate-200 hover:border-blue-500 hover:text-white`}
                      >
                        <Zap size={18} />
                        ضغط كل الصور
                      </button>
                    </div>
                  </div>

                  {(batchProgress || finishedImages.length > 0) && (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                      <div className="text-sm text-emerald-200">
                        {batchProgress || `تم ضغط ${finishedImages.length} من ${images.length} صور`}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {finishedImages.length > 1 && (
                          <button
                            type="button"
                            onClick={() => void downloadZip()}
                            disabled={isZipping}
                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                          >
                            {isZipping ? (
                              <LoaderCircle size={15} className="animate-spin" />
                            ) : (
                              <FileArchive size={15} />
                            )}
                            تنزيل الكل ZIP
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={resetCompression}
                          disabled={isProcessing}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 transition hover:border-slate-500 disabled:opacity-50"
                        >
                          <RotateCcw size={14} />
                          إعادة الضغط
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            onChange={(event) => void addImages(event.target.files ?? [])}
            className="hidden"
          />
          {uploadError && (
            <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-sm leading-6 text-rose-300">
              <AlertCircle size={17} className="mt-1 shrink-0" />
              {uploadError}
            </p>
          )}
        </section>

        <section className="grid gap-4 sm:grid-cols-3" aria-label="مميزات الأداة">
          {[
            { icon: Zap, title: 'ضغط سريع ودفعي', desc: 'عالج مجموعة صور واحدة تلو الأخرى' },
            { icon: Minimize2, title: 'تحكم دقيق بالحجم', desc: 'أهداف 100 و200 و500 كيلوبايت' },
            { icon: LockKeyhole, title: 'خصوصية تامة', desc: 'صورك لا تُرسل إلى أي خادم' },
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
              'ارفع صورة واحدة أو عدة صور PNG أو JPG أو WEBP.',
              'حدد الحجم الأقصى أو الجودة والأبعاد وصيغة الملف.',
              'اضغط صورة واحدة أو عالج المجموعة، ثم نزّل النتيجة.',
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
              question: 'كيف أضغط صورة إلى أقل من 100 كيلوبايت؟',
              answer:
                'اختر «حجم محدد» واضغط 100 KB. إذا بقي الملف أكبر من الهدف، فعّل تصغير الأبعاد أو جرّب صورة أصغر؛ فالحد النهائي يتأثر بمحتوى الصورة ولا يمكن ضمانه لكل صورة.',
            },
            {
              question: 'هل أستطيع ضغط عدة صور دفعة واحدة؟',
              answer:
                'نعم، اختر عدة ملفات أو اسحبها إلى منطقة الرفع، ثم اضغط «ضغط كل الصور». تتم معالجتها بالتتابع ويمكن تنزيل نتائجها منفردة أو كملف ZIP.',
            },
            {
              question: 'هل صورك تُرفع إلى خادم؟',
              answer:
                'لا. قراءة الصورة وضغطها ومعاينة النتيجة تتم محليًا داخل المتصفح، ولا نرسل ملفاتك إلى خوادمنا.',
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
            ضغط محلي — صورك تبقى على جهازك
          </span>
          <Link href="/" className="inline-flex items-center gap-1 transition hover:text-blue-300">
            <ImageIcon size={14} />
            جميع أدوات APDF
          </Link>
        </footer>
      </div>
    </main>
  );
}
