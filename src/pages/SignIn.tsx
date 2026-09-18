import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Building2, Check, Eye, EyeOff, HeartHandshake, UserRound } from "lucide-react";
import lottie from "lottie-web";
import { useApp } from "../context/AppContext";
import type { LucideIcon } from "lucide-react";

type Role = "hospital" | "ngo" | "donor";

const roleOptions: { value: Role; label: string; icon: LucideIcon }[] = [
  { value: "hospital", label: "Hospital", icon: Building2 },
  { value: "ngo", label: "NGO", icon: HeartHandshake },
  { value: "donor", label: "Donor", icon: UserRound },
];

function LottieAnimation({ path, label }: { path: string; label: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const animation = lottie.loadAnimation({
      container: containerRef.current,
      renderer: "svg",
      loop: true,
      autoplay: true,
      path,
    });

    return () => animation.destroy();
  }, [path]);

  return <div ref={containerRef} role="img" aria-label={label} className="h-full w-full" />;
}

const roleMedia: Record<Role, { title: string; description: string; assets: { path: string; label: string }[] }> = {
  donor: {
    title: "Every donation starts a connection.",
    description: "Your time and care can help someone take their next breath.",
    assets: [{ path: "/login.mp4", label: "Donor welcome animation" }],
  },
  hospital: {
    title: "Care moves faster when teams connect.",
    description: "Coordinate critical blood requests with trusted partners.",
    assets: [
      { path: "/Hospital%20(1).json", label: "Hospital animation" },
      { path: "/Online%20Doctor.json", label: "Online doctor animation" },
    ],
  },
  ngo: {
    title: "Small acts build stronger communities.",
    description: "Bring donors, hospitals, and families closer together.",
    assets: [
      { path: "/Home.json", label: "Home animation" },
      { path: "/Kids%20Studying%20from%20Home%20(1).json", label: "Kids studying from home animation" },
    ],
  },
};

