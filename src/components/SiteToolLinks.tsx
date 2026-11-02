import Link from "next/link";
import { Image as ImageIcon, ReceiptText } from "lucide-react";

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
];

export default function SiteToolLinks() {
  return (
    <nav
      aria-label="روابط الأدوات السريعة"
      className="relative z-50 border-b border-slate-800 bg-slate-950/95 px-3 py-2.5 text-slate-100 backdrop-blur"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 sm:justify-end sm:gap-3">
        {tools.map(({ href, label, description, Icon, colors }) => (
          <Link
            key={href}
            href={href}
            className="group flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-2.5 py-2 transition duration-200 hover:-translate-y-0.5 hover:border-slate-600 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 sm:flex-none sm:justify-start sm:gap-3 sm:px-4"
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${colors}`}
            >
              <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
            </span>
            <span className="min-w-0">
              <span className="block whitespace-nowrap text-xs font-bold text-slate-100 sm:text-sm">
                {label}
              </span>
              <span className="hidden text-xs text-slate-400 sm:block">
                {description}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
