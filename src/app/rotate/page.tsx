import type { Metadata } from "next";
import RotateTool from "./rotate-tool";

export const metadata: Metadata = {
  title: "تدوير صفحات PDF وحفظ الاتجاه مجاناً | APDF",
  description:
    "عدّل اتجاه صفحات PDF المقلوبة إلى 90 أو 180 أو 270 درجة، وعاين التغييرات ثم احفظ نسخة جديدة من المستند.",
};

export default function RotatePage() {
  return <RotateTool />;
}
