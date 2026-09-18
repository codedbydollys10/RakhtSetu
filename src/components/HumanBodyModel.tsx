import React, { useRef, useMemo, Component, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, useGLTF, Center } from '@react-three/drei';
import * as THREE from 'three';

// ============================================================
// DATA & TYPES
// ============================================================
export interface OrganInfo {
  id: string;
  name: string;
  position: [number, number, number];
  color: string;
  glowColor: string;
  description: string;
  stats: { label: string; value: string }[];
  impact: string;
  icon: string;
  volume: string;
}

// CALIBRATED ANATOMICAL COORDINATES
export const ORGANS_LIST: OrganInfo[] = [
  {
    id: 'heart',
    name: 'Heart',
    position: [0.08, 0.95, 0.12], // Anatomical left-center chest
    color: '#ef4444',
    glowColor: '#f87171',
    description: 'The primary central muscular pump propelling blood across 100,000 km of vascular networks.',
    stats: [
      { label: 'CARDIAC OUTPUT', value: '5.0 L / min' },
      { label: 'PULSE RATE', value: '72 BPM (Resting)' }
    ],
    volume: '5.0 L',
    impact: 'Critical — Transfused whole blood and packed RBCs sustain coronary perfusion and prevent cardiogenic shock.',
    icon: '🫀',
  },
  {
    id: 'brain',
    name: 'Brain',
    position: [0, 2.05, 0.04], // Inside cranial cavity
    color: '#06b6d4',
    glowColor: '#38bdf8',
    description: 'The master neural control center consuming 20% of total body oxygen and glucose supply.',
    stats: [
      { label: 'OXYGEN DEMAND', value: '20% Total Body' },
      { label: 'ANOXIC TOLERANCE', value: '< 4 Minutes' }
    ],
    volume: '750 mL',
    impact: 'Irreversible cerebral damage occurs within 4 minutes without adequate oxygen-carrying hemoglobin.',
    icon: '🧠',
  },
  {
    id: 'lungs',
    name: 'Lungs & Pulmonary Circuit',
    position: [0, 0.98, -0.02], // Center thoracic cavity flanking heart
    color: '#0ea5e9',
    glowColor: '#22d3ee',
    description: 'Bilateral respiratory lobes facilitating continuous alveolar gas exchange to oxygenate venous return.',
    stats: [
      { label: 'O2 SATURATION', value: '98 - 100%' },
      { label: 'ALVEOLAR AREA', value: '~100 m²' }
    ],
    volume: '6.0 L',
    impact: 'Requires donor red cells with high oxygen affinity to maintain essential tissue respiration.',
    icon: '🫁',
  },
  {
    id: 'liver',
    name: 'Liver',
    position: [-0.2, 0.45, 0.1], // Right upper hypochondrium
    color: '#6366f1',
    glowColor: '#818cf8',
    description: 'Metabolic powerhouse synthesizing clotting factors, albumin, and detoxifying circulating plasma.',
    stats: [
      { label: 'COAGULATION', value: 'Factor Synthesis' },
      { label: 'HEPATIC FLOW', value: '1.5 L / min' }
    ],
    volume: '1.5 L',
    impact: 'Fresh Frozen Plasma (FFP) donations replace life-saving clotting factors synthesized by hepatocytes.',
    icon: '🪵',
  },
  {
    id: 'kidneys',
    name: 'Kidneys',
    position: [0, 0.2, -0.12], // Bilateral posterior lumbar
    color: '#8b5cf6',
    glowColor: '#a78bfa',
    description: 'Filters blood plasma, regulates arterial blood pressure, and secretes erythropoietin (EPO).',
    stats: [
      { label: 'FILTRATION RATE', value: '125 mL / min' },
      { label: 'DAILY FILTERED', value: '180 Litres' }
    ],
    volume: '300 mL',
    impact: 'Maintains fluid volume and electrolyte equilibrium during acute traumatic hemorrhage.',
    icon: '🫘',
  },
  {
    id: 'marrow',
    name: 'Bone Marrow (Femurs)',
    position: [-0.32, -0.85, 0.05], // Inside right femoral shaft
    color: '#10b981',
    glowColor: '#34d399',
    description: 'The core hematopoietic factory generating red blood cells, platelets, and leukocytes continually.',
    stats: [
      { label: 'RBC PRODUCTION', value: '2.4M cells / sec' },
      { label: 'PLATELET COUNT', value: '150-400k / µL' }
    ],
    volume: '0.5 L',
    impact: 'Platelet and stem cell donations directly sustain cancer patients undergoing marrow suppression.',
    icon: '🦴',
  },
];

