"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, ChevronRight, Heart, Images, Paintbrush, Puzzle, Star } from "lucide-react";
import { mountPuffyScene } from "@/lib/puffy-scene";
import styles from "./puffy-exploration.module.css";

type Props = { isReady: boolean; onStart: () => void; onGallery: () => void; onImport: () => void; onWorkshop: () => void };
type IconName = "brush" | "gallery" | "camera" | "puzzle";

function MenuIcon({ name, isClay }: { name: IconName; isClay: boolean }) {
  if (!isClay) {
    const Icon = { brush: Paintbrush, gallery: Images, camera: Camera, puzzle: Puzzle }[name];
    return <Icon aria-hidden="true" className={styles["puffy-menu-icon"]} strokeWidth={2.5} />;
  }
  return <svg viewBox="0 0 64 64" aria-hidden="true" className={styles["puffy-menu-icon"]}>
    {name === "brush" && <><path d="M25 38 47 9q5-6 10 0 2 3-2 7L33 44" fill="#b77a54" stroke="#966443" strokeWidth="2" /><path d="m22 34 14 11-7 8-14-11z" fill="#fffcf1" /><path d="M18 41C7 39 5 50 8 57c10 3 21-2 21-9" fill="#ff99bd" /><path d="M10 48c3-4 9-4 12-1" fill="none" stroke="#ffc4d8" strokeWidth="4" strokeLinecap="round" /></>}
    {name === "gallery" && <><rect x="8" y="7" width="48" height="50" rx="9" fill="#fffdf2" /><rect x="15" y="15" width="34" height="34" rx="4" fill="#bce6e6" /><circle cx="40" cy="23" r="6" fill="#ffda73" /><path d="m15 44 10-18 12 23H15m16 0 9-14 9 14" fill="#83d2a0" /><path d="M12 14v34" stroke="#fff" strokeWidth="3" strokeLinecap="round" /></>}
    {name === "camera" && <><rect x="8" y="20" width="48" height="33" rx="9" fill="#fff8e6" /><path d="m20 20 5-8h14l5 8" fill="#fffaed" /><circle cx="33" cy="35" r="15" fill="#b391d7" /><circle cx="33" cy="35" r="10" fill="#80619f" /><circle cx="33" cy="35" r="6" fill="#a58bc3" /><circle cx="47" cy="26" r="3" fill="#f5adc5" /><circle cx="30" cy="32" r="2" fill="#d9c9ed" /></>}
    {name === "puzzle" && <><path d="M9 14h14q-4-12 5-12t5 12h13v13q12-4 12 5t-12 5v15H32q4 12-5 12t-5-12H9V38q-12 4-12-5t12-5z" transform="translate(6 0) scale(.85)" fill="#ffda72" /><path d="M27 31h10q-3-9 4-9t4 9h10v10q9-3 9 4t-9 4v10H44q3 9-4 9t-4-9h-9V48q-9 3-9-4t9-4z" transform="translate(4 -3) scale(.85)" fill="#b194da" /><path d="M39 8h8q-3-8 3-8t3 8h8v9q8-3 8 3t-8 3v9H39v-9q-8 3-8-3t8-3z" transform="translate(-5 4) scale(.85)" fill="#f38fb5" /></>}
  </svg>;
}

export default function WelcomeScreen({ isReady, onStart, onGallery, onImport, onWorkshop }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const menuRef = useRef<HTMLElement>(null);
  const hoveredIndex = useRef(-1);
  const pressedIndex = useRef(-1);
  const [hasThreeScene, setHasThreeScene] = useState(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    const menu = menuRef.current;
    if (!canvas || !menu) return;
    let isCancelled = false;
    let cleanup: (() => void) | undefined;
    mountPuffyScene(canvas, menu, hoveredIndex, pressedIndex).then((dispose) => {
      if (isCancelled) { dispose?.(); return; }
      cleanup = dispose;
      setHasThreeScene(Boolean(dispose));
    });
    return () => { isCancelled = true; cleanup?.(); };
  }, []);
  const items = [
    { icon: "brush" as const, label: isReady ? "Start painting" : "Opening paintbox…", action: onStart, tone: "pink" },
    { icon: "gallery" as const, label: "My gallery", action: onGallery, tone: "mint" },
    { icon: "camera" as const, label: "Add a picture", action: onImport, tone: "lavender" },
    { icon: "puzzle" as const, label: "Puzzle Workshop", action: onWorkshop, tone: "blue" },
  ];
  return <div className={styles.world}><header className={styles.explorationHeader}><Link href="/"><ArrowLeft size={16} aria-hidden="true" /> Back to Pigment</Link><span>Puffy Paint Club · interactive exploration</span></header><section className={styles["puffy-welcome"]} aria-label="Welcome to Pigment">
    <div className={styles["puffy-brand"]}>
      <Star className={`${styles["puffy-star"]} ${styles["puffy-star-one"]}`} aria-hidden="true" fill="currentColor" strokeWidth={1} />
      <Star className={`${styles["puffy-star"]} ${styles["puffy-star-two"]}`} aria-hidden="true" fill="currentColor" strokeWidth={1} />
      <h1 className={styles["puffy-logo"]}><Image src="/puffy-unicorn-logo.png" alt="Pigment" width={1226} height={1283} sizes="(max-width: 760px) 340px, 48vw" priority /></h1>
      <p className={styles["puffy-tagline"]}>Little artists,<br />brighter tomorrows</p>
    </div>
    <div className={styles["puffy-menu-panel"]}>
      <p className={styles["puffy-invitation"]}>What shall we make today?</p>
      <nav ref={menuRef} className={`${styles["puffy-menu"]} ${hasThreeScene ? styles.hasThreeScene : ""}`} aria-label="Game menu"><canvas ref={canvasRef} className={styles.scene} aria-hidden="true" />
        {items.map((item, index) => <button key={item.icon} className={`${styles["puffy-menu-button"]} ${styles[`puffy-${item.tone}`]}`} onPointerEnter={() => { hoveredIndex.current = index; }} onPointerLeave={() => { hoveredIndex.current = -1; pressedIndex.current = -1; }} onFocus={() => { hoveredIndex.current = index; }} onBlur={() => { hoveredIndex.current = -1; }} onPointerDown={() => { pressedIndex.current = index; }} onPointerUp={() => { pressedIndex.current = -1; }} disabled={!isReady} onClick={item.action}><MenuIcon name={item.icon} isClay={hasThreeScene} /><span>{item.label}</span><ChevronRight className={styles["puffy-chevron"]} aria-hidden="true" strokeWidth={4} /></button>)}
      </nav>
      <p className={styles["puffy-kindness"]}>Small creativity. Big smiles. <Heart size={23} aria-hidden="true" /></p>
    </div>
  </section><p className={styles.explorationHint}>Hover or focus a button to lift it. Tap to try the menu.</p></div>;
}
