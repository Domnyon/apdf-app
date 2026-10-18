import type { Metadata } from "next";
import EditorTool from "./editor-tool";

export const metadata: Metadata = {
  title: "محرر وتعديل ملفات PDF أونلاين مجاناً | APDF",
  description:
    "أضف نصوصاً وتوقيعات وملاحظات إلى مستندات PDF عبر المتصفح، ثم احفظ نسخة معدلة على جهازك.",
};

export default function EditorPage() {
  return <EditorTool />;
}