export interface HumanBodyModelProps {
  mode: 'normal' | 'blood';
  selectedOrganId: string;
  onSelectOrgan: (id: string) => void;
  modelUrl?: string;
}

// ============================================================
// SCI-FI HOLOGRAPHIC DIAGNOSTIC SCANNER BEAM
// ============================================================
function DiagnosticScannerPlane() {
  const scanRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (scanRef.current) {
      scanRef.current.position.y = 0.5 + Math.sin(clock.elapsedTime * 1.4) * 1.7;
    }
  });

  return (
    <group ref={scanRef}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.9, 1.05, 48]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.4} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.9, 32]} />
        <meshBasicMaterial color="#06b6d4" transparent opacity={0.06} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

// ============================================================
// SCI-FI HUD OVERLAYS
// ============================================================
function HUDOverlays({ mode }: { mode: 'normal' | 'blood' }) {
  return (
    <>
      <Html position={[-2.4, 2.0, 0]} center className="pointer-events-none hidden md:block select-none">
        <div className="w-52 rounded-xl border border-cyan-400/40 bg-[#031A36]/85 p-3 font-mono text-xs text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.25)] backdrop-blur-md">
          <div className="mb-2 flex items-center justify-between border-b border-cyan-400/30 pb-1.5 font-bold tracking-widest text-cyan-200">
            <span>HEMO-SCAN v4.2</span>
            <span className="h-2 w-2 animate-ping rounded-full bg-cyan-400"></span>
          </div>
          <div className="flex justify-between py-0.5 text-[11px] text-cyan-100/90">
            <span>PHYSIOLOGY:</span>
            <b className="text-emerald-400">OPTIMIZED</b>
          </div>
          <div className="flex justify-between py-0.5 text-[11px] text-cyan-100/90">
            <span>HEART RATE:</span>
            <span className="font-bold text-red-400">72 BPM</span>
          </div>
          <div className="flex justify-between py-0.5 text-[11px] text-cyan-100/90">
            <span>BLOOD VOLUME:</span>
            <span className="font-bold text-cyan-200">5.0 L (100%)</span>
          </div>
          <div className="flex justify-between py-0.5 text-[11px] text-cyan-100/90">
            <span>O2 SATURATION:</span>
            <span className="font-bold text-cyan-300">99%</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-cyan-950">
            <div className="h-full w-[94%] bg-gradient-to-r from-cyan-500 to-emerald-400 animate-pulse"></div>
          </div>
        </div>
      </Html>

      <Html position={[2.4, 1.6, 0]} center className="pointer-events-none hidden md:block select-none">
        <div className="w-48 rounded-xl border border-cyan-400/40 bg-[#031A36]/85 p-3 font-mono text-xs text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.25)] backdrop-blur-md">
          <div className="mb-2 border-b border-cyan-400/30 pb-1.5 font-bold tracking-widest text-cyan-200">
            {mode === 'blood' ? 'HEMODYNAMICS' : 'SYSTEM STATUS'}
          </div>
          <div className="space-y-1 text-[11px] text-cyan-100/80">
            <div className="flex justify-between">
              <span>ACTIVE CIRCUIT:</span>
              <span className={mode === 'blood' ? 'text-red-400 font-bold' : 'text-cyan-300'}>
                {mode === 'blood' ? 'PULSATILE' : 'RESTING'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>VESSEL INTEGRITY:</span>
              <span className="text-emerald-400 font-bold">100%</span>
            </div>
            <div className="flex justify-between">
              <span>HEMATOCRIT:</span>
              <span>45% (Normal)</span>
            </div>
          </div>
          <div className="mt-2 flex h-6 items-end gap-1">
            <div className="h-full w-1/5 rounded-t bg-cyan-400/80 animate-pulse"></div>
            <div className="h-2/3 w-1/5 rounded-t bg-cyan-400/60"></div>
            <div className="h-5/6 w-1/5 rounded-t bg-cyan-400/80 animate-pulse"></div>
            <div className="h-1/2 w-1/5 rounded-t bg-cyan-400/50"></div>
            <div className="h-full w-1/5 rounded-t bg-cyan-400/90 animate-pulse"></div>
          </div>
        </div>
      </Html>
    </>
  );
}

// ============================================================
// HIGH-PRECISION PROCEDURAL HOLOGRAPHIC ANATOMY MANNEQUIN
// ============================================================
function HolographicAnatomyMannequin({ mode }: { mode: 'normal' | 'blood' }) {
  const isBlood = mode === 'blood';

  const skinMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#06b6d4',
        emissive: '#0891b2',
        emissiveIntensity: isBlood ? 0.08 : 0.25,
        transparent: true,
        opacity: isBlood ? 0.05 : 0.12,
        roughness: 0.15,
        metalness: 0.1,
        transmission: 0.9,
        thickness: 0.6,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [isBlood]
  );

  const wireMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#22d3ee',
        transparent: true,
        opacity: isBlood ? 0.04 : 0.14,
        wireframe: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [isBlood]
  );

  const boneMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#38bdf8',
        emissive: '#0284c7',
        emissiveIntensity: isBlood ? 0.35 : 1.1,
        roughness: 0.3,
        metalness: 0.2,
        transparent: true,
        opacity: isBlood ? 0.25 : 0.75,
      }),
    [isBlood]
  );

  const jointMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#67e8f9',
        transparent: true,
        opacity: isBlood ? 0.3 : 0.8,
        blending: THREE.AdditiveBlending,
      }),
    [isBlood]
  );

  return (
    <group position={[0, 0, 0]}>
      {/* ----------------- 1. HEAD & SKULL ----------------- */}
      <mesh position={[0, 2.05, 0]} material={skinMaterial}>
        <sphereGeometry args={[0.38, 32, 32]} />
      </mesh>
      <mesh position={[0, 2.05, 0]} material={wireMaterial} scale={1.02}>
        <sphereGeometry args={[0.38, 20, 20]} />
      </mesh>
      <mesh position={[0, 2.05, 0]} material={boneMaterial}>
        <sphereGeometry args={[0.3, 20, 20]} />
      </mesh>
      <mesh position={[0, 1.82, 0.08]} rotation={[0.2, 0, 0]} material={skinMaterial}>
        <coneGeometry args={[0.22, 0.28, 16]} />
      </mesh>
      <mesh position={[0, 1.82, 0.07]} rotation={[0.2, 0, 0]} material={boneMaterial}>
        <coneGeometry args={[0.16, 0.24, 12]} />
      </mesh>

      {/* ----------------- 2. NECK & CERVICAL SPINE ----------------- */}
      <mesh position={[0, 1.58, 0]} material={skinMaterial}>
        <cylinderGeometry args={[0.15, 0.18, 0.32, 24]} />
      </mesh>
      <mesh position={[0, 1.58, 0]} material={wireMaterial} scale={1.03}>
        <cylinderGeometry args={[0.15, 0.18, 0.32, 16]} />
      </mesh>
      <mesh position={[0, 1.58, -0.02]} material={boneMaterial}>
        <cylinderGeometry args={[0.06, 0.06, 0.3, 10]} />
      </mesh>

      {/* ----------------- 3. SPINAL COLUMN ----------------- */}
      <mesh position={[0, 0.72, -0.1]} material={boneMaterial}>
        <cylinderGeometry args={[0.055, 0.065, 1.45, 12]} />
      </mesh>
      {Array.from({ length: 12 }).map((_, i) => (
        <mesh key={`vert-${i}`} position={[0, 1.4 - i * 0.11, -0.1]} material={boneMaterial}>
          <cylinderGeometry args={[0.08, 0.08, 0.035, 12]} />
        </mesh>
      ))}

      {/* ----------------- 4. CLAVICLES & SHOULDERS ----------------- */}
      <mesh position={[-0.32, 1.34, 0.03]} rotation={[0, 0, 0.1]} material={boneMaterial}>
        <cylinderGeometry args={[0.035, 0.03, 0.62, 8]} />
      </mesh>
      <mesh position={[0.32, 1.34, 0.03]} rotation={[0, 0, -0.1]} material={boneMaterial}>
        <cylinderGeometry args={[0.035, 0.03, 0.62, 8]} />
      </mesh>
      <mesh position={[-0.68, 1.32, 0]} material={jointMaterial}>
        <sphereGeometry args={[0.12, 16, 16]} />
      </mesh>
      <mesh position={[0.68, 1.32, 0]} material={jointMaterial}>
        <sphereGeometry args={[0.12, 16, 16]} />
      </mesh>

      {/* ----------------- 5. THORACIC RIBCAGE & STERNUM ----------------- */}
      <mesh position={[0, 1.0, 0.24]} material={boneMaterial}>
        <boxGeometry args={[0.07, 0.55, 0.03]} />
      </mesh>
      {Array.from({ length: 8 }).map((_, i) => {
        const y = 1.32 - i * 0.09;
        const widthRadius = 0.36 + Math.sin(i * 0.38) * 0.12;
        return (
          <mesh key={`rib-${i}`} position={[0, y, 0.04]} rotation={[Math.PI / 2, 0, 0]} material={boneMaterial}>
            <torusGeometry args={[widthRadius, 0.02, 8, 32, Math.PI * 1.9]} />
          </mesh>
        );
      })}

      <mesh position={[0, 1.0, 0.02]} material={skinMaterial}>
        <cylinderGeometry args={[0.54, 0.44, 0.76, 28]} />
      </mesh>
      <mesh position={[0, 1.0, 0.02]} material={wireMaterial} scale={1.02}>
        <cylinderGeometry args={[0.54, 0.44, 0.76, 20]} />
      </mesh>
      <mesh position={[0, 0.42, 0.01]} material={skinMaterial}>
        <cylinderGeometry args={[0.44, 0.46, 0.52, 28]} />
      </mesh>
      <mesh position={[0, 0.42, 0.01]} material={wireMaterial} scale={1.02}>
        <cylinderGeometry args={[0.44, 0.46, 0.52, 20]} />
      </mesh>

      {/* ----------------- 6. PELVIC GIRDLE ----------------- */}
      <mesh position={[0, -0.05, 0]} material={skinMaterial}>
        <sphereGeometry args={[0.48, 24, 16]} />
      </mesh>
      <mesh position={[0, -0.05, 0]} material={wireMaterial} scale={1.02}>
        <sphereGeometry args={[0.48, 18, 14]} />
      </mesh>
      <mesh position={[-0.26, -0.02, 0.02]} rotation={[0.2, 0.3, 0.2]} material={boneMaterial}>
        <torusGeometry args={[0.22, 0.04, 8, 20, Math.PI * 1.2]} />
      </mesh>
      <mesh position={[0.26, -0.02, 0.02]} rotation={[0.2, -0.3, -0.2]} material={boneMaterial}>
        <torusGeometry args={[0.22, 0.04, 8, 20, Math.PI * 1.2]} />
      </mesh>
      <mesh position={[0, -0.12, -0.08]} rotation={[0.4, 0, 0]} material={boneMaterial}>
        <cylinderGeometry args={[0.1, 0.04, 0.25, 8]} />
      </mesh>

      {/* ----------------- 7. UPPER LIMBS (ARMS) ----------------- */}
      <mesh position={[-0.78, 0.95, 0]} rotation={[0, 0, 0.12]} material={skinMaterial}>
        <cylinderGeometry args={[0.11, 0.09, 0.65, 16]} />
      </mesh>
      <mesh position={[-0.78, 0.95, 0]} rotation={[0, 0, 0.12]} material={boneMaterial}>
        <cylinderGeometry args={[0.04, 0.035, 0.62, 8]} />
      </mesh>
      <mesh position={[-0.82, 0.6, 0]} material={jointMaterial}>
        <sphereGeometry args={[0.07, 12, 12]} />
      </mesh>
      <mesh position={[-0.86, 0.25, 0.03]} rotation={[0, 0, 0.08]} material={skinMaterial}>
        <cylinderGeometry args={[0.085, 0.065, 0.6, 16]} />
      </mesh>
      <mesh position={[-0.86, 0.25, 0.03]} rotation={[0, 0, 0.08]} material={boneMaterial}>
        <cylinderGeometry args={[0.03, 0.025, 0.58, 8]} />
      </mesh>
      <mesh position={[-0.88, -0.12, 0.05]} material={boneMaterial}>
        <boxGeometry args={[0.08, 0.14, 0.04]} />
      </mesh>

      <mesh position={[0.78, 0.95, 0]} rotation={[0, 0, -0.12]} material={skinMaterial}>
        <cylinderGeometry args={[0.11, 0.09, 0.65, 16]} />
      </mesh>
      <mesh position={[0.78, 0.95, 0]} rotation={[0, 0, -0.12]} material={boneMaterial}>
        <cylinderGeometry args={[0.04, 0.035, 0.62, 8]} />
      </mesh>
      <mesh position={[0.82, 0.6, 0]} material={jointMaterial}>
        <sphereGeometry args={[0.07, 12, 12]} />
      </mesh>
      <mesh position={[0.86, 0.25, 0.03]} rotation={[0, 0, -0.08]} material={skinMaterial}>
        <cylinderGeometry args={[0.085, 0.065, 0.6, 16]} />
      </mesh>
      <mesh position={[0.86, 0.25, 0.03]} rotation={[0, 0, -0.08]} material={boneMaterial}>
        <cylinderGeometry args={[0.03, 0.025, 0.58, 8]} />
      </mesh>
      <mesh position={[0.88, -0.12, 0.05]} material={boneMaterial}>
        <boxGeometry args={[0.08, 0.14, 0.04]} />
      </mesh>

      {/* ----------------- 8. LOWER LIMBS (LEGS) ----------------- */}
      <mesh position={[-0.32, -0.65, 0.02]} rotation={[0, 0, 0.05]} material={skinMaterial}>
        <cylinderGeometry args={[0.17, 0.13, 0.95, 20]} />
      </mesh>
      <mesh position={[-0.32, -0.65, 0.02]} rotation={[0, 0, 0.05]} material={wireMaterial} scale={1.02}>
        <cylinderGeometry args={[0.17, 0.13, 0.95, 14]} />
      </mesh>
      <mesh position={[-0.32, -0.65, 0.02]} rotation={[0, 0, 0.05]} material={boneMaterial}>
        <cylinderGeometry args={[0.06, 0.05, 0.92, 10]} />
      </mesh>
      <mesh position={[-0.34, -1.16, 0.04]} material={jointMaterial}>
        <sphereGeometry args={[0.09, 14, 14]} />
      </mesh>
      <mesh position={[-0.34, -1.6, 0.03]} material={skinMaterial}>
        <cylinderGeometry args={[0.12, 0.09, 0.85, 18]} />
      </mesh>
      <mesh position={[-0.34, -1.6, 0.03]} material={boneMaterial}>
        <cylinderGeometry args={[0.05, 0.04, 0.82, 10]} />
      </mesh>
      <mesh position={[-0.34, -2.08, 0.12]} material={boneMaterial}>
        <boxGeometry args={[0.12, 0.08, 0.26]} />
      </mesh>

      <mesh position={[0.32, -0.65, 0.02]} rotation={[0, 0, -0.05]} material={skinMaterial}>
        <cylinderGeometry args={[0.17, 0.13, 0.95, 20]} />
      </mesh>
      <mesh position={[0.32, -0.65, 0.02]} rotation={[0, 0, -0.05]} material={wireMaterial} scale={1.02}>
        <cylinderGeometry args={[0.17, 0.13, 0.95, 14]} />
      </mesh>
      <mesh position={[0.32, -0.65, 0.02]} rotation={[0, 0, -0.05]} material={boneMaterial}>
        <cylinderGeometry args={[0.06, 0.05, 0.92, 10]} />
      </mesh>
      <mesh position={[0.34, -1.16, 0.04]} material={jointMaterial}>
        <sphereGeometry args={[0.09, 14, 14]} />
      </mesh>
      <mesh position={[0.34, -1.6, 0.03]} material={skinMaterial}>
        <cylinderGeometry args={[0.12, 0.09, 0.85, 18]} />
      </mesh>
      <mesh position={[0.34, -1.6, 0.03]} material={boneMaterial}>
        <cylinderGeometry args={[0.05, 0.04, 0.82, 10]} />
      </mesh>
      <mesh position={[0.34, -2.08, 0.12]} material={boneMaterial}>
        <boxGeometry args={[0.12, 0.08, 0.26]} />
      </mesh>
    </group>
  );
}

