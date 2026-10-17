import React, { useState } from "react";
import { motion } from "framer-motion";
import { FileCheck, CheckCircle, Clock } from "lucide-react";
import DashboardLayout, { PageHeader } from "../../components/layout/DashboardLayout";
import { UrgencyBadge, VerificationBadge } from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { useApp } from "../../context/AppContext";

export default function NGOVerification() {
  const { requests, requestFeedError, verifyRequest } = useApp();
  const [actionError, setActionError] = useState<string | null>(null);
  const pending = requests.filter((r) => r.status === "Verification Pending");
  const verified = requests.filter((r) => Boolean(r.verifiedBy));
  const handleVerify = async (requestId: string) => {
    setActionError(null);
    try {
      await verifyRequest(requestId);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Unable to verify this request.",
      );
    }
  };

  return (
    <DashboardLayout>
      <PageHeader title="Request Verification" subtitle="Review and verify incoming blood requests before donor outreach." />
      {(requestFeedError || actionError) && (
        <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {requestFeedError
            ? `Requests could not be loaded: ${requestFeedError}`
            : actionError}
        </p>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pending */}
        <div>
          <h2 className="text-base font-display font-bold text-[#021734] mb-4 flex items-center gap-2">
            <Clock size={16} className="text-amber-500" />
            Pending Verification ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.length === 0 ? (
              <div className="bg-white rounded-xl border border-[#C0D2DE]/60 p-8 text-center">
                <CheckCircle size={28} className="text-emerald-500 mx-auto mb-3" />
                <p className="text-sm text-[#021734]/50">No pending verifications — all caught up.</p>
              </div>
            ) : pending.map((req, i) => (
              <motion.div key={req.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                className={`bg-white rounded-xl border p-4 ${req.urgency === "CRITICAL" ? "border-red-200" : "border-[#C0D2DE]/60"}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <UrgencyBadge urgency={req.urgency} />
                      <span className="font-mono text-xs text-[#021734]/40">{req.id}</span>
                    </div>
                    <p className="font-semibold text-[#021734] text-sm">{req.bloodGroup} · {req.units} units</p>
                    <p className="text-xs text-[#021734]/50 mt-1">
                      {req.hospitalName} · {req.area || req.locationAddress || "Location not specified"}
                    </p>
                    <p className="text-xs text-[#021734]/40 mt-1">
                      Required by: {req.requiredBy
                        ? new Date(req.requiredBy).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
                        : "As soon as possible"}
                    </p>
                    {req.notes && <p className="text-xs text-[#021734]/40 mt-2 bg-[#F0F6F8] p-2 rounded-lg italic">"{req.notes}"</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => void handleVerify(req.id)} className="flex-1">
                    <CheckCircle size={13} /> Verify Request
                  </Button>
                  <Button size="sm" variant="outline">Request More Info</Button>
                </div>
                <p className="text-[10px] text-[#021734]/30 mt-2">
                  Verification confirms organisational need — not medical eligibility.
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Verified by us */}
        <div>
          <h2 className="text-base font-display font-bold text-[#021734] mb-4 flex items-center gap-2">
            <FileCheck size={16} className="text-[#036D7D]" />
            Verified ({verified.length})
          </h2>
          <div className="space-y-3">
            {verified.map((req, i) => (
              <motion.div key={req.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-white rounded-xl border border-emerald-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="font-mono text-xs text-[#021734]/40">{req.id}</span>
                      <UrgencyBadge urgency={req.urgency} />
                    </div>
                    <p className="font-semibold text-[#021734] text-sm">{req.bloodGroup} · {req.units} units — {req.hospitalName}</p>
                    <p className="text-xs text-[#021734]/40 mt-1">{req.status}</p>
                  </div>
                  <VerificationBadge type="Requirement" />
                </div>
              </motion.div>
            ))}
            {verified.length === 0 && (
              <div className="bg-white rounded-xl border border-[#C0D2DE]/60 p-8 text-center">
                <p className="text-sm text-[#021734]/50">No verified requests yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
