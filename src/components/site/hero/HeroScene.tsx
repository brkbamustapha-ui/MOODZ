"use client";

import { Canvas, useFrame, useThree, type RootState, type ThreeElements } from "@react-three/fiber";
import type { MotionValue } from "motion/react";
import { useEffect, useEffectEvent, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import { LOGO_GLYPHS } from "@/lib/brand/logo-glyphs";

const UNIT = 1 / 40; // unités du tracé -> unités 3D

/**
 * Profil de rendu. Écrans tactiles et petits processeurs : scène allégée (matériaux standard,
 * géométrie plus simple, moins de pixels) et balancement automatique du logo, faute de souris.
 */
type Profile = { lite: boolean; touch: boolean };

function detectProfile(): Profile {
  const touch = window.matchMedia("(hover: none)").matches;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  return { lite: touch || coarse || (navigator.hardwareConcurrency || 8) <= 4, touch };
}

/**
 * Horloge de la scène : n'avance que pendant le rendu. Celle de R3F repart de zéro quand le rendu
 * reprend (logo sorti puis revenu à l'écran) : les lettres rejouaient leur entrée.
 */
function useSceneFrame(callback: (time: number, delta: number, state: RootState) => void) {
  const time = useRef(0);
  useFrame((state, delta) => {
    time.current += Math.min(delta, 0.1);
    callback(time.current, delta, state);
  });
}

/**
 * Orientation visée par le logo. À la souris : le pointeur. Au doigt : un balancement lent, sinon
 * le logo paraît figé. `scroll` (0 à 1, sortie du hero) le fait basculer vers l'arrière ; il vient
 * de motion : lire window.scrollY à chaque image forcerait un recalcul de la mise en page.
 */
function lookTarget(time: number, state: RootState, touch: boolean, scroll: MotionValue<number>) {
  const progress = scroll.get();
  if (!touch) return { x: state.pointer.x, y: state.pointer.y, scroll: progress };
  return { x: Math.sin(time * 0.52) * 1.15, y: Math.sin(time * 0.37 + 1.2) * 0.7, scroll: progress };
}

/** Rend la main au navigateur entre deux étapes coûteuses (défilement et interactions restent fluides). */
const yieldToMain = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

type Glyph = { geometry: THREE.ExtrudeGeometry; center: THREE.Vector3 };
type Glyphs = { glyphs: Glyph[]; width: number };

const disposeGlyphs = (glyphs: Glyph[]) => new Set(glyphs.map((g) => g.geometry)).forEach((geometry) => geometry.dispose());

/**
 * Extrusion des lettres, une par tâche : d'un seul bloc, elle figeait la page ~150 ms sur mobile.
 * Les lettres répétées (les deux O) partagent la même géométrie.
 */
async function buildGlyphs(lite: boolean, cancelled: () => boolean): Promise<Glyphs | null> {
  const loader = new SVGLoader();
  const byChar = new Map<string, { geometry: THREE.ExtrudeGeometry; center: THREE.Vector3; x: number }>();
  const raw: Glyph[] = [];
  for (const g of LOGO_GLYPHS) {
    const twin = byChar.get(g.char);
    if (twin) {
      raw.push({ geometry: twin.geometry, center: twin.center.clone().setX(twin.center.x + (g.x - twin.x) * UNIT) });
      continue;
    }
    await yieldToMain();
    if (cancelled()) {
      disposeGlyphs(raw);
      return null;
    }
    const data = loader.parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${g.d}"/></svg>`);
    const shapes = data.paths.flatMap((p) => p.toShapes());
    const geometry = new THREE.ExtrudeGeometry(shapes, {
      depth: 11,
      bevelEnabled: true,
      bevelThickness: 1.8,
      bevelSize: 1.05,
      bevelOffset: 0,
      bevelSegments: lite ? 3 : 5,
      curveSegments: lite ? 7 : 12,
    });
    geometry.scale(UNIT, UNIT, UNIT);
    // SVG : axe Y vers le bas -> rotation plutôt qu'une échelle négative (garde les normales correctes)
    geometry.rotateX(Math.PI);
    geometry.computeBoundingBox();
    const center = new THREE.Vector3();
    geometry.boundingBox!.getCenter(center);
    geometry.translate(-center.x, -center.y, -center.z);
    byChar.set(g.char, { geometry, center: center.clone(), x: g.x });
    raw.push({ geometry, center });
  }
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

/** Lettres du logotype, prêtes de façon asynchrone (null tant qu'elles se préparent ou si inutiles). */
function useGlyphs(lite: boolean, enabled: boolean): Glyphs | null {
  const [glyphs, setGlyphs] = useState<Glyphs | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let built: Glyphs | null = null;
    buildGlyphs(lite, () => cancelled).then((result) => {
      if (!result) return;
      if (cancelled) {
        disposeGlyphs(result.glyphs);
        return;
      }
      built = result;
      setGlyphs(result);
    });
    return () => {
      cancelled = true;
      if (built) disposeGlyphs(built.glyphs);
    };
  }, [lite, enabled]);
  return enabled ? glyphs : null;
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

  useSceneFrame((t) => {
    const mesh = ref.current;
    if (!mesh) return;
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

function Wordmark({
  letters,
  accent,
  animate,
  profile,
  scroll,
}: {
  letters: Glyphs;
  accent: string;
  animate: boolean;
  profile: Profile;
  scroll: MotionValue<number>;
}) {
  const group = useRef<THREE.Group>(null);
  const viewport = useThree((state) => state.viewport);
  const { glyphs, width } = letters;

  const [faceMaterial, sideMaterial] = useMemo(() => {
    const color = new THREE.Color(accent);
    // Vernis (clearcoat) réservé aux ordinateurs : c'est le shader le plus lourd de la scène
    const face = profile.lite
      ? new THREE.MeshStandardMaterial({ color, metalness: 1, roughness: 0.2, envMapIntensity: 1.45 })
      : new THREE.MeshPhysicalMaterial({
          color,
          metalness: 1,
          roughness: 0.2,
          clearcoat: 0.5,
          clearcoatRoughness: 0.18,
          envMapIntensity: 1.45,
        });
    const side = new THREE.MeshStandardMaterial({
      color: color.clone().multiplyScalar(0.82),
      metalness: 1,
      roughness: 0.34,
      envMapIntensity: 1.15,
    });
    return [face, side];
  }, [accent, profile.lite]);
  useEffect(
    () => () => {
      faceMaterial.dispose();
      sideMaterial.dispose();
    },
    [faceMaterial, sideMaterial],
  );

  const scale = Math.min(1, (viewport.width * (viewport.aspect < 1 ? 0.9 : 0.68)) / width);

  useSceneFrame((t, delta, state) => {
    const g = group.current;
    if (!g || !animate) return;
    const look = lookTarget(t, state, profile.touch, scroll);
    const targetY = look.x * 0.28;
    const targetX = -look.y * 0.14 + Math.sin(t * 0.35) * 0.04 - look.scroll * 0.55;
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, targetY, 2.2, delta);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, targetX, 2.2, delta);
    g.position.y = Math.sin(t * 0.7) * 0.06;
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

function Halo({ accent, animate, lite }: { accent: string; animate: boolean; lite: boolean }) {
  const a = useRef<THREE.Mesh>(null);
  const b = useRef<THREE.Mesh>(null);
  const viewport = useThree((state) => state.viewport);
  // Anneaux qui encadrent le logo (au-dessus et au-dessous) sans le traverser
  const wide = viewport.aspect >= 1;
  const radius = Math.min(viewport.width * (wide ? 0.4 : 0.5), 5.4);
  // Sur grand écran : plus inclinés et un peu abaissés, l'arc supérieur reste sous la navigation
  const tiltA = wide ? 1.3 : 1.18;
  const tiltB = wide ? 1.38 : 1.3;
  const offsetY = wide ? -radius * 0.05 : 0;
  // Fils très fins : peu de facettes suffisent sur mobile
  const segments = lite ? 150 : 260;
  useSceneFrame((t) => {
    if (!animate) return;
    if (a.current) a.current.rotation.set(tiltA + Math.sin(t * 0.22) * 0.04, Math.sin(t * 0.17) * 0.06, t * 0.05);
    if (b.current) b.current.rotation.set(tiltB + Math.cos(t * 0.18) * 0.04, -0.12 + Math.sin(t * 0.13) * 0.05, -t * 0.04);
  });
  return (
    <group position={[0, offsetY, -1.2]}>
      <mesh ref={a} rotation={[tiltA, 0, 0]}>
        <torusGeometry args={[radius, 0.009, lite ? 6 : 16, segments]} />
        <meshStandardMaterial color={accent} metalness={1} roughness={0.3} emissive={accent} emissiveIntensity={0.22} />
      </mesh>
      <mesh ref={b} rotation={[tiltB, -0.12, 0]}>
        <torusGeometry args={[radius * 1.12, 0.005, lite ? 6 : 12, segments]} />
        <meshStandardMaterial color={accent} metalness={1} roughness={0.4} emissive={accent} emissiveIntensity={0.14} transparent opacity={0.55} />
      </mesh>
    </group>
  );
}

type LogoTexture = { texture: THREE.CanvasTexture | null; failed: boolean };

/** Texture ronde nette à partir du logo importé (PNG, JPG, WebP ou SVG). */
function useLogoTexture(url: string | null): LogoTexture {
  const [logo, setLogo] = useState<LogoTexture>({ texture: null, failed: false });
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
      setLogo({ texture: created, failed: false });
    };
    img.onerror = () => {
      if (!disposed) setLogo({ texture: null, failed: true });
    };
    img.src = url;
    return () => {
      disposed = true;
      created?.dispose();
    };
  }, [url]);
  return logo;
}

type MetalProps = Omit<ThreeElements["meshStandardMaterial"], "ref"> & {
  lite: boolean;
  clearcoat?: number;
  clearcoatRoughness?: number;
};

/** Métal poli : vernis (clearcoat) sur ordinateur, matériau standard plus léger sur mobile. */
function Metal({ lite, clearcoat = 0, clearcoatRoughness = 0.1, ...props }: MetalProps) {
  if (lite || clearcoat === 0) return <meshStandardMaterial {...props} />;
  return <meshPhysicalMaterial {...props} clearcoat={clearcoat} clearcoatRoughness={clearcoatRoughness} />;
}

/** Médaillon doré portant le logo importé par le gérant. */
function Medallion({
  texture,
  accent,
  animate,
  profile,
  scroll,
}: {
  texture: THREE.Texture;
  accent: string;
  animate: boolean;
  profile: Profile;
  scroll: MotionValue<number>;
}) {
  const group = useRef<THREE.Group>(null);
  const viewport = useThree((state) => state.viewport);
  const radius = Math.min(1.5, viewport.height * 0.24, viewport.width * 0.34);
  const { lite } = profile;

  useSceneFrame((t, delta, state) => {
    const g = group.current;
    if (!g || !animate) return;
    const look = lookTarget(t, state, profile.touch, scroll);
    const drift = profile.touch ? 0 : Math.sin(t * 0.5) * 0.25;
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, look.x * 0.45 + drift, 2, delta);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, -look.y * 0.25 + Math.sin(t * 0.37) * 0.06 - look.scroll * 0.5, 2, delta);
    g.position.y = Math.sin(t * 0.8) * 0.08;
  });

  return (
    <group ref={group}>
      {/* Pièce : face avant (logo) orientée vers la caméra ; groupes du cylindre : 0 tranche, 1 dessus, 2 dessous */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[radius, radius, 0.22, lite ? 72 : 128]} />
        <Metal lite={lite} attach="material-0" color={accent} metalness={1} roughness={0.22} clearcoat={0.4} envMapIntensity={1.5} />
        <Metal
          lite={lite}
          attach="material-1"
          map={texture}
          color="#ffffff"
          metalness={0.25}
          roughness={0.45}
          clearcoat={0.8}
          clearcoatRoughness={0.15}
        />
        <Metal lite={lite} attach="material-2" color={accent} metalness={1} roughness={0.22} envMapIntensity={1.5} />
      </mesh>
      <mesh position={[0, 0, 0.1]}>
        <torusGeometry args={[radius, 0.07, lite ? 16 : 32, lite ? 120 : 200]} />
        <Metal lite={lite} color={accent} metalness={1} roughness={0.22} clearcoat={0.4} envMapIntensity={1.5} />
      </mesh>
      <mesh position={[0, 0, 0.12]}>
        <torusGeometry args={[radius * 0.9, 0.012, lite ? 8 : 16, lite ? 120 : 200]} />
        <Metal lite={lite} color={accent} metalness={1} roughness={0.22} envMapIntensity={1.5} />
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

/**
 * Filtre GGX de PMREM, créé d'avance pour être compilé en parallèle.
 * API interne de three.js : si elle change, on s'en passe (compilation classique, bloquante).
 */
function pmremFilterMaterial(pmrem: THREE.PMREMGenerator, size: number): THREE.Material | null {
  const internal = pmrem as unknown as {
    _setSize?: (size: number) => void;
    _allocateTargets?: () => THREE.WebGLRenderTarget;
    _ggxMaterial?: THREE.Material | null;
  };
  if (typeof internal._setSize !== "function" || typeof internal._allocateTargets !== "function") return null;
  internal._setSize(size);
  internal._allocateTargets().dispose();
  return internal._ggxMaterial ?? null;
}

/**
 * Reflets du métal : quelques panneaux lumineux, précalculés une seule fois (PMREM).
 * Les shaders sont d'abord compilés en parallèle (KHR_parallel_shader_compile) : compilés au premier
 * rendu, ils figeaient la page plusieurs centaines de millisecondes sur mobile.
 */
async function buildEnvironment(gl: THREE.WebGLRenderer, size: number) {
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color("#050403");
  for (const panel of PANELS) envScene.add(buildPanel(panel));
  const tilted = new THREE.Group();
  tilted.rotation.set(-Math.PI / 3, 0, 1);
  for (const panel of TILTED_PANELS) tilted.add(buildPanel(panel));
  envScene.add(tilted);

  const pmrem = new THREE.PMREMGenerator(gl);
  // Mêmes programmes que ceux de PMREM : fond uni, filtre GGX, rendu dans une cible linéaire
  const extras = new THREE.Group();
  extras.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial({ side: THREE.BackSide })));
  const ggx = pmremFilterMaterial(pmrem, size);
  if (ggx) extras.add(new THREE.Mesh(new THREE.BufferGeometry(), ggx));
  const camera = new THREE.PerspectiveCamera(90, 1, 0.1, 100);
  const probe = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
  const previous = gl.getRenderTarget();
  gl.setRenderTarget(probe);
  const compiled = Promise.all([gl.compileAsync(envScene, camera), gl.compileAsync(extras, camera, envScene)]);
  gl.setRenderTarget(previous);
  await compiled;

  const target = pmrem.fromScene(envScene, 0, 0.1, 100, { size });
  pmrem.dispose();
  probe.dispose();
  for (const root of [envScene, extras]) {
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      if (object.material !== ggx) (object.material as THREE.Material).dispose();
    });
  }
  return target;
}

