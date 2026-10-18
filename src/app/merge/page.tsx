"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Files,
  ArrowRight,
  UploadCloud,
  FileText,
  Trash2,
  ArrowUp,
  ArrowDown,
  Download,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  Zap,
  HelpCircle,
  Loader2,
  Sparkles,
  Plus,
} from "lucide-react";
import { PDFDocument } from "pdf-lib";

interface UploadedPdfItem {
  id: string;
  file: File;
  name: string;
  size: string;
  pageCount?: number;
}

export default function MergePage() {
  const [items, setItems] = useState<UploadedPdfItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // شاشة التحميل والنتيجة النهائية
  const [downloadReady, setDownloadReady] = useState(false);
  const [mergedDownloadUrl, setMergedDownloadUrl] = useState<string | null>(null);
  const [outputFileName, setOutputFileName] = useState<string>("apdf_merged.pdf");

  // حالة السحب والإفلات في منطقة الرفع
  const [isDragOver, setIsDragOver] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const handleFilesAdded = async (fileList: FileList | File[]) => {
    const rawFiles = Array.from(fileList).filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
    );
    if (rawFiles.length === 0) return;

    setProcessing(true);
    setStatusMsg("جاري فحص ملفات الـ PDF...");

    const newItems: UploadedPdfItem[] = [];

    for (const f of rawFiles) {
      let pageCount: number | undefined = undefined;
      try {
        const buffer = await f.arrayBuffer();
        const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        pageCount = doc.getPageCount();
      } catch {
        // في حال تعذر القراءة الأولية يستمر الملف
      }

      newItems.push({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        file: f,
        name: f.name,
        size: formatFileSize(f.size),
        pageCount,
      });
    }

    setItems((prev) => [...prev, ...newItems]);
    setProcessing(false);
    setStatusMsg(null);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesAdded(e.target.files);
      e.target.value = "";
    }
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const updated = [...items];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setItems(updated);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // تنفيذ عملية الدمج
  const handleMergePdfs = async () => {
    if (items.length < 2) return;

    setProcessing(true);
    setStatusMsg("جاري دمج الملفات وإعداد النسخة الموحدة...");

    try {
      const mergedPdf = await PDFDocument.create();

      for (const item of items) {
        const fileBuffer = await item.file.arrayBuffer();
        const sourceDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true });
        const copiedPages = await mergedPdf.copyPages(sourceDoc, sourceDoc.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      const mergedBytes = await mergedPdf.save();
      const finalBlob = new Blob([mergedBytes as unknown as BlobPart], {
        type: "application/pdf",
      });

      const generatedUrl = URL.createObjectURL(finalBlob);
      setMergedDownloadUrl(generatedUrl);
      setOutputFileName(`apdf_merged_${Date.now()}.pdf`);
      setDownloadReady(true);
    } catch {
      setStatusMsg("حدث خطأ أثناء دمج الملفات. يرجى التأكد من سلامة الملفات.");
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setDownloadReady(false);
    setMergedDownloadUrl(null);
    setItems([]);
  };

  return (
    <div
      className="min-h-screen bg-[#070b12] text-slate-100 font-sans selection:bg-purple-500 selection:text-white relative flex flex-col justify-between"
      dir="rtl"
    >
      <div className="absolute top-0 right-1/4 w-[500px] h-[350px] bg-purple-600/10 blur-[130px] rounded-full pointer-events-none" />

      {/* الهيدر العلوي */}
      <header className="relative z-30 max-w-6xl mx-auto w-full px-4 py-4 flex items-center justify-between border-b border-slate-900">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800"
        >
          <ArrowRight className="w-4 h-4" /> الرئيسية
        </Link>
        <div className="flex items-center gap-2">
          <span className="font-black text-lg tracking-tight text-white">
            apdf<span className="text-purple-400">.app</span>
          </span>
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
            <Files className="w-4 h-4" />
          </div>
        </div>
      </header>

      <main className="relative z-20 max-w-4xl mx-auto px-3 py-6 flex-1 w-full space-y-12">
        {processing && (
          <div className="fixed inset-0 z-50 bg-[#070b12]/80 backdrop-blur-md flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            <span className="text-sm font-bold text-white">{statusMsg || "جاري المعالجة..."}</span>
          </div>
        )}

        {/* 🌟 شاشة التحميل والبانر الإعلاني عند اكتمال الدمج 🌟 */}
        {downloadReady && mergedDownloadUrl ? (
          <div className="max-w-xl mx-auto space-y-6 pt-2 animate-in fade-in zoom-in-95 duration-200">
            {/* 📢 مربع البانر الإعلاني (AdSense / Sponsor Area) */}
            <div className="w-full bg-slate-900/70 border border-dashed border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center text-center min-h-[120px] sm:min-h-[160px] relative overflow-hidden group">
              <span className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase mb-1">
                إعلان / Sponsored Ad
              </span>
              <div className="text-xs text-slate-400 flex flex-col items-center justify-center gap-1">
                <span className="font-bold text-slate-300">مساحة إعلانية جاهزة</span>
                <span className="text-[11px] text-slate-500">Google AdSense Responsive Banner</span>
              </div>
            </div>

            {/* بطاقة النتيجة وزر التحميل الرئيسي */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl relative">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <h2 className="text-xl sm:text-2xl font-black text-white">تم دمج ملفاتك بنجاح!</h2>
                <p className="text-xs sm:text-sm text-slate-400">
                  تم دمج كافة الملفات بالترتيب المحدد وأصبح المستند الموحد جاهزاً للتحميل الفوري.
                </p>
              </div>

              {/* زر التحميل */}
              <div className="space-y-3 pt-2">
                <a
                  href={mergedDownloadUrl}
                  download={outputFileName}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
                >
                  <Download className="w-5 h-5" /> اضغط هنا لتحميل الملف المدمج (PDF)
                </a>

                <button
                  onClick={handleReset}
                  className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center gap-2 border border-slate-800 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> دمج ملفات أخرى
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* واجهة الأداة الرئيسية والتحكم */
          <div className="space-y-8">
            <div className="max-w-xl mx-auto text-center space-y-2 pt-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" /> دمج سريع ومجاني
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                دمج ملفات <span className="text-purple-400">PDF</span>
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm">
                ارفع الملفات، رتّب تسلسلها بسهولة باللمس أو الأسهم، وادمجها في ملف واحد متكامل.
              </p>
            </div>

            {/* منطقة الرفع والسحب والإفلات */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  handleFilesAdded(e.dataTransfer.files);
                }
              }}
              className="max-w-2xl mx-auto"
            >
              <label
                className={`border-2 border-dashed rounded-3xl p-8 sm:p-10 flex flex-col items-center justify-center cursor-pointer transition text-center shadow-xl group ${
                  isDragOver
                    ? "border-purple-400 bg-purple-500/10 scale-[1.01]"
                    : "border-slate-800 hover:border-purple-500/60 bg-slate-950/60"
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <span className="text-sm font-bold text-white mb-1">
                  اضغط لاختيار ملفات PDF أو اسحبها هنا
                </span>
                <span className="text-[11px] text-slate-500">
                  يمكنك تحديد ملفين أو أكثر في نفس الوقت
                </span>
                <input
                  type="file"
                  multiple
                  accept=".pdf"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* قائمة الملفات وإعادة الترتيب */}
            {items.length > 0 && (
              <div className="max-w-2xl mx-auto space-y-4">
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="font-bold text-slate-300">
                    الملفات المحددة ({items.length}):
                  </span>
                  <label className="text-purple-400 hover:text-purple-300 cursor-pointer font-bold flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> إضافة المزيد
                    <input
                      type="file"
                      multiple
                      accept=".pdf"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="space-y-2.5">
                  {items.map((item, idx) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl hover:border-slate-700 transition"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <span className="w-6 h-6 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-bold text-slate-400 flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="truncate text-right">
                          <p className="text-xs font-bold text-white truncate max-w-[200px] sm:max-w-xs">
                            {item.name}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                            <span>{item.size}</span>
                            {item.pageCount && (
                              <>
                                <span>•</span>
                                <span>{item.pageCount} صفحة</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* أزرار التقديم والتأخير والحذف */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => moveItem(idx, "up")}
                          disabled={idx === 0}
                          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 transition"
                          title="تحريك لأعلى"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveItem(idx, "down")}
                          disabled={idx === items.length - 1}
                          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 transition"
                          title="تحريك لأسفل"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition mr-1"
                          title="حذف الملف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* زر تنفيذ الدمج الرئيسي */}
                <div className="pt-2">
                  <button
                    onClick={handleMergePdfs}
                    disabled={items.length < 2 || processing}
                    className="w-full py-3.5 px-6 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-purple-600/20 active:scale-[0.99] transition-all"
                  >
                    {items.length < 2 ? (
                      "يرجى إضافة ملفين على الأقل للدمج"
                    ) : (
                      <>
                        <Files className="w-4 h-4" /> دمج الملفات الآن ({items.length} ملفات)
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 🌟 محتوى السيو الشامل ودليل الاستخدام والأسئلة الشائعة 🌟 */}
        <section className="space-y-8 pt-8 border-t border-slate-900 text-xs sm:text-sm leading-relaxed text-slate-300">
          <div className="space-y-4">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" /> كيفية دمج ملفات PDF أونلاين بسهولة
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="bg-slate-950/60 border border-slate-900 rounded-2xl p-4 space-y-2">
                <span className="text-xs font-black px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">
                  1. رفع المستندات
                </span>
                <h3 className="font-bold text-white text-xs sm:text-sm">اختر أو اسحب الملفات</h3>
                <p className="text-slate-400 text-xs">
                  حدد ملفين أو أكثر من جهازك دفعة واحدة، أو قم بسحبها وإفلاتها مباشرة في المربع المخصص.
                </p>
              </div>
              <div className="bg-slate-950/60 border border-slate-900 rounded-2xl p-4 space-y-2">
                <span className="text-xs font-black px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">
                  2. إعادة الترتيب
                </span>
                <h3 className="font-bold text-white text-xs sm:text-sm">ضبط تسلسل الصفحات</h3>
                <p className="text-slate-400 text-xs">
                  استخدم أزرار الأسهم لتقديم أو تأخير أي مستند حتى يصبح الترتيب مطابقاً لما تريده بدقة.
                </p>
              </div>
              <div className="bg-slate-950/60 border border-slate-900 rounded-2xl p-4 space-y-2">
                <span className="text-xs font-black px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">
                  3. الدمج الفوري
                </span>
                <h3 className="font-bold text-white text-xs sm:text-sm">تحميل الملف النهائي</h3>
                <p className="text-slate-400 text-xs">
                  اضغط على زر الدمج ليتم تجميع الملفات في ثوانٍ معدودة بصيغة PDF واحدة جاهزة للتنزيل مجاناً.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-950/50 border border-slate-900 rounded-2xl p-5 space-y-4">
            <h2 className="text-base font-bold text-white">مميزات أداة دمج ملفات PDF من apdf.app</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white">أمان وخصوصية كاملة 100%</h4>
                  <p className="text-slate-400">
                    تتم عملية دمج وتنسيق الصفحات داخلياً في متصفحك عبر معالج جهازك، دون إرسال ملفاتك إلى أي خوادم خارجية.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Zap className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white">سرعة فائقة وبدون قيود</h4>
                  <p className="text-slate-400">
                    ادمج عدد غير محدود من الصفحات بدون انتظار أو قيود يومية، مع الحفاظ الكامل على الجودة الأصلية والتنسيق.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-purple-400" /> أسئلة شائعة حول دمج ملفات PDF
            </h2>
            <div className="space-y-2">
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-900 space-y-1">
                <h3 className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> هل يتأثر وضوح النصوص أو جودة الصور بعد الدمج؟
                </h3>
                <p className="text-slate-400 text-xs pr-5">
                  لا إطلاقاً، تحافظ مكتبة الدمج على نفس الدقة والوضوح للملفات الأصلية دون إعادة ضغط أو تقليل للجودة.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-900 space-y-1">
                <h3 className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> هل تضع الأداة أي علامات مائية على الملف المدمج؟
                </h3>
                <p className="text-slate-400 text-xs pr-5">
                  الأداة مجانية بالكامل ومفتوحة المصدر للمستخدمين، وتخرج ملفاتك نظيفة تماماً دون أي علامات مائية أو إضافات مزعجة.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-900 space-y-1">
                <h3 className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> هل يمكن استخدام الأداة من الهاتف المحمول؟
                </h3>
                <p className="text-slate-400 text-xs pr-5">
                  نعم، واجهة الأداة مصممة بنظام استجابة متكامل يعمل بسلاسة وسرعة على جميع الهواتف الذكية (آيفون وأندرويد) والأجهزة اللوحية.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* الفوتر */}
      <footer className="border-t border-slate-900 py-6 bg-slate-950/70 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} apdf.app - جميع الحقوق محفوظة.
      </footer>
    </div>
  );
}