import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, FileCheck, Zap, BarChart3, ArrowRight, CheckCircle } from "lucide-react";
import DashboardLayout, { PageHeader } from "../../components/layout/DashboardLayout";
import { StatCard } from "../../components/ui/Card";
import { UrgencyBadge } from "../../components/ui/Badge";
import { useApp } from "../../context/AppContext";

export default function NGODashboard() {
  const { requests, donors, currentUser, verifyRequest } = useApp();
  const pending = requests.filter((r) => r.status === "Verification Pending");
  const active = requests.filter((r) => !["Fulfilled", "Created"].includes(r.status));
  const availDonors = donors.filter((d) => d.available).length;

  return (
    <DashboardLayout>
      <PageHeader
        title={`Welcome, ${currentUser?.name}`}
        subtitle="Coordinate blood requests, verify donors, and manage your network."
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <StatCard label="Donors in Network" value={donors.length} sub={`${availDonors} available now`} icon={<Users size={18} />} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <StatCard label="Pending Verification" value={pending.length} sub="Need your review" icon={<FileCheck size={18} />} accent="bg-amber-50 text-amber-600" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <StatCard label="Active Coordination" value={active.length} sub="Requests in progress" icon={<Zap size={18} />} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <StatCard label="Requests Coordinated" value={142} sub="This year" icon={<BarChart3 size={18} />} accent="bg-[#036D7D]/10 text-[#036D7D]" />
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Pending Verification */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-bold text-[#021734]">Pending Verification</h2>
            <Link to="/ngo/verification" className="text-xs text-[#036D7D] hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            {pending.length === 0 ? (
              <div className="bg-white rounded-xl border border-[#C0D2DE]/60 p-8 text-center">
                <CheckCircle size={28} className="text-emerald-500 mx-auto mb-3" />
                <p className="text-sm text-[#021734]/50">All caught up — no pending verifications.</p>
              </div>
            ) : (
              pending.map((req, i) => (
                <motion.div key={req.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                  className={`bg-white rounded-xl border p-4 ${req.urgency === "CRITICAL" ? "border-red-200 bg-red-50/20" : "border-[#C0D2DE]/60"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <UrgencyBadge urgency={req.urgency} />
                        <span className="font-mono text-xs text-[#021734]/40">{req.id}</span>
                      </div>
                      <p className="font-semibold text-[#021734] text-sm">{req.bloodGroup} · {req.units} units</p>
                      <p className="text-xs text-[#021734]/50 mt-1">{req.hospitalName} · {req.area}</p>
                      {req.notes && <p className="text-xs text-[#021734]/40 mt-1 italic">"{req.notes}"</p>}
                    </div>
                    <button
                      onClick={() => verifyRequest(req.id)}
                      className="px-3 py-1.5 bg-[#036D7D] text-white text-xs font-medium rounded-lg hover:bg-[#057080] transition-colors whitespace-nowrap"
                    >
                      Verify Request
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Active requests brief */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-display font-bold text-[#021734]">Active Coordination</h2>
              <Link to="/ngo/requests" className="text-xs text-[#036D7D] hover:underline flex items-center gap-1">View all <ArrowRight size={12} /></Link>
            </div>
            <div className="space-y-2">
              {active.slice(0, 4).map((r) => (
                <div key={r.id} className="bg-white rounded-lg border border-[#C0D2DE]/60 px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <UrgencyBadge urgency={r.urgency} />
                    <span className="font-mono text-xs text-[#021734]/40">{r.id}</span>
                    <span className="text-sm font-medium text-[#021734] truncate">{r.bloodGroup} · {r.hospitalName}</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 bg-[#C0D2DE]/30 rounded-full text-[#021734]/60 flex-shrink-0">{r.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="space-y-4">
          <div className="bg-[#021734] rounded-xl p-5">
            <h3 className="text-white font-semibold text-sm mb-4">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { label: "Manage Donors", to: "/ngo/donors", icon: Users },
                { label: "Run Matching", to: "/ngo/matching", icon: Zap },
                { label: "View Analytics", to: "/ngo/analytics", icon: BarChart3 },
                { label: "Donor Capacity", to: "/ngo/capacity", icon: Users },
              ].map(({ label, to, icon: Icon }) => (
                <Link key={to} to={to} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white text-sm">
                  <Icon size={14} className="text-[#79C3D0]" />
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-[#C0D2DE]/60 p-5">
            <h3 className="text-sm font-semibold text-[#021734] mb-3">Donor Availability</h3>
            <div className="space-y-2">
              {[
                { label: "Available Now", count: availDonors, color: "bg-emerald-500" },
                { label: "Temporarily Unavailable", count: donors.filter(d => d.status === "Temporarily Unavailable").length, color: "bg-amber-400" },
                { label: "Inactive", count: donors.filter(d => d.status === "Inactive").length, color: "bg-gray-300" },
              ].map(({ label, count, color }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />
                  <span className="text-xs text-[#021734]/60 flex-1">{label}</span>
                  <span className="text-xs font-semibold text-[#021734]">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
