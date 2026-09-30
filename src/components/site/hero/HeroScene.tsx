"use client";

import { Canvas, useFrame, useThree, type RootState, type ThreeElements } from "@react-three/fiber";
import type { MotionValue } from "motion/react";
import { useEffect, useEffectEvent, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import {
  BADGE_BRANCH,
  BADGE_DISC_R,
  BADGE_MOTTO,
  BADGE_RING,
  BADGE_SIZE,
  BADGE_STARS,
  BADGE_TITLE,
} from "@/lib/brand/badge";

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

/* ------------------------------------------------------------------ */
/* Badge MOODZ en relief : pièce émaillée crème à bord bronze, disque  */
/* olive, anneau, lettres et étoiles olive, branche crème en saillie.  */
/* Repère : unités du badge (carré de 1000), converties à l'échelle.   */
/* ------------------------------------------------------------------ */

const C = BADGE_SIZE / 2;
const BASE_R = 486;

type BadgeMaterial = "base" | "cream" | "olive";
type BadgePart = {
  geometry: THREE.ExtrudeGeometry;
  material: BadgeMaterial;
  /** Position finale en z (unités du badge). */
  z: number;
  /** Profondeur de départ sous la surface : à l'entrée, l'élément émerge de la pièce. */
  lift: number;
  /** Retard d'entrée (s). */
  delay: number;
};

const disposeParts = (parts: BadgePart[]) => parts.forEach((p) => p.geometry.dispose());

function circleShape(r: number) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, r, 0, Math.PI * 2, false);
  return shape;
}

