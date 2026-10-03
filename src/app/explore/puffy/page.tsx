import type { Metadata } from "next";
import PuffyExploration from "@/components/puffy-exploration";

export const metadata: Metadata = { title: "Pigment — Puffy Paint Club exploration", robots: { index: false, follow: false } };

export default function PuffyExplorationPage() {
  return <PuffyExploration />;
}
