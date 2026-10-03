"use client";

import { useEffect, useRef } from "react";
import { mountGlobalPaintCursor } from "@/lib/global-paint-cursor";
import styles from "./global-paint-cursor.module.css";

export default function GlobalPaintCursor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let isCancelled = false;
    let dispose: (() => void) | undefined;
    mountGlobalPaintCursor(canvas).then((cleanup) => {
      if (isCancelled) { cleanup?.(); return; }
      dispose = cleanup;
    }).catch(() => { document.documentElement.removeAttribute("data-pigment-brush"); });
    return () => { isCancelled = true; dispose?.(); };
  }, []);
  return <canvas ref={canvasRef} className={styles.cursor} aria-hidden="true" />;
}
