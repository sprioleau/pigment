"use client";

import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Maximize, ZoomIn, ZoomOut } from "lucide-react";
import GameIcon from "./game-icon";
import styles from "./canvas-zoom.module.css";

type Props = { width: number; height: number; children: ReactNode; shouldAllowPanning?: boolean };

export default function CanvasZoom({ width, height, children, shouldAllowPanning = true }: Props) {
  const [zoom, setZoom] = useState(1);
  const viewportRef = useRef<HTMLDivElement>(null);

  function changeZoom(nextZoom: number): void {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const centerX = (viewport.scrollLeft + viewport.clientWidth / 2) / zoom;
    const centerY = (viewport.scrollTop + viewport.clientHeight / 2) / zoom;
    setZoom(nextZoom);
    requestAnimationFrame(() => {
      viewport.scrollLeft = nextZoom === 1 ? 0 : centerX * nextZoom - viewport.clientWidth / 2;
      viewport.scrollTop = nextZoom === 1 ? 0 : centerY * nextZoom - viewport.clientHeight / 2;
    });
  }

  return <div className={styles.zoom}>
    <div className={styles.controls} aria-label="Picture zoom controls">
      <button className="game-button small" aria-label="Zoom out" disabled={zoom === 1} onClick={() => changeZoom(Math.max(1, zoom - .5))}><GameIcon icon={ZoomOut} /> Zoom out</button>
      <output aria-live="polite">{Math.round(zoom * 100)}%</output>
      <button className="game-button small" aria-label="Zoom in" disabled={zoom === 3} onClick={() => changeZoom(Math.min(3, zoom + .5))}><GameIcon icon={ZoomIn} /> Zoom in</button>
      <button className="game-button small" aria-label="Fit picture" disabled={zoom === 1} onClick={() => changeZoom(1)}><GameIcon icon={Maximize} /> Fit</button>
    </div>
    <div ref={viewportRef} className={styles.viewport} style={{ "--ratio": width / height } as CSSProperties} aria-label="Scrollable coloring picture" tabIndex={zoom > 1 ? 0 : -1}>
      <div className={styles.stage} data-allow-pan={shouldAllowPanning} style={{ width: `${zoom * 100}%` }}>{children}</div>
    </div>
    {zoom > 1 && <p className={styles.hint}>{shouldAllowPanning ? "Swipe to look around. Tap an area to paint." : "Choose Pan picture to swipe around the enlarged canvas."}</p>}
  </div>;
}
