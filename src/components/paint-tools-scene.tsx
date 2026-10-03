"use client";

import { useEffect, useRef, type RefObject } from "react";
import { mountPaintToolsScene } from "@/lib/paint-tools-scene";
import styles from "./paint-cursor.module.css";

type Props = { palette: RefObject<HTMLElement | null>; colors: string[]; selectedNumber: RefObject<number>; onReady: (isReady: boolean) => void };

export default function PaintToolsScene({ palette, colors, selectedNumber, onReady }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const paletteElement = palette.current;
    if (!canvas || !paletteElement) return;
    let isCancelled = false;
    let dispose: (() => void) | undefined;
    function loseContext(): void {
      dispose?.();
      onReady(false);
    }
    canvas.addEventListener("webglcontextlost", loseContext);
    mountPaintToolsScene({ canvas, palette: paletteElement, colors, selectedNumber }).then((cleanup) => {
      if (isCancelled) { cleanup?.(); return; }
      dispose = cleanup;
      onReady(Boolean(cleanup));
    }).catch(() => { if (!isCancelled) onReady(false); });
    return () => { isCancelled = true; canvas.removeEventListener("webglcontextlost", loseContext); dispose?.(); };
  }, [palette, colors, selectedNumber, onReady]);
  return <canvas ref={canvasRef} className={styles.scene} aria-hidden="true" />;
}
