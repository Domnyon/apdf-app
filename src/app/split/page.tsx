import type { Metadata } from "next";
import SplitTool from "./split-tool";

export const metadata: Metadata = {
  title: "فصل واستخراج صفحات من ملف PDF أونلاين | APDF",
  description:
    "قسّم ملفات PDF وحدد الصفحات التي تريد استخراجها أو حذفها، ثم نزّل مستنداً جديداً يضم الصفحات المختارة.",
};

export default function SplitPage() {
  return <SplitTool />;
}
