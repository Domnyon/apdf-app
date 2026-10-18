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
  Globe2,
} from "lucide-react";

const tools = [
  { title: "محرر وتوقيع PDF", desc: "توقيع المستندات وإضافة نصوص وأشكال", href: "/editor", icon: FileSignature, color: "from-blue-500 to-indigo-600", badge: "شائع" },
  { title: "دمج ملفات PDF", desc: "دمج عدة ملفات وترتيب الصفحات", href: "/merge", icon: Layers, color: "from-purple-500 to-pink-600", badge: null },
  { title: "تقسيم واستخراج", desc: "حذف صفحات محددة واستخراج ما تحتاجه", href: "/split", icon: Scissors, color: "from-amber-500 to-orange-600", badge: null },
  { title: "ضغط ملفات PDF", desc: "تصغير حجم المستند والحفاظ على الجودة", href: "/compress", icon: Minimize2, color: "from-rose-500 to-red-600", badge: "مطلوب" },
  { title: "طباعة PDF والصور", desc: "معاينة الملفات والطباعة عبر Wi-Fi", href: "/print-pdf", icon: Printer, color: "from-sky-500 to-indigo-600", badge: null },
  { title: "تحويل شامل (صور / PDF)", desc: "تحويل بين PDF والصور ومجلدات ZIP", href: "/convert", icon: ArrowLeftRight, color: "from-emerald-500 to-teal-600", badge: "شامل" },
  { title: "تدوير الصفحات", desc: "تعديل اتجاه الصفحات المقلوبة بلمسة", href: "/rotate", icon: RotateCw, color: "from-cyan-500 to-blue-600", badge: null },
  { title: "تحويل وتعديل لوورد (AI)", desc: "استخراج نصوص وتعديل المستند بالذكاء", href: "/pdf-to-word", icon: Bot, color: "from-violet-500 to-fuchsia-600", badge: "ذكاء اصطناعي" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 font-sans relative flex flex-col justify-between" dir="rtl">
      {/* Header */}
      <header className="max-w-5xl mx-auto w-full px-4 py-4 flex items-center justify-between border-b border-slate-900">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-black text-lg tracking-tight text-white">apdf<span className="text-purple-400">.app</span></span>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-full border border-slate-800">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> آمن ومجاني 100%
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-3 py-8 space-y-10 flex-1 w-full">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold">
            <Zap className="w-3.5 h-3.5" /> منصة أدوات PDF السريعة
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight">
            الحل الشامل لمعالجة وتحرير ملفات <span className="text-purple-400">PDF</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
            مجموعة أدوات مجانية لإدارة مستنداتك محلياً مباشرة من متصفحك دون رفع ملفاتك إلى أي خادم خارجي.
          </p>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {tools.map((tool, idx) => {
            const Icon = tool.icon;
            return (
              <Link
                key={idx}
                href={tool.href}
                className="group bg-slate-950/70 hover:bg-slate-900/90 border border-slate-800/80 hover:border-purple-500/50 rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 active:scale-95 shadow-lg relative overflow-hidden"
              >
                {tool.badge && (
                  <span className="absolute top-2.5 left-2.5 px-1.5 py-0.5 rounded-md bg-purple-500/20 border border-purple-500/30 text-[9px] font-black text-purple-300">
                    {tool.badge}
                  </span>
                )}
                <div>
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center text-white shadow-md mb-2.5 group-hover:scale-105 transition-transform`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-xs sm:text-sm text-white group-hover:text-purple-300 transition-colors">
                    {tool.title}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {tool.desc}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Features Info */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-4">
          <div className="bg-slate-950/50 border border-slate-900 rounded-2xl p-4 space-y-2">
            <div className="p-2 w-fit rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Lock className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-xs sm:text-sm text-white">حماية وخصوصية تامة</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">تتم معالجة المستندات على جهازك محلياً دون رفع بياناتك لأي جهة خارجية.</p>
          </div>
          <div className="bg-slate-950/50 border border-slate-900 rounded-2xl p-4 space-y-2">
            <div className="p-2 w-fit rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-xs sm:text-sm text-white">معالجة فورية فائقة</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">تنفيذ العمليات في أجزاء من الثانية دون انتظار رفع أو تنزيل المستندات.</p>
          </div>
          <div className="bg-slate-950/50 border border-slate-900 rounded-2xl p-4 space-y-2">
            <div className="p-2 w-fit rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Globe2 className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-xs sm:text-sm text-white">مجاني بدون تسجيل</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">استخدم كل الوظائف عبر الهواتف الذكية وأجهزة الحاسوب بدون رسوم اشتراك.</p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 mt-8 bg-slate-950/70">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} apdf.app - جميع الحقوق محفوظة.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-purple-400 transition-colors">سياسة الخصوصية</Link>
            <Link href="/terms" className="hover:text-purple-400 transition-colors">شروط الاستخدام</Link>
            <Link href="/about" className="hover:text-purple-400 transition-colors">من نحن</Link>
            <Link href="/contact" className="hover:text-purple-400 transition-colors">اتصل بنا</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
