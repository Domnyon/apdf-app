import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "لم يتم استلام أي ملف." }, { status: 400 });
    }

    const publicKey = process.env.ILOVEPDF_PUBLIC_KEY;
    const secretKey = process.env.ILOVEPDF_SECRET_KEY;

    if (!publicKey || !secretKey) {
      return NextResponse.json(
        { error: "مفاتيح iLovePDF API غير مضبوطة في إعدادات البيئة." },
        { status: 500 }
      );
    }

    // 1. التوثيق وإنشاء توكن الجلسة
    const authRes = await fetch("https://api.ilovepdf.com/v1/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ public_key: publicKey }),
    });

    if (!authRes.ok) {
      throw new Error("فشل الاتصال والتوثيق مع iLovePDF API");
    }

    const authData = await authRes.json();
    const token = authData.token;

    // 2. بدء مهمة pdfword
    const startRes = await fetch("https://api.ilovepdf.com/v1/start/pdfword", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!startRes.ok) {
      throw new Error("تعذر بدء مهمة التحويل في iLovePDF");
    }

    const startData = await startRes.json();
    const { server, task } = startData;

    // 3. رفع ملف الـ PDF
    const fileBuffer = await file.arrayBuffer();
    const uploadFormData = new FormData();
    uploadFormData.append("task", task);
    uploadFormData.append("file", new Blob([fileBuffer], { type: "application/pdf" }), file.name);

    const uploadRes = await fetch(`https://${server}/v1/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: uploadFormData,
    });

    if (!uploadRes.ok) {
      throw new Error("فشل رفع الملف إلى خادم iLovePDF");
    }

    const uploadData = await uploadRes.json();
    const serverFilename = uploadData.server_filename;

    // 4. تنفيذ التحويل واستخراج DOCX الأصلي
    const processRes = await fetch(`https://${server}/v1/process`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        task: task,
        tool: "pdfword",
        files: [{ server_filename: serverFilename, filename: file.name }],
      }),
    });

    if (!processRes.ok) {
      throw new Error("فشلت عملية التحويل في خادم المعالجة");
    }

    // 5. تحميل المستند الناتج
    const downloadRes = await fetch(`https://${server}/v1/download/${task}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!downloadRes.ok) {
      throw new Error("تعذر جلب ملف Word المحول");
    }

    const wordBuffer = await downloadRes.arrayBuffer();
    const downloadName = file.name.replace(/\.[^/.]+$/, "") + ".docx";

    return new NextResponse(wordBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
      },
    });
  } catch (error: any) {
    console.error("iLovePDF Conversion Error:", error);
    return NextResponse.json(
      { error: error.message || "حدث خطأ غير متوقع أثناء معالجة المستند." },
      { status: 500 }
    );
  }
}
