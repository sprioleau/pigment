import type { RefObject } from "react";
import { createClayPaintbrush } from "./clay-paintbrush";

export type PaintPointer = { x: number; y: number; isVisible: boolean; isPressed: boolean };

type Props = {
  canvas: HTMLCanvasElement;
  palette: HTMLElement;
  colors: string[];
  selectedNumber: RefObject<number>;
  pointer: RefObject<PaintPointer>;
};

export async function mountPaintToolsScene({ canvas, palette, colors, selectedNumber, pointer }: Props): Promise<(() => void) | undefined> {
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
  const geometries: InstanceType<typeof THREE.BufferGeometry>[] = [];
  const materials: InstanceType<typeof THREE.Material>[] = [];
  const shouldReduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let hoveredIndex = -1;
  let hoverX = 0;
  let hoverY = 0;
  let animationFrame = 0;
  let hasDisposed = false;

  function geometry<T extends InstanceType<typeof THREE.BufferGeometry>>(value: T): T {
    geometries.push(value);
    return value;
  }

  function material(color: string, roughness = .42): InstanceType<typeof THREE.MeshStandardMaterial> {
    const value = new THREE.MeshStandardMaterial({ color, roughness, metalness: .05 });
    materials.push(value);
    return value;
  }

  /*
    Every bucket shares these real geometries. Its paint color is the only
    changing material; all logical controls and number labels stay in HTML.
  */
  const bodyGeometry = geometry(new THREE.CylinderGeometry(17, 14, 28, 40));
  const rimGeometry = geometry(new THREE.TorusGeometry(17, 2.3, 12, 40));
  const paintGeometry = geometry(new THREE.CylinderGeometry(14.5, 14.5, 1.8, 40));
  const handleGeometry = geometry(new THREE.TorusGeometry(15, 1.8, 10, 36, Math.PI));
  const badgeGeometry = geometry(new THREE.CircleGeometry(9.5, 32));
  const creamMaterial = material("#fff9ef", .55);
  const handleMaterial = material("#d8c6e8", .35);
  const buckets = colors.map((color) => {
    const bucket = new THREE.Group();
    const paintMaterial = material(color);
    const bodyMaterial = material(new THREE.Color(color).lerp(new THREE.Color("#ffffff"), .2).getStyle());
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = -5;
    const rim = new THREE.Mesh(rimGeometry, bodyMaterial);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 9;
    const paint = new THREE.Mesh(paintGeometry, paintMaterial);
    paint.position.y = 9;
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.set(0, 12, -3);
    const badge = new THREE.Mesh(badgeGeometry, creamMaterial);
    badge.position.set(0, -5, 16.4);
    bucket.add(body, rim, paint, handle, badge);
    scene.add(bucket);
    return bucket;
  });

  const brushAsset = createClayPaintbrush(THREE);
  const brush = brushAsset.group;
  brush.visible = false;
  scene.add(brush);

  function resize(): void {
    camera.right = window.innerWidth;
    camera.bottom = -window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  }

  function hover(event: globalThis.PointerEvent): void {
    const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>(".bucket") : null;
    const buttons = Array.from(palette.querySelectorAll<HTMLButtonElement>(".bucket"));
    hoveredIndex = target ? buttons.indexOf(target) : -1;
    if (!target) return;
    const bounds = target.getBoundingClientRect();
    hoverX = (event.clientX - bounds.left) / bounds.width - .5;
    hoverY = (event.clientY - bounds.top) / bounds.height - .5;
  }

  function clearHover(): void {
    hoveredIndex = -1;
  }

  function animate(): void {
    if (hasDisposed) return;
    const buttons = palette.querySelectorAll<HTMLButtonElement>(".bucket");
    buckets.forEach((bucket, index) => {
      const button = buttons[index];
      if (!button) { bucket.visible = false; return; }
      const bounds = button.getBoundingClientRect();
      bucket.visible = bounds.bottom > 0 && bounds.top < window.innerHeight;
      bucket.position.set(bounds.left + bounds.width / 2, -(bounds.top + bounds.height / 2), 0);
      const scale = Math.min(bounds.width / 40, bounds.height / 54) * 1.35 * (index + 1 === selectedNumber.current ? 1.04 : 1);
      bucket.scale.setScalar(scale);
      const targetX = .22 + (index === hoveredIndex && !shouldReduceMotion ? hoverY * .32 : 0);
      const targetY = index === hoveredIndex && !shouldReduceMotion ? hoverX * .32 : 0;
      if (shouldReduceMotion) {
        bucket.rotation.x = targetX; bucket.rotation.y = targetY;
      } else {
        bucket.rotation.x += (targetX - bucket.rotation.x) * .18;
        bucket.rotation.y += (targetY - bucket.rotation.y) * .18;
      }
    });
    const point = pointer.current;
    brush.visible = point.isVisible;
    brush.position.set(point.x, -point.y, 100);
    brush.scale.setScalar(point.isPressed && !shouldReduceMotion ? .9 : 1);
    brushAsset.paintMaterial.color.set(colors[selectedNumber.current - 1] ?? colors[0]);
    renderer.render(scene, camera);
    animationFrame = requestAnimationFrame(animate);
  }

  resize();
  window.addEventListener("resize", resize);
  palette.addEventListener("pointermove", hover);
  palette.addEventListener("pointerleave", clearHover);
  animate();
  return function dispose(): void {
    hasDisposed = true;
    cancelAnimationFrame(animationFrame);
    window.removeEventListener("resize", resize);
    palette.removeEventListener("pointermove", hover);
    palette.removeEventListener("pointerleave", clearHover);
    geometries.forEach((value) => value.dispose());
    materials.forEach((value) => value.dispose());
    brushAsset.dispose();
    renderer.dispose();
  };
}
