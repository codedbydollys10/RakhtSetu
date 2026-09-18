import React from "react";
import { motion } from "framer-motion";
import { Building2, Users, MessageSquare, Network, CheckCircle } from "lucide-react";
import DashboardLayout, { PageHeader } from "../../components/layout/DashboardLayout";
import { VerificationBadge } from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { hospitals, ngos } from "../../context/AppContext";

export default function NGOPartners() {
  return (
    <DashboardLayout>
      <PageHeader title="Partner Organisations" subtitle="Hospitals, NGOs, and partner organisations in your coordination network." />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Hospitals */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-base font-display font-bold text-[#021734] mb-4 flex items-center gap-2">
              <Building2 size={16} className="text-[#036D7D]" /> Hospitals
            </h2>
            <div className="space-y-3">
              {hospitals.map((h, i) => (
                <motion.div key={h.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="bg-white rounded-xl border border-[#C0D2DE]/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-[#021734] text-sm">{h.name}</h3>
                        {h.verified && <VerificationBadge type="Hospital" />}
                      </div>
                      <p className="text-xs text-[#021734]/50">{h.area}, {h.city}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-[#021734]/40">
                        <span className={h.networkStatus === "Online" ? "text-emerald-600" : "text-gray-400"}>● {h.networkStatus}</span>
                        <span>Blood Bank: {h.bloodBankStatus}</span>
                        <span>{h.requestsCoordinated} requests</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Button size="sm" variant="outline">Request Support</Button>
                      <Button size="sm" variant="ghost"><MessageSquare size={12} /> Message</Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-base font-display font-bold text-[#021734] mb-4 flex items-center gap-2">
              <Users size={16} className="text-[#036D7D]" /> NGO Partners
            </h2>
            <div className="space-y-3">
              {ngos.filter(n => n.id !== "n1").map((n, i) => (
                <motion.div key={n.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="bg-white rounded-xl border border-[#C0D2DE]/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-[#021734] text-sm">{n.name}</h3>
                        {n.verified && <VerificationBadge type="NGO" />}
                      </div>
                      <p className="text-xs text-[#021734]/50">{n.area}, {n.city}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-[#021734]/40">
                        <span className={n.activeNetwork ? "text-emerald-600" : "text-gray-400"}>
                          <CheckCircle size={10} className="inline mr-0.5" />{n.activeNetwork ? "Active" : "Inactive"}
                        </span>
                        <span>{n.donorCount} donors</span>
                        <span>{n.requestsCoordinated} coordinated</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Button size="sm" variant="outline"><Network size={12} /> Network Activity</Button>
                      <Button size="sm" variant="ghost"><MessageSquare size={12} /> Message</Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div>
          <div className="bg-[#021734] rounded-xl p-5 sticky top-4">
            <h3 className="text-white font-semibold text-sm mb-4">Network Summary</h3>
            <div className="space-y-3">
              {[
                { label: "Partner Hospitals", value: hospitals.length },
                { label: "Partner NGOs", value: ngos.length - 1 },
                { label: "Total Network Donors", value: 775 },
                { label: "Verified Organisations", value: hospitals.filter(h => h.verified).length + ngos.filter(n => n.verified).length },
                { label: "Active Coordination", value: 12 },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-white/10 last:border-0">
                  <span className="text-white/50 text-xs">{label}</span>
                  <span className="text-white font-semibold text-sm">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
