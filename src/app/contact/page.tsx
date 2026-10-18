"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Send, CheckCircle2, Clock, ShieldCheck, MessageSquare, AlertCircle, Loader2 } from "lucide-react";

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim() || !emailRegex.test(formData.email.trim())) {
      setErrorMsg("يرجى إدخال بريد إلكتروني صحيح.");
      return;
    }

    setStatus("loading");

    try {
      // إرسال مباشر ومعتمد إلى بريدك الإلكتروني apdfapp@gmail.com
      const response = await fetch("https://formsubmit.co/ajax/apdfapp@gmail.com", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          _subject: `[apdf.app] رسالة جديدة: ${formData.subject}`,
          الاسم: formData.name,
          البريد_الإلكتروني: formData.email,
          الموضوع: formData.subject,
          الرسالة: formData.message,
          _captcha: "false", // تعطيل الكابتشا لسرعة الإرسال
        }),
      });

      if (response.ok) {
        setStatus("success");
        setFormData({ name: "", email: "", subject: "", message: "" });
      } else {
        setStatus("error");
        setErrorMsg("تعذر إرسال الرسالة، يرجى المحاولة لاحقاً.");
      }
    } catch {
      setStatus("error");
      setErrorMsg("حدث خطأ في الاتصال بالشبكة.");
    }
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
            <MessageSquare className="w-3.5 h-3.5" /> الدعم والملاحظات
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">اتصل بنا</h1>
          <p className="text-xs text-slate-400">
            أرسل استفسارك وسيقوم فريق الدعم بالرد مباشرة على بريدك الإلكتروني
          </p>
        </div>

        {status === "success" ? (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-white">تم استلام رسالتك بنجاح</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              وصلت رسالتك إلى إدارة الموقع، وسيتم الرد عليك في أقرب وقت.
            </p>
            <button
              onClick={() => setStatus("idle")}
              className="text-xs text-purple-400 hover:underline pt-2 inline-block font-semibold"
            >
              إرسال رسالة جديدة
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-slate-950/60 border border-slate-900 rounded-2xl p-6 space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">الاسم الكامل <span className="text-purple-400">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="اكتب اسمك"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">البريد الإلكتروني للرد <span className="text-purple-400">*</span></label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 transition-colors"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">موضوع الرسالة <span className="text-purple-400">*</span></label>
              <input
                type="text"
                required
                placeholder="مثال: اقتراح تطوير أو بلاغ فني"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">نص الرسالة <span className="text-purple-400">*</span></label>
              <textarea
                required
                rows={4}
                placeholder="اكتب تفاصيل استفسارك بالتفصيل..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full bg-slate-900/80 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 transition-colors resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-[0.98] shadow-lg shadow-purple-600/20 disabled:opacity-50"
            >
              {status === "loading" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> جارٍ الإرسال...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" /> إرسال الرسالة الآن
                </>
              )}
            </button>
          </form>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-3.5 space-y-1">
            <div className="flex items-center gap-2 text-white font-bold text-xs">
              <Clock className="w-3.5 h-3.5 text-purple-400" /> سرعة الرد
            </div>
            <p className="text-[11px] text-slate-400">يتم الرد على عنوان بريدك خلال 24 - 48 ساعة.</p>
          </div>

          <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-3.5 space-y-1">
            <div className="flex items-center gap-2 text-white font-bold text-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> سرية وأمان
            </div>
            <p className="text-[11px] text-slate-400">تظل بياناتك ومراسلاتك مشفرة ومحمية بالكامل.</p>
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
