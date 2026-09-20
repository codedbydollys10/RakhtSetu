import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Droplets, Search } from "lucide-react";
import DashboardLayout, { PageHeader } from "../../components/layout/DashboardLayout";
import { UrgencyBadge } from "../../components/ui/Badge";
import Timeline from "../../components/ui/Timeline";
import Button from "../../components/ui/Button";
import { useApp } from "../../context/AppContext";
import { type BloodGroup, type Urgency } from "../../data/mockData";

export default function HospitalRequests() {
  const { requests, createRequest, updateRequestStatus, currentUser } = useApp();
  const myRequests = requests.filter((r) => r.hospitalId === currentUser?.id);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "fulfilled">("all");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ bloodGroup: "O+" as BloodGroup, units: 2, urgency: "URGENT" as Urgency, notes: "", area: "Andheri" });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const filtered = myRequests.filter((r) => {
    if (filter === "active" && r.status === "Fulfilled") return false;
    if (filter === "fulfilled" && r.status !== "Fulfilled") return false;
    if (search && !r.id.toLowerCase().includes(search.toLowerCase()) && !r.bloodGroup.includes(search)) return false;
    return true;
  });

  const selectedReq = myRequests.find((r) => r.id === selected);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      createRequest({ ...form, hospitalId: currentUser?.id ?? "", hospitalName: currentUser?.name ?? "Hospital" });
      setSubmitting(false);
      setSuccess(true);
      setTimeout(() => { setSuccess(false); setShowCreate(false); }, 2000);
    }, 800);
  };

  return (
    <DashboardLayout>
      <PageHeader
        title="Blood Requests"
        subtitle="Manage and track all blood requests from CityCare Hospital."
        actions={
          <Button onClick={() => setShowCreate(true)} size="sm">
            <Plus size={14} /> New Request
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#021734]/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID or blood group..."
            className="w-full pl-8 pr-3 py-2 rounded-lg border border-[#C0D2DE] text-sm focus:outline-none focus:ring-2 focus:ring-[#036D7D]/30 bg-white"
          />
        </div>
        {(["all", "active", "fulfilled"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${filter === f ? "bg-[#036D7D] text-white" : "bg-white border border-[#C0D2DE] text-[#021734]/60 hover:border-[#036D7D]/50"}`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* List */}
        <div className="lg:col-span-2 space-y-3">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#C0D2DE]/60 p-10 text-center">
              <Droplets size={28} className="text-[#C0D2DE] mx-auto mb-3" />
              <p className="text-sm text-[#021734]/50">No requests found</p>
              <p className="text-xs text-[#021734]/30 mt-1">Try adjusting your filters.</p>
            </div>
          ) : filtered.map((req, i) => (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => setSelected(req.id === selected ? null : req.id)}
              className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-sm ${req.urgency === "CRITICAL" ? "border-red-200" : "border-[#C0D2DE]/60"} ${selected === req.id ? "ring-2 ring-[#036D7D]/40" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <UrgencyBadge urgency={req.urgency} />
                    <span className="font-mono text-xs text-[#021734]/40">{req.id}</span>
                  </div>
                  <p className="font-semibold text-[#021734]">{req.bloodGroup} · {req.units} units</p>
                  {req.notes && <p className="text-xs text-[#021734]/50 mt-1 line-clamp-1">{req.notes}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-xs px-2 py-0.5 bg-[#C0D2DE]/30 rounded-full text-[#021734]/60">{req.status}</span>
                  {req.status !== "Fulfilled" && req.status !== "Verification Pending" && (
                    <div className="mt-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); updateRequestStatus(req.id, "Fulfilled"); }}
                        className="text-xs text-emerald-600 hover:underline"
                      >
                        Mark Fulfilled
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {req.verifiedBy && (
                <p className="text-xs text-[#036D7D] mt-2">✓ Verified by {req.verifiedBy}</p>
              )}
            </motion.div>
          ))}
        </div>

        {/* Detail */}
        <div>
          {selectedReq ? (
            <div className="bg-white rounded-xl border border-[#C0D2DE]/60 p-5 sticky top-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-[#021734]">{selectedReq.id}</h3>
                <button onClick={() => setSelected(null)}><X size={14} className="text-[#021734]/40" /></button>
              </div>
              <div className="space-y-3 text-xs text-[#021734]/60 mb-5">
                <div className="flex justify-between"><span>Blood Group</span><span className="font-semibold text-[#021734]">{selectedReq.bloodGroup}</span></div>
                <div className="flex justify-between"><span>Units</span><span className="font-semibold text-[#021734]">{selectedReq.units}</span></div>
                <div className="flex justify-between"><span>Urgency</span><UrgencyBadge urgency={selectedReq.urgency} /></div>
                <div className="flex justify-between"><span>Area</span><span className="font-semibold text-[#021734]">{selectedReq.area}</span></div>
                {selectedReq.verifiedBy && <div className="flex justify-between"><span>Verified by</span><span className="font-semibold text-[#036D7D]">{selectedReq.verifiedBy}</span></div>}
                {selectedReq.matchedDonors && <div className="flex justify-between"><span>Matched donors</span><span className="font-semibold text-[#021734]">{selectedReq.matchedDonors.length}</span></div>}
              </div>
              <h4 className="text-xs font-semibold text-[#021734] mb-3 uppercase tracking-wide">Request Lifecycle</h4>
              <Timeline currentStatus={selectedReq.status} />
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#C0D2DE]/60 p-6 text-center">
              <Droplets size={24} className="text-[#C0D2DE] mx-auto mb-2" />
              <p className="text-xs text-[#021734]/40">Select a request to view its lifecycle</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreate(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-display font-bold text-[#021734]">New Blood Request</h3>
                <button onClick={() => setShowCreate(false)}><X size={18} className="text-[#021734]/40" /></button>
              </div>
              {success ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">✓</div>
                  <p className="text-sm font-semibold text-[#021734]">Blood request submitted.</p>
                  <p className="text-xs text-[#021734]/50 mt-1">Your request is now awaiting verification by your NGO partner.</p>
                </div>
              ) : (
                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-[#021734]/60 mb-1.5 block">Blood Group</label>
                    <select value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value as BloodGroup })}
                      className="w-full px-3 py-2.5 rounded-lg border border-[#C0D2DE] text-sm focus:outline-none focus:ring-2 focus:ring-[#036D7D]/30">
                      {["O+","O-","A+","A-","B+","B-","AB+","AB-"].map(g => <option key={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#021734]/60 mb-1.5 block">Units Required</label>
                    <input type="number" min={1} max={10} value={form.units} onChange={(e) => setForm({ ...form, units: +e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg border border-[#C0D2DE] text-sm focus:outline-none focus:ring-2 focus:ring-[#036D7D]/30" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#021734]/60 mb-1.5 block">Urgency</label>
                    <select value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value as Urgency })}
                      className="w-full px-3 py-2.5 rounded-lg border border-[#C0D2DE] text-sm focus:outline-none focus:ring-2 focus:ring-[#036D7D]/30">
                      <option>CRITICAL</option><option>URGENT</option><option>NORMAL</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#021734]/60 mb-1.5 block">Area</label>
                    <select value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg border border-[#C0D2DE] text-sm focus:outline-none focus:ring-2 focus:ring-[#036D7D]/30">
                      {["Andheri","Bandra","Borivali","Thane","Mulund","Ghatkopar","Dadar","Kurla"].map(a => <option key={a}>{a}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#021734]/60 mb-1.5 block">Notes (optional)</label>
                    <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      rows={2} placeholder="Clinical context for verification team..."
                      className="w-full px-3 py-2.5 rounded-lg border border-[#C0D2DE] text-sm focus:outline-none focus:ring-2 focus:ring-[#036D7D]/30 resize-none" />
                  </div>
                  <p className="text-xs text-[#021734]/40 bg-[#FBFBFD] rounded-lg p-3">
                    This request will be sent for verification before donors are contacted. Final medical decisions rest with authorised professionals.
                  </p>
                  <Button type="submit" loading={submitting} className="w-full">Submit Request</Button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
