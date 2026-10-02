import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const action = formData.get("action") as string;
    const prompt = (formData.get("prompt") as string) || "";
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "لم يتم إرفاق أي ملف PDF." },
        { status: 400 }
      );
    }

    let resultPdfBytes: Uint8Array;

    if (action === "merge") {
      const mergedPdf = await PDFDocument.create();
      for (const file of files) {
        const fileBytes = await file.arrayBuffer();
        const pdf = await PDFDocument.load(fileBytes);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }
      resultPdfBytes = await mergedPdf.save();
    } else if (action === "delete_pages" || action === "split") {
      const fileBytes = await files[0].arrayBuffer();
      const pdf = await PDFDocument.load(fileBytes);
      const totalPages = pdf.getPageCount();
      
      const match = prompt.match(/\d+/);
      const pageToDelete = match ? parseInt(match[0], 10) - 1 : totalPages - 1;

      if (pageToDelete >= 0 && pageToDelete < totalPages) {
        pdf.removePage(pageToDelete);
      }
      resultPdfBytes = await pdf.save();
    } else if (action === "write" || action === "sign") {
      const fileBytes = await files[0].arrayBuffer();
      const pdf = await PDFDocument.load(fileBytes);
      const pages = pdf.getPages();
      const firstPage = pages[0];
      const font = await pdf.embedFont(StandardFonts.HelveticaBold);

      const textToAdd = action === "sign" ? "Digitally Signed via apdf.app" : (prompt || "apdf.app Document");
      firstPage.drawText(textToAdd, {
        x: 50,
        y: 50,
        size: 14,
        font: font,
        color: rgb(0.1, 0.6, 0.3),
      });

      resultPdfBytes = await pdf.save();
    } else {
      const fileBytes = await files[0].arrayBuffer();
      const pdf = await PDFDocument.load(fileBytes);
      resultPdfBytes = await pdf.save();
    }

    return new Response(Buffer.from(resultPdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="processed_apdf.pdf"',
      },
    });

  } catch (err: any) {
    return NextResponse.json(
      { error: "حدث خطأ أثناء معالجة الملف: " + err.message },
      { status: 500 }
    );
  }
}
