'use client'

import { Canvas, useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import * as THREE from 'three'

export type Wind = { target: number; value: number }

const PLOT = 3 // width of the plot in scene units
const HILLS = 13 // hills of paddy per row
const BLADES_PER_HILL = 13

// Soil strata of a Tamil Nadu paddy plot, top to bottom.
const MUD = '#2a1b11'
const LATERITE = '#7a2f16'
const SUBSOIL = '#4a2312'

function useStrataTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 256
    c.height = 256
    const g = c.getContext('2d')!
    const bands: [string, number][] = [
      [MUD, 0.12],
      [LATERITE, 0.55],
      [SUBSOIL, 0.33]
    ]
    let y = 0
    for (const [colour, share] of bands) {
      g.fillStyle = colour
      g.fillRect(0, y, 256, share * 256)
      y += share * 256
    }
    // Grit and small stones, so the cut face reads as earth.
    for (let i = 0; i < 2600; i++) {
      const shade = Math.random() < 0.5 ? 0 : 255
      g.fillStyle = `rgba(${shade},${shade * 0.8},${shade * 0.6},${Math.random() * 0.12})`
      g.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 2, 1 + Math.random() * 1.5)
    }
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [])
}

function Plot() {
  const strata = useStrataTexture()
  const sideMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ map: strata, roughness: 1 }),
    [strata]
  )
  const topMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: MUD, roughness: 1 }),
    []
  )
  // Box faces: +x, -x, +y, -y, +z, -z
  const materials = useMemo(
    () => [sideMaterial, sideMaterial, topMaterial, topMaterial, sideMaterial, sideMaterial],
    [sideMaterial, topMaterial]
  )

  return (
    <group>
      <mesh position={[0, -0.6, 0]} material={materials} receiveShadow>
        <boxGeometry args={[PLOT, 1.2, PLOT]} />
      </mesh>
      {/* Standing water over the mud */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.025, 0]} receiveShadow>
        <planeGeometry args={[PLOT - 0.04, PLOT - 0.04]} />
        <meshStandardMaterial
          color="#16231a"
          roughness={0.12}
          metalness={0.4}
          transparent
          opacity={0.88}
        />
      </mesh>
    </group>
  )
}

function Paddy({ wind, still }: { wind: MutableRefObject<Wind>; still: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const count = HILLS * HILLS * BLADES_PER_HILL
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uWind: { value: 0 } }), [])

  const geometry = useMemo(() => {
    // A tapered blade, base at y = 0 and tip at y = 1.
    const g = new THREE.PlaneGeometry(0.022, 1, 1, 6)
    g.translate(0, 0.5, 0)
    const p = g.attributes.position
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i)
      p.setX(i, p.getX(i) * (1 - y * 0.92))
    }
    g.computeVertexNormals()
    return g
  }, [])

  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      roughness: 0.7,
      side: THREE.DoubleSide
    })
    m.onBeforeCompile = shader => {
      shader.uniforms.uTime = uniforms.uTime
      shader.uniforms.uWind = uniforms.uWind
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          '#include <common>\nuniform float uTime;\nuniform float uWind;'
        )
        .replace(
          '#include <project_vertex>',
          /* glsl */ `
          vec4 mvPosition = vec4( transformed, 1.0 );
          #ifdef USE_INSTANCING
            mvPosition = instanceMatrix * mvPosition;
            vec4 root = instanceMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
          #else
            vec4 root = vec4( 0.0 );
          #endif
          // Bend grows with the square of height; a travelling wave rolls
          // across the plot like gusts over a real field.
          float h = position.y * position.y;
          float wave = sin( dot( root.xz, vec2( 1.9, 0.8 ) ) - uTime * 2.4 );
          float flutter = sin( uTime * 5.3 + root.x * 7.0 + root.z * 5.0 ) * 0.25;
          float push = 0.035 + uWind * ( 0.75 + 0.45 * wave );
          mvPosition.x += h * ( push + 0.025 * flutter + 0.03 * wave );
          mvPosition.z += h * ( push * 0.45 + 0.02 * flutter );
          mvPosition.y -= h * push * push * 0.9;
          mvPosition = modelViewMatrix * mvPosition;
          gl_Position = projectionMatrix * mvPosition;
          `
        )
    }
    return m
  }, [uniforms])

  useEffect(() => {
    const m = mesh.current
    if (!m) return
    const dummy = new THREE.Object3D()
    const colour = new THREE.Color()
    const greens = ['#5f8f2c', '#79a63a', '#4e7a24', '#8db547', '#6d9a31']
    const step = (PLOT - 0.3) / (HILLS - 1)
    let i = 0
    for (let hx = 0; hx < HILLS; hx++) {
      for (let hz = 0; hz < HILLS; hz++) {
        const cx = -PLOT / 2 + 0.15 + hx * step + (Math.random() - 0.5) * 0.05
        const cz = -PLOT / 2 + 0.15 + hz * step + (Math.random() - 0.5) * 0.05
        for (let b = 0; b < BLADES_PER_HILL; b++) {
          const a = Math.random() * Math.PI * 2
          const lean = 0.08 + Math.random() * 0.28
          dummy.position.set(cx + Math.cos(a) * 0.02, 0.02, cz + Math.sin(a) * 0.02)
          // Lean outward from the centre of the hill, as transplanted clumps grow.
          dummy.rotation.set(Math.sin(a) * lean, Math.random() * Math.PI, -Math.cos(a) * lean)
          const height = 0.42 + Math.random() * 0.36
          dummy.scale.set(1, height, 1)
          dummy.updateMatrix()
          m.setMatrixAt(i, dummy.matrix)
          m.setColorAt(i, colour.set(greens[(Math.random() * greens.length) | 0]))
          i++
        }
      }
    }
    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  }, [])

  useFrame((state, delta) => {
    const w = wind.current
    w.value += (w.target - w.value) * Math.min(1, delta * 3)
    w.target *= Math.pow(0.35, delta) // a gust dies away when nobody keeps it up
    uniforms.uWind.value = w.value
    uniforms.uTime.value += delta * (still ? 0.25 : 1)
  })

  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, material, count]}
      castShadow
      frustumCulled={false}
    />
  )
}

