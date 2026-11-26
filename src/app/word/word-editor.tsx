"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  CheckSquare,
  ChevronDown,
  Clock3,
  Eraser,
  FileText,
  ImagePlus,
  Indent,
  Italic,
  List,
  ListOrdered,
  Minus,
  Outdent,
  Palette,
  Printer,
  Redo2,
  Save,
  Strikethrough,
  Table2,
  Underline,
  Undo2,
  Upload,
  X,
} from "lucide-react";
import mammoth from "mammoth";
import {
  AlignmentType,
  BorderStyle,
  Document as DocxDocument,
  HeadingLevel,
  IParagraphOptions,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
} from "docx";

const STORAGE_KEY = "apdf-word-editor-draft-v1";
const EMPTY_DOCUMENT = "<p><br></p>";
const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36];
const CHECKBOX_CLASS =
  "inline-flex items-center justify-center w-4 h-4 mx-1 border border-slate-700 rounded-sm cursor-pointer select-none align-middle text-xs font-bold";

type Draft = { title: string; html: string };
type Block = Paragraph | Table;
type RunOptions = {
  bold?: boolean;
  italics?: boolean;
  underline?: { type: "single" };
  strike?: boolean;
  color?: string;
  font?: string;
  size?: number;
  shading?: { fill: string };
};

