"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { LOGO_GLYPHS } from "@/lib/brand/logo-glyphs";

const UNIT = 1 / 40; // unités du tracé -> unités 3D

type Glyph = { geometry: THREE.ExtrudeGeometry; center: THREE.Vector3 };

function buildGlyphs(): { glyphs: Glyph[]; width: number } {
  const loader = new SVGLoader();
  const raw = LOGO_GLYPHS.map((g) => {
    const data = loader.parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${g.d}"/></svg>`);
    const shapes = data.paths.flatMap((p) => p.toShapes());
    const geometry = new THREE.ExtrudeGeometry(shapes, {
      depth: 11,
      bevelEnabled: true,
      bevelThickness: 1.8,
      bevelSize: 1.05,
      bevelOffset: 0,
      bevelSegments: 5,
      curveSegments: 12,
    });
    geometry.scale(UNIT, UNIT, UNIT);
    // SVG : axe Y vers le bas -> rotation plutôt qu'une échelle négative (garde les normales correctes)
    geometry.rotateX(Math.PI);
    geometry.computeBoundingBox();
    const center = new THREE.Vector3();
    geometry.boundingBox!.getCenter(center);
    geometry.translate(-center.x, -center.y, -center.z);
    return { geometry, center };
  });
  const minX = Math.min(...raw.map((g) => g.center.x - (g.geometry.boundingBox!.max.x - g.geometry.boundingBox!.min.x) / 2));
  const maxX = Math.max(...raw.map((g) => g.center.x + (g.geometry.boundingBox!.max.x - g.geometry.boundingBox!.min.x) / 2));
  const midX = (minX + maxX) / 2;
  const midY = raw.reduce((s, g) => s + g.center.y, 0) / raw.length;
  for (const g of raw) {
    g.center.x -= midX;
    g.center.y -= midY;
    g.center.z = 0;
  }
  return { glyphs: raw, width: maxX - minX };
}

const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

function Letter({
  glyph,
  index,
  faceMaterial,
  sideMaterial,
  animate,
}: {
  glyph: Glyph;
  index: number;
  faceMaterial: THREE.Material;
  sideMaterial: THREE.Material;
  animate: boolean;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const start = useRef<number | null>(null);

  useFrame((state) => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = state.clock.elapsedTime;
    if (!animate) {
      mesh.position.copy(glyph.center);
      mesh.rotation.set(0, 0, 0);
      return;
    }
    start.current ??= t;
    const local = Math.max(0, t - start.current - 0.25 - index * 0.13);
    const p = easeOutExpo(Math.min(1, local / 1.6));
    mesh.position.set(
      glyph.center.x,
      glyph.center.y + (1 - p) * -1.6 + Math.sin(t * 0.9 + index * 0.8) * 0.035 * p,
      (1 - p) * -2.5,
    );
    mesh.rotation.set((1 - p) * -1.4, Math.sin(t * 0.6 + index) * 0.05 * p, 0);
    mesh.scale.setScalar(0.6 + 0.4 * p);
  });

  return (
    <mesh
      ref={ref}
      geometry={glyph.geometry}
      material={[faceMaterial, sideMaterial]}
      position={glyph.center}
      castShadow={false}
      receiveShadow={false}
    />
  );
}

