import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "لم يتم استلام أي ملف من المتصفح." }, { status: 400 });
    }

    const publicKey = process.env.ILOVEPDF_PUBLIC_KEY?.trim();
    const secretKey = process.env.ILOVEPDF_SECRET_KEY?.trim();

    if (!publicKey || !secretKey) {
      return NextResponse.json(
        { 
          error: "المفاتيح غير موجودة في Vercel: تأكد من ضبط ILOVEPDF_PUBLIC_KEY و ILOVEPDF_SECRET_KEY في Environment Variables ثم عمل Redeploy." 
        },
        { status: 500 }
      );
    }

    // 1. طلب التوثيق من iLovePDF
    const authRes = await fetch("https://api.ilovepdf.com/v1/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ public_key: publicKey }),
    });

    if (!authRes.ok) {
      const errText = await authRes.text();
      return NextResponse.json(
        { error: `فشل التوثيق مع iLovePDF (Auth Error): ${errText || authRes.statusText}` },
        { status: 500 }
      );
    }

    const authData = await authRes.json();
    const token = authData.token;

    // 2. بدء مهمة تحويل pdfword
    const startRes = await fetch("https://api.ilovepdf.com/v1/start/pdfword", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!startRes.ok) {
      const errText = await startRes.text();
      return NextResponse.json(
        { error: `فشل بدء المهمة (Start Error): ${errText || startRes.statusText}` },
        { status: 500 }
      );
    }

    const startData = await startRes.json();
    const { server, task } = startData;

    // 3. رفع ملف الـ PDF
    const fileBuffer = await file.arrayBuffer();
    const uploadFormData = new FormData();
    uploadFormData.append("task", task);
    uploadFormData.append(
      "file",
      new Blob([fileBuffer], { type: "application/pdf" }),
      file.name
    );

    const uploadRes = await fetch(`https://${server}/v1/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: uploadFormData,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      return NextResponse.json(
        { error: `فشل رفع الملف (Upload Error): ${errText || uploadRes.statusText}` },
        { status: 500 }
      );
    }

    const uploadData = await uploadRes.json();
    const serverFilename = uploadData.server_filename;

    // 4. تنفيذ عملية التحويل
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
      const errText = await processRes.text();
      return NextResponse.json(
        { error: `فشلت المعالجة في iLovePDF (Process Error): ${errText || processRes.statusText}` },
        { status: 500 }
      );
    }

    // 5. تنزيل ملف DOCX الناتج
    const downloadRes = await fetch(`https://${server}/v1/download/${task}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!downloadRes.ok) {
      const errText = await downloadRes.text();
      return NextResponse.json(
        { error: `تعذر تنزيل الملف المحول (Download Error): ${errText || downloadRes.statusText}` },
        { status: 500 }
      );
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
    return NextResponse.json(
      { error: error?.message || "حدث خطأ داخلي في الخادم." },
      { status: 500 }
    );
  }
}
