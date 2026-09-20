import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Droplets, Zap, Network, Bell, Plus, ArrowRight, Clock } from "lucide-react";
import DashboardLayout, { PageHeader } from "../../components/layout/DashboardLayout";
import { StatCard } from "../../components/ui/Card";
import { UrgencyBadge } from "../../components/ui/Badge";
import { useApp } from "../../context/AppContext";
import Timeline from "../../components/ui/Timeline";

export default function HospitalDashboard() {
  const { requests, notifications, currentUser } = useApp();
  const myRequests = requests.filter((r) => r.hospitalId === currentUser?.id);
  const active = myRequests.filter((r) => r.status !== "Fulfilled");
  const critical = myRequests.filter((r) => r.urgency === "CRITICAL" && r.status !== "Fulfilled");
  const unread = notifications.filter((n) => !n.read);

  return (
    <DashboardLayout>
      <PageHeader
        title={`Good morning, ${currentUser?.name}`}
        subtitle="Here's what needs your attention today."
        actions={
          <Link to="/hospital/requests/create" className="flex items-center gap-2 px-4 py-2 bg-[#036D7D] text-white rounded-lg text-sm font-medium transition-colors hover:bg-primary-hover">
            <Plus size={15} /> New Request
          </Link>
        }
      />

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <StatCard label="Active Requests" value={active.length} sub="Ongoing blood needs" icon={<Droplets size={18} />} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <StatCard label="Critical" value={critical.length} sub="Require immediate action" icon={<Zap size={18} />} accent="bg-red-50 text-red-600" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <StatCard label="Network Partners" value={4} sub="Active NGO connections" icon={<Network size={18} />} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <StatCard label="Notifications" value={unread.length} sub="Unread updates" icon={<Bell size={18} />} accent="bg-amber-50 text-amber-600" />
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Active Requests */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-bold text-[#021734]">Active Requests</h2>
            <Link to="/hospital/requests" className="text-xs text-[#036D7D] hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            {active.length === 0 ? (
              <div className="bg-white rounded-xl border border-border/60 p-8 text-center">
                <Droplets size={28} className="text-border mx-auto mb-3" />
                <p className="text-sm text-[#021734]/50">No active blood requests</p>
                <p className="text-xs text-[#021734]/30 mt-1">All current needs have been fulfilled.</p>
              </div>
            ) : (
              active.map((req, i) => (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <Link to={`/hospital/requests`}>
                    <div className={`bg-white rounded-xl border p-4 hover:shadow-sm transition-all ${req.urgency === "CRITICAL" ? "border-red-200 bg-red-50/20" : "border-border/60"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <UrgencyBadge urgency={req.urgency} />
                            <span className="font-mono text-xs text-[#021734]/40">{req.id}</span>
                          </div>
                          <p className="font-semibold text-[#021734]">
                            {req.bloodGroup} · {req.units} units
                          </p>
                          <p className="text-xs text-[#021734]/50 mt-1">{req.notes || `Blood required — ${req.area}`}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs px-2 py-0.5 bg-border/30 text-[#021734]/60 rounded-full">{req.status}</span>
                          <div className="flex items-center gap-1 mt-2 text-xs text-[#021734]/40 justify-end">
                            <Clock size={11} />
                            {new Date(req.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="space-y-6">
          {/* Critical request timeline */}
          {active.find((r) => r.urgency === "CRITICAL") && (
            <div className="bg-white rounded-xl border border-border/60 p-5">
              <h3 className="text-sm font-semibold text-[#021734] mb-4">Request Lifecycle — {active.find((r) => r.urgency === "CRITICAL")?.id}</h3>
              <Timeline currentStatus={active.find((r) => r.urgency === "CRITICAL")!.status} />
            </div>
          )}

          {/* Recent notifications */}
          <div className="bg-white rounded-xl border border-border/60 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#021734]">Recent Alerts</h3>
              <Link to="/hospital/notifications" className="text-xs text-[#036D7D] hover:underline">View all</Link>
            </div>
            <div className="space-y-3">
              {notifications.slice(0, 3).map((n) => (
                <div key={n.id} className={`flex gap-3 text-xs ${!n.read ? "opacity-100" : "opacity-60"}`}>
                  <div className="w-1.5 h-1.5 rounded-full bg-[#036D7D] mt-1.5 shrink-0" />
                  <div>
                    <p className="font-medium text-[#021734]">{n.title}</p>
                    <p className="text-[#021734]/50 mt-0.5 leading-relaxed">{n.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
