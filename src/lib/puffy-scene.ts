import type { RefObject } from "react";

export async function mountPuffyScene(canvas: HTMLCanvasElement, menu: HTMLElement, hoveredIndex: RefObject<number>, pressedIndex: RefObject<number>, hoverPosition: RefObject<{ x: number; y: number }>): Promise<(() => void) | undefined> {
  const THREE = await import("three");
  let renderer: InstanceType<typeof THREE.WebGLRenderer>;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch {
    return undefined;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-300, 300, 300, -300, .1, 1500);
  camera.position.set(0, 0, 800);
  const ambient = new THREE.HemisphereLight(0xffffff, 0xe7bfb4, 2.2);
  scene.add(ambient);
  const light = new THREE.DirectionalLight(0xffffff, 3);
  light.position.set(-200, 400, 500);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.camera.left = -450; light.shadow.camera.right = 450;
  light.shadow.camera.top = 450; light.shadow.camera.bottom = -450;
  light.shadow.camera.near = .1; light.shadow.camera.far = 1200;
  light.shadow.bias = -.001;
  light.shadow.radius = 4;
  scene.add(light);
  const buttons: InstanceType<typeof THREE.Group>[] = [];
  const colors = [0xf48db4, 0x6dcac1, 0xbb99da, 0x78cbd6];
  const geometries: InstanceType<typeof THREE.BufferGeometry>[] = [];
  const materials: InstanceType<typeof THREE.Material>[] = [];

  function roundedShape(width: number, height: number) {
    const radius = height / 2;
    const left = -width / 2; const right = width / 2;
    const shape = new THREE.Shape();
    shape.moveTo(left + radius, -radius);
    shape.lineTo(right - radius, -radius);
    shape.absarc(right - radius, 0, radius, -Math.PI / 2, Math.PI / 2, false);
    shape.lineTo(left + radius, radius);
    shape.absarc(left + radius, 0, radius, Math.PI / 2, Math.PI * 1.5, false);
    return shape;
  }

  function addBrush(group: InstanceType<typeof THREE.Group>, width: number) {
    const brush = new THREE.Group();
    const handleGeometry = new THREE.CylinderGeometry(6, 9, 47, 24);
    const handleMaterial = new THREE.MeshStandardMaterial({ color: 0xb58058, roughness: .5 });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    const bandGeometry = new THREE.CylinderGeometry(10, 10, 12, 24);
    const bandMaterial = new THREE.MeshStandardMaterial({ color: 0xfff4dc, roughness: .4 });
    const band = new THREE.Mesh(bandGeometry, bandMaterial); band.position.y = 25;
    const tipGeometry = new THREE.SphereGeometry(13, 24, 20);
    const tipMaterial = new THREE.MeshStandardMaterial({ color: 0xffd0e0, roughness: .5 });
    const tip = new THREE.Mesh(tipGeometry, tipMaterial); tip.scale.set(.9, 1.3, .75); tip.position.y = 42;
    geometries.push(handleGeometry, bandGeometry, tipGeometry); materials.push(handleMaterial, bandMaterial, tipMaterial);
    brush.add(handle, band, tip); brush.rotation.z = -.65; brush.rotation.x = -.4;
    brush.position.set(-width / 2 + 48, -10, 40);
    brush.traverse((object) => { if (object instanceof THREE.Mesh) object.castShadow = true; });
    group.add(brush);
  }

  function resize() {
    for (const group of buttons) scene.remove(group);
    buttons.length = 0;
    geometries.splice(0).forEach((geometry) => geometry.dispose());
    materials.splice(0).forEach((material) => material.dispose());
    const width = menu.clientWidth;
    const height = menu.clientHeight;
    renderer.setSize(width + 36, height + 36, false);
    camera.left = -(width + 36) / 2; camera.right = (width + 36) / 2;
    camera.top = (height + 36) / 2; camera.bottom = -(height + 36) / 2;
    camera.updateProjectionMatrix();
    const controls = menu.querySelectorAll("button");
    controls.forEach((control, index) => {
      const group = new THREE.Group();
      const geometry = new THREE.ExtrudeGeometry(roundedShape(width - 28, control.clientHeight - 25), { depth: 14, bevelEnabled: true, bevelThickness: 12, bevelSize: 12, bevelSegments: 8, curveSegments: 24 });
      const material = new THREE.MeshStandardMaterial({ color: colors[index], roughness: .45, metalness: 0 });
      const mesh = new THREE.Mesh(geometry, material); mesh.castShadow = true;
      group.add(mesh);
      if (index === 0) addBrush(group, width);
      group.position.y = height / 2 - control.offsetTop - control.clientHeight / 2;
      group.userData.baseY = group.position.y;
      buttons.push(group); scene.add(group);
      geometries.push(geometry); materials.push(material);
    });
    renderer.render(scene, camera);
  }

  const shadowGeometry = new THREE.PlaneGeometry(1200, 1200);
  const shadowMaterial = new THREE.ShadowMaterial({ opacity: .07 });
  const shadowPlane = new THREE.Mesh(shadowGeometry, shadowMaterial);
  shadowPlane.position.z = -16; shadowPlane.receiveShadow = true; scene.add(shadowPlane);
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let shouldReduceMotion = motionQuery.matches;
  function updateMotion(event: MediaQueryListEvent) { shouldReduceMotion = event.matches; }
  motionQuery.addEventListener("change", updateMotion);
  let frame = 0;
  let isDisposed = false;
  function animate(time: number) {
    if (isDisposed) return;
    buttons.forEach((button, index) => {
      const hasHover = hoveredIndex.current === index;
      const isPressed = pressedIndex.current === index;
      button.position.z = THREE.MathUtils.lerp(button.position.z, isPressed ? -5 : hasHover ? 25 : 0, .14);
      button.rotation.x = THREE.MathUtils.lerp(button.rotation.x, hasHover && !shouldReduceMotion ? -hoverPosition.current.y * .065 : 0, .12);
      button.rotation.y = THREE.MathUtils.lerp(button.rotation.y, hasHover && !shouldReduceMotion ? -hoverPosition.current.x * .065 : 0, .12);
      button.rotation.z = THREE.MathUtils.lerp(button.rotation.z, hasHover && !shouldReduceMotion ? Math.sin(time * .006) * .007 : 0, .12);
      button.position.y = button.userData.baseY + (hasHover && !shouldReduceMotion ? 4 : 0);
    });
    renderer.render(scene, camera);
    frame = requestAnimationFrame(animate);
  }
  const observer = new ResizeObserver(resize); observer.observe(menu);
  resize(); frame = requestAnimationFrame(animate);
  return function dispose() {
    isDisposed = true; cancelAnimationFrame(frame); observer.disconnect();
    motionQuery.removeEventListener("change", updateMotion);
    geometries.forEach((geometry) => geometry.dispose()); materials.forEach((material) => material.dispose());
    shadowGeometry.dispose(); shadowMaterial.dispose(); renderer.dispose();
  };
}
