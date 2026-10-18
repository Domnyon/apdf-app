import type { Metadata } from "next";
import MergeTool from "./merge-tool";

export const metadata: Metadata = {
  title: "دمج ملفات PDF أونلاين مجاناً وترتيب الصفحات | APDF",
  description:
    "ادمج عدة ملفات PDF في ملف واحد منظم بسرعة وأمان مع إمكانية ترتيب الصفحات بسهولة داخل المتصفح.",
};

export default function MergePage() {
  return <MergeTool />;
}
