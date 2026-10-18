" client"; const default export from function import null setFile]="useState<File" use useRef useState, { | }>(null);
  const [fileName, setFileName] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement null |>(null);
  const [history, setHistory] = useState<ImageData[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const s = e.target.files[0];
    if (s.type === "application/pdf" || s.name.endsWith(".pdf")) {
      setFile(s);
      setFileName(s.name);
      clearCanvas();
    }
  };

  const clearCanvas = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    setHistory([]);
  };

  const undoLast = () => {
    if (history.length === 0) return;
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const h = [...history];
    h.pop();
    setHistory(h);
    if (h.length > 0) {
      ctx.putImageData(h[h.length - 1], 0, 0);
    } else {
      ctx.clearRect(0, 0, c.width, c.height);
    }
  };

  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current;
    if (!c) return { x: 0, y: 0 };
    const r = c.getBoundingClientRect();
    const cx = "touches" in e ? e.touches[0].clientX : e.clientX;
    const cy = "touches" in e ? e.touches[0].clientY : e.clientY;
    return { x: cx - r.left, y: cy - r.top };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    setHistory((prev) => [...prev, ctx.getImageData(0, 0, c.width, c.height)]);
    setIsDrawing(true);
    const p = getPos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const p = getPos(e);
    ctx.strokeStyle = "#a855f7";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const downloadSignature = () => {
    const c = canvasRef.current;
    if (!c) return;
    const link = document.createElement("a");
    link.href = c.toDataURL("image/png");
    link.download = "signature.png";
    link.click();
  };

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col justify-between" dir="rtl">
      <header className="max-w-4xl mx-auto w-full px-4 py-4 flex items-center justify-between border-b border-slate-900">
        <Link className="flex items-center gap-2 text-xs font-semibold text-purple-400" href="/">
          <ArrowRight className="w-4 h-4"/> الرئيسية
        </Link>
        <span className="font-black text-lg text-white">apdf<span className="text-purple-400">.app</span></span>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6 flex-1 w-full">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-bold">
            <FileSignature className="w-3.5 h-3.5"/> أداة التوقيع
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">محرر وتوقيع مستندات PDF</h1>
          <p className="text-xs text-slate-400">وقع مستنداتك محلياً عبر المتصفح بأمان وخصوصية كاملة.</p>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
          {!file ? (
            <label className="border-2 border-dashed border-slate-800 hover:border-purple-500/50 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-900/20">
              <Upload className="w-6 h-6 text-purple-400"/>
              <span className="text-xs font-bold text-white">اختر ملف PDF أو وقع في اللوحة أدناه</span>
              <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
            </label>
          ) : (
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="text-xs text-purple-300 truncate">{fileName}</span>
              <button onClick={() => setFile(null)} className="text-xs text-rose-400">تغيير</button>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-slate-900 pt-2">
            <span className="text-xs text-purple-400 font-bold">لوحة التوقيع الحر</span>
            <div className="flex gap-2">
              <button onClick={undoLast} className="px-3 py-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white text-xs">
                تراجع
              </button>
              <button onClick={clearCanvas} className="px-3 py-1.5 rounded-lg bg-slate-900 text-rose-400 hover:bg-rose-500/20 text-xs">
                مسح
              </button>
            </div>
          </div>

          <div className="w-full border border-slate-800 rounded-xl overflow-hidden bg-slate-950/90 relative touch-none">
            <canvas
              ref={canvasRef}
              width={700}
              height={300}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-56 sm:h-72 cursor-crosshair"
            />
          </div>

          <button
            onClick={downloadSignature}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs
