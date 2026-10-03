import { createClayPaintbrush } from "./clay-paintbrush";

export async function mountGlobalPaintCursor(canvas: HTMLCanvasElement): Promise<(() => void) | undefined> {
  const pointerMedia = window.matchMedia("(hover: hover) and (pointer: fine)");
  if (!pointerMedia.matches) return undefined;
  const THREE = await import("three");
  let renderer: InstanceType<typeof THREE.WebGLRenderer>;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch {
    return undefined;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, window.innerWidth, 0, -window.innerHeight, .1, 2000);
  camera.position.z = 1000;
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8bad5, 2.5));
  const light = new THREE.DirectionalLight(0xffffff, 3.3);
  light.position.set(-200, 400, 700);
  scene.add(light);
  const brush = createClayPaintbrush(THREE);
  const initialColor = document.documentElement.style.getPropertyValue("--pigment-active-paint").trim();
  brush.paintMaterial.color.set(/^#[0-9a-f]{6}$/i.test(initialColor) ? initialColor : "#F8AED2");
  brush.group.visible = false;
  scene.add(brush.group);
  const motionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");
  let isPressed = false;
  let hasDisposed = false;
  let animationFrame = 0;

  function resize(): void {
    camera.right = window.innerWidth;
    camera.bottom = -window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  }

  function hide(): void {
    brush.group.visible = false;
    isPressed = false;
    document.documentElement.removeAttribute("data-pigment-brush");
  }

  function move(event: PointerEvent): void {
    if (event.pointerType !== "mouse" || !pointerMedia.matches || hasDisposed) { hide(); return; }
    brush.group.position.set(event.clientX, -event.clientY, 100);
    brush.group.visible = true;
    document.documentElement.setAttribute("data-pigment-brush", "true");
  }

  function press(event: PointerEvent): void {
    move(event);
    isPressed = event.pointerType === "mouse" && event.button === 0;
  }

  function release(): void {
    isPressed = false;
  }

  function leave(event: PointerEvent): void {
    if (!event.relatedTarget) hide();
  }

  function changePointer(): void {
    if (!pointerMedia.matches) hide();
  }

  function changeColor(event: Event): void {
    const color = (event as CustomEvent<{ color?: string }>).detail?.color;
    if (typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color)) brush.paintMaterial.color.set(color);
  }

  function animate(time: number): void {
    if (hasDisposed) return;
    /*
      The tip stays at the group's origin. Only its handle breathes and turns,
      so the visible paint point always matches the exact pointer location.
    */
    const shouldReduceMotion = motionMedia.matches;
    brush.group.rotation.z = -Math.PI / 4 + (shouldReduceMotion ? 0 : Math.sin(time / 850) * .025);
    brush.group.rotation.y = shouldReduceMotion ? 0 : Math.sin(time / 1200) * .045;
    brush.group.scale.setScalar(shouldReduceMotion ? 1 : isPressed ? .92 : 1 + Math.sin(time / 1000) * .018);
    renderer.render(scene, camera);
    animationFrame = requestAnimationFrame(animate);
  }

  function loseContext(): void {
    hide();
    dispose();
  }

  function dispose(): void {
    if (hasDisposed) return;
    hasDisposed = true;
    hide();
    cancelAnimationFrame(animationFrame);
    window.removeEventListener("resize", resize);
    window.removeEventListener("blur", hide);
    document.removeEventListener("pointermove", move);
    document.removeEventListener("pointerdown", press);
    document.removeEventListener("pointerup", release);
    document.removeEventListener("pointercancel", release);
    document.removeEventListener("pointerout", leave);
    window.removeEventListener("pigment:paint-color", changeColor);
    pointerMedia.removeEventListener("change", changePointer);
    canvas.removeEventListener("webglcontextlost", loseContext);
    brush.dispose();
    renderer.dispose();
  }

  resize();
  window.addEventListener("resize", resize);
  window.addEventListener("blur", hide);
  document.addEventListener("pointermove", move, { passive: true });
  document.addEventListener("pointerdown", press, { passive: true });
  document.addEventListener("pointerup", release, { passive: true });
  document.addEventListener("pointercancel", release, { passive: true });
  document.addEventListener("pointerout", leave, { passive: true });
  window.addEventListener("pigment:paint-color", changeColor);
  pointerMedia.addEventListener("change", changePointer);
  canvas.addEventListener("webglcontextlost", loseContext);
  animationFrame = requestAnimationFrame(animate);
  return dispose;
}