// ============================================================
// ANIMATED VITAL ORGANS
// ============================================================
function DynamicOrganGeometry({
  organ,
  isSelected,
  mode,
  onSelect,
}: {
  organ: OrganInfo;
  isSelected: boolean;
  mode: 'normal' | 'blood';
  onSelect: () => void;
}) {
  const meshRef = useRef<THREE.Group>(null);
  const isBlood = mode === 'blood';

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.elapsedTime;

    if (organ.id === 'heart') {
      const beatCycle = t * 4.5;
      const beat = Math.pow(Math.sin(beatCycle), 12) * 0.22 + Math.pow(Math.sin(beatCycle - 0.35), 12) * 0.12;
      meshRef.current.scale.setScalar((isSelected ? 1.25 : 1.0) + beat);
    } else if (organ.id === 'lungs') {
      const resp = Math.sin(t * 1.5) * 0.08;
      meshRef.current.scale.set(1 + resp, 1 + resp * 0.8, 1 + resp * 1.1);
    } else {
      const pulse = Math.sin(t * 2.0 + organ.position[1]) * 0.04;
      meshRef.current.scale.setScalar(isSelected ? 1.25 : 1.0 + pulse);
    }
  });

  return (
    <group position={organ.position}>
      <group
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
      >
        {organ.id === 'heart' ? (
          <group>
            <mesh position={[-0.03, -0.02, 0]}>
              <sphereGeometry args={[0.13, 24, 24]} />
              <meshStandardMaterial
                color={isSelected ? '#ffffff' : '#ef4444'}
                emissive="#f87171"
                emissiveIntensity={isSelected ? 3.0 : 1.6}
                roughness={0.2}
              />
            </mesh>
            <mesh position={[0.04, 0.02, 0.02]}>
              <sphereGeometry args={[0.11, 24, 24]} />
              <meshStandardMaterial
                color={isSelected ? '#ffffff' : '#dc2626'}
                emissive="#ef4444"
                emissiveIntensity={isSelected ? 3.0 : 1.6}
                roughness={0.2}
              />
            </mesh>
            <mesh position={[0, 0.12, 0]} rotation={[0, 0, -0.2]}>
              <cylinderGeometry args={[0.04, 0.04, 0.14, 12]} />
              <meshStandardMaterial color="#fca5a5" emissive="#ef4444" emissiveIntensity={1.4} />
            </mesh>
          </group>
        ) : organ.id === 'lungs' ? (
          <group>
            <mesh position={[-0.24, 0, 0]}>
              <capsuleGeometry args={[0.13, 0.28, 12, 18]} />
              <meshStandardMaterial
                color={isSelected ? '#ffffff' : '#0284c7'}
                emissive="#38bdf8"
                emissiveIntensity={isSelected ? 2.5 : 1.2}
                transparent
                opacity={0.85}
              />
            </mesh>
            <mesh position={[0.24, 0, 0]}>
              <capsuleGeometry args={[0.12, 0.26, 12, 18]} />
              <meshStandardMaterial
                color={isSelected ? '#ffffff' : '#0284c7'}
                emissive="#38bdf8"
                emissiveIntensity={isSelected ? 2.5 : 1.2}
                transparent
                opacity={0.85}
              />
            </mesh>
          </group>
        ) : organ.id === 'liver' ? (
          <mesh rotation={[0.1, -0.3, 0.2]}>
            <coneGeometry args={[0.22, 0.28, 16]} />
            <meshStandardMaterial
              color={isSelected ? '#ffffff' : '#6366f1'}
              emissive="#818cf8"
              emissiveIntensity={isSelected ? 2.5 : 1.3}
              roughness={0.25}
            />
          </mesh>
        ) : organ.id === 'kidneys' ? (
          <group>
            <mesh position={[-0.18, 0, 0]} rotation={[0.2, 0.3, 0]}>
              <sphereGeometry args={[0.09, 16, 16]} />
              <meshStandardMaterial
                color={isSelected ? '#ffffff' : '#8b5cf6'}
                emissive="#a78bfa"
                emissiveIntensity={isSelected ? 2.5 : 1.3}
              />
            </mesh>
            <mesh position={[0.18, 0, 0]} rotation={[0.2, -0.3, 0]}>
              <sphereGeometry args={[0.09, 16, 16]} />
              <meshStandardMaterial
                color={isSelected ? '#ffffff' : '#8b5cf6'}
                emissive="#a78bfa"
                emissiveIntensity={isSelected ? 2.5 : 1.3}
              />
            </mesh>
          </group>
        ) : (
          <mesh>
            <sphereGeometry args={[isSelected ? 0.16 : 0.13, 32, 32]} />
            <meshStandardMaterial
              color={isSelected ? '#ffffff' : organ.color}
              emissive={organ.glowColor}
              emissiveIntensity={isSelected ? 2.8 : 1.4}
              roughness={0.2}
            />
          </mesh>
        )}

        <mesh>
          <sphereGeometry args={[isSelected ? 0.32 : 0.2, 16, 16]} />
          <meshBasicMaterial
            color={organ.glowColor}
            transparent
            opacity={isSelected ? 0.6 : isBlood ? 0.3 : 0.18}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>

      {(isSelected || isBlood) && (
        <Html distanceFactor={8} position={[0, 0.35, 0]} center zIndexRange={[100, 0]}>
          <div
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className={`cursor-pointer whitespace-nowrap rounded-lg px-3 py-1.5 font-mono text-[11px] font-bold tracking-widest transition-all shadow-xl backdrop-blur-md border ${isSelected
                ? 'bg-[#031A36]/90 text-white border-cyan-400 ring-2 ring-cyan-400/40'
                : 'bg-black/70 text-cyan-300 border-white/20 hover:border-cyan-400'
              }`}
          >
            <span className="mr-1.5 text-base">{organ.icon}</span>
            <span>{organ.name.toUpperCase()}</span>
            <span className="ml-2 text-[9px] text-cyan-400">[{organ.volume}]</span>
          </div>
        </Html>
      )}
    </group>
  );
}