export default function SignIn() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setRole } = useApp();
  const requestedRole = new URLSearchParams(location.search).get("role");
  const initialRole = roleOptions.find(({ value }) => value === requestedRole)?.value ?? "hospital";
  const [form, setForm] = useState({ email: "", password: "", role: initialRole });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const activeMedia = roleMedia[form.role];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      const nameMap = { hospital: "CityCare Hospital", ngo: "UPAY Community Network", donor: "Aarav Mehta" };
      const idMap = { hospital: "h1", ngo: "n1", donor: "d1" };
      setRole(form.role, idMap[form.role], nameMap[form.role]);
      navigate(`/${form.role}/dashboard`);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#FBFBFD] flex">
      <motion.div
        key={form.role}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35 }}
        className="hidden lg:flex flex-1 bg-[#031A36] p-12 flex-col justify-between overflow-hidden"
      >
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="RakhtSetu logo" className="h-8 w-8 rounded-lg bg-white object-contain" />
          <span className="font-display text-xl font-bold"><span className="text-red-500">Rakht</span><span className="text-white">Setu</span></span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col justify-center py-8">
          <div className={`mx-auto flex w-full max-w-[700px] items-center justify-center gap-2 ${activeMedia.assets.length > 1 ? "h-[430px]" : "h-[520px]"}`}>
            {activeMedia.assets.map((asset) => (
              <div key={asset.path} className="relative h-full min-w-0 flex-1 overflow-hidden rounded-[28px] border-2 border-[#6CC7D3]/65 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
                {asset.path.endsWith(".mp4") ? (
                  <video src={asset.path} aria-label={asset.label} autoPlay loop muted playsInline className="h-full w-full object-contain" />
                ) : (
                  <div className={asset.path === "/Home.json" ? "h-full w-full scale-[1.3]" : "h-full w-full"}>
                    <LottieAnimation path={asset.path} label={asset.label} />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mx-auto mt-8 max-w-[580px]">
            <h2 className="font-display text-2xl font-semibold leading-tight text-white">{activeMedia.title}</h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-[#B7C8D8]">{activeMedia.description}</p>
          </div>
        </div>
      </motion.div>

      <div className="flex-1 flex items-center justify-center p-5 sm:p-8 bg-[#F5F8FA]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[440px]"
        >
          <Link to="/" className="flex items-center gap-2 text-sm text-[#021734]/50 hover:text-[#062847] mb-6 transition-colors">
            <ArrowLeft size={14} /> Back to home
          </Link>

          <div className="rounded-[22px] border border-[#C0D2DE] bg-[#FBFCFD] p-4 shadow-[0_18px_45px_rgba(3,26,54,0.10),inset_0_1px_0_rgba(255,255,255,0.95)] sm:p-7">
            <div className="mb-6">
              <h1 className="text-3xl font-display font-bold tracking-[-0.02em] text-[#021734] mb-2">Welcome back</h1>
              <p className="text-[#021734]/55 text-sm">Sign in to your RakhtSetu account</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-1 rounded-xl border border-[#D4E2E8] bg-[#EEF6F8] p-1 shadow-[inset_0_2px_4px_rgba(3,26,54,0.06)]" aria-label="Choose account type">
                {roleOptions.map(({ value, label, icon: Icon }) => {
                  const selected = form.role === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setForm({ ...form, role: value })}
                      className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold transition-all sm:text-sm ${selected ? "bg-[#031A36] text-white shadow-[0_3px_6px_rgba(3,26,54,0.22),inset_0_1px_0_rgba(255,255,255,0.2)]" : "text-[#123B5A]/75 hover:bg-white/70"}`}
                      aria-pressed={selected}
                    >
                      <Icon size={15} strokeWidth={selected ? 2.5 : 2} />
                      {label}
                    </button>
                  );
                })}
              </div>

              <div>
                <label htmlFor="signin-email" className="text-xs font-semibold text-[#021734] mb-1.5 block">Email / Mobile</label>
                <input
                  id="signin-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="donor@demo.com"
                  className="w-full rounded-xl border border-[#C0D2DE] bg-white px-4 py-3 text-sm text-[#021734] shadow-[inset_0_2px_5px_rgba(3,26,54,0.04)] outline-none transition focus:border-[#062847] focus:ring-2 focus:ring-[#062847]/20"
                />
              </div>
              <div>
                <label htmlFor="signin-password" className="text-xs font-semibold text-[#021734] mb-1.5 block">Password</label>
                <div className="relative">
                  <input
                    id="signin-password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-[#C0D2DE] bg-white px-4 py-3 pr-11 text-sm text-[#021734] shadow-[inset_0_2px_5px_rgba(3,26,54,0.04)] outline-none transition focus:border-[#062847] focus:ring-2 focus:ring-[#062847]/20"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#123B5A]/45 hover:text-[#062847]">
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 py-0.5 text-xs text-[#123B5A]/75">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="peer sr-only" />
                  <span className="flex h-4 w-4 items-center justify-center rounded border border-[#A8BBC6] bg-white text-transparent shadow-[inset_0_1px_2px_rgba(3,26,54,0.08)] peer-checked:bg-[#031A36] peer-checked:text-white"><Check size={11} strokeWidth={3} /></span>
                  Remember me
                </label>
                <button type="button" className="font-medium text-[#062847] hover:underline">Forgot password?</button>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#031A36] py-3.5 font-display text-sm font-bold text-white shadow-[0_4px_0_#001126,0_7px_13px_rgba(3,26,54,0.18),inset_0_1px_0_rgba(255,255,255,0.18)] transition hover:bg-[#062847] active:translate-y-0.5 active:shadow-[0_2px_0_#001126,0_4px_8px_rgba(3,26,54,0.16)] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Signing in...
                  </>
                ) : "Sign in"}
              </button>
            </form>

            <p className="text-center text-sm text-[#021734]/50 mt-6">
              New to RakhtSetu?{" "}
              <Link to="/register" className="text-[#062847] font-medium hover:underline">
                Register your organisation
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
