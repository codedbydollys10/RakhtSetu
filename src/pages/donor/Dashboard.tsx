import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Heart, Droplets, Clock, Award, ArrowRight, CheckCircle } from "lucide-react";
import DashboardLayout, { PageHeader } from "../../components/layout/DashboardLayout";
import { StatCard } from "../../components/ui/Card";
import { UrgencyBadge } from "../../components/ui/Badge";
import { useApp } from "../../context/AppContext";

export default function DonorDashboard() {
  const { donors, requests, currentUser, donorAvailability, toggleDonorAvailability, updateRequestStatus } = useApp();
  const donorRecord = donors.find((d) => d.id === currentUser?.id);
  const me = donorRecord ?? (currentUser ? {
    id: currentUser.id,
    name: currentUser.name,
    bloodGroup: "Not available",
    area: "",
    city: "",
    status: "Inactive" as const,
    available: donorAvailability ?? false,
    lastDonation: "Not recorded",
    donationsCount: 0,
    phone: "",
    matchScore: 0,
    contactedBy: [],
  } : null);
  const [responded, setResponded] = React.useState<string[]>([]);

  const relevantRequests = requests.filter((r) =>
    ["Donors Contacted", "Verified", "Matching"].includes(r.status) &&
    r.matchedDonors?.includes(currentUser?.id ?? "")
  );

  const handleAccept = (reqId: string) => {
    setResponded((r) => [...r, reqId]);
    updateRequestStatus(reqId, "Donor Confirmed");
  };

  const available = donorRecord ? donorAvailability ?? donorRecord.available : donorAvailability ?? false;

  if (!me) return null;

  return (
    <DashboardLayout>
      <PageHeader
        title={`Hello, ${me.name}`}
        subtitle="Your dashboard — availability, requests, and impact."
      />

      {/* Availability toggle */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-xl p-5 mb-6 flex items-center justify-between gap-4 ${available ? "bg-[#021734]" : "bg-[#F0F6F8] border border-[#C0D2DE]/60"}`}
      >
        <div>
          <p className={`font-semibold ${available ? "text-white" : "text-[#021734]"}`}>
            {available ? "You are currently available." : "You are currently unavailable."}
          </p>
          <p className={`text-xs mt-1 ${available ? "text-white/50" : "text-[#021734]/50"}`}>
            {available ? "You will be matched with compatible requests in your area." : "You won't be matched until you toggle availability back on."}
          </p>
        </div>
        <button
          onClick={() => currentUser && toggleDonorAvailability(currentUser.id)}
          className={`relative w-14 h-7 rounded-full transition-all duration-300 flex-shrink-0 ${available ? "bg-[#1C8791]" : "bg-[#CECFD3]"}`}
        >
          <motion.div
            layout
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="absolute top-0.5 w-6 h-6 bg-white rounded-full shadow"
            style={{ left: available ? "calc(100% - 1.75rem)" : "0.125rem" }}
          />
        </button>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <StatCard label="Total Donations" value={me.donationsCount} sub="Lifetime contributions" icon={<Droplets size={18} />} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <StatCard label="Blood Group" value={me.bloodGroup} sub="Universal donor compatible" icon={<Heart size={18} />} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <StatCard label="Last Donation" value={me.lastDonation === "Not recorded" ? "Not available" : me.lastDonation} sub="90-day interval respected" icon={<Clock size={18} />} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <StatCard label="Match Score" value={`${me.matchScore}%`} sub="Coordination score only" icon={<Award size={18} />} accent="bg-[#036D7D]/10 text-[#036D7D]" />
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Matching Requests */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-bold text-[#021734]">Requests Matching You</h2>
            <Link to="/donor/requests" className="text-xs text-[#036D7D] hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {relevantRequests.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#C0D2DE]/60 p-8 text-center">
              <Droplets size={28} className="text-[#C0D2DE] mx-auto mb-3" />
              <p className="text-sm text-[#021734]/50">No matching requests right now.</p>
              <p className="text-xs text-[#021734]/30 mt-1">You'll be notified when a compatible request arrives.</p>
            </div>
          ) : relevantRequests.map((req, i) => (
            <motion.div key={req.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
              className={`bg-white rounded-xl border p-4 mb-3 ${req.urgency === "CRITICAL" ? "border-red-200 bg-red-50/20" : "border-[#C0D2DE]/60"}`}>
              <div className="flex items-start gap-3 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <UrgencyBadge urgency={req.urgency} />
                    <span className="font-mono text-xs text-[#021734]/40">{req.id}</span>
                  </div>
                  <p className="font-semibold text-[#021734] text-sm">{req.bloodGroup} · {req.units} units needed</p>
                  <p className="text-xs text-[#021734]/50 mt-1">{req.hospitalName} · {req.area}</p>
                  {req.verifiedBy && <p className="text-xs text-[#036D7D] mt-0.5">✓ Verified by {req.verifiedBy}</p>}
                </div>
              </div>
              <AnimatePresence>
                {responded.includes(req.id) ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
                    <CheckCircle size={14} />
                    Response received — the hospital has been notified. Thank you.
                  </motion.div>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => handleAccept(req.id)}
                      className="flex-1 py-2 bg-[#036D7D] text-white text-sm font-semibold rounded-lg hover:bg-[#057080] transition-colors flex items-center justify-center gap-2">
                      <Heart size={14} /> I Can Help
                    </button>
                    <button className="px-4 py-2 border border-[#C0D2DE] text-[#021734]/60 text-sm rounded-lg hover:border-[#021734]/40 transition-colors">
                      Not available
                    </button>
                  </div>
                )}
              </AnimatePresence>
              <p className="text-[10px] text-[#021734]/30 mt-2 text-center">
                Final eligibility is determined by medical professionals at the donation site.
              </p>
            </motion.div>
          ))}
        </div>

        {/* Impact + info */}
        <div className="space-y-4">
          <div className="bg-[#021734] rounded-xl p-5">
            <h3 className="text-white font-semibold text-sm mb-4">Your Impact</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Lives potentially helped", value: `${me.donationsCount * 3}` },
                { label: "Donation area", value: me.area || "Not available" },
                { label: "Member since", value: "Not available" },
                { label: "Coordination score", value: `${me.matchScore}%` },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white/10 rounded-lg p-3">
                  <p className="text-xl font-display font-bold text-white">{value}</p>
                  <p className="text-xs text-white/40 mt-1">{label}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-white/30 mt-3">Coordination score only — not medical eligibility.</p>
          </div>

          <div className="bg-white rounded-xl border border-[#C0D2DE]/60 p-5">
            <h3 className="text-sm font-semibold text-[#021734] mb-3">Privacy Controls</h3>
            <p className="text-xs text-[#021734]/50 leading-relaxed mb-3">
              Your exact location is never displayed. Only your area and blood group are visible to verified organisations during active coordination.
            </p>
            <Link to="/donor/privacy" className="text-xs text-[#036D7D] hover:underline font-medium flex items-center gap-1">
              Manage privacy settings <ArrowRight size={11} />
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
