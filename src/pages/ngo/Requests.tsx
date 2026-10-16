import React, { useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import DashboardLayout, { PageHeader } from "../../components/layout/DashboardLayout";
import { UrgencyBadge } from "../../components/ui/Badge";
import Timeline from "../../components/ui/Timeline";
import { useApp } from "../../context/AppContext";

export default function NGORequests() {
  const { requests, requestFeedError, updateRequestStatus } = useApp();
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = requests.filter((r) => {
    if (search && !r.id.includes(search) && !r.bloodGroup.includes(search) && !r.hospitalName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const sel = requests.find((r) => r.id === selected);
  const markFulfilled = async (requestId: string) => {
    setActionError(null);
    try {
      await updateRequestStatus(requestId, "Fulfilled");
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Unable to update this request.",
      );
    }
  };

  return (
    <DashboardLayout>
      <PageHeader title="All Requests" subtitle="Requests assigned to your verified NGO." />
      {(requestFeedError || actionError) && (
        <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {requestFeedError
            ? `Requests could not be loaded: ${requestFeedError}`
            : actionError}
        </p>
      )}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#021734]/30" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search requests..."
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-[#C0D2DE] text-sm focus:outline-none focus:ring-2 focus:ring-[#036D7D]/30 bg-white" />
        </div>
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {filtered.map((req, i) => (
            <motion.div key={req.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              onClick={() => setSelected(req.id === selected ? null : req.id)}
              className={`bg-white rounded-xl border p-4 cursor-pointer hover:shadow-sm transition-all ${req.urgency === "CRITICAL" ? "border-red-200" : "border-[#C0D2DE]/60"} ${selected === req.id ? "ring-2 ring-[#036D7D]/40" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <UrgencyBadge urgency={req.urgency} />
                    <span className="font-mono text-xs text-[#021734]/40">{req.id}</span>
                  </div>
                  <p className="font-semibold text-[#021734] text-sm">{req.bloodGroup} · {req.units} units</p>
                  <p className="text-xs text-[#021734]/50 mt-0.5">{req.hospitalName} · {req.area || req.locationAddress || "Location not specified"}</p>
                </div>
                <span className="text-xs px-2 py-0.5 bg-[#C0D2DE]/30 rounded-full text-[#021734]/60">{req.status}</span>
              </div>
              {req.verifiedBy && <p className="text-xs text-[#036D7D] mt-2">✓ Verified by {req.verifiedBy}</p>}
            </motion.div>
          ))}
        </div>
        <div>
          {sel ? (
            <div className="bg-white rounded-xl border border-[#C0D2DE]/60 p-5 sticky top-4">
              <h3 className="text-sm font-semibold text-[#021734] mb-4">{sel.id}</h3>
              <div className="space-y-2 text-xs text-[#021734]/60 mb-5">
                <div className="flex justify-between"><span>Blood Group</span><span className="font-semibold text-[#021734]">{sel.bloodGroup}</span></div>
                <div className="flex justify-between"><span>Units</span><span className="font-semibold text-[#021734]">{sel.units}</span></div>
                <div className="flex justify-between"><span>Urgency</span><span className="font-semibold text-[#021734]">{sel.urgency}</span></div>
                <div className="flex justify-between"><span>Hospital</span><span className="font-semibold text-[#021734]">{sel.hospitalName}</span></div>
                <div className="flex justify-between"><span>Location</span><span className="font-semibold text-[#021734]">{sel.area || sel.locationAddress || "Not specified"}</span></div>
                <div className="flex justify-between"><span>Required by</span><span className="font-semibold text-[#021734]">{sel.requiredBy ? new Date(sel.requiredBy).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "As soon as possible"}</span></div>
                <div className="flex justify-between"><span>Status</span><span className="font-semibold text-[#021734]">{sel.status}</span></div>
              </div>
              <h4 className="text-xs font-semibold text-[#021734] mb-3 uppercase tracking-wide">Lifecycle</h4>
              <Timeline currentStatus={sel.status} />
              {["Verified", "Matching", "Donors Contacted", "Donor Confirmed", "Hospital Confirmation"].includes(sel.status) && (
                <button onClick={() => void markFulfilled(sel.id)}
                  className="mt-4 w-full py-2 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
                  Mark Fulfilled
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#C0D2DE]/60 p-6 text-center text-xs text-[#021734]/40">
              Select a request to view its lifecycle
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