/** Applique la carte d'environnement dès qu'elle est prête, puis monte `children`. */
function StudioEnvironment({ size, children }: { size: number; children?: ReactNode }) {
  const gl = useThree((state) => state.gl);
  // null : en préparation ; texture null : échec, la scène s'affiche sans reflets
  const [environment, setEnvironment] = useState<{ texture: THREE.Texture | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    let target: THREE.WebGLRenderTarget | null = null;
    buildEnvironment(gl, size).then(
      (result) => {
        if (cancelled) {
          result.dispose();
          return;
        }
        target = result;
        setEnvironment({ texture: result.texture });
      },
      (error: unknown) => {
        console.warn("Environnement 3D indisponible", error);
        if (!cancelled) setEnvironment({ texture: null });
      },
    );
    return () => {
      cancelled = true;
      target?.dispose();
    };
  }, [gl, size]);

  if (!environment) return null;
  return (
    <>
      {environment.texture && <primitive object={environment.texture} attach="environment" />}
      {children}
    </>
  );
}

/**
 * Compile tous les shaders de la scène en parallèle, sans figer la page. Quand le navigateur sait
 * le faire (KHR_parallel_shader_compile), une image invisible (canevas encore transparent) envoie
 * ensuite les géométries au processeur graphique : la première vraie image n'a plus rien à préparer.
 * Sans cette extension, cette image attendrait la fin de la compilation et figerait la page.
 */