function Probe() {
  return (
    <group position={[PLOT / 2 - 0.28, 0, PLOT / 2 - 0.28]}>
      <mesh position={[0, 0.05, 0]} castShadow>
        <cylinderGeometry args={[0.016, 0.016, 1.1, 12]} />
        <meshStandardMaterial color="#b9bdb6" metalness={1} roughness={0.32} />
      </mesh>
      <mesh position={[0, 0.66, 0]} castShadow>
        <boxGeometry args={[0.2, 0.13, 0.09]} />
        <meshStandardMaterial color="#121512" roughness={0.6} />
      </mesh>
      {/* The status light of the ESP8266 board */}
      <mesh position={[0.06, 0.67, 0.047]}>
        <boxGeometry args={[0.022, 0.022, 0.004]} />
        <meshBasicMaterial color="#c6f19d" />
      </mesh>
    </group>
  )
}

function Exhibit({ wind, still }: { wind: MutableRefObject<Wind>; still: boolean }) {
  const group = useRef<THREE.Group>(null)

  useFrame((state, delta) => {
    const g = group.current
    if (!g) return
    if (!still) g.rotation.y += delta * 0.06
    // A little parallax towards the pointer.
    const targetX = state.pointer.y * 0.06
    g.rotation.x += (targetX - g.rotation.x) * Math.min(1, delta * 2)
  })

  return (
    <group ref={group} rotation-y={-0.5}>
      <Plot />
      <Paddy wind={wind} still={still} />
      <Probe />
    </group>
  )
}

export default function FieldScene({
  wind,
  label
}: {
  wind: MutableRefObject<Wind>
  label: string
}) {
  const host = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(true)
  const [still, setStill] = useState(false)

  useEffect(() => {
    const q = window.matchMedia('(prefers-reduced-motion: reduce)')
    setStill(q.matches)
    const onChange = () => setStill(q.matches)
    q.addEventListener('change', onChange)

    // Stop rendering when the stage is scrolled away.
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting))
    if (host.current) io.observe(host.current)
    return () => {
      q.removeEventListener('change', onChange)
      io.disconnect()
    }
  }, [])

  return (
    <div ref={host} className="lv-canvas" role="img" aria-label={label}>
      <Canvas
        shadows
        dpr={[1, 1.75]}
        frameloop={visible ? 'always' : 'never'}
        camera={{ position: [3.9, 2.7, 4.5], fov: 30 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ camera }) => camera.lookAt(0, 0.05, 0)}
      >
        <ambientLight intensity={0.22} />
        <spotLight
          position={[0.6, 7, 1.2]}
          angle={0.42}
          penumbra={0.7}
          intensity={150}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-bias={-0.0004}
        />
        {/* Faint rim from behind so the plot's edge separates from the dark */}
        <directionalLight position={[-4, 2, -5]} intensity={0.5} color="#c6f19d" />
        <Exhibit wind={wind} still={still} />
      </Canvas>
    </div>
  )
}
