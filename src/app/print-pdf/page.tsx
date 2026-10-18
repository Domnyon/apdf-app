import type { Metadata } from "next";
import PrintPdfTool from "./print-pdf-tool";

export const metadata: Metadata = {
  title: "طباعة PDF والصور أونلاين - كشف طابعات الواي فاي والشبكة مباشرة | apdf.app",
  description:
    "عاين ملفات PDF والصور واضبط حجم الورق والاتجاه ثم اطبع مباشرة عبر طابعات Wi-Fi أو AirPrint المتصلة بنظامك. معالجة خاصة داخل المتصفح.",
  keywords: [
    "طباعة PDF أونلاين",
    "طباعة الصور",
    "طباعة PDF من الجوال",
    "طابعة Wi-Fi",
    "AirPrint",
  ],
  openGraph: {
    title: "طباعة PDF والصور أونلاين | apdf.app",
    description:
      "عاين ملفات PDF والصور واضبط إعدادات الورق واطبع عبر الطابعات المتصلة بجهازك.",
    type: "website",
  },
};

export default function PrintPdfPage() {
  return <PrintPdfTool />;
}
