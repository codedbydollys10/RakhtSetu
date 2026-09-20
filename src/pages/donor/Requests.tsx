import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Droplets, CheckCircle } from "lucide-react";
import DashboardLayout, { PageHeader } from "../../components/layout/DashboardLayout";
import { UrgencyBadge } from "../../components/ui/Badge";
import { useApp } from "../../context/AppContext";

export default function DonorRequests() {
  const { requests, donors, currentUser, updateRequestStatus } = useApp();
  const me = donors.find((d) => d.id === currentUser?.id);
  const [responded, setResponded] = useState<string[]>([]);

  const myRequests = requests.filter((r) =>
    ["Donors Contacted", "Verified", "Matching", "Donor Confirmed"].includes(r.status) &&
    (r.matchedDonors?.includes(currentUser?.id ?? "") || r.confirmedDonor === currentUser?.id)
  );

  const handleAccept = (reqId: string) => {
    setResponded((r) => [...r, reqId]);
    updateRequestStatus(reqId, "Donor Confirmed");
  };

  return (
    <DashboardLayout>
      <PageHeader title="My Requests" subtitle="Blood requests that have been matched with your profile." />
      <div className="space-y-4 max-w-2xl">
        {myRequests.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#C0D2DE]/60 p-10 text-center">
            <Droplets size={28} className="text-[#C0D2DE] mx-auto mb-3" />
            <p className="text-sm text-[#021734]/50">Your donor network currently has no matching requests.</p>
            <p className="text-xs text-[#021734]/30 mt-1">Ensure your availability is toggled on to receive requests.</p>
          </div>
        ) : myRequests.map((req, i) => (
          <motion.div key={req.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className={`bg-white rounded-xl border p-5 ${req.urgency === "CRITICAL" ? "border-red-200" : "border-[#C0D2DE]/60"}`}>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <UrgencyBadge urgency={req.urgency} />
              <span className="font-mono text-xs text-[#021734]/40">{req.id}</span>
              <span className="text-xs px-2 py-0.5 bg-[#C0D2DE]/30 rounded-full text-[#021734]/60">{req.status}</span>
            </div>
            <p className="font-semibold text-[#021734]">{req.bloodGroup} · {req.units} units required</p>
            <p className="text-sm text-[#021734]/50 mt-1">{req.hospitalName} · {req.area}</p>
            {req.verifiedBy && <p className="text-xs text-[#036D7D] mt-1.5">✓ Verified by {req.verifiedBy}</p>}
            {req.notes && <p className="text-xs text-[#021734]/40 mt-2 bg-[#F0F6F8] p-2.5 rounded-lg italic">"{req.notes}"</p>}

            <div className="mt-4">
              <AnimatePresence>
                {responded.includes(req.id) || req.status === "Donor Confirmed" ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-4 py-3 rounded-lg">
                    <CheckCircle size={16} />
                    Your response has been sent. The hospital and NGO have been notified.
                  </motion.div>
                ) : (
                  <div className="flex gap-3">
                    <button onClick={() => handleAccept(req.id)}
                      className="flex-1 py-2.5 bg-[#036D7D] text-white font-semibold rounded-lg hover:bg-[#057080] transition-colors flex items-center justify-center gap-2">
                      <Heart size={15} /> I Can Help
                    </button>
                    <button className="px-5 py-2.5 border border-[#C0D2DE] text-[#021734]/60 rounded-lg hover:border-[#021734]/40 transition-colors text-sm">
                      Decline
                    </button>
                  </div>
                )}
              </AnimatePresence>
            </div>
            <p className="text-[10px] text-[#021734]/30 mt-2 text-center">
              Final medical eligibility is determined by professionals at the donation site.
            </p>
          </motion.div>
        ))}
      </div>
    </DashboardLayout>
  );
}