function Wordmark({ accent, animate }: { accent: string; animate: boolean }) {
  const group = useRef<THREE.Group>(null);
  const { viewport } = useThree();
  const { glyphs, width } = useMemo(() => buildGlyphs(), []);

  const [faceMaterial, sideMaterial] = useMemo(() => {
    const color = new THREE.Color(accent);
    const face = new THREE.MeshPhysicalMaterial({
      color,
      metalness: 1,
      roughness: 0.2,
      clearcoat: 0.5,
      clearcoatRoughness: 0.18,
      envMapIntensity: 1.25,
    });
    const side = new THREE.MeshPhysicalMaterial({
      color: color.clone().multiplyScalar(0.82),
      metalness: 1,
      roughness: 0.34,
      envMapIntensity: 1,
    });
    return [face, side];
  }, [accent]);

  const scale = Math.min(1, (viewport.width * (viewport.aspect < 1 ? 0.9 : 0.68)) / width);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g || !animate) return;
    const targetY = state.pointer.x * 0.28;
    const targetX = -state.pointer.y * 0.14 + Math.sin(state.clock.elapsedTime * 0.35) * 0.04;
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, targetY, 2.2, delta);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, targetX, 2.2, delta);
    g.position.y = Math.sin(state.clock.elapsedTime * 0.7) * 0.06;
  });

  return (
    <group ref={group} scale={scale}>
      {glyphs.map((glyph, i) => (
        <Letter
          key={i}
          glyph={glyph}
          index={i}
          faceMaterial={faceMaterial}
          sideMaterial={sideMaterial}
          animate={animate}
        />
      ))}
    </group>
  );
}

function Halo({ accent, animate }: { accent: string; animate: boolean }) {
  const a = useRef<THREE.Mesh>(null);
  const b = useRef<THREE.Mesh>(null);
  const { viewport } = useThree();
  // Anneaux qui encadrent le logo (au-dessus et au-dessous) sans le traverser
  const radius = Math.min(viewport.width * (viewport.aspect < 1 ? 0.5 : 0.4), 5.4);
  useFrame((state) => {
    if (!animate) return;
    const t = state.clock.elapsedTime;
    if (a.current) a.current.rotation.set(1.18 + Math.sin(t * 0.22) * 0.05, Math.sin(t * 0.17) * 0.06, t * 0.05);
    if (b.current) b.current.rotation.set(1.3 + Math.cos(t * 0.18) * 0.05, -0.12 + Math.sin(t * 0.13) * 0.05, -t * 0.04);
  });
  return (
    <group position={[0, 0, -1.2]}>
      <mesh ref={a} rotation={[1.18, 0, 0]}>
        <torusGeometry args={[radius, 0.009, 16, 260]} />
        <meshStandardMaterial color={accent} metalness={1} roughness={0.3} emissive={accent} emissiveIntensity={0.22} />
      </mesh>
      <mesh ref={b} rotation={[1.3, -0.12, 0]}>
        <torusGeometry args={[radius * 1.12, 0.005, 12, 260]} />
        <meshStandardMaterial color={accent} metalness={1} roughness={0.4} emissive={accent} emissiveIntensity={0.14} transparent opacity={0.55} />
      </mesh>
    </group>
  );
}


/** Texture ronde nette à partir du logo importé (PNG, JPG, WebP ou SVG). */
function useLogoTexture(url: string | null) {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  useEffect(() => {
    if (!url) return;
    let disposed = false;
    let created: THREE.CanvasTexture | null = null;
    const img = new Image();
    img.onload = () => {
      if (disposed) return;
      const size = 1024;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const bg = ctx.createRadialGradient(size / 2, size / 2, size * 0.1, size / 2, size / 2, size / 2);
      bg.addColorStop(0, "#1a160f");
      bg.addColorStop(1, "#0a0907");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, size, size);
      const w0 = img.naturalWidth || 512;
      const h0 = img.naturalHeight || 512;
      const scale = Math.min((size * 0.66) / w0, (size * 0.66) / h0);
      const w = w0 * scale;
      const h = h0 * scale;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      created = new THREE.CanvasTexture(canvas);
      created.colorSpace = THREE.SRGBColorSpace;
      created.anisotropy = 8;
      // Les UV du disque d'un cylindre sont tournées d'un quart de tour : on les redresse
      created.center.set(0.5, 0.5);
      created.rotation = Math.PI / 2;
      setTexture(created);
    };
    img.src = url;
    return () => {
      disposed = true;
      created?.dispose();
    };
  }, [url]);
  return texture;
}

