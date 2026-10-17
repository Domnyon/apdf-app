"use client";

import React from "react";
import Link from "next/link";
import {
  FileSignature,
  Layers,
  Scissors,
  ArrowLeftRight,
  RotateCw,
  Bot,
  Sparkles,
  ShieldCheck,
  Zap,
  Minimize2,
  Printer,
  Lock,
  Cpu,
  Globe2,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";

const tools = [
  {
    title: "محرر وتوقيع PDF",
    desc: "توقيع المستندات وإضافة نصوص وأشكال باللمس",
    href: "/editor",
    icon: FileSignature,
    color: "from-blue-500 to-indigo-600",
    badge: "شائع",
  },
  {
    title: "دمج ملفات PDF",
    desc: "دمج عدة ملفات وترتيب الصفحات بسلاسة",
    href: "/merge",
    icon: Layers,
    color: "from-purple-500 to-pink-600",
    badge: null,
  },
  {
    title: "تقسيم واستخراج",
    desc: "حذف صفحات محددة واستخراج ما تحتاجه",
    href: "/split",
    icon: Scissors,
    color: "from-amber-500 to-orange-600",
    badge: null,
  },
  {
    title: "ضغط ملفات PDF",
    desc: "تصغير حجم المستند مع الحفاظ على وضوح الخطوط",
    href: "/compress",
    icon: Minimize2,
    color: "from-rose-500 to-red-600",
    badge: "مطلوب",
  },
  {
    title: "طباعة ملفات PDF",
    desc: "معاينة وضبط خيارات القياس والطباعة المباشرة",
    href: "/print",
    icon: Printer,
    color: "from-sky-500 to-indigo-600",
    badge: null,
  },
  {
    title: "تحويل شامل (صور / PDF)",
    desc: "تحويل بين PDF والصور ومجلدات ZIP",
    href: "/convert",
    icon: ArrowLeftRight,
    color: "from-emerald-500 to-teal-600",
    badge: "شامل",
  },
  {
    title: "تدوير الصفحات",
    desc: "تعديل اتجاه الصفحات المقلوبة بلمسة",
    href: "/rotate",
    icon: RotateCw,
    color: "from-cyan-500 to-blue-600",
    badge: null,
  },
  {
    title: "تحويل وتعديل لوورد (AI)",
    desc: "استخراج نصوص وتعديل المستند بواسطة Gemini",
    href: "/pdf-to-word",
    icon: Bot,
    color: "from-violet-500 to-fuchsia-600",
    badge: "ذكاء اصطناعي",
  },
];

const features = [
  {
    icon: Lock,
    title: "أمان وخصوصية 100%",
    desc: "تتم معالجة المستندات مباشرة عبر متصفح جهازك بواسطة تقنيات الويب الحديثة. ملفاتك وبياناتك الشخصية لا تُرفع إلى أي خادم خارجي، مما يضمن سرية تامة لمعلوماتك.",
  },
  {
    icon: Zap,
    title: "سرعة فائقة بدون انتظار",
    desc: "لا حاجة لانتظار رفع الملفات وتنزيلها من السيرفر. تجري جميع عمليات الدمج، التقطيع، والضغط في أجزاء من الثانية بالاعتماد على قوة معالج جهازك.",
  },
  {
    icon: Globe2,
    title: "مجاني ومتاح من أي جهاز",
    desc: "تعمل أدواتنا بكفاءة على جميع الأجهزة الذكية: هواتف أندرويد وآيفون، والأجهزة اللوحية، وأجهزة الكمبيوتر بدون الحاجة لتثبيت أي برامج أو دفع اشتراكات.",
  },
];

const faqs = [
  {
    q: "هل ملفاتي ومستنداتي آمنة عند استخدام أدوات apdf.app؟",
    a: "نعم، آمنة تماماً. الموقع يعتمد على تقنية Client-Side Processing؛ أي أن معالجة ملفات PDF تتم محلياً داخل نافذة المتصفح على هاتفك أو حاسوبك دون رفعها إلى أي سحابة أو خوادم وسيطة.",
  },
  {
    q: "هل تفرض المنصة حداً أقصى لحجم الملفات أو عدد الصفحات؟",
    a: "نظراً لأن المعالجة تتم على جهازك مباشرة، يمكنك معالجة الملفات الكبيرة بحرية تامة اعتماداً على قدرة ذاكرة جهازك، دون تقييد بعدد العمليات اليومية.",
  },
  {
    q: "كيف تساعد ميزات الذكاء الاصطناعي في تحويل وتعديل الملفات؟",
    a: "نوفر أداة متقدمة تدعم التعرف الضوئي على الحروف (OCR) ومعالجة النصوص عبر الذكاء الاصطناعي، لتسهيل استخراج النصوص وتعديل المستندات المصورة بدقة وسرعة عالية.",
  },
];

export default function HomePage() {
  return (
    <div
      className="min-h-screen bg-[#070b12] text-slate-100 font-sans selection:bg-purple-500 selection:text-white relative flex flex-col justify-between"
      dir="rtl"
    >
      {/* خلفية جمالية خفيفة */}
      <div className="absolute top-0 right-1/4 w-[450px] h-[300px] bg-purple-600/10 blur-[130px] rounded-full pointer-events-none" />

      {/* الرأس (Header) */}
      <header className="relative z-30 max-w-5xl mx-auto w-full px-4 py-4 flex items-center justify-between border-b border-slate-900">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-black text-lg tracking-tight text-white">
            apdf<span className="text-purple-400">.app</span>
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-full border border-slate-800">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> آمن ومجاني 100%
        </div>
      </header>

      {/* المحتوى الرئيسي */}
      <main className="relative z-20 max-w-4xl mx-auto px-3 py-8 space-y-16 flex-1 w-full">
        {/* المقدمة الترحيبية */}
        <div className="text-center space-y-3 max-w-2xl mx-auto pt-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold">
            <Zap className="w-3.5 h-3.5" /> منصة أدوات PDF الذكية والمجانية
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight">
            الحل المتكامل لمعالجة وتحرير ملفات{" "}
            <span className="text-purple-400">PDF</span> أونلاين
          </h1>
          <p className="text-slate-400 text-xs sm:text-base leading-relaxed">
            مجموعة متكاملة من الأدوات السريعة والمجانية لإدارة وتعديل مستنداتك الرقمية بكل احترافية، مصممة لتعمل بسلاسة على الهاتف والكمبيوتر وبأقصى معايير الأمان والخصوصية.
          </p>
        </div>

        {/* شبكة الأدوات - 8 بطاقات متناسقة */}
        <div>
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-sm sm:text-base font-bold text-slate-200">
              الأدوات المتاحة
            </h2>
            <span className="text-xs text-slate-500">اختر الأداة للبدء فوراً</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3.5">
            {tools.map((tool, idx) => {
              const Icon = tool.icon;
              return (
                <Link
                  key={idx}
                  href={tool.href}
                  className="group bg-slate-950/70 hover:bg-slate-900/90 border border-slate-800/80 hover:border-purple-500/50 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between transition-all duration-200 active:scale-95 shadow-lg relative overflow-hidden"
                >
                  {tool.badge && (
                    <span className="absolute top-2.5 left-2.5 px-1.5 py-0.5 rounded-md bg-purple-500/20 border border-purple-500/30 text-[9px] font-black text-purple-300">
                      {tool.badge}
                    </span>
                  )}

                  <div>
                    <div
                      className={`w-9 h-9 sm:w
