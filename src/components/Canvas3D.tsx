import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useProjectStore } from '../store/projectStore'
import { getMaterial, getSizeValue, getWall } from '../lib/materials'

export default function Canvas3D() {
  const canvasRef = useRef<HTMLDivElement>(null)
  const { project } = useProjectStore()
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const animFrameRef = useRef<number>(0)
  const orbitRef = useRef({ theta: 45, phi: 35, radius: 60, target: new THREE.Vector3(0, 0, 0) })
  const mouseRef = useRef({ down: false, x: 0, y: 0, button: 0 })

  useEffect(() => {
    if (!canvasRef.current) return
    const container = canvasRef.current
    const w = container.clientWidth, h = container.clientHeight

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(w, h)
    renderer.setClearColor(0x0a0d14)
    renderer.shadowMap.enabled = true
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const scene = new THREE.Scene()
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 2000)
    cameraRef.current = camera

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const dl = new THREE.DirectionalLight(0xffffff, 0.8)
    dl.position.set(30, 50, 30)
    scene.add(dl)
    const dl2 = new THREE.DirectionalLight(0x8888ff, 0.3)
    dl2.position.set(-20, -10, -20)
    scene.add(dl2)
    const pl = new THREE.PointLight(0xffa040, 0.2)
    pl.position.set(0, 20, 0)
    scene.add(pl)

    // Grid
    const grid = new THREE.GridHelper(200, 200, 0x1a2035, 0x111827)
    scene.add(grid)

    function updateCamera() {
      const { theta, phi, radius, target } = orbitRef.current
      const tRad = theta * Math.PI / 180
      const pRad = phi * Math.PI / 180
      camera.position.x = target.x + radius * Math.cos(pRad) * Math.sin(tRad)
      camera.position.y = target.y + radius * Math.sin(pRad)
      camera.position.z = target.z + radius * Math.cos(pRad) * Math.cos(tRad)
      camera.lookAt(target)
    }

    updateCamera()

    function animate() {
      animFrameRef.current = requestAnimationFrame(animate)
      renderer.render(scene, camera)
    }
    animate()

    function onMouseDown(e: MouseEvent) {
      mouseRef.current = { down: true, x: e.clientX, y: e.clientY, button: e.button }
    }
    function onMouseMove(e: MouseEvent) {
      if (!mouseRef.current.down) return
      const dx = e.clientX - mouseRef.current.x
      const dy = e.clientY - mouseRef.current.y
      mouseRef.current.x = e.clientX
      mouseRef.current.y = e.clientY
      if (mouseRef.current.button === 0) {
        orbitRef.current.theta -= dx * 0.4
        orbitRef.current.phi = Math.max(5, Math.min(89, orbitRef.current.phi + dy * 0.4))
      } else if (mouseRef.current.button === 2) {
        const right = new THREE.Vector3()
        right.crossVectors(camera.getWorldDirection(new THREE.Vector3()), camera.up).normalize()
        const up = camera.up.clone()
        orbitRef.current.target.addScaledVector(right, -dx * 0.05)
        orbitRef.current.target.addScaledVector(up, dy * 0.05)
      }
      updateCamera()
    }
    function onMouseUp() { mouseRef.current.down = false }
    function onWheel(e: WheelEvent) {
      orbitRef.current.radius = Math.max(5, Math.min(500, orbitRef.current.radius * (e.deltaY > 0 ? 1.1 : 0.9)))
      updateCamera()
    }

    renderer.domElement.addEventListener('mousedown', onMouseDown)
    renderer.domElement.addEventListener('mousemove', onMouseMove)
    renderer.domElement.addEventListener('mouseup', onMouseUp)
    renderer.domElement.addEventListener('wheel', onWheel)
    renderer.domElement.addEventListener('contextmenu', e => e.preventDefault())

    const ro = new ResizeObserver(() => {
      const w2 = container.clientWidth, h2 = container.clientHeight
      renderer.setSize(w2, h2)
      camera.aspect = w2 / h2
      camera.updateProjectionMatrix()
    })
    ro.observe(container)

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      renderer.domElement.removeEventListener('mousedown', onMouseDown)
      renderer.domElement.removeEventListener('mousemove', onMouseMove)
      renderer.domElement.removeEventListener('mouseup', onMouseUp)
      renderer.domElement.removeEventListener('wheel', onWheel)
      ro.disconnect()
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [])

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return

    const toRemove = scene.children.filter(c => c.userData.isPiece)
    toRemove.forEach(c => {
      scene.remove(c)
      if ((c as THREE.Mesh).geometry) (c as THREE.Mesh).geometry.dispose()
    })

    for (const p of project.pieces) {
      const mat = getMaterial(p.type)
      const sv = getSizeValue(p.type, p.sizeIdx)
      const wall = getWall(p.type, p.thkIdx)
      const color = new THREE.Color(mat.color)
      const material = new THREE.MeshPhongMaterial({ color, transparent: true, opacity: 0.92 })
      const edgeMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15 })

      let geometry: THREE.BufferGeometry

      if (p.upright) {
        const w = Array.isArray(sv) ? sv[0] : sv
        const h = Array.isArray(sv) ? sv[1] : sv
        const isRound = mat.isRound
        if (isRound) {
          geometry = new THREE.CylinderGeometry(w / 2, w / 2, p.length, 16)
        } else {
          geometry = new THREE.BoxGeometry(w, p.length, h)
        }
        const mesh = new THREE.Mesh(geometry, material)
        mesh.position.set(p.x, p.zOffset + p.length / 2, p.y)
        mesh.userData.isPiece = true
        scene.add(mesh)
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), edgeMat)
        edges.position.copy(mesh.position)
        edges.userData.isPiece = true
        scene.add(edges)
      } else {
        const vizH = Array.isArray(sv) ? Math.min(sv[0], sv[1]) : sv
        if (p.type === 'sheet' || p.type === 'plate') {
          geometry = new THREE.BoxGeometry(p.length, wall * 2, p.customH)
          const mesh = new THREE.Mesh(geometry, material)
          const angleRad = -p.angle * Math.PI / 180
          mesh.rotation.y = angleRad
          mesh.position.set(p.x, p.zOffset + wall, p.y)
          mesh.userData.isPiece = true
          scene.add(mesh)
          const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), edgeMat)
          edges.rotation.y = angleRad
          edges.position.copy(mesh.position)
          edges.userData.isPiece = true
          scene.add(edges)
        } else {
          const vizW = Array.isArray(sv) ? Math.max(sv[0], sv[1]) : sv
          geometry = new THREE.BoxGeometry(p.length, vizH, vizW)
          const mesh = new THREE.Mesh(geometry, material)
          const angleRad = -p.angle * Math.PI / 180
          mesh.rotation.y = angleRad
          mesh.position.set(p.x, p.zOffset + vizH / 2, p.y)
          mesh.userData.isPiece = true
          scene.add(mesh)
          const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), edgeMat)
          edges.rotation.y = angleRad
          edges.position.copy(mesh.position)
          edges.userData.isPiece = true
          scene.add(edges)
        }
      }
    }
  }, [project.pieces])

  return <div ref={canvasRef} style={{ width: '100%', height: '100%' }} />
}