/** Médaillon doré portant le logo importé par le gérant. */
function Medallion({ url, accent, animate }: { url: string; accent: string; animate: boolean }) {
  const group = useRef<THREE.Group>(null);
  const { viewport } = useThree();
  const texture = useLogoTexture(url);
  const radius = Math.min(1.5, viewport.height * 0.24, viewport.width * 0.34);

  const [face, rim] = useMemo(() => {
    const faceMat = new THREE.MeshPhysicalMaterial({ color: "#ffffff", metalness: 0.25, roughness: 0.45, clearcoat: 0.8, clearcoatRoughness: 0.15 });
    const rimMat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(accent), metalness: 1, roughness: 0.22, clearcoat: 0.4, envMapIntensity: 1.3 });
    return [faceMat, rimMat];
  }, [accent]);

  useEffect(() => {
    face.map = texture;
    face.needsUpdate = true;
  }, [face, texture]);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g || !animate) return;
    const t = state.clock.elapsedTime;
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, state.pointer.x * 0.45 + Math.sin(t * 0.5) * 0.25, 2, delta);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -state.pointer.y * 0.25 + Math.sin(t * 0.37) * 0.06, 2, delta);
    g.position.y = Math.sin(t * 0.8) * 0.08;
  });

  return (
    <group ref={group}>
      {/* Pièce : face avant (logo) orientée vers la caméra */}
      <mesh rotation={[Math.PI / 2, 0, 0]} material={[rim, face, rim]}>
        <cylinderGeometry args={[radius, radius, 0.22, 128]} />
      </mesh>
      <mesh position={[0, 0, 0.1]}>
        <torusGeometry args={[radius, 0.07, 32, 200]} />
        <primitive object={rim} attach="material" />
      </mesh>
      <mesh position={[0, 0, 0.12]}>
        <torusGeometry args={[radius * 0.9, 0.012, 16, 200]} />
        <primitive object={rim} attach="material" />
      </mesh>
    </group>
  );
}


/* ------------------------------------------------------------------ */
/* Environnement studio procédural (sans chargeur HDR : bundle léger)  */
/* ------------------------------------------------------------------ */

type Panel = {
  form: "rect" | "circle";
  color?: string;
  intensity: number;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale: [number, number];
};

const PANELS: Panel[] = [
  // Grand panneau chaud derrière la caméra : illumine les faces avant des lettres
  { form: "rect", color: "#ffd89a", intensity: 2.2, position: [0, 0.5, 9], scale: [14, 3.5] },
  { form: "rect", color: "#fff4e0", intensity: 1.2, position: [-7, 3, 6], rotation: [0, 0.6, 0], scale: [3, 8] },
];

const TILTED_PANELS: Panel[] = [
  { form: "circle", intensity: 4, position: [0, 5, -9], rotation: [Math.PI / 2, 0, 0], scale: [2, 2] },
  { form: "circle", intensity: 2, position: [-5, 1, -1], rotation: [0, Math.PI / 2, 0], scale: [2, 2] },
  { form: "circle", intensity: 2, position: [-5, -1, -1], rotation: [0, Math.PI / 2, 0], scale: [2, 2] },
  { form: "circle", intensity: 2, position: [10, 1, 0], rotation: [0, -Math.PI / 2, 0], scale: [8, 8] },
  { form: "rect", color: "#ffe2b0", intensity: 3, position: [0, -6, 4], rotation: [-Math.PI / 2.5, 0, 0], scale: [12, 2] },
];

function buildPanel(panel: Panel) {
  const geometry = panel.form === "circle" ? new THREE.CircleGeometry(0.5, 48) : new THREE.PlaneGeometry(1, 1);
  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color(panel.color ?? "#ffffff").multiplyScalar(panel.intensity),
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...panel.position);
  if (panel.rotation) mesh.rotation.set(...panel.rotation);
  mesh.scale.set(panel.scale[0], panel.scale[1], 1);
  return mesh;
}

