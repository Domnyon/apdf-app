import type { Metadata } from "next";
import ConvertTool from "./convert-tool";

export const metadata: Metadata = {
  title: "تحويل PDF إلى صور وصور إلى PDF أونلاين | APDF",
  description:
    "حوّل الصور إلى PDF أو صدّر صفحات PDF كصور، مع معاينة الملفات وتنزيل النتائج مباشرة من المتصفح.",
};

export default function ConvertPage() {
  return <ConvertTool />;
}
