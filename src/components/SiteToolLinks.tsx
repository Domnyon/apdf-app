"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Image as ImageIcon, QrCode, ReceiptText, Sparkles } from "lucide-react";

const tools = [
  {
    href: "/image-converter",
    label: "محرر الصور",
    description: "تحويل صيغ الصور",
    Icon: ImageIcon,
    colors:
      "border-blue-500/20 bg-blue-500/10 text-blue-300 group-hover:border-blue-400/50 group-hover:bg-blue-500/20 group-hover:text-blue-200",
  },
  {
    href: "/invoice-generator",
    label: "صانع الفواتير",
    description: "إنشاء فاتورة PDF",
    Icon: ReceiptText,
    colors:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-300 group-hover:border-emerald-400/50 group-hover:bg-emerald-500/20 group-hover:text-emerald-200",
  },
  {
    href: "/qr-generator",
    label: "منشئ رمز QR",
    description: "إنشاء رمز QR مخصص",
    Icon: QrCode,
    colors:
      "border-violet-500/20 bg-violet-500/10 text-violet-300 group-hover:border-violet-400/50 group-hover:bg-violet-500/20 group-hover:text-violet-200",
  },
];

export default function SiteToolLinks() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="التنقل الرئيسي"
      className="relative z-50 border-b border-slate-800 bg-slate-950/95 px-3 py-3 text-slate-100 backdrop-blur"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <Link
          href="/"
          className="group flex items-center justify-center gap-2 self-center rounded-xl px-2 py-1 text-white transition hover:text-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:self-auto"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 text-purple-300 transition group-hover:border-purple-400/50 group-hover:bg-purple-500/20">
            <Sparkles aria-hidden="true" className="h-[18px] w-[18px]" />
          </span>
          <span className="text-right">
            <span className="block text-sm font-black tracking-tight">
              apdf<span className="text-purple-300">.app</span>
            </span>
            <span className="block text-[10px] text-slate-400">أدوات PDF</span>
          </span>
        </Link>

        <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:gap-3">
          {tools.map(({ href, label, description, Icon, colors }) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              title={description}
              className={`group flex min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-center transition duration-200 hover:-translate-y-0.5 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:flex-row sm:gap-3 sm:px-4 sm:py-2 ${
                pathname === href
                  ? "border-blue-500/60 bg-blue-500/10 text-white shadow-sm shadow-blue-950/30"
                  : "border-slate-800 bg-slate-900/80 text-slate-100 hover:border-slate-600"
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${colors}`}
              >
                <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0">
                <span className="block whitespace-nowrap text-[11px] font-bold sm:text-sm">
                  {label}
                </span>
                <span className="hidden text-xs text-slate-400 lg:block">
                  {description}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
