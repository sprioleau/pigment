import type { BufferGeometry, Group, Material, MeshStandardMaterial, Vector3 } from "three";

export type ClayPaintbrush = { group: Group; paintMaterial: MeshStandardMaterial; tipPosition: Vector3; dispose: () => void };

export function createClayPaintbrush(THREE: typeof import("three")): ClayPaintbrush {
  const group = new THREE.Group();
  const geometries: BufferGeometry[] = [];
  const materials: Material[] = [];
  const handleMaterial = new THREE.MeshStandardMaterial({ color: 0xb7a0cd, roughness: .55 });
  const ferruleMaterial = new THREE.MeshStandardMaterial({ color: 0xf5e5c8, roughness: .45 });
  const bristleMaterial = new THREE.MeshStandardMaterial({ color: 0xd9b98b, roughness: .75 });
  const paintMaterial = new THREE.MeshStandardMaterial({ color: 0xf48db4, roughness: .5 });
  materials.push(handleMaterial, ferruleMaterial, bristleMaterial, paintMaterial);

  function addMesh(geometry: BufferGeometry, material: MeshStandardMaterial, x: number, y: number, z: number) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    geometries.push(geometry);
    group.add(mesh);
    return mesh;
  }

  const handle = addMesh(new THREE.CylinderGeometry(5.5, 6.5, 43, 24), handleMaterial, 0, 52.5, 0);
  handle.rotation.y = .15;
  addMesh(new THREE.SphereGeometry(5.5, 24, 16), handleMaterial, 0, 74, 0);
  addMesh(new THREE.CylinderGeometry(8.2, 8.2, 12, 24), ferruleMaterial, 0, 27, 0);
  const bandTop = addMesh(new THREE.TorusGeometry(7.5, 1.25, 12, 24), ferruleMaterial, 0, 32, 0);
  bandTop.rotation.x = Math.PI / 2;
  const bandBottom = addMesh(new THREE.TorusGeometry(7.5, 1.25, 12, 24), ferruleMaterial, 0, 22, 0);
  bandBottom.rotation.x = Math.PI / 2;
  const bristles = addMesh(new THREE.ConeGeometry(8, 21, 32), bristleMaterial, 0, 10.5, 0);
  bristles.rotation.z = Math.PI;
  bristles.scale.z = .72;

  /*
    The rounded paint cap ends at the group's origin so the visible paint tip
    and the canvas pointer hotspot remain aligned when the brush rotates.
  */
  const paintCoating = addMesh(new THREE.ConeGeometry(6, 14, 32), paintMaterial, 0, 7, 0);
  paintCoating.rotation.z = Math.PI;
  paintCoating.scale.z = .76;
  const paintTip = addMesh(new THREE.SphereGeometry(3, 24, 16), paintMaterial, 0, 3, 0);
  paintTip.scale.set(.86, 1, .66);
  const paintCollar = addMesh(new THREE.SphereGeometry(6, 24, 16), paintMaterial, 0, 11, 0);
  paintCollar.scale.set(1, .5, .72);
  group.rotation.z = -Math.PI / 4;
  const tipPosition = new THREE.Vector3(0, 0, 0);

  function dispose(): void {
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
  }

  return { group, paintMaterial, tipPosition, dispose };
}
