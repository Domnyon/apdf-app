"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Scissors,
  ArrowRight,
  UploadCloud,
  FileText,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  Zap,
  HelpCircle,
  Loader2,
  Sparkles,
  Download,
  Check,
} from "lucide-react";
import { PDFDocument } from "pdf-lib";

interface PageItem {
  pageIndex: number;
  pageNumber: number;
  selected: boolean;
}

export default function SplitPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const [mode, setMode] = useState<"extract" | "delete">("extract");

  const [downloadReady, setDownloadReady] = useState(false);
  const [resultDownloadUrl, setResultDownloadUrl] = useState<string | null>(null);
  const [outputFileName, setOutputFileName] = useState<string>("apdf_split.pdf");
  const [savedPagesCount, setSavedPagesCount] = useState<number>(0);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setProcessing(true);
    setStatusMsg("جاري قراءة صفحات المستند...");

    try {
      const buffer = await uploadedFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const totalPages = pdfDoc.getPageCount();

      const initialPages: PageItem[] = Array.from({ length: totalPages }, (_, i) => ({
        pageIndex: i,
        pageNumber: i + 1,
        selected: true,
      }));

      setFile(uploadedFile);
      setPages(initialPages);
    } catch {
      setStatusMsg("تعذر فتح ملف الـ PDF. يرجى التأكد من سلامته.");
    } finally {
      setProcessing(false);
      setStatusMsg(null);
    }
  };

  const togglePageSelection = (idx: number) => {
    setPages((prev) =>
      prev.map((p) => (p.pageIndex === idx ? { ...p, selected: !p.selected } : p))
    );
  };

  const selectAll = (status: boolean) => {
    setPages((prev) => prev.map((p) => ({ ...p, selected: status })));
  };

  const selectOdd = () => {
    setPages((prev) =>
      prev.map((p) => ({ ...p, selected: p.pageNumber % 2 !== 0 }))
    );
  };

  const selectEven = () => {
    setPages((prev) =>
      prev.map((p) => ({ ...p, selected: p.pageNumber % 2 === 0 }))
    );
  };

  const handleProcessPdf = async () => {
    if (!file || pages.length === 0) return;

    let targetIndices: number[] = [];
    if (mode === "extract") {
      targetIndices = pages.filter((p) => p.selected).map((p) => p.pageIndex);
    } else {
      targetIndices = pages.filter((p) => !p.selected).map((p) => p.pageIndex);
    }

    if (targetIndices.length === 0) {
      alert("يجب اختيار صفحة واحدة على الأقل للاحتفاظ بها.");
      return;
    }

    setProcessing(true);
    setStatusMsg("جاري استخراج الصفحات وإعداد ملف الـ PDF...");

    try {
      const originalBuffer = await file.arrayBuffer();
      const sourceDoc = await PDFDocument.load(originalBuffer, { ignoreEncryption: true });
      const newPdf = await PDFDocument.create();

      const copiedPages = await newPdf.copyPages(sourceDoc, targetIndices);
      copiedPages.forEach((page) => newPdf.addPage(page));

      const finalBytes = await newPdf.save();
      const finalBlob = new Blob([finalBytes as unknown as BlobPart], {
        type: "application/pdf",
      });

      const generatedUrl = URL.createObjectURL(finalBlob);
      setResultDownloadUrl(generatedUrl);
      setSavedPagesCount(targetIndices.length);
      setOutputFileName(`apdf_split_${Date.now()}.pdf`);
      setDownloadReady(true);
    } catch {
      setStatusMsg("حدث خطأ أثناء تقسيم الملف.");
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setDownloadReady(false);
    setResultDownloadUrl(null);
    setFile(null);
    setPages([]);
    setMode("extract");
  };

  const selectedCount = pages.filter((p) => p.selected).length;
  const remainingCount = pages.length - selectedCount;

  return (
    <div
      className="min-h-screen bg-[#070b12] text-slate-100 font-sans selection:bg-purple-500 selection:text-white relative flex flex-col justify-between"
      dir="rtl"
    >
      <div className="absolute top-0 right-1/4 w-[500px] h-[350px] bg-purple-600/10 blur-[130px] rounded-full pointer-events-none" />

      {/* Header */}
      <header className="relative z-30 max-w-6xl mx-auto w-full px-4 py-4 flex items-center justify-between border-b border-slate-900">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800"
        >
          <ArrowRight className="w-4 h-4" />
          <span>الرئيسية</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="font-black text-lg tracking-tight text-white">
            apdf<span className="text-purple-400">.app</span>
          </span>
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
            <Scissors className="w-4 h-4" />
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

        {/* شاشة التحميل والبانر الإعلاني عند اكتمال الاستخراج */}
        {downloadReady && resultDownloadUrl ? (
          <div className="max-w-xl mx-auto space-y-6 pt-2 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-full bg-slate-900/70 border border-dashed border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center text-center min-h-[120px] sm:min-h-[160px] relative overflow-hidden group">
              <span className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase mb-1">
                إعلان / Sponsored Ad
              </span>
              <div className="text-xs text-slate-400 flex flex-col items-center justify-center gap-1">
                <span className="font-bold text-slate-300">مساحة إعلانية جاهزة</span>
                <span className="text-[11px] text-slate-500">Google AdSense Responsive Banner</span>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-2xl relative">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <h2 className="text-xl sm:text-2xl font-black text-white">تم تجهيز ملفك بنجاح!</h2>
                <p className="text-xs sm:text-sm text-slate-400">
                  تم استخراج وتجميع ({savedPagesCount}) صفحة بنجاح وبجودتها الكاملة.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <a
                  href={resultDownloadUrl}
                  download={outputFileName}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
                >
                  <Download className="w-5 h-5" />
                  <span>اضغط هنا لتحميل الملف (PDF)</span>
                </a>

                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center gap-2 border border-slate-800 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>قص ملف آخر</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="max-w-xl mx-auto text-center space-y-2 pt-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>قص وفصل الصفحات</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                قص واستخراج صفحات <span className="text-purple-400">PDF</span>
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm">
                اختر الملف، حدد الصفحات التي تريد استخراجها أو حذفها، واحفظ المستند في ثوانٍ.
              </p>
            </div>

            {!file && (
              <div className="max-w-md mx-auto">
                <label className="border-2 border-dashed border-slate-800 hover:border-purple-500/60 rounded-3xl p-10 flex flex-col items-center justify-center cursor-pointer transition bg-slate-950/60 text-center shadow-xl group">
                  <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3 group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <span className="text-sm font-bold text-white mb-1">
                    اضغط لاختيار ملف PDF
                  </span>
                  <span className="text-[11px] text-slate-500">من جهازك أو ألبوم الملفات</span>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            {file && pages.length > 0 && (
              <div className="max-w-2xl mx-auto space-y-6">
                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs">
                      <span className="font-bold text-white">{file.name}</span>
                      <span className="text-slate-400 mr-2">({pages.length} صفحة)</span>
                    </div>

                    <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
                      <button
                        type="button"
                        onClick={() => setMode("extract")}
                        className={`px-3 py-1.5 rounded-lg font-bold transition ${
                          mode === "extract"
                            ? "bg-purple-600 text-white"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        استخراج المحدد
                      </button>
                      <button
                        type="button"
                        onClick={() => setMode("delete")}
                        className={`px-3 py-1.5 rounded-lg font-bold transition ${
                          mode === "delete"
                            ? "bg-rose-600 text-white"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        حذف المحدد
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-900 text-xs">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => selectAll(true)}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition"
                      >
                        تحديد الكل
                      </button>
                      <button
                        type="button"
                        onClick={() => selectAll(false)}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition"
                      >
                        إلغاء التحديد
                      </button>
                      <button
                        type="button"
                        onClick={selectOdd}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition"
                      >
                        فردي
                      </button>
                      <button
                        type="button"
                        onClick={selectEven}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition"
                      >
                        زوجي
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        setPages([]);
                      }}
                      className="text-slate-400 hover:text-rose-400 flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>تغيير الملف</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {pages.map((p) => {
                    const isSelected = p.selected;
                    const willKeep = mode === "extract" ? isSelected : !isSelected;

                    return (
                      <button
                        key={p.pageIndex}
                        type="button"
                        onClick={() => togglePageSelection(p.pageIndex)}
                        className={`relative aspect-[3/4] rounded-2xl border-2 p-2 flex flex-col items-center justify-between transition-all group ${
                          isSelected
                            ? mode === "extract"
                              ? "bg-purple-950/20 border-purple-500 shadow-lg shadow-purple-500/10 scale-[1.02]"
                              : "bg-rose-950/20 border-rose-500 scale-[0.98] opacity-70"
                            : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                        }`}
                      >
                        <div className="w-full flex justify-end">
                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center transition ${
                              isSelected
                                ? mode === "extract"
                                  ? "bg-purple-500 text-slate-950"
                                  : "bg-rose-500 text-white"
                                : "border border-slate-700 bg-slate-900 text-transparent"
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </div>
                        </div>

                        <div className="flex flex-col items-center gap-1">
                          <FileText
                            className={`w-8 h-8 transition ${
                              willKeep ? "text-purple-400" : "text-slate-600 line-through"
                            }`}
                          />
                          <span className="text-xs font-bold text-slate-300">
                            صفحة {p.pageNumber}
                          </span>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            willKeep
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-rose-500/10 text-rose-400"
                          }`}
                        >
                          {willKeep ? "سيتم الحفظ" : "سيتم الحذف"}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleProcessPdf}
                    disabled={processing}
                    className="w-full py-4 px-6 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-purple-600/20 active:scale-[0.99] transition-all"
                  >
                    <Scissors className="w-4 h-4" />
                    <span>
                      {mode === "extract"
                        ? `استخراج وحفظ (${selectedCount}) صفحة`
                        : `حذف (${selectedCount}) وحفظ الباقي (${remainingCount}) صفحة`}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* محتوى السيو الشامل ودليل الاستخدام والأسئلة الشائعة */}
        <section className="space-y-8 pt-8 border-t border-slate-900 text-xs sm:text-sm leading-relaxed text-slate-300">
          <div className="space-y-4">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>كيفية قص واستخراج صفحات PDF أونلاين</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="bg-slate-950/60 border border-slate-900 rounded-2xl p-4 space-y-2">
                <span className="text-xs font-black px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">
                  1. رفع الملف
                </span>
                <h3 className="font-bold text-white text-xs sm:text-sm">اختر ملف PDF</h3>
                <p className="text-slate-400 text-xs">
                  ارفع المستند من جهازك ثم انتظر حتى يتم تحميل جميع الصفحات وتظهر في اللوحة التفاعلية.
                </p>
              </div>
              <div className="bg-slate-950/60 border border-slate-900 rounded-2xl p-4 space-y-2">
                <span className="text-xs font-black px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">
                  2. اختر الصفحات
                </span>
                <h3 className="font-bold text-white text-xs sm:text-sm">حدد ما تريد حفظه أو حذفـه</h3>
                <p className="text-slate-400 text-xs">
                  اضغط على أي صفحة لتحديدها، أو استخدم أزرار التحديد السريع لكافة الصفحات الفردية أو الزوجية.
                </p>
              </div>
              <div className="bg-slate-950/60 border border-slate-900 rounded-2xl p-4 space-y-2">
                <span className="text-xs font-black px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">
                  3. حفظ الملف
                </span>
                <h3 className="font-bold text-white text-xs sm:text-sm">حمّل النتيجة فوراً</h3>
                <p className="text-slate-400 text-xs">
                  بمجرد النقر على زر التنفيذ، سيتم تجميع الصفحات المختارة في ملف PDF جديد جاهز للتحميل.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-950/50 border border-slate-900 rounded-2xl p-5 space-y-4">
            <h2 className="text-base font-bold text-white">مميزات أداة قص PDF من apdf.app</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white">أمان وخصوصية كاملة</h4>
                  <p className="text-slate-400">
                    تتم معالجة ملفك مباشرة داخل المتصفح، دون تحميله إلى خوادم خارجية أو حفظ نسخة خارجية.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Zap className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-white">سرعة ومتانة</h4>
                  <p className="text-slate-400">
                    قص الصفحات يعمل بسرعة كبيرة مع الحفاظ على جودة المستند الأصلي وتقليل التعقيد في التعامل معه.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-purple-400" />
              أسئلة شائعة حول قص ملفات PDF
            </h2>
            <div className="space-y-2">
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-900 space-y-1">
                <h3 className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> هل يمكن استخراج صفحات معينة فقط؟
                </h3>
                <p className="text-slate-400 text-xs pr-5">
                  نعم، يمكنك اختيار الصفحات المراد الاحتفاظ بها أو حذفها ثم إنشاء ملف PDF جديد مباشرة دون تعديل الملف الأصلي.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-900 space-y-1">
                <h3 className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> هل يدعم القص ملفات PDF الكبيرة؟
                </h3>
                <p className="text-slate-400 text-xs pr-5">
                  نعم، الأداة تستوعب ملفات PDF متعددة الصفحات وتقوم بمعالجة الصفحات المختارة بشكل آمن وسريع.
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-900 space-y-1">
                <h3 className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> هل ستبقى جودة الملف دون فقدان؟
                </h3>
                <p className="text-slate-400 text-xs pr-5">
                  نعم، يتم الاحتفاظ بجودة الصفحات داخل الملف الجديد مع الحفاظ على دقة محتوى المستند والرسومات الأصلية.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
