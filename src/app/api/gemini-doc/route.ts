import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ضبط إعدادات Next.js لقبول أحجام ملفات أكبر
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const prompt = (formData.get("prompt") as string) || "حول كامل المستند إلى Word بتنسيق مرتب واحتفظ بالنصوص كما هي باللغة العربية";

    if (!file) {
      return NextResponse.json(
        { error: "لم يتم تزويد أي ملف" },
        { status: 400 }
      );
    }

    // تحويل الملف إلى Buffer ثم Base64
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString("base64");
    const mimeType = file.type || "application/pdf";

    const systemInstruction = `
أنت خبير استخراج وتنسيق مستندات PDF. 
المطلوب منك استخراج وقراءة النصوص بدقة تامة من المستند المرفق، مع مراعاة اللغة العربية وترتيب الفقرات والعناوين، وتنفيذ التعديل أو الطلب المطلوب من المستخدم حرفياً.
أرجع فقط النص النهائي المرتب دون مقدمات أو حشو.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: `\({systemInstruction}\n\nطلب المستخدم:\){prompt}` },
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
    });

    return NextResponse.json({ resultText: response.text });
  } catch (error: any) {
    console.error("Gemini Doc Error:", error);
    return NextResponse.json(
      { error: error?.message || "حدث خطأ أثناء معالجة المستند عبر Gemini" },
      { status: 500 }
    );
  }
}
