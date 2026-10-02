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
  Infinity,
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
      accent: "text-rose-400",
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
      accent: "text-sky-400",
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
      accent: "text-amber-400",
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
      accent: "text-blue-400",
      border: "border-blue-500/50 hover:border-blue-400",
      glow: "hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]",
      btnBg: "bg-blue-500/20 text-blue-400 group-hover:bg-blue-500 group-hover:text-slate-950",
    },
  ];

  return (
