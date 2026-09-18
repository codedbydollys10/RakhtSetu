import React from "react";
import DashboardLayout, { PageHeader } from "../../components/layout/DashboardLayout";
import Button from "../../components/ui/Button";
import { Megaphone, Users, Plus } from "lucide-react";

const campaigns = [
  { name: "Andheri Blood Drive – Sep 2026", status: "Active", donors: 48, target: 60, date: "28 Sep 2026" },
  { name: "World Blood Donor Day Campaign", status: "Completed", donors: 92, target: 80, date: "14 Jun 2026" },
  { name: "Monsoon Emergency Reserve", status: "Active", donors: 31, target: 50, date: "30 Sep 2026" },
];

export default function NGOCampaigns() {
  return (
    <DashboardLayout>
      <PageHeader title="Campaigns" subtitle="Manage donor outreach and blood drive campaigns."
        actions={<Button size="sm"><Plus size={13} /> New Campaign</Button>} />
      <div className="space-y-4 max-w-2xl">
        {campaigns.map((c) => {
          const pct = Math.min(100, Math.round((c.donors / c.target) * 100));
          return (
            <div key={c.name} className="bg-white rounded-xl border border-[#C0D2DE]/60 p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-[#036D7D]/10 text-[#036D7D] rounded-lg flex items-center justify-center">
                    <Megaphone size={16} />
                  </div>
                  <div>
                    <p className="font-semibold text-[#021734] text-sm">{c.name}</p>
                    <p className="text-xs text-[#021734]/40 mt-0.5">Target: {c.date}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === "Active" ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-500"}`}>
                  {c.status}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-[#021734]/50 mb-3">
                <Users size={12} />
                {c.donors}/{c.target} donors
                <span className="ml-auto font-semibold text-[#021734]">{pct}%</span>
              </div>
              <div className="h-2 bg-[#C0D2DE]/30 rounded-full overflow-hidden">
                <div className="h-full bg-[#036D7D] rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