function Precompile({ onReady }: { onReady: () => void }) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);
  const ready = useEffectEvent(onReady);

  useEffect(() => {
    let cancelled = false;
    const done = () => {
      if (cancelled) return;
      if (gl.extensions.has("KHR_parallel_shader_compile")) gl.render(scene, camera);
      ready();
    };
    gl.compileAsync(scene, camera).then(done, done);
    return () => {
      cancelled = true;
    };
  }, [gl, scene, camera]);

  return null;
}

/** Générateur pseudo-aléatoire déterministe (rendu pur, positions stables). */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DUST_VERTEX = /* glsl */ `
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
`;

const DUST_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d) * vAlpha * 0.8;
    if (a < 0.01) discard;
    gl_FragColor = vec4(uColor, a);
  }
`;

/** Poussière d'or : particules scintillantes (un seul appel de rendu, shader minimal). */
function GoldDust({ color, count = 70 }: { color: string; count?: number }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uColor: { value: new THREE.Color(color) }, uPixelRatio: { value: 1 } }), [color]);

  const geometry = useMemo(() => {
    const random = mulberry32(20260929);
    const g = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (random() - 0.5) * 14;
      positions[i * 3 + 1] = (random() - 0.5) * 6;
      positions[i * 3 + 2] = (random() - 0.5) * 5;
      seeds[i] = random();
    }
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    return g;
  }, [count]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useSceneFrame((t, _delta, state) => {
    const material = materialRef.current;
    if (!material) return;
    material.uniforms.uTime.value = t;
    material.uniforms.uPixelRatio.value = state.gl.getPixelRatio();
  });

  return (
    <points geometry={geometry}>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={DUST_VERTEX}
        fragmentShader={DUST_FRAGMENT}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/**
 * Balance lentement l'environnement : les reflets glissent sur le métal (sans recalcul coûteux).
 * Oscillation limitée pour que le panneau principal reste face aux lettres : elles restent dorées.
 */
function EnvironmentSweep({ animate }: { animate: boolean }) {
  useSceneFrame((t, _delta, state) => {
    if (!animate) return;
    state.scene.environmentRotation.set(Math.sin(t * 0.21) * 0.2, Math.sin(t * 0.16) * 0.55, 0);
  });
  return null;
}

function MovingLight({ animate }: { animate: boolean }) {
  const light = useRef<THREE.SpotLight>(null);
  useSceneFrame((t) => {
    if (!light.current || !animate) return;
    light.current.position.set(Math.sin(t * 0.45) * 9, 3 + Math.cos(t * 0.3) * 1.5, 7);
  });
  return <spotLight ref={light} position={[6, 4, 7]} angle={0.55} penumbra={1} intensity={90} color="#fff1d6" />;
}

/**
 * Logo 3D du hero. La scène se prépare pendant l'intro (reflets, shaders compilés en parallèle),
 * puis le rendu démarre quand le rideau est levé ; il s'arrête dès que le hero quitte l'écran.
 */
export default function HeroScene({
  accent,
  active,
  play,
  reduceMotion,
  logoUrl,
  scroll,
  onReady,
}: {
  accent: string;
  active: boolean;
  play: boolean;
  reduceMotion: boolean;
  logoUrl?: string | null;
  /** Progression de la sortie du hero (0 à 1). */
  scroll: MotionValue<number>;
  onReady?: () => void;
}) {
  const [profile] = useState(detectProfile);
  const [ready, setReady] = useState(false);
  const logo = useLogoTexture(logoUrl ?? null);
  // Le médaillon attend son image ; si elle ne se charge pas, on revient au logotype
  const showMedallion = !!logoUrl && !logo.failed;
  const letters = useGlyphs(profile.lite, !showMedallion);
  const animate = !reduceMotion;
  const running = ready && play && active;

  let content: ReactNode = null;
  if (showMedallion && logo.texture) {
    content = <Medallion texture={logo.texture} accent={accent} animate={animate} profile={profile} scroll={scroll} />;
  } else if (!showMedallion && letters) {
    content = <Wordmark letters={letters} accent={accent} animate={animate} profile={profile} scroll={scroll} />;
  }

  return (
    <Canvas
      camera={{ position: [0, 0, 11], fov: 32 }}
      dpr={profile.lite ? [1, 1.5] : [1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      frameloop={!running ? "never" : animate ? "always" : "demand"}
      // Pas de mesure au défilement : elle re-rendait la scène toutes les 50 ms pendant le scroll
      resize={{ scroll: false }}
      aria-hidden
    >
      <ambientLight intensity={0.25} />
      <MovingLight animate={animate} />
      <directionalLight position={[-6, -2, 4]} intensity={0.6} color="#ffd9a0" />
      {content}
      <Halo accent={accent} animate={animate} lite={profile.lite} />
      <EnvironmentSweep animate={animate} />
      {animate && <GoldDust color={accent} count={profile.lite ? 40 : 70} />}
      <StudioEnvironment size={profile.lite ? 128 : 256}>
        {content !== null && (
          <Precompile
            onReady={() => {
              setReady(true);
              onReady?.();
            }}
          />
        )}
      </StudioEnvironment>
    </Canvas>
  );
}
