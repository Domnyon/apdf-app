"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, Target, ShieldCheck, HeartHandshake, Mail } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 font-sans relative flex flex-col justify-between" dir="rtl">
      {/* Header */}
      <header className="max-w-4xl mx-auto w-full px-4 py-4 flex items-center justify-between border-b border-slate-900">
        <Link href="/" className="flex items-center gap-2 text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors">
          <ArrowRight className="w-4 h-4" /> العودة للرئيسية
        </Link>
        <span className="font-black text-lg tracking-tight text-white">apdf<span className="text-purple-400">.app</span></span>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-10 space-y-8 flex-1 w-full">
        <div className="space-y-2 border-b border-slate-900 pb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" /> نبذة عن المنصة
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">من نحن - apdf.app</h1>
          <p className="text-xs text-slate-400">حلول رقمية ذكية لإدارة المستندات بأمان وكفاءة</p>
        </div>

        <section className="space-y-5 text-xs sm:text-sm text-slate-300 leading-relaxed">
          <div className="bg-slate-950/60 border border-slate-900 rounded-2xl p-5 space-y-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-400" /> رؤيتنا
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              انطلقت منصة <strong>apdf.app</strong> لتلبية الحاجة إلى أدوات معالجة ملفات PDF سريعة، مجانية، وخالية من التعقيد. نهدف إلى تمكين الطلاب، المهنيين، وأصحاب الأعمال من إنجاز مهام المستندات اليومية بكل سلاسة عبر أي متصفح دون اشتراكات معقدة.
            </p>
          </div>

          <div className="bg-slate-950/60 border border-slate-900 rounded-2xl p-5 space-y-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> مبدأ الخصوصية أولاً
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              نؤمن بحق المستخدم الكامل في الحفاظ على سرية مستنداته. لذلك قمنا بهندسة أدوات الموقع لتعتمد على تقنية <strong>المعالجة من جانب العميل (Client-Side)</strong>؛ بحيث تتم قراءة وتعديل الملفات محلياً داخل جهازك دون تحميلها على أي خوادم خارجية.
            </p>
          </div>

          <div className="bg-slate-950/60 border border-slate-900 rounded-2xl p-5 space-y-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <HeartHandshake className="w-4 h-4 text-purple-400" /> التطوير المستمر
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              نعمل باستمرار على تحسين وتوسيع حزمة الأدوات، وإضافة تقنيات الذكاء الاصطناعي لتسهيل التعامل مع النصوص والمستندات المصورة، بما يحقق أفضل تجربة للمستخدم العربي.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 text-xs text-purple-300">
              <Mail className="w-4 h-4 shrink-0" /> هل لديك اقتراح أو استفسار؟
            </div>
            <a href="mailto:apdfapp@gmail.com" className="text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 px-3 py-1.5 rounded-lg transition-colors">
              تواصل معنا: apdfapp@gmail.com
            </a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 bg-slate-950/70 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} apdf.app - جميع الحقوق محفوظة.
      </footer>
    </div>
  );
}
