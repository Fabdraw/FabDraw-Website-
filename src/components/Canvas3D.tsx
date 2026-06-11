import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useProjectStore } from '../store/projectStore';
import { getMaterial, getSizeValue, getWall } from '../lib/materials';

export default function Canvas3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const { project } = useProjectStore();
  const pieces = project.pieces;

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

    function makeIBeamShape(w: number, h: number, wall: number): THREE.Shape {
      const hw = w / 2;
      const hh = h / 2;
      const hw2 = wall / 2;
      const shape = new THREE.Shape();
      shape.moveTo(-hw, -hh);
      shape.lineTo(hw, -hh);
      shape.lineTo(hw, -hh + wall);
      shape.lineTo(hw2, -hh + wall);
      shape.lineTo(hw2, hh - wall);
      shape.lineTo(hw, hh - wall);
      shape.lineTo(hw, hh);
      shape.lineTo(-hw, hh);
      shape.lineTo(-hw, hh - wall);
      shape.lineTo(-hw2, hh - wall);
      shape.lineTo(-hw2, -hh + wall);
      shape.lineTo(-hw, -hh + wall);
      shape.closePath();
      return shape;
    }

    function makeChannelShape(w: number, h: number, wall: number): THREE.Shape {
      const hw = w / 2;
      const hh = h / 2;
      const shape = new THREE.Shape();
      shape.moveTo(-hw, -hh);
      shape.lineTo(hw, -hh);
      shape.lineTo(hw, -hh + wall);
      shape.lineTo(-hw + wall, -hh + wall);
      shape.lineTo(-hw + wall, hh - wall);
      shape.lineTo(hw, hh - wall);
      shape.lineTo(hw, hh);
      shape.lineTo(-hw, hh);
      shape.closePath();
      return shape;
    }

    function makeAngleShape(w: number, h: number, wall: number): THREE.Shape {
      const hw = w / 2;
      const hh = h / 2;
      const shape = new THREE.Shape();
      shape.moveTo(-hw, -hh);
      shape.lineTo(hw, -hh);
      shape.lineTo(hw, -hh + wall);
      shape.lineTo(-hw + wall, -hh + wall);
      shape.lineTo(-hw + wall, hh);
      shape.lineTo(-hw, hh);
      shape.closePath();
      return shape;
    }

    const group = new THREE.Group();
    const darkMat = new THREE.MeshPhongMaterial({ color: 0x111111 });

    for (const piece of pieces) {
      const matCfg = getMaterial(piece.type);
      const sv = getSizeValue(piece.type, piece.sizeIdx);
      const wall = getWall(piece.type, piece.thkIdx);

      // Determine dimensions from size value
      const outerW = Array.isArray(sv) ? sv[0] : sv;
      const outerH = Array.isArray(sv) ? sv[1] : sv;
      const od = Array.isArray(sv) ? Math.max(sv[0], sv[1]) : sv;
      const minDim = Array.isArray(sv) ? Math.min(sv[0], sv[1]) : sv;

      // Determine visual height for horizontal pieces (inches, not pixels)
      let vizH: number;
      if (piece.type === 'sheet' || piece.type === 'plate') {
        vizH = wall * 2;
      } else if (piece.type === 'flat_bar') {
        vizH = outerW * 0.25;
      } else if (piece.type === 'angle') {
        vizH = outerW;
      } else {
        vizH = minDim;
      }

      // Color based on material grade
      let baseColor: THREE.Color;
      if (piece.material === 'stainless') {
        baseColor = new THREE.Color(0x9ca3af).multiplyScalar(0.8);
      } else if (piece.material === 'aluminum') {
        baseColor = new THREE.Color(0xbfdbfe).multiplyScalar(0.8);
      } else {
        baseColor = hexToColor(matCfg.color, 0.7);
      }

      const material = new THREE.MeshPhongMaterial({
        color: baseColor,
        shininess: piece.material === 'stainless' ? 80 : piece.material === 'aluminum' ? 60 : 20,
        specular: new THREE.Color(0.2, 0.2, 0.2),
      });
      const edgeColor = baseColor.clone().multiplyScalar(0.5);
      const edgeMat = new THREE.LineBasicMaterial({ color: edgeColor });

      const addMesh = (geo: THREE.BufferGeometry, mat2: THREE.Material, pos: THREE.Vector3, rot?: THREE.Euler) => {
        const mesh = new THREE.Mesh(geo, mat2);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
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

      if (piece.upright) {
        const pos = new THREE.Vector3(piece.x, piece.zOffset + piece.length / 2, piece.y);
        if (matCfg.isRound) {
          const outerR = od / 2;
          const innerR = Math.max(0.01, outerR - wall);
          const outerGeo = new THREE.CylinderGeometry(outerR, outerR, piece.length, 16);
          addMesh(outerGeo, material, pos);
          if (innerR > 0.05 && (piece.type === 'round_tube' || piece.type === 'pipe')) {
            const innerGeo = new THREE.CylinderGeometry(innerR, innerR, piece.length + 0.1, 16);
            addMesh(innerGeo, darkMat, pos);
          }
        } else {
          const outerGeo = new THREE.BoxGeometry(outerW, piece.length, outerH);
          addMesh(outerGeo, material, pos);
          if ((piece.type === 'square_tube' || piece.type === 'rect_tube') && wall > 0) {
            const innerGeo = new THREE.BoxGeometry(
              Math.max(0.01, outerW - wall * 2),
              piece.length + 0.1,
              Math.max(0.01, outerH - wall * 2)
            );
            addMesh(innerGeo, darkMat, pos);
          }
        }
        continue;
      }

      // Horizontal/angled pieces
      const basePos = new THREE.Vector3(piece.x, piece.zOffset + vizH / 2, piece.y);
      const yRot = new THREE.Euler(0, -rad, 0);

      if (matCfg.isRound) {
        const outerR = od / 2;
        const innerR = Math.max(0.01, outerR - wall);
        const pivot = new THREE.Group();
        pivot.position.copy(basePos);
        pivot.rotation.y = -rad;
        const outerGeo = new THREE.CylinderGeometry(outerR, outerR, piece.length, 12);
        const outerMesh = new THREE.Mesh(outerGeo, material);
        outerMesh.castShadow = true;
        outerMesh.rotation.z = Math.PI / 2;
        pivot.add(outerMesh);
        if (innerR > 0.05 && (piece.type === 'round_tube' || piece.type === 'pipe')) {
          const innerGeo = new THREE.CylinderGeometry(innerR, innerR, piece.length + 0.1, 12);
          const innerMesh = new THREE.Mesh(innerGeo, darkMat);
          innerMesh.rotation.z = Math.PI / 2;
          pivot.add(innerMesh);
        }
        const edges = new THREE.EdgesGeometry(new THREE.CylinderGeometry(outerR, outerR, piece.length, 12));
        const edgeMesh = new THREE.LineSegments(edges, edgeMat);
        edgeMesh.rotation.z = Math.PI / 2;
        pivot.add(edgeMesh);
        group.add(pivot);
      } else if (piece.type === 'square_tube' || piece.type === 'rect_tube') {
        const outerGeo = new THREE.BoxGeometry(piece.length, outerH, outerW);
        addMesh(outerGeo, material, basePos, yRot);
        const innerW2 = Math.max(0.01, outerW - wall * 2);
        const innerH2 = Math.max(0.01, outerH - wall * 2);
        const innerGeo = new THREE.BoxGeometry(piece.length + 0.1, innerH2, innerW2);
        addMesh(innerGeo, darkMat, basePos, yRot);
      } else if (piece.type === 'ibeam') {
        const shape = makeIBeamShape(od, vizH, wall);
        const extSettings = { depth: piece.length, bevelEnabled: false };
        const geo = new THREE.ExtrudeGeometry(shape, extSettings);
        geo.rotateY(Math.PI / 2);
        geo.translate(piece.length / 2, -vizH / 2, 0);
        addMesh(geo, material, basePos, yRot);
      } else if (piece.type === 'channel') {
        const shape = makeChannelShape(od, vizH, wall);
        const extSettings = { depth: piece.length, bevelEnabled: false };
        const geo = new THREE.ExtrudeGeometry(shape, extSettings);
        geo.rotateY(Math.PI / 2);
        geo.translate(piece.length / 2, -vizH / 2, 0);
        addMesh(geo, material, basePos, yRot);
      } else if (piece.type === 'angle') {
        const shape = makeAngleShape(od, vizH, wall);
        const extSettings = { depth: piece.length, bevelEnabled: false };
        const geo = new THREE.ExtrudeGeometry(shape, extSettings);
        geo.rotateY(Math.PI / 2);
        geo.translate(piece.length / 2, -vizH / 2, 0);
        addMesh(geo, material, basePos, yRot);
      } else if (piece.type === 'sheet' || piece.type === 'plate') {
        const thickness = wall;
        const geo = new THREE.BoxGeometry(piece.length, Math.max(thickness, 0.05), piece.customW);
        addMesh(geo, material, new THREE.Vector3(piece.x, piece.zOffset + thickness / 2, piece.y), yRot);
      } else if (piece.type === 'flat_bar') {
        const thickness = wall;
        const geo = new THREE.BoxGeometry(piece.length, Math.max(thickness, 0.05), od);
        addMesh(geo, material, new THREE.Vector3(piece.x, piece.zOffset + thickness / 2, piece.y), yRot);
      } else {
        const geo = new THREE.BoxGeometry(piece.length, Math.max(vizH, 0.1), Math.max(wall, 0.1));
        addMesh(geo, material, basePos, yRot);
      }

      // Holes as dark cylinders
      for (const hole of piece.holes) {
        const t = hole.posInches / piece.length;
        const localX = (t - 0.5) * piece.length;
        const cosA = Math.cos(-rad);
        const sinA = Math.sin(-rad);
        const worldX = piece.x + localX * cosA;
        const worldZ = piece.y + localX * sinA;
        const worldY = piece.zOffset + vizH / 2;
        const holeGeo = new THREE.CylinderGeometry(hole.diameter / 2, hole.diameter / 2, vizH + 1, 12);
        const holeMesh = new THREE.Mesh(holeGeo, darkMat);
        holeMesh.position.set(worldX, worldY, worldZ);
        holeMesh.rotation.y = -rad;
        group.add(holeMesh);
      }
    }
    scene.add(group);

    // Center camera on content
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

    // Orbit state
    const state = {
      theta: Math.PI / 4,
      phi: Math.PI / 3,
      radius,
      targetX: orbitTarget.x,
      targetY: orbitTarget.y,
      targetZ: orbitTarget.z,
    };

    function updateCamera() {
      camera.position.x = state.targetX + state.radius * Math.sin(state.phi) * Math.sin(state.theta);
      camera.position.y = state.targetY + state.radius * Math.cos(state.phi);
      camera.position.z = state.targetZ + state.radius * Math.sin(state.phi) * Math.cos(state.theta);
      camera.lookAt(state.targetX, state.targetY, state.targetZ);
    }
    updateCamera();

    let mouseButton = -1;
    let lastMX = 0;
    let lastMY = 0;

    const onMouseDown = (e: MouseEvent) => {
      mouseButton = e.button;
      lastMX = e.clientX;
      lastMY = e.clientY;
    };
    const onMouseUp = () => { mouseButton = -1; };
    const onMouseMove = (e: MouseEvent) => {
      if (mouseButton === -1) return;
      const dx = e.clientX - lastMX;
      const dy = e.clientY - lastMY;
      lastMX = e.clientX;
      lastMY = e.clientY;

      if (mouseButton === 0) {
        // Left drag: orbit
        state.theta -= dx * 0.005;
        state.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, state.phi - dy * 0.005));
      } else if (mouseButton === 2) {
        // Right drag: pan
        const right = new THREE.Vector3();
        const up = new THREE.Vector3(0, 1, 0);
        right.crossVectors(new THREE.Vector3(
          state.radius * Math.sin(state.phi) * Math.sin(state.theta),
          state.radius * Math.cos(state.phi),
          state.radius * Math.sin(state.phi) * Math.cos(state.theta)
        ).normalize(), up).normalize();
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
    const animate = () => {
      animId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

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
