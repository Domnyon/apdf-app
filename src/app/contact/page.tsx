"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Mail, Clock, ShieldCheck } from "lucide-react";

export default function ContactPage() {
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
        <div className="space-y-2 border-b border-slate-900 pb-6 text-center sm:text-right">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold">
            <Mail className="w-3.5 h-3.5" /> الدعم والملاحظات
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">اتصل بنا</h1>
          <p className="text-xs text-slate-400">نسعد دائماً باستقبال آرائك واستفساراتك واقتراحاتك لتطوير المنصة</p>
        </div>

        <section className="space-y-5 text-xs sm:text-sm text-slate-300">
          <div className="bg-slate-950/60 border border-slate-900 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-right">
              <h2 className="text-base font-bold text-white flex items-center justify-center sm:justify-start gap-2">
                <Mail className="w-5 h-5 text-purple-400" /> البريد الإلكتروني الرسمي
              </h2>
              <p className="text-slate-400 text-xs">
                للدعم الفني، المقترحات، وملاحظات الاستخدام والإعلانات:
              </p>
            </div>
            <a
              href="mailto:apdfapp@gmail.com"
              className="text-sm font-bold text-purple-300 hover:text-white bg-slate-900 hover:bg-purple-600/80 px-4 py-2.5 rounded-xl border border-slate-800 hover:border-purple-500 transition-all"
            >
              apdfapp@gmail.com
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-950/50 border border-slate-900 rounded-2xl p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-white font-bold text-xs sm:text-sm">
                <Clock className="w-4 h-4 text-purple-400" /> وقت الاستجابة
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                نحرص على مراجعة جميع الرسائل والرد على الاستفسارات الفنية والملاحظات خلال 24 إلى 48 ساعة عمل.
              </p>
            </div>

            <div className="bg-slate-950/50 border border-slate-900 rounded-2xl p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-white font-bold text-xs sm:text-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> سرية المراسلات
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                أي معلومات أو بيانات مشاركة في الرسائل يتم التعامل معها بسرية تامة ولا تُشارك مع أي طرف خارجي.
              </p>
            </div>
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
