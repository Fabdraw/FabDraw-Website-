import React, { useRef, useEffect, useCallback } from 'react'
import { useProjectStore } from '../store/projectStore'
import { useUIStore } from '../store/uiStore'
import { useHistoryStore } from '../store/historyStore'
import { MATERIALS, getOD, getHeight, getWall } from '../lib/materials'
import { SCALE, worldToCanvas, canvasToWorld, getVisualHeight, getSnapPoints, findSnap, hitTestPiece, getPieceEndpointsWorld } from '../lib/geometry'
import type { Piece, Connection } from '../types'

export default function Canvas2D() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const piecesRef = useRef<Piece[]>([])
  const connectionsRef = useRef<Connection[]>([])
  const zoomRef = useRef(1)
  const panXRef = useRef(240)
  const panYRef = useRef(120)

  const draggingIdRef = useRef<string|null>(null)
  const dragOffsetRef = useRef({x:0,y:0})
  const snapRef = useRef<{dx:number,dy:number,tx:number,ty:number,label:string}|null>(null)

  const isPanningRef = useRef(false)
  const panStartRef = useRef({mx:0,my:0,px:0,py:0})

  const selBoxRef = useRef<{x1:number,y1:number,x2:number,y2:number}|null>(null)
  const selBoxStartRef = useRef<{cx:number,cy:number}|null>(null)

  const rafRef = useRef(0)
  const selectedIdsRef = useRef<string[]>([])
  const modeRef = useRef<'select'|'pan'>('select')
  const holeAddModeRef = useRef(false)
  const holePreviewRef = useRef<{x:number,y:number}|null>(null)

  const { pieces, connections, zoom, panX, panY, setPan, updatePiece, addConnection } = useProjectStore()
  const { mode, selectedIds, setSelectedIds, toggleSelectedId, setContextMenu, setHolePreview, holePreview, holeAddMode } = useUIStore()
  const historyStore = useHistoryStore()

  useEffect(() => { piecesRef.current = pieces }, [pieces])
  useEffect(() => { connectionsRef.current = connections }, [connections])
  useEffect(() => { zoomRef.current = zoom }, [zoom])
  useEffect(() => { panXRef.current = panX }, [panX])
  useEffect(() => { panYRef.current = panY }, [panY])
  useEffect(() => { selectedIdsRef.current = selectedIds }, [selectedIds])
  useEffect(() => { modeRef.current = mode as 'select'|'pan' }, [mode])
  useEffect(() => { holeAddModeRef.current = holeAddMode }, [holeAddMode])
  useEffect(() => {
    if (holePreview) holePreviewRef.current = {x:holePreview.x,y:holePreview.y}
    else holePreviewRef.current = null
  }, [holePreview])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width, H = canvas.height
    const z = zoomRef.current
    const px = panXRef.current
    const py = panYRef.current
    const ps = piecesRef.current
    const cs = connectionsRef.current
    const selIds = selectedIdsRef.current

    ctx.clearRect(0,0,W,H)
    ctx.fillStyle = '#0d1117'
    ctx.fillRect(0,0,W,H)

    // Grid
    const gridIn = z >= 1.5 ? 1 : z >= 0.5 ? 3 : 12
    const gridPx = gridIn * z * SCALE
    const startX = ((px % gridPx) + gridPx) % gridPx
    const startY = ((py % gridPx) + gridPx) % gridPx
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'
    ctx.lineWidth = 0.5
    for (let x=startX;x<W;x+=gridPx){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
    for (let y=startY;y<H;y+=gridPx){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
    const majPx = 12 * z * SCALE
    const majX = ((px % majPx)+majPx)%majPx
    const majY = ((py % majPx)+majPx)%majPx
    ctx.strokeStyle = 'rgba(255,255,255,0.09)'
    ctx.lineWidth = 0.5
    for (let x=majX;x<W;x+=majPx){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}
    for (let y=majY;y<H;y+=majPx){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}

    // Origin crosshair
    const [ox,oy] = worldToCanvas(0,0,px,py,z)
    ctx.strokeStyle = 'rgba(249,115,22,0.4)'
    ctx.lineWidth = 1
    ctx.beginPath();ctx.moveTo(ox-20,oy);ctx.lineTo(ox+20,oy);ctx.stroke()
    ctx.beginPath();ctx.moveTo(ox,oy-20);ctx.lineTo(ox,oy+20);ctx.stroke()

    // Sort: sheets/plates behind linear members
    const sorted = [...ps].sort((a,b) => {
      const aSheet = a.type==='sheet'||a.type==='plate'?0:1
      const bSheet = b.type==='sheet'||b.type==='plate'?0:1
      return aSheet-bSheet
    })

    for (const piece of sorted) {
      const isSelected = selIds.includes(piece.id)
      const mat = MATERIALS[piece.type]
      const color = mat.color
      const [pcx,pcy] = worldToCanvas(piece.x, piece.y, px, py, z)

      ctx.save()
      ctx.translate(pcx, pcy)

      if (piece.upright) {
        const od = getOD(piece.type, piece.sizeIdx)
        const sizePx = Math.max(8, od * z * SCALE)
        const half = sizePx/2
        const wallPx = Math.max(2, getWall(piece.type, piece.thkIdx) * z * SCALE)

        if (piece.type==='round_tube'||piece.type==='pipe') {
          ctx.beginPath();ctx.arc(0,0,half,0,Math.PI*2)
          ctx.fillStyle=color;ctx.fill()
          ctx.beginPath();ctx.arc(0,0,Math.max(1,half-wallPx),0,Math.PI*2)
          ctx.fillStyle='rgba(0,0,0,0.65)';ctx.fill()
        } else {
          ctx.fillStyle=color;ctx.fillRect(-half,-half,sizePx,sizePx)
          const iw=sizePx-wallPx*2
          if(iw>0){ctx.fillStyle='rgba(0,0,0,0.65)';ctx.fillRect(-half+wallPx,-half+wallPx,iw,iw)}
        }
        ctx.strokeStyle=isSelected?'#f97316':color
        ctx.lineWidth=isSelected?2:1.5
        if(piece.type==='round_tube'||piece.type==='pipe'){ctx.beginPath();ctx.arc(0,0,half,0,Math.PI*2);ctx.stroke()}
        else{ctx.strokeRect(-half,-half,sizePx,sizePx)}
        ctx.strokeStyle=color;ctx.lineWidth=1
        ctx.beginPath();ctx.moveTo(0,-half-4);ctx.lineTo(0,-half-12);ctx.stroke()
        ctx.beginPath();ctx.moveTo(-3,-half-8);ctx.lineTo(0,-half-12);ctx.lineTo(3,-half-8);ctx.stroke()
        if(z>0.4){
          ctx.fillStyle='#94a3b8';ctx.font=`9px "JetBrains Mono",monospace`
          ctx.textAlign='center';ctx.textBaseline='bottom'
          ctx.fillText(`${piece.length}"`,0,-half-14)
        }
        ctx.restore();continue
      }

      const rad = piece.angle * Math.PI/180
      ctx.rotate(rad)
      const halfLen = piece.length/2*z*SCALE
      const vh = getVisualHeight(piece,z)
      const wallPx = Math.max(Math.ceil(vh*0.20), Math.max(2, getWall(piece.type,piece.thkIdx)*z*SCALE))

      if(piece.type==='square_tube'||piece.type==='rect_tube'){
        ctx.fillStyle=color;ctx.fillRect(-halfLen,-vh/2,halfLen*2,vh)
        const iw=halfLen*2-wallPx*2,ih=vh-wallPx*2
        if(iw>0&&ih>0){ctx.fillStyle='rgba(0,0,0,0.65)';ctx.fillRect(-halfLen+wallPx,-vh/2+wallPx,iw,ih)}
        ctx.fillStyle='rgba(255,255,255,0.1)';ctx.fillRect(-halfLen,-vh/2,halfLen*2,vh*0.38)
        ctx.strokeStyle=isSelected?'#f97316':color;ctx.lineWidth=isSelected?2.5:1.5
        ctx.strokeRect(-halfLen,-vh/2,halfLen*2,vh)
      } else if(piece.type==='round_tube'||piece.type==='pipe'){
        const r=vh/2
        const drawCapsule=(x:number,y:number,w:number,h:number,cr:number)=>{
          const r2=Math.min(cr,w/2,h/2)
          ctx.beginPath()
          ctx.moveTo(x+r2,y);ctx.lineTo(x+w-r2,y)
          ctx.arc(x+w-r2,y+r2,r2,-Math.PI/2,Math.PI/2)
          ctx.lineTo(x+r2,y+h)
          ctx.arc(x+r2,y+r2,r2,Math.PI/2,-Math.PI/2)
          ctx.closePath()
        }
        ctx.fillStyle=color;drawCapsule(-halfLen,-r,halfLen*2,vh,r);ctx.fill()
        const innerR=Math.max(1,r-wallPx),innerW=halfLen*2-wallPx*2
        if(innerW>0&&innerR>1){ctx.fillStyle='rgba(0,0,0,0.65)';drawCapsule(-halfLen+wallPx,-innerR,innerW,innerR*2,innerR);ctx.fill()}
        ctx.fillStyle='rgba(255,255,255,0.12)';drawCapsule(-halfLen,-r,halfLen*2,r*0.45,r*0.4);ctx.fill()
        ctx.strokeStyle=isSelected?'#f97316':color;ctx.lineWidth=isSelected?2.5:1.5
        drawCapsule(-halfLen,-r,halfLen*2,vh,r);ctx.stroke()
      } else if(piece.type==='angle'){
        const leg=Math.max(3,vh/4)
        ctx.fillStyle=color
        ctx.fillRect(-halfLen,vh/2-leg,halfLen*2,leg)
        ctx.fillRect(-halfLen,-vh/2,leg,vh)
        ctx.strokeStyle=isSelected?'#f97316':color;ctx.lineWidth=isSelected?2:1
        ctx.beginPath()
        ctx.moveTo(-halfLen,-vh/2);ctx.lineTo(-halfLen+leg,-vh/2)
        ctx.lineTo(-halfLen+leg,vh/2-leg);ctx.lineTo(halfLen,vh/2-leg)
        ctx.lineTo(halfLen,vh/2);ctx.lineTo(-halfLen,vh/2);ctx.closePath();ctx.stroke()
      } else if(piece.type==='channel'){
        const flange=Math.max(3,vh*0.25),web=Math.max(3,vh*0.18)
        ctx.fillStyle=color
        ctx.fillRect(-halfLen,-vh/2,halfLen*2,flange)
        ctx.fillRect(-halfLen,vh/2-flange,halfLen*2,flange)
        ctx.fillRect(-halfLen,-vh/2,web,vh)
        if(isSelected){ctx.strokeStyle='#f97316';ctx.lineWidth=1.5;ctx.strokeRect(-halfLen,-vh/2,halfLen*2,vh)}
      } else if(piece.type==='ibeam'){
        const flange=Math.max(3,vh*0.22),webH=Math.max(2,vh*0.12)
        ctx.fillStyle=color
        ctx.fillRect(-halfLen,-vh/2,halfLen*2,flange)
        ctx.fillRect(-halfLen,vh/2-flange,halfLen*2,flange)
        ctx.fillRect(-halfLen,-webH/2,halfLen*2,webH)
        if(isSelected){ctx.strokeStyle='#f97316';ctx.lineWidth=1.5;ctx.strokeRect(-halfLen,-vh/2,halfLen*2,vh)}
      } else if(piece.type==='flat_bar'){
        ctx.fillStyle=color;ctx.fillRect(-halfLen,-vh/2,halfLen*2,vh)
        ctx.fillStyle='rgba(255,255,255,0.18)';ctx.fillRect(-halfLen,-vh/2,halfLen*2,vh*0.45)
        ctx.strokeStyle=isSelected?'#f97316':color;ctx.lineWidth=isSelected?2:1
        ctx.strokeRect(-halfLen,-vh/2,halfLen*2,vh)
      } else if(piece.type==='sheet'){
        const shH=(piece.customH??48)*z*SCALE
        ctx.globalAlpha=0.85
        ctx.fillStyle=color;ctx.fillRect(-halfLen,-shH/2,halfLen*2,shH)
        ctx.globalAlpha=1
        ctx.strokeStyle='rgba(255,255,255,0.08)';ctx.lineWidth=0.5
        const hatchSp=Math.max(4,4*z*SCALE)
        for(let x=-halfLen;x<halfLen;x+=hatchSp){ctx.beginPath();ctx.moveTo(x,-shH/2);ctx.lineTo(x,shH/2);ctx.stroke()}
        ctx.strokeStyle=isSelected?'#f97316':'rgba(255,255,255,0.5)';ctx.lineWidth=isSelected?2.5:1.5
        ctx.strokeRect(-halfLen,-shH/2,halfLen*2,shH)
      } else if(piece.type==='plate'){
        const shH=(piece.customH??12)*z*SCALE
        ctx.fillStyle=color;ctx.fillRect(-halfLen,-shH/2,halfLen*2,shH)
        ctx.strokeStyle='rgba(255,255,255,0.08)';ctx.lineWidth=0.5
        const sp=Math.max(4,8*z*SCALE)
        for(let x=-halfLen;x<halfLen;x+=sp){ctx.beginPath();ctx.moveTo(x,-shH/2);ctx.lineTo(x,shH/2);ctx.stroke()}
        for(let y=-shH/2;y<shH/2;y+=sp){ctx.beginPath();ctx.moveTo(-halfLen,y);ctx.lineTo(halfLen,y);ctx.stroke()}
        ctx.strokeStyle=isSelected?'#f97316':color;ctx.lineWidth=isSelected?2.5:2
        ctx.strokeRect(-halfLen,-shH/2,halfLen*2,shH)
      }

      if(z>0.4&&halfLen>35){
        ctx.fillStyle='rgba(255,255,255,0.8)';ctx.font=`9px "JetBrains Mono",monospace`
        ctx.textAlign='center';ctx.textBaseline='middle'
        ctx.fillText(`${piece.length}"`,0,0)
      }

      for(let hi=0;hi<piece.holes.length;hi++){
        const hole=piece.holes[hi]
        const hx=(hole.posInches-piece.length/2)*z*SCALE
        const hr=Math.max(3,(hole.diameter/2)*z*SCALE)
        ctx.beginPath();ctx.arc(hx,0,hr,0,Math.PI*2)
        ctx.fillStyle='rgba(0,0,0,0.9)';ctx.fill()
        ctx.strokeStyle='rgba(255,255,255,0.8)';ctx.lineWidth=1.5;ctx.stroke()
        ctx.fillStyle='#fff';ctx.font=`bold ${Math.max(7,hr*0.9)}px "JetBrains Mono",monospace`
        ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(hi+1),hx,0)
      }

      ctx.restore()

      if(isSelected&&z>0.3){
        const spts=getSnapPoints(piece,px,py,z)
        for(const sp of spts){
          ctx.beginPath();ctx.arc(sp.x,sp.y,4,0,Math.PI*2)
          ctx.fillStyle=sp.color;ctx.fill()
          ctx.strokeStyle='rgba(255,255,255,0.5)';ctx.lineWidth=1;ctx.stroke()
        }
      }
    }

    // Corner caps for connections
    for(const conn of cs){
      const pA=ps.find(p=>p.id===conn.p1),pB=ps.find(p=>p.id===conn.p2)
      if(!pA||!pB)continue
      if(pA.type==='sheet'||pB.type==='sheet')continue
      if(pA.upright||pB.upright)continue
      const vhA=getVisualHeight(pA,z),vhB=getVisualHeight(pB,z)
      const capPx=Math.max(vhA,vhB)+2
      const {sx:sxA,sy:syA,ex:exA,ey:eyA}=getPieceEndpointsWorld(pA)
      let jx=pA.x,jy=pA.y
      if(conn.e1==='start'){jx=sxA;jy=syA}
      else if(conn.e1==='end'){jx=exA;jy=eyA}
      const [jcx,jcy]=worldToCanvas(jx,jy,px,py,z)
      const dom=vhA>=vhB?pA:pB
      ctx.fillStyle=MATERIALS[dom.type].color
      ctx.fillRect(jcx-capPx/2,jcy-capPx/2,capPx,capPx)
    }

    // Snap indicator
    const snap=snapRef.current
    if(snap){
      ctx.beginPath();ctx.arc(snap.tx,snap.ty,10,0,Math.PI*2)
      ctx.strokeStyle='#f97316';ctx.lineWidth=2;ctx.stroke()
      ctx.strokeStyle='rgba(249,115,22,0.6)';ctx.lineWidth=1
      ctx.beginPath();ctx.moveTo(snap.tx-16,snap.ty);ctx.lineTo(snap.tx+16,snap.ty);ctx.stroke()
      ctx.beginPath();ctx.moveTo(snap.tx,snap.ty-16);ctx.lineTo(snap.tx,snap.ty+16);ctx.stroke()
      ctx.fillStyle='#f97316';ctx.font='10px "JetBrains Mono",monospace'
      ctx.textAlign='center';ctx.textBaseline='bottom'
      ctx.fillText(snap.label,snap.tx,snap.ty-13)
    }

    // Snap target dots while dragging
    if(draggingIdRef.current){
      const dragId=draggingIdRef.current
      for(const p of ps){
        if(p.id===dragId)continue
        const spts=getSnapPoints(p,px,py,z)
        for(const sp of spts){
          ctx.beginPath();ctx.arc(sp.x,sp.y,3.5,0,Math.PI*2)
          ctx.fillStyle=sp.color+'99';ctx.fill()
        }
      }
    }

    // Selection box
    const sb=selBoxRef.current
    if(sb){
      const sx2=Math.min(sb.x1,sb.x2),sy2=Math.min(sb.y1,sb.y2)
      const sw=Math.abs(sb.x2-sb.x1),sh2=Math.abs(sb.y2-sb.y1)
      ctx.fillStyle='rgba(249,115,22,0.06)';ctx.fillRect(sx2,sy2,sw,sh2)
      ctx.strokeStyle='#f97316';ctx.lineWidth=1;ctx.setLineDash([4,3])
      ctx.strokeRect(sx2,sy2,sw,sh2);ctx.setLineDash([])
    }

    // Hole preview
    if(holeAddModeRef.current){
      const hp=holePreviewRef.current
      if(hp){
        const [hpx2,hpy2]=worldToCanvas(hp.x,hp.y,px,py,z)
        ctx.beginPath();ctx.arc(hpx2,hpy2,8,0,Math.PI*2)
        ctx.fillStyle='rgba(59,130,246,0.3)';ctx.fill()
        ctx.strokeStyle='#3b82f6';ctx.lineWidth=2;ctx.setLineDash([3,3])
        ctx.stroke();ctx.setLineDash([])
        ctx.fillStyle='#3b82f6';ctx.font='9px "JetBrains Mono",monospace'
        ctx.textAlign='center';ctx.textBaseline='top';ctx.fillText('ADD HOLE',hpx2,hpy2+11)
      }
    }

    // Empty state
    if(ps.length===0){
      ctx.fillStyle='rgba(255,255,255,0.06)';ctx.font='48px Inter,sans-serif'
      ctx.textAlign='center';ctx.textBaseline='middle'
      ctx.fillText('⬡',W/2,H/2-40)
      ctx.fillStyle='rgba(255,255,255,0.25)';ctx.font='14px Inter,sans-serif'
      ctx.fillText('Select a material from the library and click Add to Drawing',W/2,H/2+10)
      ctx.fillStyle='rgba(255,255,255,0.12)';ctx.font='12px Inter,sans-serif'
      ctx.fillText('Or press Ctrl+K to quick-add',W/2,H/2+34)
    }

    rafRef.current=requestAnimationFrame(draw)
  }, [])

  useEffect(()=>{
    rafRef.current=requestAnimationFrame(draw)
    return()=>cancelAnimationFrame(rafRef.current)
  },[draw])

  useEffect(()=>{
    const canvas=canvasRef.current
    if(!canvas)return
    const ro=new ResizeObserver(()=>{canvas.width=canvas.offsetWidth;canvas.height=canvas.offsetHeight})
    ro.observe(canvas)
    canvas.width=canvas.offsetWidth;canvas.height=canvas.offsetHeight
    return()=>ro.disconnect()
  },[])

  const getCanvasPos=(e:React.MouseEvent|MouseEvent):{cx:number,cy:number}=>{
    const r=canvasRef.current!.getBoundingClientRect()
    return{cx:e.clientX-r.left,cy:e.clientY-r.top}
  }

  const handleMouseDown=useCallback((e:React.MouseEvent)=>{
    if(e.button===2)return
    const {cx,cy}=getCanvasPos(e)
    const z=zoomRef.current,px2=panXRef.current,py2=panYRef.current
    const [wx,wy]=canvasToWorld(cx,cy,px2,py2,z)
    const currentMode=modeRef.current

    if(e.button===1||currentMode==='pan'){
      isPanningRef.current=true
      panStartRef.current={mx:e.clientX,my:e.clientY,px:px2,py:py2}
      return
    }

    if(holeAddModeRef.current){
      const ps=piecesRef.current
      for(let i=ps.length-1;i>=0;i--){
        if(hitTestPiece(ps[i],wx,wy,z)){
          const {sx,sy,ex,ey}=getPieceEndpointsWorld(ps[i])
          const ldx=ex-sx,ldy=ey-sy,ll=Math.sqrt(ldx*ldx+ldy*ldy)
          const t=ll>0?Math.max(0,Math.min(1,((wx-sx)*ldx+(wy-sy)*ldy)/(ll*ll))):0
          const posInches=t*ps[i].length
          const newHole={id:crypto.randomUUID(),type:'circle' as const,posInches,diameter:0.5}
          const updated=[...ps[i].holes,newHole]
          historyStore.push({pieces:ps,connections:connectionsRef.current})
          useProjectStore.getState().updatePiece(ps[i].id,{holes:updated})
          return
        }
      }
      return
    }

    const ps=piecesRef.current
    let hit:Piece|null=null
    for(let i=ps.length-1;i>=0;i--){
      if(hitTestPiece(ps[i],wx,wy,z)){hit=ps[i];break}
    }

    if(hit){
      if(!e.shiftKey&&!selectedIdsRef.current.includes(hit.id)) setSelectedIds([hit.id])
      else if(e.shiftKey) toggleSelectedId(hit.id)
      historyStore.push({pieces:ps,connections:connectionsRef.current})
      draggingIdRef.current=hit.id
      dragOffsetRef.current={x:wx-hit.x,y:wy-hit.y}
    } else {
      if(!e.shiftKey) setSelectedIds([])
      selBoxStartRef.current={cx,cy}
      selBoxRef.current=null
    }
  },[setSelectedIds,toggleSelectedId,historyStore])

  const handleMouseMove=useCallback((e:React.MouseEvent)=>{
    const {cx,cy}=getCanvasPos(e)
    const z=zoomRef.current,px2=panXRef.current,py2=panYRef.current

    if(isPanningRef.current){
      const {mx,my,px:ppx,py:ppy}=panStartRef.current
      setPan(ppx+(e.clientX-mx),ppy+(e.clientY-my))
      return
    }

    if(draggingIdRef.current){
      const [wx,wy]=canvasToWorld(cx,cy,px2,py2,z)
      const ps=piecesRef.current
      const piece=ps.find(p=>p.id===draggingIdRef.current)
      if(!piece)return
      const newX=wx-dragOffsetRef.current.x
      const newY=wy-dragOffsetRef.current.y
      const moved={...piece,x:newX,y:newY}
      const snap=findSnap(moved,ps,px2,py2,z)
      if(snap){
        const finalX=newX+snap.dx/(z*SCALE)
        const finalY=newY+snap.dy/(z*SCALE)
        snapRef.current={dx:snap.dx,dy:snap.dy,tx:snap.targetPoint.x,ty:snap.targetPoint.y,label:snap.targetPoint.label.toUpperCase()}
        useProjectStore.getState().updatePiece(draggingIdRef.current,{x:finalX,y:finalY})
      } else {
        snapRef.current=null
        useProjectStore.getState().updatePiece(draggingIdRef.current,{x:newX,y:newY})
      }
      return
    }

    if(selBoxStartRef.current){
      selBoxRef.current={x1:selBoxStartRef.current.cx,y1:selBoxStartRef.current.cy,x2:cx,y2:cy}
      return
    }

    if(holeAddModeRef.current){
      const [wx,wy]=canvasToWorld(cx,cy,px2,py2,z)
      const ps=piecesRef.current
      for(let i=ps.length-1;i>=0;i--){
        if(hitTestPiece(ps[i],wx,wy,z)){
          const {sx,sy,ex,ey}=getPieceEndpointsWorld(ps[i])
          const ldx=ex-sx,ldy=ey-sy,ll=Math.sqrt(ldx*ldx+ldy*ldy)
          const t=ll>0?Math.max(0,Math.min(1,((wx-sx)*ldx+(wy-sy)*ldy)/(ll*ll))):0.5
          const hpx=sx+ldx*t,hpy=sy+ldy*t
          setHolePreview({pieceId:ps[i].id,posInches:t*ps[i].length,x:hpx,y:hpy})
          return
        }
      }
      setHolePreview(null)
    }
  },[setPan,setHolePreview])

  const handleMouseUp=useCallback((e:React.MouseEvent)=>{
    if(draggingIdRef.current){
      const snap=snapRef.current
      if(snap){
        const ps=piecesRef.current
        const piece=ps.find(p=>p.id===draggingIdRef.current)
        if(piece){
          const z=zoomRef.current,px2=panXRef.current,py2=panYRef.current
          const myPts=getSnapPoints(piece,px2,py2,z)
          for(const other of ps){
            if(other.id===piece.id)continue
            const otherPts=getSnapPoints(other,px2,py2,z)
            for(const mp of myPts){
              for(const op of otherPts){
                const dx=Math.abs(mp.x-op.x),dy=Math.abs(mp.y-op.y)
                if(dx<8&&dy<8){
                  addConnection({id:crypto.randomUUID(),p1:piece.id,e1:mp.label,p2:other.id,e2:op.label,type:'butt_weld'})
                }
              }
            }
          }
        }
      }
      snapRef.current=null
      draggingIdRef.current=null
    }

    isPanningRef.current=false

    if(selBoxRef.current){
      const sb=selBoxRef.current
      const z=zoomRef.current,px2=panXRef.current,py2=panYRef.current
      const [wx1,wy1]=canvasToWorld(Math.min(sb.x1,sb.x2),Math.min(sb.y1,sb.y2),px2,py2,z)
      const [wx2,wy2]=canvasToWorld(Math.max(sb.x1,sb.x2),Math.max(sb.y1,sb.y2),px2,py2,z)
      const inBox=piecesRef.current.filter(p=>p.x>=wx1&&p.x<=wx2&&p.y>=wy1&&p.y<=wy2)
      if(e.shiftKey) inBox.forEach(p=>toggleSelectedId(p.id))
      else setSelectedIds(inBox.map(p=>p.id))
      selBoxRef.current=null;selBoxStartRef.current=null
    }
  },[addConnection,setSelectedIds,toggleSelectedId])

  const handleWheel=useCallback((e:WheelEvent)=>{
    e.preventDefault()
    const r=canvasRef.current!.getBoundingClientRect()
    const cx=e.clientX-r.left,cy=e.clientY-r.top
    const factor=e.deltaY>0?0.9:1.1
    const z=zoomRef.current
    const newZ=Math.max(0.1,Math.min(8,z*factor))
    const newPx=cx-(cx-panXRef.current)*(newZ/z)
    const newPy=cy-(cy-panYRef.current)*(newZ/z)
    useProjectStore.getState().setPanZoom(newPx,newPy,newZ)
  },[])

  useEffect(()=>{
    const c=canvasRef.current
    if(!c)return
    c.addEventListener('wheel',handleWheel,{passive:false})
    return()=>c.removeEventListener('wheel',handleWheel)
  },[handleWheel])

  const handleContextMenu=useCallback((e:React.MouseEvent)=>{
    e.preventDefault()
    const {cx,cy}=getCanvasPos(e)
    const [wx,wy]=canvasToWorld(cx,cy,zoomRef.current,panXRef.current,panYRef.current)
    const ps=piecesRef.current
    for(let i=ps.length-1;i>=0;i--){
      if(hitTestPiece(ps[i],wx,wy,zoomRef.current)){
        setContextMenu({x:e.clientX,y:e.clientY,type:'piece',id:ps[i].id});return
      }
    }
    setContextMenu({x:e.clientX,y:e.clientY,type:'canvas'})
  },[setContextMenu])

  const cursor=mode==='pan'?'canvas-pan':holeAddMode?'canvas-hole':'canvas-select'

  return (
    <div ref={containerRef} className="relative w-full h-full" style={{background:'#0d1117'}}>
      <canvas
        ref={canvasRef}
        className={`w-full h-full block ${cursor}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
      />
    </div>
  )
}