function toDocxColor(value: string): string | undefined {
  const hex = value.match(/^#?([0-9a-f]{6})$/i)?.[1];
  if (hex) return hex.toUpperCase();
  const shortHex = value.match(/^#?([0-9a-f]{3})$/i)?.[1];
  if (shortHex) return shortHex.split("").map((digit) => `${digit}${digit}`).join("").toUpperCase();
  const rgb = value.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (!rgb) return undefined;
  return rgb.slice(1, 4).map((channel) => Number(channel).toString(16).padStart(2, "0")).join("").toUpperCase();
}

function getDocumentCounts(html: string): { words: number; characters: number } {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const text = parsed.body.innerText || parsed.body.textContent || "";
  return {
    words: text.trim().match(/\S+/gu)?.length || 0,
    characters: text.length,
  };
}

function getNodeText(node: Node): string {
  return node.textContent || "";
}

function makeCheckbox(document: Document, checked: boolean): HTMLSpanElement {
  const checkbox = document.createElement("span");
  checkbox.dataset.checkbox = "true";
  checkbox.dataset.checked = String(checked);
  checkbox.setAttribute("contenteditable", "false");
  checkbox.className = CHECKBOX_CLASS;
  checkbox.textContent = checked ? "✓" : "";
  return checkbox;
}

function replaceCheckboxCharacters(root: HTMLElement) {
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (/[\uf06f\uf0a8\uf0fe\uf052]/u.test(node.data)) textNodes.push(node);
  }

  for (const textNode of textNodes) {
    const fragment = root.ownerDocument.createDocumentFragment();
    const parts = textNode.data.split(/([\uf06f\uf0a8\uf0fe\uf052])/u);
    for (const part of parts) {
      if (/^[\uf06f\uf0a8\uf0fe\uf052]$/u.test(part)) {
        fragment.appendChild(makeCheckbox(root.ownerDocument, false));
      } else if (part) {
        fragment.appendChild(root.ownerDocument.createTextNode(part));
      }
    }
    textNode.replaceWith(fragment);
  }
}

function sanitizePastedHtml(html: string): string {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  parsed.querySelectorAll("script, iframe, object, embed").forEach((element) => element.remove());

  parsed.querySelectorAll("img").forEach((image) => {
    const source = image.getAttribute("src") || "";
    if (/^\s*file:\/\//i.test(source)) {
      const altText = `${image.getAttribute("alt") || ""} ${image.getAttribute("title") || ""}`;
      const checked = /check(?:ed)?|selected|☑|✓/i.test(altText);
      image.replaceWith(makeCheckbox(parsed, checked));
    }
  });

  parsed.querySelectorAll('input[type="checkbox" i]').forEach((input) => {
    const checked = input.hasAttribute("checked") || (input as HTMLInputElement).checked;
    input.replaceWith(makeCheckbox(parsed, checked));
  });

  parsed.querySelectorAll('[data-checkbox="true"]').forEach((checkbox) => {
    const checked = checkbox.getAttribute("data-checked") === "true";
    checkbox.replaceWith(makeCheckbox(parsed, checked));
  });

  Array.from(parsed.body.querySelectorAll("*")).forEach((element) => {
    if (/^(o|w):/i.test(element.tagName)) {
      element.replaceWith(...Array.from(element.childNodes));
      return;
    }

    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value;
      if (
        name.startsWith("on") ||
        /file:\/\//i.test(value) ||
        /^(?:javascript|vbscript):/i.test(value.trim())
      ) {
        element.removeAttribute(attribute.name);
      }
    });
  });
  parsed.querySelectorAll("[src^='file:' i], [href^='file:' i]").forEach((element) => {
    element.removeAttribute("src");
    element.removeAttribute("href");
  });
  replaceCheckboxCharacters(parsed.body);
  const textWalker = parsed.createTreeWalker(parsed.body, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (textWalker.nextNode()) {
    if (/file:\/\//i.test(textWalker.currentNode.textContent || "")) {
      textNodes.push(textWalker.currentNode as Text);
    }
  }
  textNodes.forEach((node) => {
    node.data = node.data.replace(/file:\/\/[^\s"'<>)]*/gi, "");
  });
  return parsed.body.innerHTML;
}

function getRunOptions(element: HTMLElement, inherited: RunOptions): RunOptions {
  const options = { ...inherited };
  const tag = element.tagName.toLowerCase();
  if (tag === "b" || tag === "strong") options.bold = true;
  if (tag === "i" || tag === "em") options.italics = true;
  if (tag === "u") options.underline = { type: "single" };
  if (tag === "s" || tag === "del" || tag === "strike") options.strike = true;
  if (element.style.color) options.color = toDocxColor(element.style.color);
  if (element.style.backgroundColor) {
    const fill = toDocxColor(element.style.backgroundColor);
    if (fill) options.shading = { fill };
  }
  if (element.style.fontFamily) options.font = element.style.fontFamily.replace(/["']/g, "");
  const fontSize = Number.parseFloat(element.style.fontSize);
  if (Number.isFinite(fontSize) && fontSize > 0) options.size = Math.round(fontSize * 1.5);
  return options;
}

function parseRuns(node: Node, inherited: RunOptions = {}): (TextRun | ImageRun)[] {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = getNodeText(node);
    return text ? [new TextRun({ text, ...inherited })] : [];
  }
  if (!(node instanceof HTMLElement)) return [];

  if (node.dataset.checkbox === "true") {
    return [new TextRun({ text: node.dataset.checked === "true" ? "☑ " : "☐ ", ...inherited })];
  }

  if (node.tagName.toLowerCase() === "img") {
    const source = node.getAttribute("src") || "";
    const match = source.match(/^data:image\/(png|jpe?g|gif|bmp);base64,/i);
    if (!match) return [];
    const type = match[1].toLowerCase().replace("jpeg", "jpg") as "png" | "jpg" | "gif" | "bmp";
    const width = Number(node.getAttribute("width")) || 480;
    const height = Number(node.getAttribute("height")) || 320;
    return [new ImageRun({ type, data: source, transformation: { width, height } })];
  }

  const options = getRunOptions(node, inherited);
  if (node.tagName.toLowerCase() === "br") return [new TextRun({ text: "\n", ...options })];
  return Array.from(node.childNodes).flatMap((child) => parseRuns(child, options));
}

type ToolbarButtonProps = {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
};

function ToolbarButton({ label, icon, onClick }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="shrink-0 p-2 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800 transition"
    >
      {icon}
    </button>
  );
}

function paragraphOptions(element: HTMLElement, children: (TextRun | ImageRun)[]): IParagraphOptions {
  const tag = element.tagName.toLowerCase();
  const alignment = element.style.textAlign;
  const dir = element.getAttribute("dir") || element.closest("[dir]")?.getAttribute("dir") || "rtl";
  const heading =
    tag === "h1"
      ? HeadingLevel.HEADING_1
      : tag === "h2"
        ? HeadingLevel.HEADING_2
        : tag === "h3"
          ? HeadingLevel.HEADING_3
          : undefined;
  return {
    children,
    bidirectional: dir === "rtl",
    ...(heading ? { heading } : {}),
    alignment:
      alignment === "center"
        ? AlignmentType.CENTER
        : alignment === "left"
          ? AlignmentType.LEFT
          : alignment === "justify"
            ? AlignmentType.JUSTIFIED
            : AlignmentType.RIGHT,
  };

}

function tableToDocx(tableElement: HTMLTableElement): Table {
  const rows = Array.from(tableElement.rows).map(
    (row) =>
      new TableRow({
        children: Array.from(row.cells).map(
          (cell) =>
            new TableCell({
              children: [new Paragraph({
                children: Array.from(cell.childNodes).flatMap((node) => parseRuns(node)),
                bidirectional: cell.getAttribute("dir") !== "ltr",
                alignment: AlignmentType.RIGHT,
              })],
            }),
        ),
      }),
  );

  const border = { style: BorderStyle.SINGLE, size: 4, color: "94A3B8" };
  return new Table({
    rows,
    width: { size: 100, type: "pct" },
    visuallyRightToLeft: true,
    borders: {
      top: border,
      bottom: border,
      left: border,
      right: border,
      insideHorizontal: border,
      insideVertical: border,
    },
  });
}

function htmlToDocxBlocks(html: string): Block[] {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const blocks: Block[] = [];

  const addBlock = (element: HTMLElement, listType?: "bullet" | "number") => {
    const tag = element.tagName.toLowerCase();
    if (tag === "table") {
      blocks.push(tableToDocx(element as HTMLTableElement));
      return;
    }

    if (tag === "hr") {
      blocks.push(new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "94A3B8" } },
      }));
      return;
    }

    if (tag === "ul" || tag === "ol") {
      const type = tag === "ul" ? "bullet" : "number";
      Array.from(element.children).forEach((child) => {
        if (child instanceof HTMLElement && child.tagName.toLowerCase() === "li") {
          addBlock(child, type);
        }
      });
      return;
    }

    if (
      tag === "div" &&
      Array.from(element.children).some((child) =>
        ["p", "h1", "h2", "h3", "table", "ul", "ol", "hr"].includes(child.tagName.toLowerCase()),
      )
    ) {
      Array.from(element.children).forEach((child) => {
        if (child instanceof HTMLElement) addBlock(child, listType);
      });
      return;
    }

    const runs = Array.from(element.childNodes).flatMap((node) => parseRuns(node));
    const options: IParagraphOptions = {
      ...paragraphOptions(element, runs),
      ...(listType === "bullet" ? { bullet: { level: 0 } } : {}),
      ...(listType === "number" ? { numbering: { reference: "word-numbering", level: 0 } } : {}),
    };
    blocks.push(new Paragraph(options));
  };

  Array.from(parsed.body.children).forEach((child) => {
    if (child instanceof HTMLElement) addBlock(child);
  });
  if (!blocks.length) blocks.push(new Paragraph(""));
  return blocks;
}

