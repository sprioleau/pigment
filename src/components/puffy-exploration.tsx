"use client";

import { useState } from "react";
import WelcomeScreen from "./welcome-screen";

export default function PuffyExploration() {
  const [message, setMessage] = useState("");
  return <><WelcomeScreen isReady isExploration onStart={() => setMessage("Start painting — ready to choose a picture!")} onGallery={() => setMessage("My gallery — a home for your little masterpieces.")} onImport={() => setMessage("Add a picture — bring your own coloring page.")} onWorkshop={() => setMessage("Puzzle Workshop — make your own color-by-number puzzle.")} /><p role="status" style={{ position: "fixed", bottom: 12, left: "50%", transform: "translateX(-50%)", width: "max-content", maxWidth: "90%", textAlign: "center", borderRadius: 20, background: message ? "#fffaf0" : "transparent", padding: message ? "12px 22px" : 0, color: "#80628f", boxShadow: message ? "0 5px 20px #86664e22" : "none" }}>{message}</p></>;
}
