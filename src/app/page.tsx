"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Layers,
  Scissors,
  FileSignature,
  Images,
  FileDigit,
  Printer,
  ShieldCheck,
  Zap,
  Infinity as InfinityIcon,
  Menu,
  X,
  Sparkles,
  ArrowLeft,
} from "lucide-react";

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const tools = [
    {
      id: "merge",
      title: "دمج PDF",
      desc: "دمج عدة ملفات PDF في ملف واحد بسهولة وسرعة.",
      route: "/merge",
      icon: Layers,
      badge: "الأكثر استخداماً",
      accent: "text-emerald-400",
      badgeColor: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
      border: "border-emerald-500/50 hover:border-emerald-400",
      glow: "hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]",
      btnBg: "bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950",
    },
    {
      id: "split",
      title: "قص وتجزئة PDF",
      desc: "قسم ملفات PDF إلى أجزاء أصغر أو قص الصفحات التي تحتاجها.",
      route: "/split",
      icon: Scissors,
      badge: null,
      accent: "text-rose-400",
      badgeColor: "",
      border: "border-rose-500/50 hover:border-rose-400",
      glow: "hover:shadow-[0_0_30px_rgba(244,63,94,0.15)]",
      btnBg: "bg-rose-500/20 text-rose-400 group-hover:bg-rose-500 group-hover:text-slate-950",
    },
    {
      id: "editor",
      title: "كتابة وتوقيع وختم",
      desc: "أضف النصوص، التوقيعات، والختم على ملفات PDF بسهولة.",
      route: "/editor",
      icon: FileSignature,
      badge: "محرر تفاعلي",
      accent: "text-purple-400",
      badgeColor: "bg-purple-500/20 text-purple-400 border border-purple-500/30",
      border: "border-purple-500/50 hover:border-purple-400",
      glow: "hover:shadow-[0_0_30px_rgba(168,85,247,0.15)]",
      btnBg: "bg-purple-500/20 text-purple-400 group-hover:bg-purple-500 group-hover:text-slate-950",
    },
    {
      id: "convert",
      title: "تحويل صور إلى PDF",
      desc: "حوّل صورك إلى ملفات PDF بجودة عالية.",
      route: "/convert",
      icon: Images,
      badge: null,
      accent: "text-sky-400",
      badgeColor: "",
      border: "border-sky-500/50 hover:border-sky-400",
      glow: "hover:shadow-[0_0_30px_rgba(56,189,248,0.15)]",
      btnBg: "bg-sky-500/20 text-sky-400 group-hover:bg-sky-500 group-hover:text-slate-950",
    },
    {
      id: "pages",
      title: "ترقيم الصفحات",
      desc: "أضف أرقام الصفحات إلى ملفات PDF بشكل تلقائي وسهل.",
      route: "/pages",
      icon: FileDigit,
      badge: null,
      accent: "text-amber-400",
      badgeColor: "",
      border: "border-amber-500/50 hover:border-amber-400",
      glow: "hover:shadow-[0_0_30px_rgba(245,158,11,0.15)]",
      btnBg: "bg-amber-500/20 text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950",
    },
    {
      id: "print",
      title: "طباعة المستند",
      desc: "جهز ملف PDF للطباعة مع خيارات مرنة وسهلة.",
      route: "/print",
      icon: Printer,
      badge: null,
      accent: "text-blue-400",
      badgeColor: "",
      border: "border-blue-500/50 hover:border-blue-400",
      glow: "hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]",
      btnBg: "bg-blue-500/20 text-blue-400 group-hover:bg-blue-500 group-hover:text-slate-950",
    },
  ];

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 font-sans selection:bg-emerald-500 selection:text-black relative overflow-hidden" dir="rtl">
      {/* توهج الخلفية */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[400px] bg-emerald-600/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-[500px] h-[350px] bg-teal-600/10 blur-[140px] rounded-full pointer-events-none" />

      {/* الشريط العلوي */}
      <header className="relative z-30 max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-11 h-11 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-center text-slate-300 hover:text-white transition"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-900/60 border border-emerald-500/30 text-emerald-400 text-xs font-semibold backdrop-blur-md">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>100% على جهازك وبخصوصية تامة</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-extrabold text-2xl tracking-tight text-white">
            apdf<span className="text-emerald-400">.app</span>
          </span>
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center font-black text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.3)] text-2xl">
            A
          </div>
        </div>
      </header>

      {/* المحتوى الرئيسي */}
      <main className="relative z-20 max-w-6xl mx-auto px-6 pt-6 pb-20 space-y-14">
        <div className="text-center space-y-5 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-slate-900/90 border border-emerald-500/40 text-emerald-400 text-xs font-bold shadow-lg shadow-emerald-950/40 backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>معالجة فورية داخل المتصفح بدون خوادم</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-white leading-tight tracking-tight">
            أدوات الـ PDF الأسهل، <br />
            <span className="text-emerald-400 drop-shadow-[0_0_25px_rgba(52,211,153,0.3)]">
              الأسرع، والأكثر أمانًا.
            </span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl mx-auto font-medium">
            مع <span className="text-white font-bold">apdf.app</span> يمكنك معالجة ملفات الـ PDF مباشرة داخل متصفحك،
            بدون رفعها إلى أي خوادم. خصوصيتك أولاً، دائماً.
          </p>
        </div>

        {/* شبكة البطاقات الست */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((t) => {
            const Icon = t.icon;
            return (
              <Link
                key={t.id}
                href={t.route}
                className={`group relative p-7 rounded-[28px] bg-slate-950/70 border backdrop-blur-xl transition-all duration-300 flex flex-col justify-between h-[230px] ${t.border} ${t.glow}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <Icon className={`w-8 h-8 ${t.accent}`} />
                    {t.badge && (
                      <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${t.badgeColor}`}>
                        {t.badge}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-black text-white mb-2">{t.title}</h2>
                  <p className="text-xs text-slate-400 leading-relaxed font-medium">{t.desc}</p>
                </div>

                <div className="flex items-center gap-2 mt-auto">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${t.btnBg}`}>
                    <ArrowLeft className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-mono text-slate-500 group-hover:text-slate-300 transition-colors">
                    {t.route}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* شريط المزايا الثلاثي */}
        <div className="p-7 rounded-[26px] bg-slate-900/40 border border-slate-800/80 backdrop-blur-md grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="space-y-2">
            <div className="w-10 h-10 mx-auto rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">سرعة فائقة</h3>
            <p className="text-xs text-slate-400">لا توجد أوقات انتظار، كل شيء فوري داخل المتصفح.</p>
          </div>

          <div className="space-y-2 md:border-x md:border-slate-800/80 md:px-4">
            <div className="w-10 h-10 mx-auto rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">خصوصية مطلقة</h3>
            <p className="text-xs text-slate-400">ملفاتك لا تُرفع إلى أي خوادم، تبقى على جهازك فقط.</p>
          </div>

          <div className="space-y-2">
            <div className="w-10 h-10 mx-auto rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <InfinityIcon className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">مجاني بالكامل بدون تسجيل</h3>
            <p className="text-xs text-slate-400">استخدم جميع الأدوات مجاناً وبدون الحاجة لإنشاء حساب.</p>
          </div>
        </div>
      </main>

      {/* الفوتر */}
      <footer className="relative z-20 border-t border-slate-900 max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <p>جميع الحقوق محفوظة © 2026 apdf.app</p>
        <div className="flex items-center gap-6">
          <a href="#" className="hover:text-slate-300 transition">من نحن</a>
          <a href="#" className="hover:text-slate-300 transition">سياسة الخصوصية</a>
        </div>
      </footer>
    </div>
  );
}
