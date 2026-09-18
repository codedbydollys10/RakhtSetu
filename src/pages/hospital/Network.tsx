import React from "react";
import { motion } from "framer-motion";
import { Building2, Users, MessageSquare, Network, CheckCircle, Wifi, WifiOff } from "lucide-react";
import DashboardLayout, { PageHeader } from "../../components/layout/DashboardLayout";
import { VerificationBadge } from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { hospitals, ngos } from "../../context/AppContext";

export default function HospitalNetwork() {
  const partnerHospitals = hospitals.filter((h) => h.id !== "h1");
  return (
    <DashboardLayout>
      <PageHeader
        title="Hospital Network"
        subtitle="Partner hospitals and NGOs in your coordination network."
      />
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Partner Hospitals */}
        <div>
          <h2 className="text-base font-display font-bold text-[#021734] mb-4 flex items-center gap-2">
            <Building2 size={16} className="text-[#036D7D]" /> Partner Hospitals
          </h2>
          <div className="space-y-3">
            {partnerHospitals.map((h, i) => (
              <motion.div key={h.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                className="bg-white rounded-xl border border-[#C0D2DE]/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-[#021734] text-sm">{h.name}</h3>
                      {h.verified && <VerificationBadge type="Hospital" />}
                    </div>
                    <p className="text-xs text-[#021734]/50">{h.area}, {h.city}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs flex-wrap">
                      <span className={`flex items-center gap-1 ${h.networkStatus === "Online" ? "text-emerald-600" : "text-gray-400"}`}>
                        {h.networkStatus === "Online" ? <Wifi size={11} /> : <WifiOff size={11} />}
                        {h.networkStatus}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full ${h.bloodBankStatus === "Critical" ? "bg-red-50 text-red-600" : h.bloodBankStatus === "Low" ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}>
                        Blood Bank: {h.bloodBankStatus}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Button size="sm" variant="outline">Request Support</Button>
                    <Button size="sm" variant="ghost">
                      <MessageSquare size={12} /> Message
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Partner NGOs */}
        <div>
          <h2 className="text-base font-display font-bold text-[#021734] mb-4 flex items-center gap-2">
            <Users size={16} className="text-[#036D7D]" /> Partner NGOs
          </h2>
          <div className="space-y-3">
            {ngos.map((n, i) => (
              <motion.div key={n.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                className="bg-white rounded-xl border border-[#C0D2DE]/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-[#021734] text-sm">{n.name}</h3>
                      {n.verified && <VerificationBadge type="NGO" />}
                    </div>
                    <p className="text-xs text-[#021734]/50">{n.area}, {n.city}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs flex-wrap">
                      <span className={`flex items-center gap-1 ${n.activeNetwork ? "text-emerald-600" : "text-gray-400"}`}>
                        <CheckCircle size={11} /> {n.activeNetwork ? "Active Network" : "Inactive"}
                      </span>
                      <span className="text-[#021734]/40">{n.donorCount} donors · {n.requestsCoordinated} requests</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Button size="sm" variant="outline">
                      <Network size={12} /> View Activity
                    </Button>
                    <Button size="sm" variant="ghost">
                      <MessageSquare size={12} /> Message
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Shared Capacity */}
      <div className="mt-8 bg-[#021734] rounded-2xl p-6">
        <h2 className="text-white font-display font-bold text-lg mb-4">Shared Capacity Overview</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { label: "Total Network Donors", value: "775" },
            { label: "Active Coordination Requests", value: "12" },
            { label: "Requests Fulfilled This Month", value: "48" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/10 rounded-xl p-4 text-center">
              <p className="text-3xl font-display font-bold text-white">{value}</p>
              <p className="text-xs text-white/40 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
