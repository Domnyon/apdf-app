import type { Metadata } from "next";
import HomeTool from "./home-tool";

export const metadata: Metadata = {
  title: "أدوات PDF أونلاين مجانية وسريعة | APDF",
  description:
    "مجموعة أدوات PDF الشاملة لتعديل ودمج وضغط وتحويل وطباعة ملفات PDF والصور أونلاين مجاناً وبكل سهولة.",
};

export default function HomePage() {
  return <HomeTool />;
}
