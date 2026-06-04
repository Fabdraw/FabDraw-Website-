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
    scene.fog = new THREE.Fog(0x12151e, 500, 3000);

    // Camera - positioned for inch-scale scene (typical table ~48" wide, ~34" tall)
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 5000);
    camera.position.set(60, 40, 60);
    camera.lookAt(24, 17, 24);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(50, 80, 50);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
    fillLight.position.set(-30, 20, -30);
    scene.add(fillLight);

    // Grid - 200 inches wide, 20 divisions (10" each)
    const gridHelper = new THREE.GridHelper(200, 20, 0x333344, 0x222233);
    scene.add(gridHelper);

    // Ground plane (shadow catcher)
    const groundGeo = new THREE.PlaneGeometry(2000, 2000);
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

      const material = new THREE.MeshPhongMaterial({
        color,
        shininess: piece.grade === 'stainless' ? 80 : piece.grade === 'aluminum' ? 60 : 20,
        specular: new THREE.Color(0.2, 0.2, 0.2),
      });

      // Use inches directly as Three.js units
      if (piece.orientation === 'upright') {
        // Vertical tube - rises from Y=0 to Y=piece.length
        let geo: THREE.BufferGeometry;
        if (piece.type === 'round_tube' || piece.type === 'pipe') {
          geo = new THREE.CylinderGeometry(piece.width / 2, piece.width / 2, piece.length, 16);
        } else {
          geo = new THREE.BoxGeometry(piece.width, piece.length, piece.height);
        }
        const mesh = new THREE.Mesh(geo, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        // Center vertically at half length
        mesh.position.set(piece.x, piece.length / 2, piece.y);
        group.add(mesh);

        // Edge overlay
        const edges = new THREE.EdgesGeometry(geo);
        const edgeMat = new THREE.LineBasicMaterial({ color: new THREE.Color(r * 0.4, g * 0.4, b * 0.4), linewidth: 1 });
        const edgeMesh = new THREE.LineSegments(edges, edgeMat);
        edgeMesh.position.copy(mesh.position);
        group.add(edgeMesh);
      } else {
        const rad = (piece.angle * Math.PI) / 180;
        const len = piece.length;
        const vizH = getVisualHeight(piece);
        let geo: THREE.BufferGeometry;

        if (piece.type === 'round_tube' || piece.type === 'pipe') {
          geo = new THREE.CylinderGeometry(piece.width / 2, piece.width / 2, len, 12);
          const mesh = new THREE.Mesh(geo, material);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.rotation.z = Math.PI / 2;
          // For rotated tubes, position correctly using pivot
          const pivot = new THREE.Group();
          pivot.add(mesh);
          pivot.position.set(piece.x, piece.zHeight + piece.width / 2, piece.y);
          pivot.rotation.y = -rad;
          group.add(pivot);

          const edges = new THREE.EdgesGeometry(geo);
          const edgeMat = new THREE.LineBasicMaterial({ color: new THREE.Color(r * 0.4, g * 0.4, b * 0.4) });
          const edgeMesh = new THREE.LineSegments(edges, edgeMat);
          const edgePivot = new THREE.Group();
          edgePivot.add(edgeMesh);
          edgePivot.position.copy(pivot.position);
          edgePivot.rotation.copy(pivot.rotation);
          group.add(edgePivot);
          continue;
        }

        // Box geometry: length along X, vizH along Y, wall/width along Z
        const thickness = piece.type === 'flat_bar' ? piece.height : piece.wall;
        geo = new THREE.BoxGeometry(len, vizH, Math.max(thickness, 0.1));

        const mesh = new THREE.Mesh(geo, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.position.set(piece.x, piece.zHeight + vizH / 2, piece.y);
        mesh.rotation.y = -rad;
        group.add(mesh);

        const edges = new THREE.EdgesGeometry(geo);
        const edgeMat = new THREE.LineBasicMaterial({ color: new THREE.Color(r * 0.4, g * 0.4, b * 0.4) });
        const edgeMesh = new THREE.LineSegments(edges, edgeMat);
        edgeMesh.position.copy(mesh.position);
        edgeMesh.rotation.copy(mesh.rotation);
        group.add(edgeMesh);
      }
    }
    scene.add(group);

    // Center camera on content
    let orbitTarget = new THREE.Vector3(24, 17, 24);
    if (pieces.length > 0) {
      const box = new THREE.Box3().setFromObject(group);
      const center = new THREE.Vector3();
      box.getCenter(center);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      const dist = maxDim * 2.5;
      orbitTarget = center.clone();
      camera.position.set(center.x + dist, center.y + dist * 0.8, center.z + dist);
      camera.lookAt(center);
    }

    // Orbit controls (manual)
    let isMouseDown = false;
    let lastMX = 0;
    let lastMY = 0;
    let theta = Math.PI / 4;
    let phi = Math.PI / 3;
    let radius = camera.position.distanceTo(orbitTarget);
    const target = orbitTarget.clone();

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
      radius = Math.max(5, Math.min(2000, radius * (e.deltaY > 0 ? 1.1 : 0.9)));
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