function insertHtmlAtSelection(editor: HTMLElement, html: string) {
  editor.focus();
  document.execCommand("insertHTML", false, html);
}

export default function WordEditor() {
  const editorRef = useRef<HTMLDivElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const [documentTitle, setDocumentTitle] = useState("مستند جديد");
  const [editorHtml, setEditorHtml] = useState(EMPTY_DOCUMENT);
  const [hydrated, setHydrated] = useState(false);
  const [saveStatus, setSaveStatus] = useState("جاهز");
  const [wordCount, setWordCount] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState("Arial");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const draft = JSON.parse(saved) as Partial<Draft>;
          if (typeof draft.title === "string") setDocumentTitle(draft.title);
          if (typeof draft.html === "string") {
            setEditorHtml(draft.html);
            if (editorRef.current) editorRef.current.innerHTML = draft.html;
            const counts = getDocumentCounts(draft.html);
            setWordCount(counts.words);
            setCharacterCount(counts.characters);
          }
        }
      } catch (error) {
        console.error("Unable to load the saved Word draft:", error);
        setSaveStatus("تعذر استعادة المسودة");
      } finally {
        setHydrated(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ title: documentTitle, html: editorHtml }));
        setSaveStatus("تم الحفظ تلقائياً");
      } catch (error) {
        console.error("Unable to save the Word draft:", error);
        setSaveStatus("تعذر الحفظ المحلي");
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [documentTitle, editorHtml, hydrated]);

  const handleEditorInput = () => {
    const html = editorRef.current?.innerHTML || EMPTY_DOCUMENT;
    setEditorHtml(html);
    const counts = getDocumentCounts(html);
    setWordCount(counts.words);
    setCharacterCount(counts.characters);
    setSaveStatus("جارٍ الحفظ...");
  };

  const runCommand = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    handleEditorInput();
  };

  const applyFontSize = (size: number) => {
    setFontSize(size);
    const selection = window.getSelection();
    const editor = editorRef.current;
    if (!selection || !editor || selection.rangeCount === 0 || selection.isCollapsed) return;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;
    const span = document.createElement("span");
    span.style.fontSize = `${size}px`;
    span.appendChild(range.extractContents());
    range.insertNode(span);
    selection.removeAllRanges();
    const nextRange = document.createRange();
    nextRange.selectNodeContents(span);
    selection.addRange(nextRange);
    handleEditorInput();
  };

  const setDirection = (direction: "rtl" | "ltr") => {
    const selection = window.getSelection();
    const node = selection?.anchorNode;
    const element = node instanceof HTMLElement ? node : node?.parentElement;
    const block = element?.closest<HTMLElement>("p,h1,h2,h3,li,td,th,div");
    if (block && editorRef.current?.contains(block)) {
      block.setAttribute("dir", direction);
      block.style.direction = direction;
      handleEditorInput();
    } else if (editorRef.current) {
      editorRef.current.dir = direction;
      handleEditorInput();
    }
  };

  const importDocx = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setErrorMessage(null);
    try {
      const result = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
      const html = result.value || EMPTY_DOCUMENT;
      setDocumentTitle(file.name.replace(/\.docx$/i, "") || "مستند جديد");
      setEditorHtml(html);
      if (editorRef.current) editorRef.current.innerHTML = html;
      const counts = getDocumentCounts(html);
      setWordCount(counts.words);
      setCharacterCount(counts.characters);
      setSaveStatus("تم استيراد المستند");
    } catch (error) {
      console.error("DOCX import error:", error);
      setErrorMessage("تعذر فتح ملف Word. تأكد من سلامة الملف وحاول مرة أخرى.");
    }
  };

  const importImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setErrorMessage("تعذر قراءة الصورة المحددة.");
        return;
      }
      const image = new Image();
      image.onload = () => {
        const canvas = window.document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d");
        if (!context) {
          setErrorMessage("تعذر تجهيز الصورة للإدراج.");
          return;
        }
        context.drawImage(image, 0, 0);
        const pngDataUrl = canvas.toDataURL("image/png");
        const editor = editorRef.current;
        if (!editor) return;
        insertHtmlAtSelection(
          editor,
          `<img src="${pngDataUrl}" alt="صورة" width="${Math.min(image.naturalWidth, 600)}" height="${Math.round(image.naturalHeight * Math.min(1, 600 / image.naturalWidth))}" style="max-width:100%;height:auto;resize:both" />`,
        );
        handleEditorInput();
      };
      image.onerror = () => setErrorMessage("تعذر قراءة الصورة المحددة.");
      image.src = reader.result;
    };
    reader.onerror = () => setErrorMessage("تعذر قراءة الصورة المحددة.");
    reader.readAsDataURL(file);
  };

  const insertTable = (rows: number, columns: number) => {
    const rowHtml = Array.from({ length: rows }, () =>
      `<tr>${Array.from({ length: columns }, () => '<td dir="rtl"><p><br></p></td>').join("")}</tr>`,
    ).join("");
    insertHtmlAtSelection(
      editorRef.current!,
      `<table dir="rtl" style="width:100%;border-collapse:collapse"><tbody>${rowHtml}</tbody></table><p><br></p>`,
    );
    setShowTablePicker(false);
    handleEditorInput();
  };

  const insertCheckbox = () => {
    const editor = editorRef.current;
    if (!editor) return;
    insertHtmlAtSelection(
      editor,
      `<span data-checkbox="true" data-checked="false" contenteditable="false" class="${CHECKBOX_CLASS}"></span>`,
    );
    handleEditorInput();
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    const html = event.clipboardData.getData("text/html");
    if (!html) {
      window.setTimeout(handleEditorInput, 0);
      return;
    }

    event.preventDefault();
    const cleanHtml = sanitizePastedHtml(html);
    insertHtmlAtSelection(event.currentTarget, cleanHtml);
    handleEditorInput();
  };

  const handleCheckboxClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const checkbox = target.closest<HTMLElement>('[data-checkbox="true"]');
    if (!checkbox || !event.currentTarget.contains(checkbox)) return;

    const checked = checkbox.dataset.checked !== "true";
    checkbox.dataset.checked = String(checked);
    checkbox.textContent = checked ? "✓" : "";
    handleEditorInput();
  };

  const createNewDocument = () => {
    if (!window.confirm("هل تريد إنشاء مستند جديد؟ سيتم استبدال محتوى المستند الحالي.")) return;
    setDocumentTitle("مستند جديد");
    setEditorHtml(EMPTY_DOCUMENT);
    if (editorRef.current) editorRef.current.innerHTML = EMPTY_DOCUMENT;
    const counts = getDocumentCounts(EMPTY_DOCUMENT);
    setWordCount(counts.words);
    setCharacterCount(counts.characters);
    setErrorMessage(null);
  };

  const exportDocx = async () => {
    try {
      const documentFile = new DocxDocument({
        numbering: {
          config: [{
            reference: "word-numbering",
            levels: [{
              level: 0,
              format: "decimal",
              text: "%1.",
              alignment: AlignmentType.RIGHT,
              style: { paragraph: { indent: { left: 720, hanging: 260 } } },
            }],
          }],
        },
        sections: [{
          properties: {
            page: {
              size: { width: 11906, height: 16838 },
              margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 },
            },
          },
          children: htmlToDocxBlocks(editorRef.current?.innerHTML || editorHtml),
        }],
      });
      const blob = await Packer.toBlob(documentFile);
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      const safeName = documentTitle.trim().replace(/[\\/:*?"<>|]/g, "_") || "مستند";
      link.download = `${safeName}.docx`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setSaveStatus("تم تنزيل ملف Word");
    } catch (error) {
      console.error("DOCX export error:", error);
      setErrorMessage("تعذر إنشاء ملف Word. حاول مرة أخرى.");
    }
  };

  const clearSavedDraft = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setSaveStatus("تم مسح المسودة المحفوظة");
    } catch (error) {
      console.error("Unable to clear the saved Word draft:", error);
      setSaveStatus("تعذر مسح المسودة");
    }
  };

  return (
    <main className="word-editor-shell max-w-7xl mx-auto w-full px-3 py-5 space-y-4">
      <section className="word-editor-ui bg-slate-950/80 border border-slate-800 rounded-2xl p-3 sm:p-4 space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <div className="flex flex-1 items-center gap-2 min-w-0">
            <FileText className="w-5 h-5 text-purple-400 shrink-0" />
            <input
              aria-label="عنوان المستند"
              value={documentTitle}
              onChange={(event) => setDocumentTitle(event.target.value)}
              className="min-w-0 flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <input ref={importRef} type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={importDocx} className="hidden" />
            <input ref={imageRef} type="file" accept="image/*" onChange={importImage} className="hidden" />
            <button type="button" onClick={() => importRef.current?.click()} className="tool-action">
              <Upload className="w-4 h-4" /> استيراد Word
            </button>
            <button type="button" onClick={createNewDocument} className="tool-action">
              <FileText className="w-4 h-4" /> مستند جديد
            </button>
            <button type="button" onClick={() => void exportDocx()} className="tool-action-primary">
              <Save className="w-4 h-4" /> حفظ Word (.docx)
            </button>
            <button type="button" onClick={() => window.print()} className="tool-action">
              <Printer className="w-4 h-4" /> حفظ / طباعة PDF
            </button>
          </div>
        </div>

        <div className="sticky top-0 z-30 -mx-3 sm:-mx-4 px-3 sm:px-4 py-2 bg-slate-950/95 border-y border-slate-800 backdrop-blur">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <div className="flex items-center gap-1 border-l border-slate-700 pl-2">
              <ToolbarButton label="تراجع" icon={<Undo2 className="w-4 h-4" />} onClick={() => runCommand("undo")} />
              <ToolbarButton label="إعادة" icon={<Redo2 className="w-4 h-4" />} onClick={() => runCommand("redo")} />
            </div>
            <select aria-label="نمط النص" defaultValue="p" onChange={(event) => runCommand("formatBlock", event.target.value)} className="tool-select">
              <option value="p">فقرة عادية</option><option value="h1">عنوان رئيسي H1</option><option value="h2">عنوان فرعي H2</option><option value="h3">عنوان H3</option>
            </select>
            <select aria-label="نوع الخط" value={fontFamily} onChange={(event) => { setFontFamily(event.target.value); runCommand("fontName", event.target.value); }} className="tool-select min-w-32">
              {["Cairo", "Tajawal", "Arial", "Tahoma", "Times New Roman"].map((font) => <option key={font} value={font}>{font}</option>)}
            </select>
            <select aria-label="حجم الخط" value={fontSize} onChange={(event) => applyFontSize(Number(event.target.value))} className="tool-select">
              {FONT_SIZES.map((size) => <option key={size} value={size}>{size}px</option>)}
            </select>
            <div className="flex items-center gap-1 border-x border-slate-700 px-2">
              <ToolbarButton label="عريض" icon={<Bold className="w-4 h-4" />} onClick={() => runCommand("bold")} />
              <ToolbarButton label="مائل" icon={<Italic className="w-4 h-4" />} onClick={() => runCommand("italic")} />
              <ToolbarButton label="تحته خط" icon={<Underline className="w-4 h-4" />} onClick={() => runCommand("underline")} />
              <ToolbarButton label="يتوسطه خط" icon={<Strikethrough className="w-4 h-4" />} onClick={() => runCommand("strikeThrough")} />
            </div>
            <label title="لون النص" className="shrink-0 flex items-center gap-1 p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 cursor-pointer">
              <Palette className="w-4 h-4" /><input aria-label="لون النص" type="color" onChange={(event) => runCommand("foreColor", event.target.value)} className="w-5 h-5 bg-transparent border-0" />
            </label>
            <label title="لون التمييز" className="shrink-0 flex items-center gap-1 p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 cursor-pointer">
              <span className="text-xs">تظليل</span><input aria-label="لون التمييز" type="color" onChange={(event) => runCommand("hiliteColor", event.target.value)} className="w-5 h-5 bg-transparent border-0" />
            </label>
            <div className="flex items-center gap-1 border-x border-slate-700 px-2">
              <ToolbarButton label="اتجاه RTL" icon={<span className="text-[10px] font-black">RTL</span>} onClick={() => setDirection("rtl")} />
              <ToolbarButton label="اتجاه LTR" icon={<span className="text-[10px] font-black">LTR</span>} onClick={() => setDirection("ltr")} />
              <ToolbarButton label="محاذاة لليمين" icon={<AlignRight className="w-4 h-4" />} onClick={() => runCommand("justifyRight")} />
              <ToolbarButton label="توسيط" icon={<AlignCenter className="w-4 h-4" />} onClick={() => runCommand("justifyCenter")} />
              <ToolbarButton label="محاذاة لليسار" icon={<AlignLeft className="w-4 h-4" />} onClick={() => runCommand("justifyLeft")} />
              <ToolbarButton label="ضبط النص" icon={<AlignJustify className="w-4 h-4" />} onClick={() => runCommand("justifyFull")} />
            </div>
            <ToolbarButton label="قائمة نقطية" icon={<List className="w-4 h-4" />} onClick={() => runCommand("insertUnorderedList")} />
            <ToolbarButton label="قائمة مرقمة" icon={<ListOrdered className="w-4 h-4" />} onClick={() => runCommand("insertOrderedList")} />
            <ToolbarButton label="زيادة المسافة البادئة" icon={<Indent className="w-4 h-4" />} onClick={() => runCommand("indent")} />
            <ToolbarButton label="تقليل المسافة البادئة" icon={<Outdent className="w-4 h-4" />} onClick={() => runCommand("outdent")} />
            <div className="relative shrink-0">
              <button type="button" title="إدراج جدول" onMouseDown={(event) => event.preventDefault()} onClick={() => setShowTablePicker((open) => !open)} className="tool-action">
                <Table2 className="w-4 h-4" /> جدول <ChevronDown className="w-3 h-3" />
              </button>
              {showTablePicker && (
                <div className="absolute top-full mt-2 right-0 z-50 p-2 bg-slate-900 border border-slate-700 rounded-xl shadow-xl flex gap-1">
                  {[2, 3, 4].map((size) => <button key={size} type="button" onClick={() => insertTable(size, size)} className="px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-purple-600 text-xs font-bold">{size}×{size}</button>)}
                </div>
              )}
            </div>
            <ToolbarButton label="إدراج صورة" icon={<ImagePlus className="w-4 h-4" />} onClick={() => imageRef.current?.click()} />
            <ToolbarButton label="إدراج مربع اختيار" icon={<CheckSquare className="w-4 h-4" />} onClick={insertCheckbox} />
            <ToolbarButton label="فاصل أفقي" icon={<Minus className="w-4 h-4" />} onClick={() => {
              const editor = editorRef.current;
              if (!editor) return;
              insertHtmlAtSelection(editor, "<hr />");
              handleEditorInput();
            }} />
            <ToolbarButton label="مسح التنسيق" icon={<Eraser className="w-4 h-4" />} onClick={() => runCommand("removeFormat")} />
          </div>
        </div>
      </section>

      {errorMessage && (
        <div role="alert" className="word-editor-ui flex items-center justify-between gap-3 p-3 rounded-xl border border-rose-500/40 bg-rose-950/70 text-sm text-rose-200">
          <span>{errorMessage}</span><button type="button" onClick={() => setErrorMessage(null)} aria-label="إغلاق" className="p-1"><X className="w-4 h-4" /></button>
        </div>
      )}

      <section className="word-paper min-h-[1123px] w-full max-w-[794px] mx-auto bg-white text-slate-900 shadow-2xl p-8 md:p-14 rounded-sm">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          dir="rtl"
          onInput={handleEditorInput}
          onPaste={handlePaste}
          onClick={handleCheckboxClick}
          className="min-h-[980px] outline-none text-base leading-8 text-slate-900 [&_h1]:text-3xl [&_h1]:font-black [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:text-xl [&_h3]:font-bold [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-400 [&_td]:p-2 [&_th]:border [&_th]:border-slate-400 [&_th]:p-2 [&_img]:max-w-full [&_img]:h-auto"
          style={{ fontFamily }}
        >
          <p><br /></p>
        </div>
      </section>

      <footer className="word-editor-ui max-w-[794px] mx-auto flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <span>عدد الكلمات: <b className="text-slate-200">{wordCount}</b></span>
          <span>عدد الأحرف: <b className="text-slate-200">{characterCount}</b></span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5"><Clock3 className="w-3.5 h-3.5 text-emerald-400" />{saveStatus}</span>
          <button type="button" onClick={clearSavedDraft} className="text-rose-300 hover:text-rose-200">مسح المسودة المحفوظة</button>
        </div>
      </footer>
    </main>
  );
}
