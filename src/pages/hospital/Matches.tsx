import React from "react";
import { motion } from "framer-motion";
import { Zap, User, MapPin } from "lucide-react";
import DashboardLayout, { PageHeader } from "../../components/layout/DashboardLayout";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { useApp } from "../../context/AppContext";

export default function HospitalMatches() {
  const { donors, requests } = useApp();
  const activeReqs = requests.filter((r) => r.matchedDonors && r.matchedDonors.length > 0);

  return (
    <DashboardLayout>
      <PageHeader title="Donor Matches" subtitle="Coordination match scores — not medical eligibility." />
      <div className="space-y-6">
        {activeReqs.map((req) => {
          const matched = donors.filter((d) => req.matchedDonors?.includes(d.id));
          return (
            <div key={req.id} className="bg-white rounded-xl border border-[#C0D2DE]/60 overflow-hidden">
              <div className="bg-[#021734] px-5 py-3 flex items-center justify-between">
                <div>
                  <span className="text-white font-semibold text-sm">{req.id}</span>
                  <span className="text-white/40 text-xs ml-3">{req.bloodGroup} · {req.units} units · {req.hospitalName}</span>
                </div>
                <span className="text-xs px-2 py-0.5 bg-white/10 text-white/60 rounded-full">{req.status}</span>
              </div>
              <div className="p-5">
                <p className="text-xs text-[#021734]/40 mb-3 italic">Coordination score — not medical eligibility. Final decisions rest with medical professionals.</p>
                <div className="space-y-3">
                  {matched.map((d, i) => (
                    <motion.div key={d.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                      className="flex items-center gap-4 p-3 bg-[#F0F6F8] rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-[#036D7D] text-white flex items-center justify-center font-bold flex-shrink-0">
                        {d.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-[#021734]">{d.name}</p>
                          <Badge variant={d.available ? "active" : "unavailable"} label={d.available ? "Available" : "Unavailable"} />
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[#021734]/50 mt-1 flex-wrap">
                          <span className="font-mono">{d.bloodGroup}</span>
                          <span className="flex items-center gap-1"><MapPin size={10} />{d.area}</span>
                          <span>{d.donationsCount} donations</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="flex items-center gap-1.5 justify-end mb-2">
                          <Zap size={12} className="text-[#036D7D]" />
                          <span className="text-lg font-display font-bold text-[#036D7D]">{d.matchScore}%</span>
                        </div>
                        <div className="w-24 h-1.5 bg-[#C0D2DE]/40 rounded-full overflow-hidden">
                          <div className="h-full bg-[#036D7D] rounded-full" style={{ width: `${d.matchScore}%` }} />
                        </div>
                      </div>
                      <Button size="sm" disabled={!d.available}>Contact</Button>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
        {activeReqs.length === 0 && (
          <div className="bg-white rounded-xl border border-[#C0D2DE]/60 p-10 text-center">
            <Zap size={28} className="text-[#C0D2DE] mx-auto mb-3" />
            <p className="text-sm text-[#021734]/50">No donor matches yet</p>
            <p className="text-xs text-[#021734]/30 mt-1">Matches appear once requests are verified.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
