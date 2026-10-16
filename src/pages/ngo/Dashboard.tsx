import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import {
  Users,
  FileCheck,
  Zap,
  BarChart3,
  ArrowRight,
  CheckCircle,
  Droplets,
  HeartHandshake,
} from "lucide-react"
import DashboardLayout from "../../components/layout/DashboardLayout"
import { UrgencyBadge } from "../../components/ui/Badge"
import { useApp } from "../../context/AppContext"

const cardStyle =
  "rounded-2xl border border-[#D8E3EA] bg-white shadow-[0_4px_18px_rgba(3,26,54,0.05)]"

function NGOStatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "red",
}: {
  label: string
  value: string | number
  sub: string
  icon: typeof Users
  tone?: "red" | "amber" | "navy"
}) {
  const tones = {
    red: "bg-[#FFF1F3] text-[#E51C3D]",
    amber: "bg-amber-50 text-amber-600",
    navy: "bg-[#EAF0F5] text-[#062847]",
  }

  return (
    <article className={`${cardStyle} flex min-h-[122px] items-center gap-4 p-4 sm:p-5`}>
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}
      >
        <Icon size={19} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wide text-[#617587]">
          {label}
        </p>
        <p className="mt-1 font-display text-[27px] font-extrabold leading-none text-[#021734]">
          {value}
        </p>
        <p className="mt-2 text-xs text-[#617587]">{sub}</p>
      </div>
    </article>
  )
}

function SectionHeading({
  title,
  to,
}: {
  title: string
  to: string
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="font-display text-lg font-bold text-[#021734]">{title}</h2>
      <Link
        to={to}
        className="inline-flex items-center gap-1 text-xs font-semibold text-[#E51C3D] hover:underline"
      >
        View all <ArrowRight size={13} />
      </Link>
    </div>
  )
}

