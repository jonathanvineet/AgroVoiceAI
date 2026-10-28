'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const vertex = /* glsl */ `
  uniform float uTime;
  uniform float uAmp;
  uniform float uSize;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    float d = length(p.xz);
    // Slow swell of a field in wind, plus rings that spread from the centre
    // like a voice; uAmp turns the rings up as the page scrolls.
    float swell = sin(p.x * 0.32 + uTime * 0.7) * 0.5 + sin(p.z * 0.22 + uTime * 0.5) * 0.5;
    float voice = sin(d * 0.85 - uTime * 2.6) * exp(-d * 0.05);
    p.y += swell * 0.55 + voice * uAmp * 1.6;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * (12.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
    vAlpha = smoothstep(70.0, 6.0, -mv.z);
  }
`

const fragment = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    if (length(gl_PointCoord - 0.5) > 0.5) discard;
    gl_FragColor = vec4(uColor, vAlpha * 0.7);
  }
`

// Layered pattern: a fixed Three.js canvas behind the page, its camera and
// shader driven by GSAP ScrollTrigger, with the HTML sections on top.
export default function ScrollScene() {
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const el = canvas.current
    if (!el) return
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const small = window.innerWidth < 720

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ canvas: el, alpha: true, antialias: true })
    } catch {
      return // no WebGL: the page reads fine without the field
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200)
    const look = new THREE.Vector3(0, 0, 0)

    const n = small ? 110 : 170
    const spacing = 0.5
    const positions = new Float32Array(n * n * 3)
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const k = (i * n + j) * 3
        positions[k] = (i - n / 2) * spacing
        positions[k + 2] = (j - n / 2) * spacing
      }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const uniforms = {
      uTime: { value: 0 },
      uAmp: { value: 0 },
      uSize: { value: small ? 2.2 : 2.6 },
      uColor: { value: new THREE.Color('#2f6b2f') }
    }
    const material = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms,
      transparent: true,
      depthWrite: false
    })
    const field = new THREE.Points(geometry, material)
    scene.add(field)

    // Camera keyframes: overview at the hero, sweeping low over the field
    // through the story, settling as the tools come up.
    const rig = { x: 0, y: 7, z: 24, lookY: 2, rot: 0 }
    camera.position.set(rig.x, rig.y, rig.z)

    const resize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    resize()
    window.addEventListener('resize', resize)

    // Set up the DOM animations only once the page has hydrated, so GSAP's
    // inline styles never reach React before it compares the server HTML.
    const ctx = gsap.context(() => {})
    const choreograph = () => ctx.add(() => {
      // Registered here, not at import: it writes to <body> on registration.
      gsap.registerPlugin(ScrollTrigger)
      if (!still) {
        gsap
          .timeline({
            scrollTrigger: { trigger: '.lv', start: 'top top', end: 'bottom bottom', scrub: 1 }
          })
          .to(rig, { y: 2.6, z: 9, lookY: 0.4, rot: 0.6, ease: 'power2.inOut', duration: 1 })
          .to(uniforms.uAmp, { value: 1, ease: 'power1.inOut', duration: 0.6 }, 0.2)
          .to(rig, { y: 9, z: 16, lookY: 0, rot: 1.2, ease: 'power2.inOut', duration: 1 })
          .to(uniforms.uAmp, { value: 0.15, ease: 'power1.inOut', duration: 0.6 }, 1.2)

        // The statement lights up word by word as it is read.
        gsap.fromTo(
          '.lv-story-word',
          { opacity: 0.18 },
          {
            opacity: 1,
            stagger: 0.08,
            ease: 'none',
            scrollTrigger: { trigger: '.lv-story', start: 'top 70%', end: 'bottom 60%', scrub: true }
          }
        )

        // The chat card lies back in depth and rises to face the reader.
        gsap.fromTo(
          '.lv-chat',
          { rotateX: 18, rotateY: -14, y: 40, opacity: 0 },
          { rotateX: 0, rotateY: 0, y: 0, opacity: 1, duration: 1.1, ease: 'power3.out', delay: 0.2 }
        )
        gsap.to('.lv-chat', {
          rotateX: -8,
          y: -60,
          ease: 'none',
          scrollTrigger: { trigger: '.lv-hero', start: 'top top', end: 'bottom top', scrub: true }
        })

        gsap.from('.lv-copy > *', {
          y: 28,
          opacity: 0,
          duration: 0.9,
          stagger: 0.09,
          ease: 'power3.out'
        })

        gsap.from('.lv-tools li', {
          y: 36,
          opacity: 0,
          rotateX: -12,
          duration: 0.7,
          stagger: 0.07,
          ease: 'power3.out',
          scrollTrigger: { trigger: '.lv-tools ul', start: 'top 80%' }
        })
      }
    })
    let idle = 0
    const begin = () => {
      idle = requestAnimationFrame(() => choreograph())
    }
    if (document.readyState === 'complete') begin()
    else window.addEventListener('load', begin, { once: true })

    let raf = 0
    let last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (!still) uniforms.uTime.value += dt
      camera.position.set(Math.sin(rig.rot) * rig.z * 0.35, rig.y, Math.cos(rig.rot) * rig.z)
      look.set(0, rig.lookY, 0)
      camera.lookAt(look)
      renderer.render(scene, camera)
      raf = still ? 0 : requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    const onVisibility = () => {
      cancelAnimationFrame(raf)
      if (!document.hidden && !still) {
        last = performance.now()
        raf = requestAnimationFrame(frame)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelAnimationFrame(raf)
      cancelAnimationFrame(idle)
      window.removeEventListener('load', begin)
      ctx.revert()
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
      geometry.dispose()
      material.dispose()
      renderer.dispose()
    }
  }, [])

  return <canvas ref={canvas} className="lv-bg" aria-hidden="true" />
}
