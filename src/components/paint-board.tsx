"use client";

import { ArrowLeft, Check, Download, RotateCcw, Save, Undo2, X } from "lucide-react";
import GameIcon from "./game-icon";
import CanvasZoom from "./canvas-zoom";
import { useEffect, useRef, useState, type PointerEvent, type CSSProperties } from "react";
import Image from "next/image";
import styles from "./paint-cursor.module.css";
import type { Picture } from "@/lib/pictures";
import { getRegionLabelPosition, paintPixels, prepareArtwork, regionAt, type Segmentation } from "@/lib/paint-engine";

type Props = { picture: Picture; initialFills: Record<number, number>; isEditing?: boolean; onAssign?: (id: number, number: number) => void; onSave: (fills: Record<number, number>, thumbnail: string, total: number) => boolean; onBack: () => void; onAgain: () => void };
type Burst = { id: number; x: number; y: number; color: string };

export default function PaintBoard({ picture, initialFills, isEditing = false, onAssign, onSave, onBack, onAgain }: Props) {
  const [segmentation, setSegmentation] = useState<Segmentation | null>(null);
  const [fills, setFills] = useState(initialFills);
  const [selectedNumber, setSelectedNumber] = useState(1);
  const [message, setMessage] = useState(isEditing ? "Choose a bucket, then tap an area to give it that number." : "Pick a bucket. Find its number. Make a little magic!");
  const [error, setError] = useState("");
  const [exportImage, setExportImage] = useState("");
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [history, setHistory] = useState<Record<number, number>[]>([]);
  const [isDebug] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debug") === "1");
  const tapStart = useRef<{ x: number; y: number; id: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const brushRef = useRef<HTMLDivElement>(null);
  const [isBrushVisible, setIsBrushVisible] = useState(false);
  const [isBrushLoaded, setIsBrushLoaded] = useState(false);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const hasChanged = useRef(false);
  const selectedColor = picture.palette[selectedNumber - 1];
  const completed = segmentation?.regions.filter((region) => Boolean(fills[region.id])).length ?? 0;
  const total = segmentation?.regions.length ?? 0;
  const isComplete = total > 0 && completed === total && !isEditing;

  useEffect(() => {
    let isCancelled = false;
    prepareArtwork(picture.image, picture.seeds, picture.defaultNumber).then((data) => {
      if (isCancelled) return;
      if (!data.regions.length) { setError("No enclosed areas found. Try line art with thick, closed outlines."); return; }
      setSegmentation(data);
    }).catch((reason: Error) => { if (!isCancelled) setError(reason.message); });
    return () => { isCancelled = true; };
  }, [picture.image, picture.seeds, picture.defaultNumber]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !segmentation) return;
    canvas.width = segmentation.width; canvas.height = segmentation.height;
    const context = canvas.getContext("2d");
    if (!context) return;
    const displayFills = isEditing
      ? Object.fromEntries(segmentation.regions.map((region) => [region.id, picture.assignments?.[region.id] ?? region.number]))
      : fills;
    const data = paintPixels(segmentation, displayFills, picture.palette);
    context.putImageData(new ImageData(data, segmentation.width, segmentation.height), 0, 0);
    context.textAlign = "center"; context.textBaseline = "middle";
    context.font = "600 13px Arial";
    for (const region of segmentation.regions) {
      if (fills[region.id] && !isEditing) continue;
      const number = picture.assignments?.[region.id] ?? region.number;
      const position = getRegionLabelPosition(segmentation, region, picture.labelPositions);
      context.strokeStyle = "white"; context.lineWidth = 3;
      context.strokeText(String(number), position.x, position.y + 1);
      context.fillStyle = "#584964"; context.fillText(String(number), position.x, position.y + 1);
    }
  }, [segmentation, fills, picture.palette, picture.assignments, picture.labelPositions, isEditing]);

  useEffect(() => {
    const pendingTimeouts = timeouts.current;
    return () => pendingTimeouts.forEach((timeout) => clearTimeout(timeout));
  }, []);

  function makeExportCanvas(): HTMLCanvasElement | null {
    if (!segmentation) return null;
    const canvas = document.createElement("canvas");
    canvas.width = segmentation.width; canvas.height = segmentation.height;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.putImageData(new ImageData(paintPixels(segmentation, fills, picture.palette), segmentation.width, segmentation.height), 0, 0);
    return canvas;
  }

  function saveDrawing(): boolean {
    const canvas = makeExportCanvas();
    if (!canvas) return false;
    const thumbnail = document.createElement("canvas");
    const scale = 260 / Math.max(canvas.width, canvas.height);
    thumbnail.width = Math.round(canvas.width * scale); thumbnail.height = Math.round(canvas.height * scale);
    thumbnail.getContext("2d")?.drawImage(canvas, 0, 0, thumbnail.width, thumbnail.height);
    if (!onSave(fills, thumbnail.toDataURL("image/png"), total)) { setMessage("Couldn’t save in this browser. Download your picture to keep it."); return false; }
    hasChanged.current = false;
    setMessage("Saved to My gallery on this browser. Lovely work!");
    return true;
  }

  function downloadDrawing(): void {
    const canvas = makeExportCanvas();
    if (!canvas) return;
    setExportImage(canvas.toDataURL("image/png"));
    setMessage("Your picture is ready. Tap Save PNG below to download it.");
  }

  function colorRegion(id: number, x?: number, y?: number): void {
    const region = segmentation?.regions.find((item) => item.id === id);
    if (!region) { setMessage("Tap inside an outlined area."); return; }
    if (isEditing) { onAssign?.(id, selectedNumber); setMessage(`Area assigned to bucket ${selectedNumber}: ${picture.names[selectedNumber - 1]}.`); return; }
    const expected = picture.assignments?.[id] ?? region.number;
    if (selectedNumber !== expected) { setMessage(`This little area wants bucket ${expected}. Give that one a try!`); return; }
    if (fills[id]) { setMessage("That area is already lovely! Try another number."); return; }
    setHistory((items) => [...items, fills]);
    setFills((previous) => ({ ...previous, [id]: selectedNumber }));
    setExportImage("");
    hasChanged.current = true;
    setMessage(`A little ${picture.names[selectedNumber - 1].toLowerCase()} magic!`);
    if (x !== undefined && y !== undefined && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const burst: Burst = { id: Date.now(), x, y, color: selectedColor };
      setBursts((items) => [...items, burst]);
      timeouts.current.push(setTimeout(() => setBursts((items) => items.filter((item) => item.id !== burst.id)), 800));
    }
  }

  function moveBrush(event: PointerEvent<HTMLCanvasElement>): void {
    const shouldShowBrush = event.pointerType === "mouse" && isBrushLoaded && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    setIsBrushVisible(shouldShowBrush);
    if (!shouldShowBrush || !brushRef.current) return;
    /*
      The illustrated bristle tip is at 10%, 91.4% of the 80px sprite.
      Keep that exact tip under the pointer so paint lands where it points.
    */
    brushRef.current.style.transform = `translate3d(${event.clientX - 8}px, ${event.clientY - 73.12}px, 0)`;
  }

  function startPointer(event: PointerEvent<HTMLCanvasElement>): void {
    moveBrush(event);
    if (event.button !== 0) return;
    tapStart.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
  }

  function finishPointer(event: PointerEvent<HTMLCanvasElement>): void {
    const start = tapStart.current;
    tapStart.current = null;
    if (!segmentation || !start || start.id !== event.pointerId || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 8) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    colorRegion(regionAt(segmentation.ids, segmentation.width, segmentation.height, Math.floor(x * segmentation.width), Math.floor(y * segmentation.height)), x * 100, y * 100);
  }

  function leavePainting(): void {
    if (hasChanged.current && !isEditing && !saveDrawing()) return;
    onBack();
  }

  function undo(): void {
    const previous = history.at(-1);
    if (!previous) return;
    setFills(previous); setHistory((items) => items.slice(0, -1)); hasChanged.current = true;
    setExportImage("");
    setMessage("One little step back. Try another color!");
  }

  return (
    <section className="painting-screen">
      <div ref={brushRef} className={styles.brush} data-visible={isBrushVisible} aria-hidden="true">
        <div className={styles.sprite}>
          <Image src="/paintbrush.png" width={80} height={80} alt="" unoptimized onLoad={() => setIsBrushLoaded(true)} />
          <svg className={styles.paint} viewBox="0 0 1000 1000" aria-hidden="true">
            <path d="M101 914C126 898 131 868 140 841C155 847 184 861 223 864C251 864 273 856 290 846C250 901 184 932 101 914Z" fill={selectedColor} />
            <path d="M127 909Q175 910 229 881" fill="none" stroke="white" strokeWidth="8" opacity=".5" strokeLinecap="round" />
          </svg>
        </div>
      </div>
      <header className="screen-header">
        <button className="game-button small" onClick={leavePainting}><GameIcon icon={ArrowLeft} /> Pictures</button>
        <div><span className="eyebrow">{isEditing ? "MAKE A NEW ADVENTURE" : "YOUR LITTLE MASTERPIECE"}</span><h1>{picture.title}</h1></div>
        <div className="toolbar">{!isEditing && <><button className="game-button small" disabled={!segmentation} onClick={saveDrawing}><GameIcon icon={Save} /> Save</button><button className="game-button small gold" disabled={!segmentation} onClick={downloadDrawing}><GameIcon icon={Download} /> Download</button></>}</div>
      </header>
      <div className="paint-layout">
        <aside className="palette" aria-label="Paint buckets">
          <span className="palette-title">Your colors</span>
          {picture.palette.map((color, index) => <button key={index} className={`bucket ${selectedNumber === index + 1 ? "is-selected" : ""}`} style={{ "--paint": color } as CSSProperties} aria-label={`Bucket ${index + 1}: ${picture.names[index]}`} aria-pressed={selectedNumber === index + 1} onClick={() => { setSelectedNumber(index + 1); setMessage(`Bucket ${index + 1} is ready!`); }}><span className="bucket-handle" /><span className="bucket-lip" /><span className="bucket-number">{index + 1}</span><span className="bucket-shine" /></button>)}
          {!isEditing && <button className="undo-button" disabled={!history.length} onClick={undo}><GameIcon icon={Undo2} /> Undo</button>}
        </aside>
        <div className="canvas-area">
          <div className="paper-frame">
            {error ? <p role="alert" className="canvas-message">{error}</p> : !segmentation ? <p className="canvas-message" role="status">Preparing a little magic…</p> : null}
            <CanvasZoom width={segmentation?.width ?? 1} height={segmentation?.height ?? 1}>
            <canvas ref={canvasRef} aria-label={`${picture.title} coloring canvas. Choose a numbered paint bucket, then tap a matching area.`} onPointerDown={startPointer} onPointerUp={finishPointer} onPointerCancel={() => { tapStart.current = null; }} onPointerEnter={moveBrush} onPointerMove={moveBrush} onPointerLeave={() => setIsBrushVisible(false)} style={{ cursor: isBrushVisible ? "none" : "crosshair", display: segmentation ? "block" : "none" }} />
            <div className="bursts" style={{ inset: 0 }} aria-hidden="true">{bursts.map((burst) => <div key={burst.id} className="burst" style={{ left: `${burst.x}%`, top: `${burst.y}%` }}>{Array.from({ length: 12 }, (_, i) => <i key={i} style={{ "--dx": `${Math.cos(i * Math.PI / 6) * (30 + i % 3 * 14)}px`, "--dy": `${Math.sin(i * Math.PI / 6) * (30 + i % 3 * 14)}px`, background: burst.color, opacity: .45 + (i % 3) * .2 } as CSSProperties} />)}</div>)}</div>
            </CanvasZoom>
          </div>
          {!isEditing && <div className="progress-row"><span>✦ {completed} of {total} little wonders</span><progress value={completed} max={total || 1} aria-label="Painting progress" /></div>}
          <p className="paint-hint" role="status">{message}</p>
          {exportImage && <section className="export-card" aria-label="Exported picture"><div><h2>A little wonder to keep</h2><p>Your PNG includes your painting, without numbers or game controls.</p><form action="/api/export" method="post"><input type="hidden" name="image" value={exportImage} /><input type="hidden" name="name" value={picture.id} /><button className="game-button small gold" type="submit"><GameIcon icon={Download} /> Save PNG</button></form><button className="export-close" aria-label="Close export preview" onClick={() => setExportImage("")}><GameIcon icon={X} /></button></div><Image src={exportImage} alt={`Export of ${picture.title}`} width={200} height={200} unoptimized /></section>}
          {isComplete && <section className="completion"><span className="eyebrow">EVERY COLOR FOUND ITS HOME</span><h2>You made something magical! ✨</h2><div className="completion-actions"><button className="game-button small gold" onClick={saveDrawing}><GameIcon icon={Save} /> Save my masterpiece</button><button className="game-button small" onClick={() => { if (saveDrawing()) onAgain(); }}><GameIcon icon={RotateCcw} /> Paint again</button><button className="game-button small" onClick={leavePainting}><GameIcon icon={ArrowLeft} /> Choose another picture</button></div></section>}
          {isDebug && segmentation && <details className="accessible-regions"><summary>{isEditing ? "Assign areas with buttons" : "Paint areas with buttons"}</summary><p>Choose a bucket above, then choose an area.</p><div>{segmentation.regions.map((region, index) => <button className="region-button" key={region.id} disabled={!isEditing && Boolean(fills[region.id])} onClick={() => colorRegion(region.id)}>Area {index + 1} · {picture.assignments?.[region.id] ?? region.number}{fills[region.id] ? <GameIcon icon={Check} /> : null}</button>)}</div></details>}
        </div>
      </div>
    </section>
  );
}