export default function NGODashboard() {
  const { requests, donors, currentUser, verifyRequest } = useApp()
  const pending = requests.filter((r) => r.status === "Verification Pending")
  const active = requests.filter(
    (r) => !["Fulfilled", "Created"].includes(r.status),
  )
  const availDonors = donors.filter((d) => d.available).length

  return (
    <DashboardLayout>
      <header className="ngo-welcome-card mb-8 overflow-hidden rounded-2xl shadow-[0_4px_18px_rgba(3,26,54,0.05)]">
        <div className="ngo-welcome-surface grid min-h-40 items-center gap-4 px-5 py-5 sm:grid-cols-[minmax(0,1fr)_200px] sm:px-7">
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-(--teal)">
              NGO Portal
            </p>
            <h1 className="font-display text-2xl font-extrabold text-(--text-primary) sm:text-[28px]">
              Welcome, {currentUser?.name}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-(--text-secondary)">
              Coordinate blood requests, verify donors, and manage your network.
            </p>
          </div>
          <div className="ngo-welcome-art" aria-hidden="true">
            <span className="ngo-art-orbit ngo-art-orbit-outer" />
            <span className="ngo-art-orbit ngo-art-orbit-inner" />
            <span className="ngo-art-node ngo-art-node-left"><Users size={18} /></span>
            <span className="ngo-art-node ngo-art-node-center"><HeartHandshake size={26} /></span>
            <span className="ngo-art-node ngo-art-node-right"><Droplets size={17} /></span>
          </div>
        </div>
      </header>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <NGOStatCard
            label="Donors in Network"
            value={donors.length}
            sub={`${availDonors} available now`}
            icon={Users}
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <NGOStatCard
            label="Pending Verification"
            value={pending.length}
            sub="Need your review"
            icon={FileCheck}
            tone="amber"
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <NGOStatCard
            label="Active Coordination"
            value={active.length}
            sub="Requests in progress"
            icon={Zap}
            tone="navy"
          />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <NGOStatCard
            label="Requests Coordinated"
            value={142}
            sub="This year"
            icon={BarChart3}
          />
        </motion.div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <section className="mb-7">
            <SectionHeading title="Pending Verification" to="/ngo/verification" />
            <div className="space-y-3">
              {pending.length === 0 ? (
                <div className={`${cardStyle} p-8 text-center`}>
                  <CheckCircle
                    size={28}
                    className="mx-auto mb-3 text-emerald-500"
                  />
                  <p className="text-sm text-[#617587]">
                    All caught up — no pending verifications.
                  </p>
                </div>
              ) : (
                pending.map((req, i) => (
                  <motion.article
                    key={req.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className={`${cardStyle} p-4 ${
                      req.urgency === "CRITICAL"
                        ? "border-red-200 bg-red-50/20"
                        : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <UrgencyBadge urgency={req.urgency} />
                          <span className="font-mono text-xs text-[#617587]">
                            {req.id}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-[#021734]">
                          {req.bloodGroup} · {req.units} units
                        </p>
                        <p className="mt-1 text-xs text-[#617587]">
                          {req.hospitalName} · {req.area}
                        </p>
                        {req.notes && (
                          <p className="mt-1 text-xs italic text-[#617587]">
                            "{req.notes}"
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => verifyRequest(req.id)}
                        className="whitespace-nowrap rounded-lg bg-[#E51C3D] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#C91532] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E51C3D]"
                      >
                        Verify Request
                      </button>
                    </div>
                  </motion.article>
                ))
              )}
            </div>
          </section>

          <section>
            <SectionHeading title="Active Coordination" to="/ngo/requests" />
            <div className="space-y-2">
              {active.slice(0, 4).map((r) => (
                <article
                  key={r.id}
                  className={`${cardStyle} flex items-center justify-between gap-3 px-4 py-3`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <UrgencyBadge urgency={r.urgency} />
                    <span className="shrink-0 font-mono text-xs text-[#617587]">
                      {r.id}
                    </span>
                    <span className="truncate text-sm font-medium text-[#021734]">
                      {r.bloodGroup} · {r.hospitalName}
                    </span>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#EAF0F5] px-2.5 py-1 text-xs text-[#617587]">
                    {r.status}
                  </span>
                </article>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className={`${cardStyle} p-5`}>
            <h3 className="mb-4 text-sm font-bold text-[#021734]">
              Quick Actions
            </h3>
            <div className="space-y-2">
              {[
                { label: "Manage Donors", to: "/ngo/donors", icon: Users },
                { label: "Run Matching", to: "/ngo/matching", icon: Zap },
                { label: "View Analytics", to: "/ngo/analytics", icon: BarChart3 },
                { label: "Donor Capacity", to: "/ngo/capacity", icon: Users },
              ].map(({ label, to, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center gap-3 rounded-lg border border-[#D8E3EA] px-3 py-2.5 text-sm font-medium text-[#021734] transition-colors hover:border-[#E51C3D]/30 hover:bg-[#FFF1F3]"
                >
                  <Icon size={16} className="text-[#E51C3D]" />
                  <span className="flex-1">{label}</span>
                  <ArrowRight size={14} className="text-[#617587]" />
                </Link>
              ))}
            </div>
          </section>

          <section className={`${cardStyle} p-5`}>
            <h3 className="mb-3 text-sm font-bold text-[#021734]">
              Donor Availability
            </h3>
            <div className="space-y-3">
              {[
                { label: "Available Now", count: availDonors, color: "bg-emerald-500" },
                {
                  label: "Temporarily Unavailable",
                  count: donors.filter(
                    (d) => d.status === "Temporarily Unavailable",
                  ).length,
                  color: "bg-amber-400",
                },
                {
                  label: "Inactive",
                  count: donors.filter((d) => d.status === "Inactive").length,
                  color: "bg-slate-300",
                },
              ].map(({ label, count, color }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${color}`} />
                  <span className="flex-1 text-xs text-[#617587]">{label}</span>
                  <span className="text-sm font-bold text-[#021734]">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </DashboardLayout>
  )
}
