"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, FileCheck, AlertCircle, ShieldAlert, Scale, Mail } from "lucide-react";

export default function TermsPage() {
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
            <Scale className="w-3.5 h-3.5" /> الشروط والأحكام
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">اتفاقية شروط الاستخدام</h1>
          <p className="text-xs text-slate-400">تاريخ السريان: {new Date().toLocaleDateString("ar-SA")}</p>
        </div>

        <section className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
          <div className="bg-slate-950/60 border border-slate-900 rounded-2xl p-5 space-y-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-purple-400" /> 1. قبول الشروط
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              باستخدامك لموقع <strong>apdf.app</strong>، فإنك توافق على الالتزام بشروط الاستخدام الموضحة هنا. إذا كنت لا توافق على هذه الشروط، يرجى عدم استخدام أدوات وخدمات الموقع.
            </p>
          </div>

          <div className="bg-slate-950/60 border border-slate-900 rounded-2xl p-5 space-y-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-purple-400" /> 2. الاستخدام المشروع
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              تُقدَّم الأدوات لأغراض شخصية ومهنية مشروعة. يُحظر تماماً استخدام الموقع في معالجة أو إنتاج مستندات تخالف القوانين والأنظمة المعمول بها، أو تنتهك حقوق الملكية الفكرية، أو تهدف إلى الاحتيال والتزوير.
            </p>
          </div>

          <div className="bg-slate-950/60 border border-slate-900 rounded-2xl p-5 space-y-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-purple-400" /> 3. إخلاء المسؤولية
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              يتم تقديم الخدمات والأدوات &quot;كما هي&quot; دون أي ضمانات صريحة أو ضمنية. لا تتحمل إدارة الموقع أي مسؤولية عن أي فقدان أو تلف للملفات أثناء معالجتها محلياً في المتصفح أو عبر مزود خدمة خارجي، بحسب الأداة المستخدمة. ويُنصح دوماً بالاحتفاظ بنسخ احتياطية من المستندات الأصلية.
            </p>
          </div>

          <div className="bg-slate-950/60 border border-slate-900 rounded-2xl p-5 space-y-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Mail className="w-4 h-4 text-purple-400" /> 4. الاستفسارات والتواصل
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
              لأي استفسارات قانونية أو أسئلة تتعلق بشروط الخدمة، يمكنك مراسلتنا مباشرة عبر البريد الإلكتروني:{" "}
              <a href="mailto:apdfapp@gmail.com" className="text-purple-400 underline font-medium">apdfapp@gmail.com</a>
            </p>
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