/** Reflets du métal : quelques panneaux lumineux, précalculés une seule fois (PMREM). */
function StudioEnvironment({ intensity = 1.15 }: { intensity?: number }) {
  const { gl, scene } = useThree();
  useEffect(() => {
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color("#050403");
    for (const panel of PANELS) envScene.add(buildPanel(panel));
    const tilted = new THREE.Group();
    tilted.rotation.set(-Math.PI / 3, 0, 1);
    for (const panel of TILTED_PANELS) tilted.add(buildPanel(panel));
    envScene.add(tilted);

    const pmrem = new THREE.PMREMGenerator(gl);
    const target = pmrem.fromScene(envScene, 0.02);
    scene.environment = target.texture;
    scene.environmentIntensity = intensity;
    return () => {
      scene.environment = null;
      target.dispose();
      pmrem.dispose();
      envScene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          (object.material as THREE.Material).dispose();
        }
      });
    };
  }, [gl, scene, intensity]);
  return null;
}

/** Poussière d'or : particules scintillantes (un seul appel de rendu, shader minimal). */
function GoldDust({ color, count = 70 }: { color: string; count?: number }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(color) },
          uPixelRatio: { value: 1 },
        },
        vertexShader: /* glsl */ `
          uniform float uTime;
          uniform float uPixelRatio;
          attribute float aSeed;
          varying float vAlpha;
          void main() {
            vec3 p = position;
            p.y += sin(uTime * 0.35 + aSeed * 6.2831) * 0.35;
            p.x += cos(uTime * 0.25 + aSeed * 12.566) * 0.25;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_Position = projectionMatrix * mv;
            gl_PointSize = (3.0 + aSeed * 4.0) * uPixelRatio * (9.0 / -mv.z);
            vAlpha = 0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * (0.8 + aSeed) + aSeed * 40.0));
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          varying float vAlpha;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            float a = smoothstep(0.5, 0.0, d) * vAlpha * 0.8;
            if (a < 0.01) discard;
            gl_FragColor = vec4(uColor, a);
          }
        `,
      }),
    [color],
  );

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 6;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 5;
      seeds[i] = Math.random();
    }
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    return g;
  }, [count]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
    material.uniforms.uPixelRatio.value = state.gl.getPixelRatio();
  });

  return <points geometry={geometry} material={material} />;
}

/** Fait tourner lentement l'environnement : les reflets glissent sur le métal (sans recalcul coûteux). */
function EnvironmentSweep({ animate }: { animate: boolean }) {
  useFrame((state) => {
    if (!animate) return;
    const t = state.clock.elapsedTime;
    state.scene.environmentRotation.set(Math.sin(t * 0.21) * 0.25, t * 0.18, 0);
  });
  return null;
}

function MovingLight({ animate }: { animate: boolean }) {
  const light = useRef<THREE.SpotLight>(null);
  useFrame((state) => {
    if (!light.current || !animate) return;
    const t = state.clock.elapsedTime;
    light.current.position.set(Math.sin(t * 0.45) * 9, 3 + Math.cos(t * 0.3) * 1.5, 7);
  });
  return <spotLight ref={light} position={[6, 4, 7]} angle={0.55} penumbra={1} intensity={90} color="#fff1d6" />;
}

export default function HeroScene({
  accent,
  active,
  reduceMotion,
  logoUrl,
}: {
  accent: string;
  active: boolean;
  reduceMotion: boolean;
  logoUrl?: string | null;
}) {
  const animate = !reduceMotion;
  return (
    <Canvas
      camera={{ position: [0, 0, 11], fov: 32 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      frameloop={!active ? "never" : animate ? "always" : "demand"}
      aria-hidden
    >
      <ambientLight intensity={0.25} />
      <MovingLight animate={animate} />
      <directionalLight position={[-6, -2, 4]} intensity={0.6} color="#ffd9a0" />
      {logoUrl ? <Medallion url={logoUrl} accent={accent} animate={animate} /> : <Wordmark accent={accent} animate={animate} />}
      <Halo accent={accent} animate={animate} />
      <EnvironmentSweep animate={animate} />
      {animate && <GoldDust color={accent} />}
      <StudioEnvironment intensity={1.15} />
    </Canvas>
  );
}
