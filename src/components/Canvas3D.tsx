import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useProjectStore } from '../store/projectStore';
import { getMaterial, getSizeValue, getWall } from '../lib/materials';
import { getVisualHeight } from '../lib/geometry';

export default function Canvas3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const pieces = useProjectStore(s => s.project.pieces);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const W = mount.clientWidth;
    const H = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x12151e);
    scene.fog = new THREE.Fog(0x12151e, 500, 3000);

    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 5000);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

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

    const gridHelper = new THREE.GridHelper(200, 20, 0x333344, 0x222233);
    scene.add(gridHelper);

    const groundGeo = new THREE.PlaneGeometry(2000, 2000);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.3 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);

    const hexToColor = (hex: string, brightness = 0.7) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!result) return new THREE.Color(0.5, 0.5, 0.5);
      return new THREE.Color(
        parseInt(result[1], 16) / 255 * brightness,
        parseInt(result[2], 16) / 255 * brightness,
        parseInt(result[3], 16) / 255 * brightness,
      );
    };

    function getGradedColor(matColor: string, grade: string): THREE.Color {
      if (grade === 'stainless') return new THREE.Color(0x9ca3af).multiplyScalar(0.8);
      if (grade === 'aluminum') return new THREE.Color(0xbfdbfe).multiplyScalar(0.8);
      return hexToColor(matColor, 0.7);
    }

    function makeIBeamShape(od: number, wall: number): THREE.Shape {
      const hw = od / 2; const hh = od / 2; const hw2 = wall / 2;
      const shape = new THREE.Shape();
      shape.moveTo(-hw, -hh); shape.lineTo(hw, -hh); shape.lineTo(hw, -hh + wall);
      shape.lineTo(hw2, -hh + wall); shape.lineTo(hw2, hh - wall); shape.lineTo(hw, hh - wall);
      shape.lineTo(hw, hh); shape.lineTo(-hw, hh); shape.lineTo(-hw, hh - wall);
      shape.lineTo(-hw2, hh - wall); shape.lineTo(-hw2, -hh + wall); shape.lineTo(-hw, -hh + wall);
      shape.closePath(); return shape;
    }

    function makeChannelShape(od: number, wall: number): THREE.Shape {
      const hw = od / 2; const hh = od / 2;
      const shape = new THREE.Shape();
      shape.moveTo(-hw, -hh); shape.lineTo(hw, -hh); shape.lineTo(hw, -hh + wall);
      shape.lineTo(-hw + wall, -hh + wall); shape.lineTo(-hw + wall, hh - wall);
      shape.lineTo(hw, hh - wall); shape.lineTo(hw, hh); shape.lineTo(-hw, hh);
      shape.closePath(); return shape;
    }

    function makeAngleShape(od: number, wall: number): THREE.Shape {
      const hw = od / 2; const hh = od / 2;
      const shape = new THREE.Shape();
      shape.moveTo(-hw, -hh); shape.lineTo(hw, -hh); shape.lineTo(hw, -hh + wall);
      shape.lineTo(-hw + wall, -hh + wall); shape.lineTo(-hw + wall, hh); shape.lineTo(-hw, hh);
      shape.closePath(); return shape;
    }

    const group = new THREE.Group();
    const darkMat = new THREE.MeshPhongMaterial({ color: 0x111111 });

    for (const piece of pieces) {
      const matDef = getMaterial(piece.type);
      const color = getGradedColor(matDef.color, piece.material);
      const material = new THREE.MeshPhongMaterial({
        color,
        shininess: piece.material === 'stainless' ? 80 : piece.material === 'aluminum' ? 60 : 20,
        specular: new THREE.Color(0.2, 0.2, 0.2),
      });
      const edgeColor = color.clone().multiplyScalar(0.5);
      const edgeMat = new THREE.LineBasicMaterial({ color: edgeColor });

      const sizeValue = getSizeValue(piece.type, piece.sizeIdx);
      const wall = getWall(piece.type, piece.thkIdx);
      const od = Array.isArray(sizeValue) ? Math.max(sizeValue[0], sizeValue[1]) : (sizeValue as number);
      const odMinor = Array.isArray(sizeValue) ? Math.min(sizeValue[0], sizeValue[1]) : od;
      const customW = piece.customW ?? 48;
      const customH = piece.customH ?? 48;
      // getVisualHeight returns pixels at given zoom; divide by SCALE(8) to get inches
      const vizHpx = getVisualHeight(piece.type, sizeValue, customH, 1);
      const vizH = vizHpx / 8;

      const addMesh = (geo: THREE.BufferGeometry, mat2: THREE.Material, pos: THREE.Vector3, rot?: THREE.Euler) => {
        const mesh = new THREE.Mesh(geo, mat2);
        mesh.castShadow = true; mesh.receiveShadow = true;
        mesh.position.copy(pos);
        if (rot) mesh.rotation.copy(rot);
        group.add(mesh);
        const edges = new THREE.EdgesGeometry(geo);
        const edgeMesh = new THREE.LineSegments(edges, edgeMat);
        edgeMesh.position.copy(pos);
        if (rot) edgeMesh.rotation.copy(rot);
        group.add(edgeMesh);
        return mesh;
      };

      const rad = (piece.angle * Math.PI) / 180;
      const zOff = piece.zOffset ?? 0;

      if (piece.upright) {
        const pos = new THREE.Vector3(piece.x, zOff + piece.length / 2, piece.y);
        if (piece.type === 'round_tube' || piece.type === 'pipe') {
          const outerR = od / 2;
          const innerR = Math.max(0.01, outerR - wall);
          addMesh(new THREE.CylinderGeometry(outerR, outerR, piece.length, 16), material, pos);
          if (innerR > 0.05) addMesh(new THREE.CylinderGeometry(innerR, innerR, piece.length + 0.1, 16), darkMat, pos);
        } else if (piece.type === 'square_tube' || piece.type === 'rect_tube') {
          addMesh(new THREE.BoxGeometry(od, piece.length, odMinor), material, pos);
          addMesh(new THREE.BoxGeometry(Math.max(0.01, od - wall * 2), piece.length + 0.1, Math.max(0.01, odMinor - wall * 2)), darkMat, pos);
        } else {
          addMesh(new THREE.BoxGeometry(od, piece.length, odMinor), material, pos);
        }
        continue;
      }

      const basePos = new THREE.Vector3(piece.x, zOff + vizH / 2, piece.y);
      const yRot = new THREE.Euler(0, -rad, 0);

      if (piece.type === 'round_tube' || piece.type === 'pipe') {
        const outerR = od / 2; const innerR = Math.max(0.01, outerR - wall);
        const pivot = new THREE.Group();
        pivot.position.copy(basePos); pivot.rotation.y = -rad;
        const outerGeo = new THREE.CylinderGeometry(outerR, outerR, piece.length, 12);
        const outerMesh = new THREE.Mesh(outerGeo, material);
        outerMesh.castShadow = true; outerMesh.rotation.z = Math.PI / 2;
        pivot.add(outerMesh);
        if (innerR > 0.05) {
          const innerMesh = new THREE.Mesh(new THREE.CylinderGeometry(innerR, innerR, piece.length + 0.1, 12), darkMat);
          innerMesh.rotation.z = Math.PI / 2; pivot.add(innerMesh);
        }
        const edgeMesh = new THREE.LineSegments(new THREE.EdgesGeometry(outerGeo), edgeMat);
        edgeMesh.rotation.z = Math.PI / 2; pivot.add(edgeMesh);
        group.add(pivot);
      } else if (piece.type === 'square_tube' || piece.type === 'rect_tube') {
        addMesh(new THREE.BoxGeometry(piece.length, od, odMinor), material, basePos, yRot);
        addMesh(new THREE.BoxGeometry(piece.length + 0.1, Math.max(0.01, od - wall * 2), Math.max(0.01, odMinor - wall * 2)), darkMat, basePos, yRot);
      } else if (piece.type === 'ibeam') {
        const geo = new THREE.ExtrudeGeometry(makeIBeamShape(od, wall), { depth: piece.length, bevelEnabled: false });
        geo.rotateY(Math.PI / 2); geo.translate(piece.length / 2, -od / 2, 0);
        addMesh(geo, material, basePos, yRot);
      } else if (piece.type === 'channel') {
        const geo = new THREE.ExtrudeGeometry(makeChannelShape(od, wall), { depth: piece.length, bevelEnabled: false });
        geo.rotateY(Math.PI / 2); geo.translate(piece.length / 2, -od / 2, 0);
        addMesh(geo, material, basePos, yRot);
      } else if (piece.type === 'angle') {
        const geo = new THREE.ExtrudeGeometry(makeAngleShape(od, wall), { depth: piece.length, bevelEnabled: false });
        geo.rotateY(Math.PI / 2); geo.translate(piece.length / 2, -od / 2, 0);
        addMesh(geo, material, basePos, yRot);
      } else if (piece.type === 'sheet' || piece.type === 'plate') {
        addMesh(new THREE.BoxGeometry(customW, wall, customH), material, new THREE.Vector3(piece.x, zOff + wall / 2, piece.y), yRot);
      } else if (piece.type === 'flat_bar') {
        addMesh(new THREE.BoxGeometry(piece.length, od * 0.25, od), material, basePos, yRot);
      } else {
        addMesh(new THREE.BoxGeometry(piece.length, vizH, Math.max(wall, 0.1)), material, basePos, yRot);
      }

      // Holes
      for (const hole of piece.holes) {
        const t = hole.posInches / piece.length;
        const localX = (t - 0.5) * piece.length;
        const worldX = piece.x + localX * Math.cos(-rad);
        const worldZ = piece.y + localX * Math.sin(-rad);
        const holeGeo = new THREE.CylinderGeometry(hole.diameter / 2, hole.diameter / 2, vizH + 1, 12);
        const holeMesh = new THREE.Mesh(holeGeo, darkMat);
        holeMesh.position.set(worldX, zOff + vizH / 2, worldZ);
        holeMesh.rotation.y = -rad;
        group.add(holeMesh);
      }
    }
    scene.add(group);

    let orbitTarget = new THREE.Vector3(24, 17, 24);
    let radius = 80;
    if (pieces.length > 0) {
      const box = new THREE.Box3().setFromObject(group);
      const center = new THREE.Vector3();
      box.getCenter(center);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z, 1);
      radius = maxDim * 2.5;
      orbitTarget = center.clone();
    }

    const state = { theta: Math.PI / 4, phi: Math.PI / 3, radius, targetX: orbitTarget.x, targetY: orbitTarget.y, targetZ: orbitTarget.z };

    function updateCamera() {
      camera.position.x = state.targetX + state.radius * Math.sin(state.phi) * Math.sin(state.theta);
      camera.position.y = state.targetY + state.radius * Math.cos(state.phi);
      camera.position.z = state.targetZ + state.radius * Math.sin(state.phi) * Math.cos(state.theta);
      camera.lookAt(state.targetX, state.targetY, state.targetZ);
    }
    updateCamera();

    let mouseButton = -1; let lastMX = 0; let lastMY = 0;
    const onMouseDown = (e: MouseEvent) => { mouseButton = e.button; lastMX = e.clientX; lastMY = e.clientY; };
    const onMouseUp = () => { mouseButton = -1; };
    const onMouseMove = (e: MouseEvent) => {
      if (mouseButton === -1) return;
      const dx = e.clientX - lastMX; const dy = e.clientY - lastMY;
      lastMX = e.clientX; lastMY = e.clientY;
      if (mouseButton === 0) {
        state.theta -= dx * 0.005;
        state.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, state.phi - dy * 0.005));
      } else if (mouseButton === 2) {
        const right = new THREE.Vector3();
        right.crossVectors(new THREE.Vector3(Math.sin(state.phi) * Math.sin(state.theta), Math.cos(state.phi), Math.sin(state.phi) * Math.cos(state.theta)).normalize(), new THREE.Vector3(0, 1, 0)).normalize();
        const panSpeed = state.radius * 0.001;
        state.targetX -= right.x * dx * panSpeed;
        state.targetZ -= right.z * dx * panSpeed;
        state.targetY += dy * panSpeed;
      }
      updateCamera();
    };
    const onWheel = (e: WheelEvent) => {
      state.radius = Math.max(5, Math.min(2000, state.radius * (e.deltaY > 0 ? 1.1 : 0.9)));
      updateCamera();
    };
    const onContextMenu = (e: Event) => e.preventDefault();

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: true });
    renderer.domElement.addEventListener('contextmenu', onContextMenu);

    let animId = 0;
    const animate = () => { animId = requestAnimationFrame(animate); renderer.render(scene, camera); };
    animate();

    const ro = new ResizeObserver(() => {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    });
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(animId); ro.disconnect();
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.domElement.removeEventListener('contextmenu', onContextMenu);
      mount.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [pieces]);

  return (
    <div className="w-full h-full relative">
      <div ref={mountRef} className="w-full h-full" />
      <div className="absolute bottom-4 left-4 text-xs text-slate-500 font-mono">
        3D View  •  Left drag: orbit  •  Right drag: pan  •  Scroll: zoom
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