// ============================================================
// DYNAMIC CIRCULATORY VASCULAR SYSTEM
// ============================================================
function CirculatoryVascularSystem() {
  const pointsRef = useRef<THREE.Points>(null);
  const particleCount = 1200;

  const { positions, curves, particleData, colors } = useMemo(() => {
    const heartVec = new THREE.Vector3(0.08, 0.95, 0.12);

    const endpoints = [
      { vec: new THREE.Vector3(0, 2.0, 0.04), name: 'brain', spread: 0.12 },
      { vec: new THREE.Vector3(-0.24, 0.98, -0.02), name: 'r_lung', spread: 0.08 },
      { vec: new THREE.Vector3(0.24, 0.98, -0.02), name: 'l_lung', spread: 0.08 },
      { vec: new THREE.Vector3(-0.2, 0.45, 0.1), name: 'liver', spread: 0.08 },
      { vec: new THREE.Vector3(-0.18, 0.2, -0.12), name: 'r_kidney', spread: 0.06 },
      { vec: new THREE.Vector3(0.18, 0.2, -0.12), name: 'l_kidney', spread: 0.06 },
      { vec: new THREE.Vector3(-0.25, -0.85, 0.05), name: 'r_femur', spread: 0.1 },
      { vec: new THREE.Vector3(0.25, -0.85, 0.05), name: 'l_femur', spread: 0.1 },
      { vec: new THREE.Vector3(-0.55, -0.2, 0.05), name: 'l_hand', spread: 0.1 },
      { vec: new THREE.Vector3(0.55, -0.2, 0.05), name: 'r_hand', spread: 0.1 },
      { vec: new THREE.Vector3(-0.22, -2.0, 0.12), name: 'l_foot', spread: 0.1 },
      { vec: new THREE.Vector3(0.22, -2.0, 0.12), name: 'r_foot', spread: 0.1 },
    ];

    const generatedCurves: { curve: THREE.CatmullRomCurve3; isArtery: boolean }[] = [];

    // Create a network by adding small branching variations to the paths
    endpoints.forEach(({ vec, spread }) => {
      // Create 3 branching variations for each major artery/vein
      for (let branch = 0; branch < 3; branch++) {
        const endPoint = vec.clone().add(new THREE.Vector3(
          (Math.random() - 0.5) * spread,
          (Math.random() - 0.5) * spread,
          (Math.random() - 0.5) * spread
        ));

        const midOut = new THREE.Vector3().lerpVectors(heartVec, endPoint, 0.4 + Math.random() * 0.2);
        midOut.x += (Math.random() - 0.5) * spread;
        if (endPoint.y > heartVec.y) {
          midOut.z += 0.12;
        } else {
          midOut.x += 0.04;
        }

        const midOut2 = new THREE.Vector3().lerpVectors(heartVec, endPoint, 0.7 + Math.random() * 0.15);
        midOut2.x += (Math.random() - 0.5) * spread;

        const arteryCurve = new THREE.CatmullRomCurve3([heartVec, midOut, midOut2, endPoint], false, 'catmullrom', 0.5);
        generatedCurves.push({ curve: arteryCurve, isArtery: true });

        const midIn = new THREE.Vector3().lerpVectors(endPoint, heartVec, 0.6);
        midIn.z -= 0.08;
        midIn.x += (Math.random() - 0.5) * spread;
        const veinCurve = new THREE.CatmullRomCurve3([endPoint, midIn, heartVec], false, 'catmullrom', 0.5);
        generatedCurves.push({ curve: veinCurve, isArtery: false });
      }
    });

    const pos = new Float32Array(particleCount * 3);
    const col = new Float32Array(particleCount * 3);
    const pData = [];

    for (let i = 0; i < particleCount; i++) {
      const curveEntry = generatedCurves[i % generatedCurves.length];
      const progress = Math.random();
      const speed = curveEntry.isArtery ? 0.0035 + Math.random() * 0.003 : 0.0022 + Math.random() * 0.002;

      const pt = curveEntry.curve.getPointAt(progress);
      pos[i * 3] = pt.x;
      pos[i * 3 + 1] = pt.y;
      pos[i * 3 + 2] = pt.z;

      if (curveEntry.isArtery) {
        col[i * 3] = 1.0;
        col[i * 3 + 1] = 0.05;
        col[i * 3 + 2] = 0.05;
      } else {
        // Veins still red, but a very slightly darker/different shade of red
        col[i * 3] = 0.85;
        col[i * 3 + 1] = 0.05;
        col[i * 3 + 2] = 0.1;
      }

      pData.push({
        curve: curveEntry.curve,
        progress,
        speed,
      });
    }

    return { positions: pos, curves: generatedCurves, particleData: pData, colors: col };
  }, []);

  useFrame(() => {
    if (!pointsRef.current) return;
    const posArr = pointsRef.current.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < particleCount; i++) {
      const data = particleData[i];
      data.progress += data.speed;
      if (data.progress > 1) {
        data.progress = 0;
      }

      const pt = data.curve.getPointAt(data.progress);
      posArr[i * 3] = pt.x;
      posArr[i * 3 + 1] = pt.y;
      posArr[i * 3 + 2] = pt.z;
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <group>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.055}
          vertexColors
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      {/* Descending Aorta */}
      <mesh position={[0.04, 0.45, -0.02]}>
        <cylinderGeometry args={[0.035, 0.03, 0.95, 12]} />
        <meshStandardMaterial
          color="#ff1744"
          emissive="#ff1744"
          emissiveIntensity={1.8}
          transparent
          opacity={0.8}
        />
      </mesh>
      {/* Inferior Vena Cava */}
      <mesh position={[-0.04, 0.45, -0.04]}>
        <cylinderGeometry args={[0.032, 0.028, 0.95, 12]} />
        <meshStandardMaterial
          color="#3b82f6"
          emissive="#60a5fa"
          emissiveIntensity={1.4}
          transparent
          opacity={0.7}
        />
      </mesh>
    </group>
  );
}

