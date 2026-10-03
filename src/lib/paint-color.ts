export function broadcastPaintColor(color: string): void {
  document.documentElement.style.setProperty("--pigment-active-paint", color);
  window.dispatchEvent(new CustomEvent("pigment:paint-color", { detail: { color } }));
}
