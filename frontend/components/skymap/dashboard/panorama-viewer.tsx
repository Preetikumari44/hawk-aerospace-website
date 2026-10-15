"use client"

import { Expand, Pause, Play, Ruler } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import * as THREE from "three"

import { Button } from "@/components/skymap/ui/button"
import type { TourScene } from "@/lib/skymap/types"

interface Props {
  scenes: TourScene[]
  activeIndex: number
  onChangeIndex: (index: number) => void
}

// Converts a hotspot's yaw/pitch (degrees) into a 3D point on the panorama sphere.
function hotspotPosition(yaw: number, pitch: number, radius: number) {
  const phi = THREE.MathUtils.degToRad(90 - pitch)
  const theta = THREE.MathUtils.degToRad(yaw)
  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  )
}

export function PanoramaViewer({ scenes, activeIndex, onChangeIndex }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const [autoRotate, setAutoRotate] = useState(false)
  const [showMeasurements, setShowMeasurements] = useState(false)
  const [loading, setLoading] = useState(true)

  // Refs that mirror React state/props inside the render loop (avoids stale closures
  // inside the imperative Three.js render/animation loop below).
  const autoRotateRef = useRef(autoRotate)
  // eslint-disable-next-line react-hooks/refs -- intentional latest-value ref mirror; read only inside effects/callbacks, never during render output.
  autoRotateRef.current = autoRotate
  const sceneIndexRef = useRef(activeIndex)
  // eslint-disable-next-line react-hooks/refs -- see above.
  sceneIndexRef.current = activeIndex
  const loadSceneRef = useRef<(index: number) => void>(() => {})

  useEffect(() => {
    if (!containerRef.current) return
    const container: HTMLDivElement = containerRef.current

    const RADIUS = 500
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 1, 1100)
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(container.clientWidth, container.clientHeight)
    container.appendChild(renderer.domElement)

    const geometry = new THREE.SphereGeometry(RADIUS, 60, 40)
    geometry.scale(-1, 1, 1) // view the texture from inside the sphere
    const material = new THREE.MeshBasicMaterial({ color: 0x1a1d27 })
    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)

    const loader = new THREE.TextureLoader()
    let disposed = false

    function loadScene(index: number) {
      const s = scenes[index]
      if (!s) return
      setLoading(true)
      loader.load(
        s.image360Url,
        (texture) => {
          if (disposed) return
          texture.colorSpace = THREE.SRGBColorSpace
          material.map?.dispose()
          material.map = texture
          material.color.set(0xffffff)
          material.needsUpdate = true
          setLoading(false)
        },
        undefined,
        () => { if (!disposed) setLoading(false) } // still show controls even if the image 404s
      )
    }
    loadSceneRef.current = loadScene
    loadScene(sceneIndexRef.current)

    let lon = 0
    let lat = 0
    let phi = 0
    let theta = 0
    let isPointerDown = false
    let pointerStartX = 0
    let pointerStartY = 0
    let lonStart = 0
    let latStart = 0

    function onPointerDown(e: PointerEvent) {
      isPointerDown = true
      pointerStartX = e.clientX
      pointerStartY = e.clientY
      lonStart = lon
      latStart = lat
      container?.setPointerCapture(e.pointerId)
    }
    function onPointerMove(e: PointerEvent) {
      if (!isPointerDown) return
      lon = (pointerStartX - e.clientX) * 0.18 + lonStart
      lat = (e.clientY - pointerStartY) * 0.18 + latStart
      lat = Math.max(-85, Math.min(85, lat))
    }
    function onPointerUp() { isPointerDown = false }
    function onWheel(e: WheelEvent) {
      e.preventDefault()
      camera.fov = Math.max(30, Math.min(90, camera.fov + e.deltaY * 0.05))
      camera.updateProjectionMatrix()
    }

    container.addEventListener("pointerdown", onPointerDown)
    container.addEventListener("pointermove", onPointerMove)
    container.addEventListener("pointerup", onPointerUp)
    container.addEventListener("pointerleave", onPointerUp)
    container.addEventListener("wheel", onWheel, { passive: false })

    function onResize() {
      if (!container) return
      camera.aspect = container.clientWidth / container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
    }
    const resizeObserver = new ResizeObserver(onResize)
    resizeObserver.observe(container)

    let raf = 0
    function animate() {
      raf = requestAnimationFrame(animate)
      if (autoRotateRef.current && !isPointerDown) lon += 0.045

      lat = Math.max(-85, Math.min(85, lat))
      phi = THREE.MathUtils.degToRad(90 - lat)
      theta = THREE.MathUtils.degToRad(lon)

      camera.position.x = 10 * Math.sin(phi) * Math.cos(theta)
      camera.position.y = 10 * Math.cos(phi)
      camera.position.z = 10 * Math.sin(phi) * Math.sin(theta)
      camera.lookAt(scene.position)

      renderer.render(scene, camera)

      // Project hotspots for the *current* scene onto screen space.
      const overlay = overlayRef.current
      if (overlay) {
        const currentHotspots = scenes[sceneIndexRef.current]?.hotspots || []
        overlay.querySelectorAll<HTMLElement>("[data-hotspot]").forEach((el, i) => {
          const h = currentHotspots[i]
          if (!h) return
          const pos = hotspotPosition(h.yaw, h.pitch, RADIUS * 0.98)
          const projected = pos.clone().project(camera)
          const behind = projected.z > 1
          const x = (projected.x * 0.5 + 0.5) * container.clientWidth
          const y = (-projected.y * 0.5 + 0.5) * container.clientHeight
          el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`
          el.style.display = behind ? "none" : "flex"
        })
      }
    }
    animate()

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      resizeObserver.disconnect()
      container.removeEventListener("pointerdown", onPointerDown)
      container.removeEventListener("pointermove", onPointerMove)
      container.removeEventListener("pointerup", onPointerUp)
      container.removeEventListener("pointerleave", onPointerUp)
      container.removeEventListener("wheel", onWheel)
      material.map?.dispose()
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reload the texture (without tearing down the renderer) whenever the room changes.
  const firstRun = useRef(true)
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return }
    loadSceneRef.current(activeIndex)
  }, [activeIndex])

  const activeScene = scenes[activeIndex]

  function goToRoom(roomName: string) {
    const idx = scenes.findIndex((s) => s.room === roomName)
    if (idx >= 0) onChangeIndex(idx)
  }

  function toggleFullscreen() {
    if (!containerRef.current) return
    if (document.fullscreenElement) document.exitFullscreen()
    else containerRef.current.requestFullscreen()
  }

  if (!scenes.length) {
    return (
      <div className="glass flex aspect-video items-center justify-center rounded-3xl text-sm text-muted-foreground">
        No 360° scenes available for this property yet.
      </div>
    )
  }

  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-border bg-card sm:aspect-[16/8]">
      <div ref={containerRef} className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing" />
      <div ref={overlayRef} className="pointer-events-none absolute inset-0">
        {(activeScene?.hotspots || []).map((h) => (
          <button
            key={h.label}
            data-hotspot
            onClick={() => goToRoom(h.targetRoom)}
            className="pointer-events-auto absolute grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-primary bg-background/80 text-primary backdrop-blur"
            aria-label={`Go to ${h.targetRoom}`}
            title={h.label}
          >
            <span className="size-2 rounded-full bg-primary" />
          </button>
        ))}
      </div>

      {loading && (
        <div className="absolute inset-0 grid place-items-center bg-background/60 text-sm text-muted-foreground">
          Loading {activeScene?.room}…
        </div>
      )}

      <div className="glass absolute left-4 top-4 rounded-xl px-4 py-3">
        <p className="text-xs text-muted-foreground">Current room</p>
        <p className="font-medium">{activeScene?.room}</p>
      </div>

      <div className="absolute right-4 top-4 flex gap-2">
        <Button size="icon" variant="outline" onClick={() => setAutoRotate((v) => !v)} aria-label={autoRotate ? "Pause auto-rotate" : "Start auto-rotate"}>
          {autoRotate ? <Pause /> : <Play />}
        </Button>
        <Button size="icon" variant="outline" onClick={() => setShowMeasurements((v) => !v)} aria-label="Toggle measurements">
          <Ruler />
        </Button>
        <Button size="icon" variant="outline" onClick={toggleFullscreen} aria-label="Fullscreen">
          <Expand />
        </Button>
      </div>

      {showMeasurements && (
        <div className="glass absolute bottom-4 right-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm">
          <Ruler className="size-4 text-primary" /> 14&apos; 8&quot; × 22&apos; 4&quot;
        </div>
      )}
    </div>
  )
}