function ringShape(outer: number, inner: number) {
  const shape = circleShape(outer);
  const hole = new THREE.Path();
  hole.absarc(0, 0, inner, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  return shape;
}

/**
 * Construction du badge, par étapes séparées d'une tâche à l'autre : d'un seul bloc, l'extrusion
 * figeait la page sur mobile. Chaque étape rend la main au navigateur.
 */
async function buildBadge(lite: boolean, cancelled: () => boolean): Promise<BadgePart[] | null> {
  const loader = new SVGLoader();
  const parts: BadgePart[] = [];
  const round = lite ? 36 : 56; // facettes des cercles (le double pour un tour complet)
  const bevelSegments = lite ? 2 : 3;

  /** Extrusion ; `svg` : tracé du badge (y vers le bas, origine en haut à gauche). */
  const extrude = (shapes: THREE.Shape | THREE.Shape[], depth: number, bevel: number, curveSegments: number, svg: boolean) => {
    const geometry = new THREE.ExtrudeGeometry(shapes, {
      depth,
      bevelEnabled: bevel > 0,
      bevelThickness: bevel,
      bevelSize: bevel * 0.8,
      bevelOffset: 0,
      bevelSegments,
      curveSegments,
    });
    if (svg) geometry.translate(-C, -C, 0);
    // Rotation plutôt qu'une échelle négative (garde les normales) : face avant vers la caméra
    geometry.rotateX(Math.PI);
    geometry.computeBoundingBox();
    return geometry;
  };
  const svgShapes = (d: string) =>
    loader.parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`).paths.flatMap((p) => p.toShapes());

  /** Pose une pièce en relief : son dos s'enfonce d'une unité sous `surface`. */
  const add = (geometry: THREE.ExtrudeGeometry, material: BadgeMaterial, surface: number, delay: number) => {
    const box = geometry.boundingBox!;
    const thickness = box.max.z - box.min.z;
    parts.push({ geometry, material, z: surface - box.min.z - 1, lift: thickness + 2, delay });
    return surface - 1 + thickness;
  };

  let discTop = 0;
  const steps: Array<() => void> = [
    () => {
      // Pièce : face avant à z = 0
      const base = extrude(circleShape(BASE_R), 34, 12, round, false);
      parts.push({ geometry: base, material: "base", z: -base.boundingBox!.max.z, lift: 0, delay: 0 });
      discTop = add(extrude(circleShape(BADGE_DISC_R), 9, 3, round, false), "olive", 0, 0.35);
      const ring = BADGE_RING.width * 0.65;
      add(extrude(ringShape(BADGE_RING.r + ring, BADGE_RING.r - ring), 6, 2, round, false), "olive", 0, 0.5);
    },
    () => BADGE_TITLE.forEach((g, i) => add(extrude(svgShapes(g.d), 6, 2, lite ? 5 : 8, true), "olive", 0, 0.95 + i * 0.05)),
    () => BADGE_MOTTO.forEach((g, i) => add(extrude(svgShapes(g.d), 6, 2, lite ? 5 : 8, true), "olive", 0, 1.2 + i * 0.035)),
    () => {
      BADGE_BRANCH.forEach((b, i) => add(extrude(svgShapes(b.d), 6, 2.5, lite ? 6 : 10, true), "cream", discTop, 0.7 + i * 0.06));
      BADGE_STARS.forEach((d, i) => add(extrude(svgShapes(d), 6, 2, 2, true), "olive", 0, 1.75 + i * 0.1));
    },
  ];
  for (const step of steps) {
    await yieldToMain();
    if (cancelled()) {
      disposeParts(parts);
      return null;
    }
    step();
  }
  return parts;
}

/** Pièces du badge, prêtes de façon asynchrone (null tant qu'elles se préparent ou si inutiles). */
function useBadgeParts(lite: boolean, enabled: boolean): BadgePart[] | null {
  const [parts, setParts] = useState<BadgePart[] | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let built: BadgePart[] | null = null;
    buildBadge(lite, () => cancelled).then((result) => {
      if (!result) return;
      if (cancelled) {
        disposeParts(result);
        return;
      }
      built = result;
      setParts(result);
    });
    return () => {
      cancelled = true;
      if (built) disposeParts(built);
    };
  }, [lite, enabled]);
  return enabled ? parts : null;
}

const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

const CAMERA_Z = 11;

/**
 * Place du badge dans la vue (unités 3D, plan z = 0) : 80 % de la largeur sur téléphone, borné
 * par la hauteur sur grand écran, et remonté pour laisser la place aux textes du bas du hero.
 */
function useBadgeLayout() {
  const viewport = useThree((state) => state.viewport);
  const diameter = Math.min(viewport.width * (viewport.aspect < 1 ? 0.8 : 0.5), viewport.height * 0.52);
  return { diameter, lift: viewport.height * 0.075, wide: viewport.aspect >= 1 };
}

/** Un élément du badge : à l'entrée, il sort de la pièce (de `lift` sous la surface). */
function Piece({ part, material, animate }: { part: BadgePart; material: THREE.Material | THREE.Material[]; animate: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  const start = useRef<number | null>(null);
  useSceneFrame((t) => {
    const mesh = ref.current;
    if (!mesh || !part.lift) return;
    if (!animate) {
      mesh.position.z = part.z;
      return;
    }
    start.current ??= t;
    const p = easeOutExpo(Math.min(1, Math.max(0, t - start.current - part.delay) / 0.9));
    mesh.position.z = part.z - (1 - p) * part.lift;
  });
  return <mesh ref={ref} geometry={part.geometry} material={material} position={[0, 0, part.lift && animate ? part.z - part.lift : part.z]} />;
}

function BadgeModel({
  parts,
  animate,
  profile,
  scroll,
}: {
  parts: BadgePart[];
  animate: boolean;
  profile: Profile;
  scroll: MotionValue<number>;
}) {
  const group = useRef<THREE.Group>(null);
  const start = useRef<number | null>(null);
  const { diameter, lift } = useBadgeLayout();

  const materials = useMemo(() => {
    const cream = new THREE.Color("#f2f0df");
    const olive = new THREE.Color("#6f891d");
    // Émail verni (clearcoat) sur ordinateur ; matériau standard, plus léger, sur mobile
    const enamel = (color: THREE.Color, roughness: number) =>
      profile.lite
        ? new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.05, envMapIntensity: 1.1 })
        : new THREE.MeshPhysicalMaterial({ color, roughness, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 1.05 });
    const creamEnamel = enamel(cream, 0.38);
    const oliveEnamel = enamel(olive, 0.3);
    const bronze = new THREE.MeshStandardMaterial({ color: "#b89f58", metalness: 1, roughness: 0.3, envMapIntensity: 1.6 });
    return { creamEnamel, oliveEnamel, bronze };
  }, [profile.lite]);
  useEffect(
    () => () => {
      materials.creamEnamel.dispose();
      materials.oliveEnamel.dispose();
      materials.bronze.dispose();
    },
    [materials],
  );

  const scale = diameter / (BASE_R * 2);

  useSceneFrame((t, delta, state) => {
    const g = group.current;
    if (!g) return;
    if (!animate) {
      g.rotation.set(0, 0, 0);
      g.position.y = lift;
      return;
    }
    start.current ??= t;
    // Entrée : la pièce pivote depuis la tranche et grandit légèrement
    const e = easeOutExpo(Math.min(1, (t - start.current) / 1.8));
    const look = lookTarget(t, state, profile.touch, scroll);
    const targetY = look.x * 0.32 - (1 - e) * 1.35;
    const targetX = -look.y * 0.18 + Math.sin(t * 0.35) * 0.04 - look.scroll * 0.6;
    g.rotation.y = e < 1 ? targetY : THREE.MathUtils.damp(g.rotation.y, targetY, 2.2, delta);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, targetX, 2.2, delta);
    g.position.y = lift + Math.sin(t * 0.7) * 0.05;
    g.scale.setScalar(scale * (0.82 + 0.18 * e));
  });

  return (
    <group ref={group} scale={scale} position={[0, lift, 0]}>
      {parts.map((part, i) => (
        <Piece
          key={i}
          part={part}
          animate={animate}
          material={
            part.material === "base"
              ? [materials.creamEnamel, materials.bronze]
              : part.material === "cream"
                ? materials.creamEnamel
                : materials.oliveEnamel
          }
        />
      ))}
    </group>
  );
}

function Halo({ accent, animate, lite }: { accent: string; animate: boolean; lite: boolean }) {
  const a = useRef<THREE.Mesh>(null);
  const b = useRef<THREE.Mesh>(null);
  const { diameter, lift, wide } = useBadgeLayout();
  // Orbites derrière le badge, jamais devant : reculées d'un rayon, et agrandies d'autant pour
  // dépasser de part et d'autre (demi-grand axe apparent : 1,55 rayon du badge)
  const apparent = diameter * 0.78;
  const radius = (apparent * (CAMERA_Z + 0.2)) / (CAMERA_Z - apparent);
  const back = radius + 0.2;
  const tiltA = wide ? 1.3 : 1.18;
  const tiltB = wide ? 1.38 : 1.3;
  // Fils très fins : peu de facettes suffisent sur mobile
  const segments = lite ? 150 : 260;
  useSceneFrame((t) => {
    if (!animate) return;
    if (a.current) a.current.rotation.set(tiltA + Math.sin(t * 0.22) * 0.04, Math.sin(t * 0.17) * 0.06, t * 0.05);
    if (b.current) b.current.rotation.set(tiltB + Math.cos(t * 0.18) * 0.04, -0.12 + Math.sin(t * 0.13) * 0.05, -t * 0.04);
  });
  return (
    <group position={[0, lift, -back]}>
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
      bg.addColorStop(0, "#182010");
      bg.addColorStop(1, "#0a0d06");
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

/** Poussière lumineuse : particules scintillantes (un seul appel de rendu, shader minimal). */
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
  const badge = useBadgeParts(profile.lite, !showMedallion);
  const animate = !reduceMotion;
  const running = ready && play && active;
  // Anneaux et poussière : l'accent éclairci vers le crème du logo, pour rester visibles sur l'olive profond
  const glow = useMemo(() => `#${new THREE.Color(accent).lerp(new THREE.Color("#f5f3e3"), 0.45).getHexString()}`, [accent]);

  let content: ReactNode = null;
  if (showMedallion && logo.texture) {
    content = <Medallion texture={logo.texture} accent={accent} animate={animate} profile={profile} scroll={scroll} />;
  } else if (!showMedallion && badge) {
    content = <BadgeModel parts={badge} animate={animate} profile={profile} scroll={scroll} />;
  }

  return (
    <Canvas
      camera={{ position: [0, 0, CAMERA_Z], fov: 32 }}
      dpr={profile.lite ? [1, 1.35] : [1, 1.75]}
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
      <Halo accent={glow} animate={animate} lite={profile.lite} />
      <EnvironmentSweep animate={animate} />
      {animate && <GoldDust color={glow} count={profile.lite ? 40 : 70} />}
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
