import type { Metadata } from "next";
import PdfToWordTool from "./pdf-to-word-tool";

export const metadata: Metadata = {
  title: "تحويل PDF إلى Word عربي قابل للتعديل بدقة | APDF",
  description:
    "حوّل مستندات PDF إلى ملفات DOCX عبر Adobe PDF Services باتصال HTTPS/TLS. تعتمد دقة النصوص العربية والتنسيقات على بنية الملف الأصلي.",
};

export default function PdfToWordPage() {
  return <PdfToWordTool />;
}
