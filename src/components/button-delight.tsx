"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import styles from "./button-delight.module.css";

type PaintBurst = { id: number; x: number; y: number; color: string };

export default function ButtonDelight() {
  const [bursts, setBursts] = useState<PaintBurst[]>([]);
  const activeColor = useRef("#F8AED2");
  const nextId = useRef(0);

  useEffect(() => {
    const timers = new Map<number, ReturnType<typeof setTimeout>>();
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let gesture: { id: number; x: number; y: number; hasMoved: boolean; isCancelled: boolean } | null = null;

    function handlePointerDown(event: PointerEvent): void {
      if (!event.isTrusted) return;
      gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, hasMoved: false, isCancelled: false };
    }

    function handlePointerMove(event: PointerEvent): void {
      if (gesture?.id !== event.pointerId) return;
      if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 8) gesture.hasMoved = true;
    }

    function handlePointerCancel(event: PointerEvent): void {
      if (gesture?.id === event.pointerId) gesture.isCancelled = true;
    }

    function handlePaintColor(event: Event): void {
      if (!(event instanceof CustomEvent)) return;
      const color = event.detail?.color;
      if (typeof color === "string" && CSS.supports("color", color)) activeColor.current = color;
    }

    function handleClick(event: MouseEvent): void {
      if (!event.isTrusted || motionQuery.matches || !(event.target instanceof Element)) return;
      if (event.detail > 0 && (gesture?.hasMoved || gesture?.isCancelled)) return;
      const button = event.target.closest("button, [role='button']");
      if (!(button instanceof HTMLElement) || button.matches(":disabled") || button.getAttribute("aria-disabled") === "true") return;
      const bounds = button.getBoundingClientRect();
      const paintColor = getComputedStyle(button).getPropertyValue("--paint").trim();
      const burst: PaintBurst = {
        id: ++nextId.current,
        x: event.detail === 0 ? bounds.left + bounds.width / 2 : event.clientX,
        y: event.detail === 0 ? bounds.top + bounds.height / 2 : event.clientY,
        color: paintColor && CSS.supports("color", paintColor) ? paintColor : activeColor.current,
      };
      if (timers.size >= 6) {
        const oldestId = timers.keys().next().value;
        if (oldestId !== undefined) {
          clearTimeout(timers.get(oldestId));
          timers.delete(oldestId);
        }
      }
      setBursts((previous) => [...previous.slice(-5), burst]);
      timers.set(burst.id, setTimeout(() => {
        timers.delete(burst.id);
        setBursts((previous) => previous.filter((item) => item.id !== burst.id));
      }, 480));
    }

    document.addEventListener("click", handleClick, true);
    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("pointermove", handlePointerMove, true);
    document.addEventListener("pointercancel", handlePointerCancel, true);
    window.addEventListener("pigment:paint-color", handlePaintColor);
    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("pointermove", handlePointerMove, true);
      document.removeEventListener("pointercancel", handlePointerCancel, true);
      window.removeEventListener("pigment:paint-color", handlePaintColor);
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  return <div className={styles.overlay} aria-hidden="true">
    {bursts.map((burst) => <div className={styles.burst} key={burst.id} style={{ left: burst.x, top: burst.y, "--paint": burst.color } as CSSProperties}>
      {Array.from({ length: 8 }, (_, index) => <i key={index} className={styles.drop} style={{ "--dx": `${Math.cos(index * Math.PI / 4) * (21 + index % 3 * 6)}px`, "--dy": `${Math.sin(index * Math.PI / 4) * (21 + index % 3 * 6)}px`, "--size": `${5 + index % 3 * 2}px`, "--opacity": .4 + index % 3 * .15 } as CSSProperties} />)}
    </div>)}
  </div>;
}
