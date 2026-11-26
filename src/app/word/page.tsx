import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import WordEditor from "./word-editor";

export const metadata: Metadata = {
  title: "محرر وورد مجاني أونلاين | apdf.app",
  description:
    "اكتب وحرر مستنداتك محلياً في المتصفح مع دعم كامل للعربية وRTL، واستورد أو صدّر ملفات Word وPDF مع الحفاظ على خصوصيتك.",
};

export default function WordPage() {
  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100" dir="rtl">
      <header className="word-editor-ui max-w-6xl mx-auto w-full px-4 py-4 flex items-center justify-between border-b border-slate-900">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800"
        >
          <ArrowRight className="w-4 h-4" /> الرئيسية
        </Link>
        <div className="flex items-center gap-2">
          <span className="font-black text-lg tracking-tight text-white">
            apdf<span className="text-purple-400">.app</span>
          </span>
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20">
            <FileText className="w-4 h-4" />
          </div>
        </div>
      </header>
      <WordEditor />
    </div>
  );
}
