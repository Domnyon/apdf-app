"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Send, CheckCircle2, Clock, ShieldCheck, MessageSquare } from "lucide-react";

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: "", subject: "", message: "" });
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // تجميع الرسالة وإرسالها برمجياً للإيميل دون إظهاره كنص خام في الصفحة
    const recipient = atob("YXBkZmFwcEBnbWFpbC5jb20="); // apdfapp@gmail.com مشفر
    const mailtoUrl = `mailto:${recipient}?subject=${encodeURIComponent(
      `[apdf.app] ${formData.subject}`
    )}&body=${encodeURIComponent(
      `الاسم: ${formData.name}\n\nالرسالة:\n${formData.message}`
    )}`;
    window.location.href = mailtoUrl;
    setIsSent(true);
  };

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
      <main className="max-w-2xl mx-auto px-4 py-10 space-y-8 flex-1 w-full">
        <div className="space-y-2 border-b border-slate-900 pb-6 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold">
            <MessageSquare className="w-3.5 h-3.5" /> الدعم الفني والمقترحات
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">اتصل بفريق الدعم</h1>
          <p className="text-xs text-slate-400">
            أرسل استفسارك أو اقتراحك وسيقوم فريق العمل بالرد عليك ومتابعة رسالتك
          </p>
        </div>

        {isSent ? (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-white">تم تجهيز رسالتك بنجاح</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              إذا لم يفتح برنامج البريد تلقائياً، يمكنك إرسال استفسارك مباشرة عبر تطبيق البريد المفضل لديك.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-slate-950/60 border border-slate-900 rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">الاسم أو اللقب</label>
              <input
                type="text"
                required
                placeholder="اكتب اسمك هنا"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">موضوع الرسالة</label>
              <input
                type="text"
                required
                placeholder="مثال: اقتراح إضافة أداة جديدة أو بلاغ فني"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">نص الرسالة</label>
              <textarea
                required
                rows={4}
                placeholder="اكتب تفاصيل استفسارك أو ملاحظتك هنا..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 transition-colors resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98] shadow-lg shadow-purple-600/20"
            >
              <Send className="w-3.5 h-3.5" /> إرسال الرسالة الآن
            </button>
          </form>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-3.5 space-y-1">
            <div className="flex items-center gap-2 text-white font-bold text-xs">
              <Clock className="w-3.5 h-3.5 text-purple-400" /> سرعة الاستجابة
            </div>
            <p className="text-[11px] text-slate-400">نرد على كافة الملاحظات خلال 24 إلى 48 ساعة عمل.</p>
          </div>

          <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-3.5 space-y-1">
            <div className="flex items-center gap-2 text-white font-bold text-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> خصوصية تامة
            </div>
            <p className="text-[11px] text-slate-400">معلوماتك ورسائلك تظل مشفرة وسرية تماماً.</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 bg-slate-950/70 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} apdf.app - جميع الحقوق محفوظة.
      </footer>
    </div>
  );
}
