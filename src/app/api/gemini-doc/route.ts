import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// استخدام أحدث حزمة رسمية من Google
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { imageBase64, prompt } = await req.json();

    if (!imageBase64) {
      return NextResponse.json(
        { error: "لم يتم تزويد صورة المستند" },
        { status: 400 }
      );
    }

    // استخراج بيانات الـ Base64 الصافية ونوع الصورة
    const matches = imageBase64.match(/^data:(.+);base64,(.+)$/);
    const mimeType = matches ? matches[1] : "image/jpeg";
    const base64Data = matches ? matches[2] : imageBase64;

    const systemInstruction = `
أنت خبير استخراج وتنسيق مستندات PDF. 
المطلوب منك استخراج وقراءة النصوص بدقة تامة من الصورة المرفقة، مع مراعاة اللغة العربية وترتيب الفقرات والعناوين، وتنفيذ التعديل أو الطلب المطلوب من المستخدم حرفياً.
أرجع فقط النص النهائي المرتب دون مقدمات أو حشو.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: `${systemInstruction}\n\nطلب المستخدم: ${prompt || "حول كامل المستند إلى Word بتنسيق مرتب"}` },
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
      { error: "حدث خطأ أثناء معالجة المستند عبر Gemini" },
      { status: 500 }
    );
  }
}
