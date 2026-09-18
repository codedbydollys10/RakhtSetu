import React, { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import {
  Droplets, Shield, Zap, Users, Building2, Heart, Network,
  ArrowRight, CheckCircle, Clock, Lock, ChevronDown, Activity,
  Search, Bell, Smartphone, ToggleRight, History, Apple, Download,
} from "lucide-react";
import { HumanBodyModel, ORGANS_LIST } from "../components/HumanBodyModel";
import { donors, initialRequests } from "../data/mockData";

function FadeUp({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function AnimatedStat({ value, label }: { value: string; label: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const numericVal = parseInt(value.replace(/\D/g, ""));
  useEffect(() => {
    let start = 0;
    const step = numericVal / 50;
    const timer = setInterval(() => {
      start += step;
      if (start >= numericVal) { setCount(numericVal); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 20);
    return () => clearInterval(timer);
  }, [inView, numericVal]);

  return (
    <div ref={ref} className="text-center">
      <p className="text-4xl font-display font-bold text-white">
        {value.replace(numericVal.toString(), count.toString())}
      </p>
      <p className="text-sm text-cyan mt-1">{label}</p>
    </div>
  );
}

function NetworkVisual() {
  const nodes = [
    { label: "Donor", status: "Available", icon: Users, className: "left-8 top-10" },
    { label: "Hospital", status: "Verified", icon: Building2, className: "right-8 top-10" },
    { label: "NGO", status: "Active", icon: Heart, className: "left-14 bottom-14" },
    { label: "Blood Bank", status: "Low Stock", icon: Activity, className: "right-8 bottom-14" },
  ];

  return (
    <div className="network-visual animate-network-float relative h-96 w-full max-w-140 mx-auto scale-[1.15]" aria-label="Connected blood network illustration">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 560 390" fill="none" aria-hidden="true">
        <path d="M116 87L280 195L444 87M132 312L280 195L444 312" stroke="#FFFFFF" strokeOpacity=".72" strokeWidth="2" strokeDasharray="7 7" />
        <circle cx="280" cy="195" r="92" stroke="#6CC7D3" strokeOpacity=".16" strokeWidth="1" />
        <circle cx="280" cy="195" r="70" stroke="#6CC7D3" strokeOpacity=".12" strokeWidth="1" />
      </svg>

      {nodes.map(({ label, status, icon: Icon, className }) => (
        <div key={label} className={`absolute ${className} z-10 w-23 rounded-2xl border border-cyan/40 bg-bg/15 p-3 text-center shadow-lg backdrop-blur-md`}>
          <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-cyan/25 text-bg"><Icon size={17} /></div>
          <p className="text-[11px] font-bold text-bg">{label}</p>
          <p className={`mt-1 text-[9px] ${status === "Low Stock" ? "text-warm" : "text-success"}`}>● {status}</p>
        </div>
      ))}

      <div className="absolute left-1/2 top-1/2 z-20 flex h-23 w-23 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-alert/80 bg-alert/90 text-center shadow-[0_0_50px_rgba(255,49,95,.42)] backdrop-blur">
        <Droplets size={27} className="mb-1 text-bg" fill="currentColor" />
        <span className="text-[9px] font-bold tracking-[.16em] text-bg/80">RAKHSETU</span>
      </div>

      <div className="absolute right-0 top-36.25 z-30 flex w-36.25 items-center gap-2 rounded-xl border border-blue-light/60 bg-bg p-2.5 shadow-xl">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-soft text-[10px] font-bold text-primary">RK</div>
        <div><p className="text-[10px] font-bold text-navy">Rohit Kumar</p><p className="text-[9px] text-ink-soft/60">B+ · 2.1 km</p><p className="mt-1 text-[8px] font-bold text-success">● Available to donate</p></div>
      </div>

      <div className="absolute bottom-0 left-1/2 z-30 -translate-x-1/2 rounded-xl border border-blue-light/60 bg-bg px-4 py-3 shadow-xl">
        <p className="text-[9px] font-bold uppercase tracking-widest text-alert">● Critical</p>
        <p className="text-[11px] font-bold text-navy">O+ Required — 2 Units</p>
        <p className="text-[9px] text-ink-soft/60">AIIMS Delhi · 3.8 km</p>
      </div>

      <div className="absolute left-0 top-38.75 z-30 rounded-xl bg-deep-teal px-4 py-3 text-center shadow-xl">
        <p className="text-xl font-bold text-bg">847</p><p className="text-[9px] text-cyan">Active Donors</p>
      </div>
    </div>
  );
}

function MobilePreview() {
  return (
    <section className="relative overflow-hidden bg-[#031A36] px-6 py-24 text-white" id="mobile">
      <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden="true">
        <div className="absolute left-[12%] top-16 h-px w-[76%] bg-gradient-to-r from-transparent via-cyan/50 to-transparent" />
        <div className="absolute bottom-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full border border-cyan/10" />
        <div className="absolute bottom-28 left-[18%] h-2 w-2 rounded-full bg-cyan shadow-[0_0_18px_#6CC7D3]" />
        <div className="absolute right-[18%] top-28 h-2 w-2 rounded-full bg-alert shadow-[0_0_18px_#FF315F]" />
      </div>

      <div className="relative mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-[0.9fr_1.1fr]">
        <FadeUp>
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan/30 bg-cyan/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-cyan">
              <Smartphone size={13} /> Coming soon
            </span>
            <h2 className="mt-6 max-w-md text-4xl font-display font-bold leading-tight md:text-5xl">Save Lives on the Go</h2>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-white/65">Stay connected to your donor community with real-time request alerts, availability controls and donation tracking — wherever you are.</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button type="button" disabled title="Coming soon" className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-white px-7 py-3 text-sm font-bold text-navy shadow-[0_8px_24px_rgba(0,0,0,0.18)] opacity-95"><Apple size={16} /> App Store</button>
              <button type="button" disabled title="Coming soon" className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl border border-white/20 px-7 py-3 text-sm font-bold text-white/85 opacity-80"><Download size={16} /> Install App</button>
            </div>
            <p className="mt-7 text-[10px] font-mono uppercase tracking-[0.16em] text-white/40">Web platform • Mobile experience coming soon</p>
          </div>
        </FadeUp>

        <FadeUp delay={0.12} className="relative mx-auto w-full max-w-[520px]">
          <div className="absolute -left-2 top-16 z-20 w-44 rounded-2xl border border-alert/40 bg-[#10294A]/95 p-3 shadow-[0_16px_40px_rgba(0,0,0,0.3)] backdrop-blur-md sm:-left-8">
            <div className="flex items-center gap-2 text-[9px] font-bold tracking-[0.15em] text-alert"><Bell size={12} /> URGENT REQUEST</div>
            <p className="mt-2 text-sm font-bold text-white">O+ <span className="text-white/40">•</span> 4 Units</p>
            <p className="mt-1 text-[11px] text-white/55">3.2 km away</p>
          </div>
          <div className="absolute -right-2 bottom-16 z-20 w-36 rounded-2xl border border-cyan/30 bg-[#10294A]/95 p-3 shadow-[0_16px_40px_rgba(0,0,0,0.3)] backdrop-blur-md sm:-right-6">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">Availability</p>
            <p className="mt-2 flex items-center gap-1.5 text-sm font-bold text-success"><span className="h-2 w-2 rounded-full bg-success" /> Available ✓</p>
          </div>

          <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }} className="relative mx-auto w-[min(76vw,286px)] rounded-[2.6rem] border-[7px] border-[#1C4266] bg-[#071C38] p-2 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_30px_70px_rgba(0,0,0,0.5)]">
            <div className="overflow-hidden rounded-[2rem] bg-[#F5F9FC] text-navy">
              <div className="flex items-center justify-between bg-[#E8F4F6] px-5 pb-3 pt-5 text-[9px] font-bold"><span>9:41</span><span className="h-1.5 w-8 rounded-full bg-navy/70" /></div>
              <div className="space-y-4 px-4 pb-5 pt-4">
                <div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="flex h-7 w-7 items-center justify-center rounded-lg bg-alert text-white"><Droplets size={14} fill="currentColor" /></div><span className="font-display text-sm font-extrabold">RakhtSetu</span></div><Bell size={15} className="text-primary" /></div>
                <div><p className="text-[9px] font-bold uppercase tracking-widest text-primary">Good evening, Aarav</p><h3 className="mt-1 text-lg font-display font-extrabold">Nearby Blood Requests</h3></div>
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="rounded-2xl bg-[#031A36] p-3 text-white shadow-lg"><div className="flex items-start justify-between"><div><p className="text-[9px] font-bold uppercase tracking-widest text-alert">Critical request</p><p className="mt-1 text-2xl font-display font-extrabold">O+</p></div><span className="rounded-full bg-alert/15 px-2 py-1 text-[9px] font-bold text-alert">4.2 km away</span></div><p className="mt-2 text-[10px] text-white/55">CityCare Hospital · 4 units needed</p></motion.div>
                <div className="flex items-center justify-between rounded-2xl border border-cyan/20 bg-cyan/10 p-3"><div><p className="text-[9px] font-bold uppercase tracking-widest text-primary">Your status</p><p className="mt-1 text-xs font-bold">Available to Donate</p></div><ToggleRight size={29} className="text-success" /></div>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-alert/10 text-alert"><Bell size={14} /></div><div><p className="text-[10px] font-bold">New request nearby</p><p className="mt-0.5 text-[9px] text-navy/50">Tap to review coordination details</p></div></motion.div>
                <div className="flex items-center gap-2 border-t border-navy/10 pt-3 text-[10px] font-bold text-navy/55"><History size={13} className="text-primary" /> Donation history <ArrowRight size={12} className="ml-auto" /></div>
              </div>
            </div>
          </motion.div>
        </FadeUp>
      </div>
    </section>
  );
}

const faqItems = [
  {
    q: "Who can register as a donor?",
    a: "Eligible adults can register as donors and share their availability. Medical professionals make the final decision about donation eligibility.",
  },
  {
    q: "Does RakhtSetu decide medical eligibility?",
    a: "No. RakhtSetu supports coordination only. Medical eligibility, screening, and transfusion decisions remain with qualified healthcare professionals.",
  },
  {
    q: "How are blood requests verified?",
    a: "Requests are reviewed by the coordinating hospital or organisation before they are circulated to potential donors and network partners.",
  },
  {
    q: "Is my exact location shared with other users?",
    a: "No. Donor exact locations are kept private. Coordination uses limited location information such as area or approximate distance when necessary.",
  },
  {
    q: "How does donor matching work?",
    a: "RakhtSetu prioritises potential contacts using coordination factors such as blood group, availability, approximate distance, donation interval, and response history.",
  },
];

export default function Landing() {
  const [viewMode, setViewMode] = useState<"normal" | "blood">("normal");
  const [selectedOrganId, setSelectedOrganId] = useState("heart");
  const [activeStep, setActiveStep] = useState(0);
  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState(-1);
  const [responded, setResponded] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const selectedOrgan = ORGANS_LIST.find((organ) => organ.id === selectedOrganId) ?? ORGANS_LIST[0];

  const flowStages = ["Requirement", "Verification", "Matching", "Donor Contact", "Response"];
  const matchingFactors = [
    { label: "Blood Group Match", value: 100, color: "#c0182a" },
    { label: "Availability", value: 92, color: "#22c55e" },
    { label: "Distance", value: 86, color: "#3b82f6" },
    { label: "Urgency Level", value: 95, color: "#f59e0b" },
    { label: "Donation Interval", value: 78, color: "#7a9bc4" },
    { label: "Response History", value: 88, color: "#a855f7" },
  ];

  const runDemo = async () => {
    setRunning(true);
    setDone(false);
    setResponded([]);
    for (let i = 0; i < flowStages.length; i++) {
      setStage(i);
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
    setDone(true);
    setRunning(false);
  };

  const respond = (id: number) => {
    setResponded((prev) => [...prev, id]);
  };

  return (
    <div className="landing-page min-h-screen scroll-smooth bg-bg font-sans">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-[#031A36] backdrop-blur border-b border-cyan/20">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="RakhtSetu logo" className="h-8 w-8 rounded-lg bg-white object-contain" />
            <span className="font-display text-xl font-bold"><span className="text-red-500">Rakht</span><span className="text-white">Setu</span></span>
          </div>
          <div className="hidden items-center gap-6 text-sm text-bg/70 md:flex">
            <a href="#how" className="transition-colors hover:text-cyan">3D Anatomy</a>
            <a href="#roles" className="transition-colors hover:text-cyan">How It Works</a>
            <a href="#portals" className="transition-colors hover:text-cyan">Portals</a>
            <a href="#matching" className="transition-colors hover:text-cyan">Interactive Demo</a>
            <a href="#mobile" className="transition-colors hover:text-cyan">App</a>
            <a href="#impact" className="transition-colors hover:text-cyan">Impact</a>
            <a href="#privacy" className="transition-colors hover:text-cyan">FAQ</a>
            <a href="#cta" className="transition-colors hover:text-cyan">CTA</a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/signin"
              className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-[#031A36] shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-cyan"
            >
              Sign in
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-[100dvh] bg-[#031A36] pt-16 pb-0 px-0">
        <div className="w-full">
          <div className="landing-hero min-h-[calc(100dvh-4rem)] overflow-hidden">
            <div className="relative grid lg:grid-cols-2 gap-8 px-8 md:px-14 pt-14 pb-0 items-center">
              <div className="pb-14 lg:pb-14">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <span className="inline-flex items-center gap-2 rounded-full border border-cyan/30 bg-cyan/15 px-4 py-2 text-sm font-medium text-bg/90">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-success" />
                    India's First Unified Blood Network
                  </span>
                  <h1 className="mt-6 text-4xl font-display font-bold leading-[1.1] text-bg md:text-5xl lg:text-[3.4rem]">
                    Connecting Donors<br /><span className="text-cyan">Saving Lives</span><br />Across India
                  </h1>
                  <p className="mb-8 mt-5 max-w-md text-lg leading-relaxed text-bg/75">
                    RakhtSetu bridges verified blood donors, hospitals, and blood banks with intelligent matching technology — so no patient waits.
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <a href="#how" className="flex items-center gap-2 rounded-xl border border-cyan/40 bg-cyan/15 px-6 py-3 font-medium text-bg transition-all hover:bg-cyan/25">
                      Request Blood <ArrowRight size={16} />
                    </a>
                  </div>
                  <div className="mt-8 flex items-center gap-6 border-t border-cyan/20 pt-6"><div><div className="font-display text-xl font-bold text-bg">2.4L+</div><div className="text-xs text-bg/60">Registered Donors</div></div><div><div className="font-display text-xl font-bold text-bg">840+</div><div className="text-xs text-bg/60">Partner Hospitals</div></div><div><div className="font-display text-xl font-bold text-bg">28</div><div className="text-xs text-bg/60">States Covered</div></div></div>
                </motion.div>
              </div>

              {/* Hero visual */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="relative hidden lg:block"
              >
                <NetworkVisual />
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Anatomy viewer */}
      <section className="relative z-10 border-t border-slate-200/60 bg-gradient-to-b from-[#FBFBFD] to-[#f1f5f9]/50 py-20" id="how">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-8">
          <FadeUp>
            <div className="mb-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-primary shadow-sm">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                  Interactive 3D Map
                </div>
                <h2 className="mb-4 text-4xl font-display font-extrabold tracking-tight text-navy md:text-5xl">
                  The Anatomy of a Donation.
                </h2>
                <p className="max-w-xl text-lg text-slate-500">
                  Explore how blood connects and sustains every vital organ. Our 3D viewer highlights the direct physiological impact of your donation.
                </p>
              </div>
              <div className="flex items-center rounded-full border border-slate-200 bg-white p-1.5 shadow-sm">
                <button
                  onClick={() => setViewMode("normal")}
                  className={`rounded-full px-5 py-2.5 text-sm font-bold transition-all ${viewMode === "normal" ? "bg-slate-100 text-navy shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                >
                  Anatomy View
                </button>
                <button
                  onClick={() => setViewMode("blood")}
                  className={`rounded-full px-5 py-2.5 text-sm font-bold transition-all ${viewMode === "blood" ? "bg-primary/10 text-primary shadow-sm" : "text-slate-400 hover:text-primary"}`}
                >
                  Blood Flow Mode
                </button>
              </div>
            </div>
          </FadeUp>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <FadeUp delay={0.1} className="min-w-0 lg:col-span-8">
              <div className="group relative h-[34rem] w-full overflow-hidden rounded-[2rem] bg-[#001126] shadow-[0_20px_50px_-15px_rgba(1,30,64,0.4)] ring-1 ring-white/10 lg:h-[40rem]">
                <div className="absolute left-6 top-6 z-10 flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs text-white shadow-lg backdrop-blur-md">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-primary shadow-[0_0_8px_#087B8C]" />
                  Real-time WebGL
                </div>
                <Canvas camera={{ position: [0, 0.55, 8], fov: 45 }} dpr={[1, 2]}>
                  <color attach="background" args={["#001126"]} />
                  <ambientLight intensity={0.8} />
                  <directionalLight position={[4, 6, 5]} intensity={2.4} color="#ffffff" />
                  <directionalLight position={[-4, 1, 3]} intensity={1.3} color="#6CC7D3" />
                  <HumanBodyModel mode={viewMode} selectedOrganId={selectedOrganId} onSelectOrgan={setSelectedOrganId} modelUrl="/models/human_anatomy.glb" />
                  <Environment preset="city" />
                  <OrbitControls enablePan={false} minDistance={5} maxDistance={12} minPolarAngle={Math.PI / 4} maxPolarAngle={Math.PI / 1.5} />
                </Canvas>
                <div className="absolute bottom-6 left-6 rounded-full bg-black/40 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white/60 backdrop-blur-md">
                  Drag to rotate · Scroll to zoom
                </div>
                <div className={`pointer-events-none absolute bottom-8 right-8 rounded-xl border px-4 py-3 font-mono text-[9px] tracking-widest ${viewMode === "blood" ? "border-alert/60 bg-alert/10 text-alert" : "border-cyan/40 bg-cyan/10 text-cyan"}`}>
                  {viewMode === "blood" ? "BLOOD FLOW ACTIVE" : "VITAL SYSTEMS ONLINE"}
                </div>
              </div>
            </FadeUp>

            <FadeUp delay={0.2} className="min-w-0 lg:col-span-4">
              <aside className="flex h-full min-h-[34rem] w-full flex-col rounded-[2rem] border border-white bg-[#FBFBFD]/80 p-8 shadow-[0_15px_35px_-5px_rgba(1,30,64,0.06)] backdrop-blur-xl lg:min-h-[40rem]">
                <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-6">
                  <div>
                    <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest text-primary">Selected Focus</span>
                    <h3 className="mt-2 text-3xl font-display font-extrabold tracking-tight text-navy">{selectedOrgan.name}</h3>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-2xl text-alert shadow-inner">{selectedOrgan.id === "heart" ? "♥" : "✦"}</div>
                </div>
                <div className="flex-1 space-y-6">
                  <div>
                    <h5 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Physiological Function</h5>
                    <p className="text-sm font-medium leading-relaxed text-slate-600">{selectedOrgan.description}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                    <h5 className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-navy"><span className="h-2 w-2 rounded-full bg-red-500" /> Blood Volume Sustained</h5>
                    <span className="text-2xl font-black text-red-500">{selectedOrgan.volume}</span>
                  </div>
                  {selectedOrgan.stats.length > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      {selectedOrgan.stats.map((stat) => (
                        <div key={stat.label} className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                          <h5 className="mb-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">{stat.label}</h5>
                          <p className="text-sm font-bold text-navy">{stat.value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="rounded-xl border border-cyan-100/50 bg-cyan-50/50 p-4">
                    <h5 className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary"><Zap size={12} /> Transfusion Impact</h5>
                    <p className="text-sm font-medium leading-relaxed text-slate-700">{selectedOrgan.impact}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ORGANS_LIST.map((organ) => (
                      <button key={organ.id} onClick={() => setSelectedOrganId(organ.id)} className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${selectedOrganId === organ.id ? "border-primary bg-primary text-white" : "border-slate-200 text-slate-500 hover:border-primary hover:text-primary"}`}>
                        {organ.name}
                      </button>
                    ))}
                  </div>
                </div>
                <Link to="/signin" className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-navy px-6 py-4 text-sm font-bold tracking-wide text-white shadow-[0_4px_0_#001126,0_10px_20px_rgba(1,30,64,0.25)] transition-all hover:bg-primary hover:translate-y-0.5">
                  <Search size={17} /> Find Blood Needed for {selectedOrgan.name}
                </Link>
              </aside>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="stats-marquee overflow-hidden bg-[#031A36]">
        <div className="marquee-track flex w-max min-w-max items-center gap-10 px-4 py-2 text-white">
          {[
            { value: '1.2K+', label: 'Connected Donors' },
            { value: '840', label: 'Verified Requests' },
            { value: '148', label: 'Partner Hospitals' },
            { value: '64', label: 'Partner Organisations' },
            { value: '1.2K+', label: 'Connected Donors' },
            { value: '840', label: 'Verified Requests' },
            { value: '148', label: 'Partner Hospitals' },
            { value: '64', label: 'Partner Organisations' },
          ].map(({ value, label }) => (
            <div key={`${value}-${label}`} className="flex min-w-[170px] flex-col items-center justify-center text-center">
              <div className="text-[1.75rem] font-display font-bold leading-none text-white md:text-[2rem]">{value}</div>
              <div className="mt-0.5 text-xs text-cyan/90">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white px-6 py-24" id="roles">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-16 text-center"
          >
            <h3 className="text-5xl font-display font-bold text-navy md:text-6xl">
              How RakhtSetu works?
            </h3>
            <p className="mx-auto mt-5 max-w-xl text-lg text-navy/60">
              A structured coordination flow that keeps every stakeholder informed and aligned.
            </p>
          </motion.div>

          <div className="grid gap-4 lg:grid-cols-5">
            {[
              {
                num: '01',
                title: 'Requirement Raised',
                desc: 'Hospital creates a blood requirement with details including blood group, units, urgency, and location.',
                icon: '🏥',
                color: '#3b82f6',
              },
              {
                num: '02',
                title: 'Requirement Verified',
                desc: 'The requirement is reviewed before wider circulation to ensure authenticity and details.',
                icon: '✓',
                color: '#22c55e',
              },
              {
                num: '03',
                title: 'Potential Donors Matched',
                desc: 'RakhtSetu prioritises potential donor contacts based on coordination factors including availability, proximity, and history.',
                icon: '🔍',
                color: '#f59e0b',
              },
              {
                num: '04',
                title: 'Community Responds',
                desc: 'Donors and partner organisations receive structured notifications and respond to the requirement.',
                icon: '❤️',
                color: '#c0182a',
              },
              {
                num: '05',
                title: 'Request Fulfilled',
                desc: 'The hospital or coordinator updates the request lifecycle once the requirement is addressed.',
                icon: '✅',
                color: '#7a9bc4',
              },
            ].map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
                onMouseEnter={() => setActiveStep(i)}
                className={`group relative cursor-pointer rounded-[1.5rem] border border-slate-200/80 bg-[#031A36] p-6 text-white transition-all duration-300 ${activeStep === i ? 'border-white/15 -translate-y-1' : ''}`}
                style={{
                  boxShadow: activeStep === i ? `0 8px 32px ${step.color}20, 6px 6px 12px rgba(0,0,0,0.45)` : '0 8px 18px rgba(3, 26, 54, 0.08)',
                }}
              >
                {i < 4 && (
                  <motion.div
                    className="absolute -right-2 top-1/2 hidden h-0.5 w-4 -translate-y-1/2 lg:block"
                    style={{ background: activeStep >= i ? step.color : 'rgba(255,255,255,0.08)' }}
                    animate={{ opacity: activeStep >= i ? 1 : 0.3 }}
                  />
                )}

                <div
                  className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl text-lg transition-all duration-300"
                  style={{
                    background: activeStep === i ? `${step.color}20` : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${activeStep === i ? step.color + '40' : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  {step.icon}
                </div>
                <div className="mb-2 text-[10px] font-mono uppercase tracking-[0.18em] text-white/45">{step.num}</div>
                <h3 className="mb-2 text-base font-display font-semibold text-white">{step.title}</h3>
                <p className="text-sm leading-relaxed text-white/70">{step.desc}</p>
              </motion.div>
            ))}
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="mt-10 text-center text-xs italic text-navy/50"
          >
            AI assists with coordination — it does not determine medical eligibility or transfusion decisions.
          </motion.p>
        </div>
      </section>

      <section id="portals" className="bg-[#f8fafc] px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-14 text-center"
          >
            <h2 className="text-4xl font-display font-bold text-navy md:text-5xl">
              Tailored Environments for Three Key Stakeholders
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-navy/60">
              Each stakeholder has a dedicated command centre designed for their exact operational needs.
            </p>
          </motion.div>

          <div className="grid gap-6 lg:grid-cols-3">
            {[
              {
                eyebrow: "For Healthcare Facilities",
                title: "Hospital Command Centre",
                description: "Raise genuine, stamped blood requests, review AI-prioritized donor candidates, and request peer hospital support during acute inventory shortages.",
                points: ["Real-time request lifecycle tracking", "Inter-Hospital stock share (H2H Network)", "Privacy-preserving patient ID handling"],
                label: "Launch Hospital Portal",
                role: "hospital",
                icon: Building2,
                color: "#031A36",
              },
              {
                eyebrow: "For Donation Organizations",
                title: "NGO Coordination Centre",
                description: "Maintain active voluntary donor registries, audit incoming hospital requirements in the verification queue, and prevent double-outreach.",
                points: ["Verification queue with document audit", "Duplicate Outreach Protection indicator", "Donor capacity & re-engagement tools"],
                label: "Launch NGO Portal",
                role: "ngo",
                icon: Network,
                color: "#087f8c",
              },
              {
                eyebrow: "For Voluntary Donors",
                title: "Voluntary Donor Experience",
                description: "Simple, empowering mobile-first experience to control your donation readiness, receive only verified alerts, and track your community impact.",
                points: ["Instant Availability toggle & radius controls", "One-tap \"I Can Help\" response workflow", "Exact location masking & privacy protection"],
                label: "Launch Donor Portal",
                role: "donor",
                icon: Heart,
                color: "#c0182a",
              },
            ].map(({ eyebrow, title, description, points, label, role, icon: Icon, color }, index) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex flex-col rounded-[1.5rem] border border-slate-200 bg-white p-8 shadow-[0_8px_24px_rgba(3,26,54,0.06)]"
              >
                <div className="mb-7 flex h-14 w-14 items-center justify-center rounded-2xl text-white" style={{ backgroundColor: color }}>
                  <Icon size={26} />
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#087f8c]">{eyebrow}</p>
                <h3 className="mt-3 text-2xl font-display font-bold text-navy">{title}</h3>
                <p className="mt-4 min-h-24 text-sm leading-relaxed text-navy/70">{description}</p>
                <ul className="mt-6 space-y-3 text-sm text-navy/75">
                  {points.map((point) => (
                    <li key={point} className="flex items-start gap-2">
                      <CheckCircle size={16} className="mt-0.5 shrink-0 text-[#087f8c]" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
                <Link to={`/signin?role=${role}`} className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5" style={{ backgroundColor: color }}>
                  {label} <ArrowRight size={16} />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="matching" className="bg-white px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-16 text-center"
          >
            <span className="mb-4 block text-xs font-medium uppercase tracking-[0.2em] text-[#c0182a]">Interactive Demo</span>
            <h2 className="text-4xl font-display font-bold text-navy md:text-5xl">
              One request. A coordinated response.
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-lg text-navy/60">
              See how RakhtSetu moves from requirement to potential donor contact.
            </p>
          </motion.div>

          <div className="grid gap-6 lg:grid-cols-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-[1.5rem] border border-slate-200/80 bg-[#031A36] p-6 shadow-[0_8px_30px_rgba(2,14,24,0.18)]"
            >
              <div className="mb-4 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#c0182a] animate-pulse" />
                <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#c0182a]">
                  {initialRequests[0]?.status ?? 'Verified'} Request
                </span>
              </div>

              <div className="py-6 text-center">
                <div className="mb-2 text-6xl font-display font-bold text-[#c0182a]">{initialRequests[0]?.bloodGroup ?? 'O+'}</div>
                <div className="text-sm font-semibold text-white">{initialRequests[0]?.units ?? 4} Units Required</div>
                <div className="mt-1 text-xs text-[#7a9bc4]">Within {initialRequests[0]?.urgency ?? 'CRITICAL'}</div>
              </div>

              <div className="mt-4 border-t border-white/5 pt-4">
                <div className="mb-1 text-[10px] uppercase tracking-[0.18em] text-[#4a6a8a]">Requesting Hospital</div>
                <div className="text-sm font-medium text-white">{initialRequests[0]?.hospitalName ?? 'CityCare Hospital'}</div>
                <div className="mt-0.5 text-xs text-[#7a9bc4]">{initialRequests[0]?.area ?? 'Andheri'}, Mumbai</div>
              </div>

              <div className="mt-6 flex flex-col gap-1.5">
                {flowStages.map((step, index) => (
                  <div key={step} className="flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full transition-all duration-500 ${stage >= index ? 'bg-[#22c55e] shadow-[0_0_8px_#22c55e]' : 'bg-white/10'}`}
                    />
                    <span className={`text-xs transition-colors duration-300 ${stage >= index ? 'text-white' : 'text-[#4a6a8a]'}`}>
                      {step}
                    </span>
                    {index === 4 && done && <span className="ml-auto text-[10px] text-[#22c55e]">✓ Complete</span>}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={runDemo}
                disabled={running}
                className="mt-6 w-full rounded-lg bg-[#c0182a] px-3 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-[#e8243b] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {running ? 'Running...' : done ? 'Run Again' : 'Start Matching'}
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-[1.5rem] border border-slate-200/80 bg-[#031A36] p-6 shadow-[0_8px_30px_rgba(2,14,24,0.18)]"
            >
              <h3 className="mb-1 text-sm font-display font-semibold text-white">Matching Factors</h3>
              <p className="mb-6 text-xs text-[#4a6a8a]">AI-assisted coordination score — not medical eligibility.</p>

              <div className="flex flex-col gap-4">
                {matchingFactors.map((factor, i) => (
                  <div key={factor.label}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-xs text-[#7a9bc4]">{factor.label}</span>
                      <span className="font-mono text-xs text-white">{stage >= 2 ? `${factor.value}%` : '—'}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: factor.color }}
                        initial={{ width: 0 }}
                        animate={{ width: stage >= 2 ? `${factor.value}%` : '0%' }}
                        transition={{ duration: 0.8, delay: i * 0.08 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="rounded-[1.5rem] border border-slate-200/80 bg-[#031A36] p-6 shadow-[0_8px_30px_rgba(2,14,24,0.18)]"
            >
              <h3 className="mb-1 text-sm font-display font-semibold text-white">Potential Contacts</h3>
              <p className="mb-6 text-xs text-[#4a6a8a]">Coordination Match Score — not medical eligibility.</p>

              <div className="flex flex-col gap-3">
                {donors
                  .filter((donor) => donor.bloodGroup === 'O+')
                  .slice(0, 3)
                  .map((donor, i) => {
                    const donorId = Number(donor.id.replace(/\D/g, '')) || i;
                    return (
                      <AnimatePresence key={donor.id}>
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: stage >= 3 ? 1 : 0.3, x: 0 }}
                          transition={{ delay: 0.2 + i * 0.15 }}
                          className="flex items-center gap-3 rounded-[1.1rem] border border-white/5 bg-white/3 p-4"
                        >
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-[#c0182a]/30 bg-[#c0182a]/20 text-xs font-bold text-[#c0182a]">
                            {donor.name
                              .split(' ')
                              .map((word) => word[0])
                              .join('')
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-white">{donor.name}</div>
                            <div className="text-xs text-[#4a6a8a]">{donor.bloodGroup} · {donor.area}</div>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <div className="text-sm font-bold text-[#22c55e]">{donor.matchScore ?? 92}%</div>
                            <div className="text-[10px] text-[#4a6a8a]">match</div>
                          </div>
                          {responded.includes(donorId) ? (
                            <span className="flex-shrink-0 rounded-full border border-[#22c55e]/20 bg-[#22c55e]/15 px-2 py-0.5 text-[10px] text-[#22c55e]">
                              Responded
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => respond(donorId)}
                              disabled={stage < 3}
                              className="flex-shrink-0 rounded-full border border-[#c0182a]/30 bg-[#c0182a]/20 px-2 py-0.5 text-[10px] text-[#c0182a] transition-colors hover:bg-[#c0182a]/30 disabled:cursor-not-allowed disabled:opacity-30"
                            >
                              I Can Help
                            </button>
                          )}
                        </motion.div>
                      </AnimatePresence>
                    );
                  })}
              </div>

              {done && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 rounded-xl border border-[#22c55e]/20 bg-[#22c55e]/10 p-3 text-center"
                >
                  <span className="text-sm font-medium text-[#22c55e]">
                    {responded.length > 0 ? 'Donor Response Received ✓' : 'Potential contacts identified ✓'}
                  </span>
                </motion.div>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      <section id="privacy" className="bg-white px-6 py-24">
        <div className="mx-auto max-w-3xl">
          <FadeUp>
            <div className="mb-12 text-center">
              <span className="mb-4 block text-xs font-medium uppercase tracking-[0.2em] text-[#c0182a]">FAQ</span>
              <h2 className="text-4xl font-display font-bold text-navy md:text-5xl">Common questions.</h2>
              <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-navy/60">
                Clear answers about donating, verification, matching, and privacy on RakhtSetu.
              </p>
            </div>
          </FadeUp>

          <div className="flex flex-col gap-3">
            {faqItems.map((item, index) => (
              <motion.div
                key={item.q}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.4, delay: index * 0.06 }}
                className="overflow-hidden rounded-2xl border border-white/10 bg-[#031A36] shadow-[0_8px_24px_rgba(2,14,24,0.16)]"
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                  onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
                  aria-expanded={openFAQ === index}
                >
                  <span className="text-sm font-display font-semibold text-white md:text-base">{item.q}</span>
                  <motion.div
                    animate={{ rotate: openFAQ === index ? 45 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-white/20 text-cyan"
                  >
                    <ChevronDown size={15} />
                  </motion.div>
                </button>
                <AnimatePresence initial={false}>
                  {openFAQ === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div className="border-t border-white/10 px-6 pb-5 pt-4">
                        <p className="text-sm leading-relaxed text-[#7a9bc4]">{item.a}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <MobilePreview />

      <section id="impact" className="border-t border-border/50 bg-[#F5F9FC] px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <span className="inline-flex items-center rounded-full border border-cyan/30 bg-cyan/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-primary shadow-sm">
              Trusted By
            </span>
            <h2 className="mt-7 text-4xl font-display font-bold leading-tight text-navy md:text-5xl">
              Voices from the Network
            </h2>
            <p className="mx-auto mt-5 max-w-3xl text-lg leading-relaxed text-navy/65">
              Healthcare professionals, donors, and community organizations across India trust
              <span className="font-semibold text-primary"> RakhtSetu.</span>
            </p>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {[
              {
                quote: "RakhtSetu reduced our blood procurement time from 4 hours to under 20 minutes. It has genuinely saved lives in our ICU.",
                initials: "SN",
                name: "Dr. Suresh Nair",
                title: "Head of Haematology, Apollo Hospitals",
              },
              {
                quote: "I donated for the first time because of RakhtSetu's alert. The whole experience was transparent, tracked, and incredibly easy.",
                initials: "AV",
                name: "Aditi Verma",
                title: "Verified Donor, Bengaluru",
              },
              {
                quote: "Our NGO organized 12 donation camps this year using RakhtSetu. The drive management and volunteer coordination tools are exceptional.",
                initials: "RM",
                name: "Rahul Mehta",
                title: "Director, BloodConnect Foundation",
              },
            ].map(({ quote, initials, name, title }) => (
              <div
                key={name}
                className="rounded-[1.75rem] border border-slate-200/80 bg-[#0d2a42] p-6 shadow-[10px_10px_22px_rgba(15,23,42,0.12),-10px_-10px_22px_rgba(255,255,255,0.65)]"
              >
                <div className="text-[3rem] font-light leading-none text-[#ff4b6e]">“</div>
                <p className="mt-3 text-lg leading-relaxed text-white/90">{quote}</p>

                <div className="mt-8 flex items-center gap-3 border-t border-white/10 pt-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0b5d6e] text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]">
                    {initials}
                  </div>
                  <div>
                    <p className="text-base font-bold text-white">{name}</p>
                    <p className="text-sm text-white/65">{title}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section id="cta" className="relative mt-32 overflow-hidden bg-gradient-to-r from-[#031A36] via-[#062847] to-[#087B8C] px-6 py-24 text-center text-white">
        <div className="pointer-events-none absolute inset-0 opacity-30" aria-hidden="true">
          <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan/20" />
          <div className="absolute left-[25%] top-1/3 h-px w-1/2 bg-gradient-to-r from-transparent via-cyan/50 to-transparent" />
        </div>
        <FadeUp>
          <div className="relative mx-auto max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan/25 bg-cyan/10 px-4 py-2 text-xs font-bold text-cyan"><span className="h-2 w-2 rounded-full bg-success" /> Join the Movement</span>
            <h2 className="mt-7 text-4xl font-display font-bold leading-tight md:text-6xl">Be the Bridge.<br /><span className="text-cyan">Save a Life Today.</span></h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/75 md:text-lg">Join a coordinated community of donors, hospitals and organisations. It takes minutes to respond, and a lifetime for someone to remember it.</p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
              <Link to="/register" className="rounded-full bg-[#1A9AAA] px-7 py-3.5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(26,154,170,0.28)] transition-transform hover:-translate-y-0.5">Register as Donor</Link>
              <Link to="/register" className="rounded-full border border-white/20 bg-white/5 px-7 py-3.5 text-sm font-bold text-white transition-colors hover:border-cyan/60 hover:bg-white/10">Partner with Us</Link>
            </div>
          </div>
        </FadeUp>
      </section>

      {/* Footer */}
      <footer className="bg-[#031A36] px-6 py-14 text-white">
        <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="RakhtSetu logo" className="h-7 w-7 rounded-lg bg-white object-contain" />
              <span className="font-display text-lg font-extrabold"><span className="text-red-500">Rakht</span><span className="text-white">Setu</span></span>
            </Link>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/60">Connecting the right donor to the right need through a trusted community network.</p>
            <div className="mt-6 flex gap-2" aria-label="Social links">
              {['X', 'in', 'f', 'yt'].map((social) => <span key={social} className="flex h-8 w-8 items-center justify-center rounded-full border border-cyan/20 bg-cyan/10 text-[10px] font-bold text-cyan">{social}</span>)}
            </div>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-cyan">Platform</h3>
            <div className="mt-5 space-y-3 text-sm text-white/65"><a href="#how" className="block hover:text-cyan">How It Works</a><a href="#roles" className="block hover:text-cyan">Donor Portal</a><a href="#roles" className="block hover:text-cyan">Hospital Network</a><a href="#mobile" className="block hover:text-cyan">Mobile Experience</a></div>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-cyan">Company</h3>
            <div className="mt-5 space-y-3 text-sm text-white/65"><a href="#privacy" className="block hover:text-cyan">About RakhtSetu</a><a href="#privacy" className="block hover:text-cyan">Our Mission</a><a href="#privacy" className="block hover:text-cyan">Contact Us</a><Link to="/signin" className="block hover:text-cyan">Sign In</Link></div>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-cyan">Resources</h3>
            <div className="mt-5 space-y-3 text-sm text-white/65"><a href="#roles" className="block hover:text-cyan">For Hospitals</a><a href="#roles" className="block hover:text-cyan">For NGOs</a><a href="#roles" className="block hover:text-cyan">For Donors</a><a href="#privacy" className="block hover:text-cyan">Privacy & Trust</a></div>
          </div>
        </div>
        <div className="mx-auto mt-12 flex max-w-6xl flex-col gap-4 border-t border-white/10 pt-6 text-xs text-white/55 md:flex-row md:items-center md:justify-between"><p>© 2026 RakhtSetu Health Technologies Pvt. Ltd. · Frontend demonstration</p><div className="flex gap-5"><a href="#privacy" className="hover:text-cyan">Privacy Policy</a><a href="#privacy" className="hover:text-cyan">Terms of Use</a><a href="#privacy" className="hover:text-cyan">Accessibility</a></div></div>
      </footer>

    </div>
  );
}
