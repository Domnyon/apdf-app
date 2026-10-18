import type { Metadata } from "next";
import PrintPdfTool from "./print-pdf-tool";

export const metadata: Metadata = {
  title: "طباعة PDF والصور أونلاين من الجوال عبر الواي فاي | APDF",
  description:
    "عاين مستندات PDF والصور من الجوال أو الكمبيوتر، واختر A4 أو Letter ثم افتح نافذة الطباعة لاستخدام الطابعات المتاحة عبر Wi-Fi أو AirPrint.",
  keywords: [
    "طباعة PDF أونلاين",
    "طباعة الصور",
    "طباعة PDF من الجوال",
    "طابعة Wi-Fi",
    "AirPrint",
  ],
  openGraph: {
    title: "طباعة PDF والصور أونلاين من الجوال عبر الواي فاي | APDF",
    description:
      "عاين ملفات PDF والصور واضبط حجم الورق، ثم اختر طابعة Wi-Fi أو AirPrint من نافذة النظام.",
    type: "website",
  },
};

export default function PrintPdfPage() {
  return <PrintPdfTool />;
}
