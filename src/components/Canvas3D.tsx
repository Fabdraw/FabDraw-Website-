import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useProjectStore } from '../store/projectStore'
import { MATERIALS, getOD, getHeight } from '../lib/materials'

export default function Canvas3D() {
  const mountRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer|null>(null)
  const sceneRef = useRef<THREE.Scene|null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera|null>(null)
  const meshGroupRef = useRef<THREE.Group|null>(null)
  const rafRef = useRef(0)

  const isDraggingRef = useRef(false)
  const lastMouseRef = useRef({x:0,y:0})
  const cameraAngRef = useRef({theta: 0.8, phi: 0.5, radius: 60})

  const { pieces } = useProjectStore()

  useEffect(() => {
    const el = mountRef.current
    if (!el) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#0d1117')
    scene.fog = new THREE.Fog('#0d1117', 100, 400)
    sceneRef.current = scene

    const W = el.clientWidth, H = el.clientHeight
    const camera = new THREE.PerspectiveCamera(50, W/H, 0.1, 1000)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({antialias:true})
    renderer.setSize(W, H)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.shadowMap.enabled = true
    el.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.4)
    scene.add(ambient)
    const dir = new THREE.DirectionalLight(0xffffff, 0.8)
    dir.position.set(50, 80, 30)
    dir.castShadow = true
    scene.add(dir)
    const fill = new THREE.DirectionalLight(0x8899cc, 0.3)
    fill.position.set(-30, 20, -40)
    scene.add(fill)

    // Grid
    const grid = new THREE.GridHelper(200, 40, 0x1a2030, 0x1a2030)
    scene.add(grid)

    // Origin
    const axes = new THREE.AxesHelper(8)
    scene.add(axes)

    // Mesh group
    const group = new THREE.Group()
    scene.add(group)
    meshGroupRef.current = group

    const updateCamera = () => {
      const {theta,phi,radius} = cameraAngRef.current
      camera.position.set(
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.cos(theta)
      )
      camera.lookAt(0, 8, 0)
    }
    updateCamera()

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate)
      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      const W2=el.clientWidth,H2=el.clientHeight
      camera.aspect=W2/H2;camera.updateProjectionMatrix()
      renderer.setSize(W2,H2)
    }
    window.addEventListener('resize',onResize)

    const onMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true
      lastMouseRef.current = {x:e.clientX,y:e.clientY}
    }
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return
      const dx = e.clientX - lastMouseRef.current.x
      const dy = e.clientY - lastMouseRef.current.y
      cameraAngRef.current.theta -= dx * 0.01
      cameraAngRef.current.phi = Math.max(0.1, Math.min(Math.PI/2-0.05, cameraAngRef.current.phi + dy*0.01))
      lastMouseRef.current = {x:e.clientX,y:e.clientY}
      updateCamera()
    }
    const onMouseUp = () => { isDraggingRef.current = false }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      cameraAngRef.current.radius = Math.max(5, Math.min(300, cameraAngRef.current.radius + e.deltaY * 0.1))
      updateCamera()
    }
    el.addEventListener('mousedown',onMouseDown)
    window.addEventListener('mousemove',onMouseMove)
    window.addEventListener('mouseup',onMouseUp)
    el.addEventListener('wheel',onWheel,{passive:false})

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize',onResize)
      el.removeEventListener('mousedown',onMouseDown)
      window.removeEventListener('mousemove',onMouseMove)
      window.removeEventListener('mouseup',onMouseUp)
      el.removeEventListener('wheel',onWheel)
      renderer.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [])

  // Rebuild meshes when pieces change
  useEffect(() => {
    const group = meshGroupRef.current
    if (!group) return

    // Clear old meshes
    while (group.children.length) {
      const child = group.children[0]
      group.remove(child)
      if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose()
    }

    for (const piece of pieces) {
      const mat3d = MATERIALS[piece.type]
      const color = new THREE.Color(mat3d.color)
      const material = new THREE.MeshStandardMaterial({color, roughness:0.5, metalness:0.3})

      let geo: THREE.BufferGeometry
      const od = getOD(piece.type, piece.sizeIdx)
      const h = getHeight(piece.type, piece.sizeIdx)
      const len = piece.length

      if (piece.type==='round_tube'||piece.type==='pipe') {
        geo = new THREE.CylinderGeometry(od/2, od/2, piece.upright?len:od, 16)
      } else if (piece.type==='flat_bar') {
        geo = new THREE.BoxGeometry(piece.upright?od:len, od*0.15+0.2, od)
      } else if (piece.type==='sheet') {
        geo = new THREE.BoxGeometry(piece.customW??48, 0.1, piece.customH??48)
      } else if (piece.type==='plate') {
        geo = new THREE.BoxGeometry(piece.length, 0.5, piece.customH??12)
      } else {
        const w = od
        const ht = (piece.type==='rect_tube') ? h : od
        geo = new THREE.BoxGeometry(piece.upright?w:len, piece.upright?len:ht, w)
      }

      const mesh = new THREE.Mesh(geo, material)
      mesh.castShadow = true
      mesh.receiveShadow = true

      const INCH = 1
      if (piece.upright) {
        mesh.position.set(piece.x*INCH, piece.zOffset + len/2, piece.y*INCH)
      } else if (piece.type==='sheet'||piece.type==='plate') {
        mesh.position.set(piece.x*INCH, piece.zOffset + 0.05, piece.y*INCH)
      } else {
        mesh.position.set(piece.x*INCH, piece.zOffset + od/2, piece.y*INCH)
        mesh.rotation.y = -piece.angle * Math.PI / 180
      }

      group.add(mesh)
    }
  }, [pieces])

  return (
    <div ref={mountRef} className="w-full h-full" style={{cursor:'grab',background:'#0d1117'}}>
      <div className="absolute top-3 right-3 text-xs text-slate-600 pointer-events-none select-none">
        Drag to orbit • Scroll to zoom
      </div>
    </div>
  )
}
