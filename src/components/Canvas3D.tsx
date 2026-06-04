import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useProjectStore } from '../store/projectStore';
import { MATERIALS } from '../lib/materials';
import { getVisualHeight } from '../lib/geometry';

export default function Canvas3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const { pieces } = useProjectStore();

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const W = mount.clientWidth;
    const H = mount.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x12151e);
    scene.fog = new THREE.Fog(0x12151e, 50, 300);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.01, 500);
    camera.position.set(20, 20, 30);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0x334466, 1.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2);
    dirLight.position.set(20, 40, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0xc94010, 0.4);
    rimLight.position.set(-20, 10, -20);
    scene.add(rimLight);

    // Grid
    const gridHelper = new THREE.GridHelper(100, 50, 0x1e2535, 0x1a2030);
    scene.add(gridHelper);

    // Ground plane (shadow catcher)
    const groundGeo = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.3 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);

    // Helper to parse hex color
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      } : { r: 0.5, g: 0.5, b: 0.5 };
    };

    // Add pieces
    const group = new THREE.Group();
    for (const piece of pieces) {
      const mat = MATERIALS[piece.type];
      const { r, g, b } = hexToRgb(mat.color);
      const color = new THREE.Color(r * 0.7, g * 0.7, b * 0.7);

      const material = new THREE.MeshStandardMaterial({
        color,
        metalness: piece.grade === 'stainless' ? 0.8 : piece.grade === 'aluminum' ? 0.7 : 0.4,
        roughness: piece.grade === 'stainless' ? 0.2 : piece.grade === 'aluminum' ? 0.3 : 0.6,
        envMapIntensity: 1.0,
      });

      const INCH = 1 / 12; // 1 inch in world units (feet scale)

      if (piece.orientation === 'upright') {
        // Vertical tube
        const vizH = getVisualHeight(piece) * INCH;
        let geo: THREE.BufferGeometry;
        if (piece.type === 'round_tube' || piece.type === 'pipe') {
          geo = new THREE.CylinderGeometry(piece.width / 2 * INCH, piece.width / 2 * INCH, piece.zHeight * INCH, 16);
        } else {
          geo = new THREE.BoxGeometry(piece.width * INCH, piece.zHeight * INCH, piece.height * INCH);
        }
        const mesh = new THREE.Mesh(geo, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.position.set(piece.x * INCH, piece.zHeight / 2 * INCH, piece.y * INCH);
        group.add(mesh);
      } else {
        const rad = (piece.angle * Math.PI) / 180;
        const len = piece.length * INCH;
        const vizH = getVisualHeight(piece) * INCH;
        let geo: THREE.BufferGeometry;

        if (piece.type === 'round_tube' || piece.type === 'pipe') {
          geo = new THREE.CylinderGeometry(piece.width / 2 * INCH, piece.width / 2 * INCH, len, 12);
          const mesh = new THREE.Mesh(geo, material);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.rotation.z = Math.PI / 2;
          mesh.rotation.y = rad;
          // For rotated tubes, position correctly
          const pivot = new THREE.Group();
          pivot.add(mesh);
          pivot.position.set(piece.x * INCH, piece.height / 2 * INCH, piece.y * INCH);
          pivot.rotation.y = -rad;
          group.add(pivot);
          continue;
        }

        geo = new THREE.BoxGeometry(len, vizH, piece.wall * INCH || 0.05);

        const mesh = new THREE.Mesh(geo, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.position.set(piece.x * INCH, vizH / 2, piece.y * INCH);
        mesh.rotation.y = -rad;
        group.add(mesh);
      }
    }
    scene.add(group);

    // Center camera on content
    if (pieces.length > 0) {
      const box = new THREE.Box3().setFromObject(group);
      const center = new THREE.Vector3();
      box.getCenter(center);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      const dist = maxDim * 2.5;
      camera.position.set(center.x + dist, center.y + dist * 0.8, center.z + dist);
      camera.lookAt(center);
    }

    // Orbit controls (manual)
    let isMouseDown = false;
    let lastMX = 0;
    let lastMY = 0;
    let theta = Math.PI / 4;
    let phi = Math.PI / 3;
    let radius = camera.position.distanceTo(new THREE.Vector3());
    const target = new THREE.Vector3();

    const onMouseDown = (e: MouseEvent) => {
      isMouseDown = true;
      lastMX = e.clientX;
      lastMY = e.clientY;
    };
    const onMouseUp = () => { isMouseDown = false; };
    const onMouseMove = (e: MouseEvent) => {
      if (!isMouseDown) return;
      const dx = e.clientX - lastMX;
      const dy = e.clientY - lastMY;
      theta -= dx * 0.005;
      phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, phi - dy * 0.005));
      lastMX = e.clientX;
      lastMY = e.clientY;
      camera.position.set(
        target.x + radius * Math.sin(phi) * Math.sin(theta),
        target.y + radius * Math.cos(phi),
        target.z + radius * Math.sin(phi) * Math.cos(theta),
      );
      camera.lookAt(target);
    };
    const onWheel = (e: WheelEvent) => {
      radius = Math.max(0.5, Math.min(200, radius * (e.deltaY > 0 ? 1.1 : 0.9)));
      camera.position.set(
        target.x + radius * Math.sin(phi) * Math.sin(theta),
        target.y + radius * Math.cos(phi),
        target.z + radius * Math.sin(phi) * Math.cos(theta),
      );
      camera.lookAt(target);
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: true });

    // Animate
    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const ro = new ResizeObserver(() => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('wheel', onWheel);
      mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [pieces]);

  return (
    <div className="w-full h-full relative">
      <div ref={mountRef} className="w-full h-full" />
      <div className="absolute bottom-4 left-4 text-xs text-slate-500 font-mono">
        3D View  •  Drag to rotate  •  Scroll to zoom
      </div>
      {pieces.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center text-slate-600">
            <div className="text-2xl mb-2">No pieces</div>
            <div className="text-sm">Add pieces in the Library panel</div>
          </div>
        </div>
      )}
    </div>
  );
}
