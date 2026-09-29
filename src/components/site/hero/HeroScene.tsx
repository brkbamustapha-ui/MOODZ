"use client";

import { Environment, Lightformer, Sparkles } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
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

export default function HeroScene({ accent, active, reduceMotion }: { accent: string; active: boolean; reduceMotion: boolean }) {
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
      <Wordmark accent={accent} animate={animate} />
      <Halo accent={accent} animate={animate} />
      <EnvironmentSweep animate={animate} />
      {animate && <Sparkles count={70} scale={[14, 6, 5]} size={2.4} speed={0.25} opacity={0.75} color={accent} noise={0.6} />}
      <Environment resolution={256} frames={1} environmentIntensity={1.15}>
        {/* Grand panneau chaud derrière la caméra : illumine les faces avant des lettres */}
        <Lightformer form="rect" intensity={2.2} color="#ffd89a" position={[0, 0.5, 9]} scale={[14, 3.5, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#fff4e0" position={[-7, 3, 6]} rotation-y={0.6} scale={[3, 8, 1]} />
        <group rotation={[-Math.PI / 3, 0, 1]}>
          <Lightformer form="circle" intensity={4} rotation-x={Math.PI / 2} position={[0, 5, -9]} scale={2} />
          <Lightformer form="circle" intensity={2} rotation-y={Math.PI / 2} position={[-5, 1, -1]} scale={2} />
          <Lightformer form="circle" intensity={2} rotation-y={Math.PI / 2} position={[-5, -1, -1]} scale={2} />
          <Lightformer form="circle" intensity={2} rotation-y={-Math.PI / 2} position={[10, 1, 0]} scale={8} />
          <Lightformer form="rect" intensity={3} color="#ffe2b0" position={[0, -6, 4]} scale={[12, 2, 1]} rotation-x={-Math.PI / 2.5} />
        </group>
      </Environment>
    </Canvas>
  );
}
