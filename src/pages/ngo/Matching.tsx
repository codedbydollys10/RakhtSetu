import React, { useState } from "react";
import { motion } from "framer-motion";
import { Zap, MapPin, CheckCircle, AlertCircle } from "lucide-react";
import DashboardLayout, { PageHeader } from "../../components/layout/DashboardLayout";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { UrgencyBadge } from "../../components/ui/Badge";
import { useApp } from "../../context/AppContext";

export default function NGOMatching() {
  const { requests, donors, contactDonor, updateRequestStatus } = useApp();
  const [selectedReq, setSelectedReq] = useState<string | null>(null);
  const [contacted, setContacted] = useState<string[]>([]);
  const verifiedReqs = requests.filter((r) => ["Verified", "Matching", "Donors Contacted"].includes(r.status));

  const getMatches = (req: typeof requests[0]) => {
    return donors
      .filter((d) => {
        if (!d.available) return false;
        const compatible: Record<string, string[]> = {
          "O+": ["O+", "O-"], "O-": ["O-"], "A+": ["A+", "A-", "O+", "O-"],
          "A-": ["A-", "O-"], "B+": ["B+", "B-", "O+", "O-"], "B-": ["B-", "O-"],
          "AB+": ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"],
          "AB-": ["A-", "B-", "O-", "AB-"],
        };
        return compatible[req.bloodGroup]?.includes(d.bloodGroup);
      })
      .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  };

  const handleContact = (donorId: string, reqId: string) => {
    contactDonor(donorId, reqId, "UPAY Community Network");
    setContacted((c) => [...c, `${donorId}:${reqId}`]);
    updateRequestStatus(reqId, "Donors Contacted");
  };

  return (
    <DashboardLayout>
      <PageHeader title="Donor Matching" subtitle="AI-assisted coordination matching — not medical eligibility determination." />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Request selector */}
        <div>
          <h2 className="text-sm font-semibold text-[#021734] mb-3">Select a Request to Match</h2>
          <div className="space-y-2">
            {verifiedReqs.length === 0 ? (
              <div className="bg-white rounded-xl border border-[#C0D2DE]/60 p-8 text-center">
                <p className="text-sm text-[#021734]/50">No verified requests to match.</p>
                <p className="text-xs text-[#021734]/30 mt-1">Verify requests first in the Verification tab.</p>
              </div>
            ) : verifiedReqs.map((req) => (
              <button key={req.id} onClick={() => setSelectedReq(req.id === selectedReq ? null : req.id)}
                className={`w-full text-left bg-white rounded-xl border p-4 transition-all ${selectedReq === req.id ? "border-[#036D7D] ring-2 ring-[#036D7D]/30" : "border-[#C0D2DE]/60 hover:border-[#036D7D]/40"}`}>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <UrgencyBadge urgency={req.urgency} />
                  <span className="font-mono text-xs text-[#021734]/40">{req.id}</span>
                </div>
                <p className="text-sm font-semibold text-[#021734]">{req.bloodGroup} · {req.units} units</p>
                <p className="text-xs text-[#021734]/50">{req.hospitalName}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Matches */}
        <div>
          <h2 className="text-sm font-semibold text-[#021734] mb-3">
            {selectedReq ? `Matched Donors for ${selectedReq}` : "Select a request to see matches"}
          </h2>
          {selectedReq && (() => {
            const req = requests.find((r) => r.id === selectedReq)!;
            const matches = getMatches(req);
            return (
              <div className="space-y-3">
                <p className="text-xs text-[#021734]/40 italic bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                  Coordination score — not medical eligibility. Final decisions rest with authorised medical professionals.
                </p>
                {matches.length === 0 ? (
                  <div className="bg-white rounded-xl border border-[#C0D2DE]/60 p-6 text-center">
                    <AlertCircle size={24} className="text-[#C0D2DE] mx-auto mb-2" />
                    <p className="text-sm text-[#021734]/50">No available donors match this blood group.</p>
                  </div>
                ) : matches.map((d, i) => {
                  const alreadyContacted = contacted.includes(`${d.id}:${selectedReq}`);
                  const contactedElsewhere = d.contactedBy?.some(c => c.includes(selectedReq) && !c.includes("UPAY")) || false;
                  return (
                    <motion.div key={d.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                      className="bg-white rounded-xl border border-[#C0D2DE]/60 p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#021734] text-white flex items-center justify-center font-bold flex-shrink-0">
                          {d.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-[#021734]">{d.name}</p>
                            <Badge variant="active" label="Available" />
                          </div>
                          <div className="flex items-center gap-2 text-xs text-[#021734]/50 mt-0.5 flex-wrap">
                            <span className="font-mono text-[#036D7D]">{d.bloodGroup}</span>
                            <span className="flex items-center gap-1"><MapPin size={10} />{d.area}</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xl font-display font-bold text-[#036D7D]">{d.matchScore}%</p>
                        </div>
                      </div>

                      {contactedElsewhere ? (
                        <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                          <AlertCircle size={12} />
                          Already contacted for {selectedReq} by another NGO
                        </div>
                      ) : alreadyContacted ? (
                        <div className="mt-3 flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
                          <CheckCircle size={12} />
                          Donor contacted — awaiting response
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => handleContact(d.id, req.id)}>
                          <Zap size={12} /> Contact Donor
                        </Button>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>
    </DashboardLayout>
  );
}