// ============================================================
// CRASH-PROOF MODEL FALLBACK BOUNDARY
// ============================================================
class SafeBoundary extends Component<{ fallback: React.ReactNode; children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any) {
    console.info('Using procedural 3D anatomy model:', error?.message || error);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// ============================================================
// CUSTOM GLTF MODEL COMPONENT
// ============================================================
function CustomGLTFModel({ url, mode }: { url: string; mode: 'normal' | 'blood' }) {
  const { scene } = useGLTF(url, "https://www.gstatic.com/draco/versioned/decoders/1.5.5/");
  const isBlood = mode === 'blood';

  const model = useMemo(() => {
    const clone = scene.clone();

    const bounds = new THREE.Box3().setFromObject(clone);
    const size = bounds.getSize(new THREE.Vector3());

    const skinMaterial = new THREE.MeshPhysicalMaterial({
      color: isBlood ? '#ef4444' : '#06b6d4',
      emissive: isBlood ? '#ff0000' : '#0891b2',
      emissiveIntensity: isBlood ? 0.2 : 0.25,
      transparent: true,
      opacity: isBlood ? 0.1 : 0.16,
      roughness: 0.15,
      metalness: 0.1,
      transmission: 0.9,
      thickness: 0.6,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const wireMaterial = new THREE.MeshBasicMaterial({
      color: isBlood ? '#ff1133' : '#22d3ee',
      transparent: true,
      opacity: isBlood ? 0.42 : 0.2,
      wireframe: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const meshes: THREE.Mesh[] = [];
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        meshes.push(child);
      }
    });

    meshes.forEach((child) => {
      child.material = skinMaterial;
      const wire = new THREE.Mesh(child.geometry, wireMaterial);
      child.add(wire);
    });

    clone.scale.setScalar(size.y > 0 ? 5.65 / size.y : 1);

    return clone;
  }, [scene, isBlood]);

  // Center perfectly and adjust Y offset slightly to match the procedural mannequin
  return (
    <Center>
      <primitive object={model} />
    </Center>
  );
}

// ============================================================
// MAIN COMPONENT EXPORT
// ============================================================
export function HumanBodyModel({ mode, selectedOrganId, onSelectOrgan, modelUrl }: HumanBodyModelProps) {
  const sceneGroupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (sceneGroupRef.current) {
      sceneGroupRef.current.position.y = Math.sin(clock.elapsedTime * 1.2) * 0.04;
    }
  });

  return (
    <group ref={sceneGroupRef} position={[0, -0.2, 0]}>
      <SafeBoundary fallback={<HolographicAnatomyMannequin mode={mode} />}>
        {modelUrl ? (
          <Suspense fallback={<HolographicAnatomyMannequin mode={mode} />}>
            <CustomGLTFModel url={modelUrl} mode={mode} />
          </Suspense>
        ) : (
          <HolographicAnatomyMannequin mode={mode} />
        )}
      </SafeBoundary>

      {mode === 'normal' && <DiagnosticScannerPlane />}

      <HUDOverlays mode={mode} />

      {ORGANS_LIST.map((organ) => (
        <DynamicOrganGeometry
          key={organ.id}
          organ={organ}
          isSelected={selectedOrganId === organ.id}
          mode={mode}
          onSelect={() => onSelectOrgan(organ.id)}
        />
      ))}

      {mode === 'blood' && <CirculatoryVascularSystem />}
    </group>
  );
}

export default HumanBodyModel;

useGLTF.preload("/models/human_anatomy.glb", "https://www.gstatic.com/draco/versioned/decoders/1.5.5/");
