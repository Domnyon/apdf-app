import type { Metadata } from "next";
import CompressTool from "./compress-tool";

export const metadata: Metadata = {
  title: "تصغير وتقليل حجم ملف PDF أونلاين بجودة عالية | APDF",
  description:
    "اضغط ملفات PDF لتقليل حجمها للمشاركة عبر الرسائل والبريد، مع اختيار مستوى الموازنة المناسب بين حجم الملف ووضوح الصفحات.",
};

export default function CompressPage() {
  return <CompressTool />;
}
