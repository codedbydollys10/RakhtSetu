import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import DashboardLayout, { PageHeader } from "../../components/layout/DashboardLayout";
import { useApp } from "../../context/AppContext";

export default function NGODonorCapacity() {
  const { donors } = useApp();
  const active = donors.filter((d) => d.status === "Active" && d.available);
  const tempUnavail = donors.filter((d) => d.status === "Temporarily Unavailable");
  const inactive = donors.filter((d) => d.status === "Inactive");
  const reEngageable = donors.filter((d) => d.status === "Inactive" && d.donationsCount > 0);

  const pieData = [
    { name: "Available Now", value: active.length, color: "#1C8791" },
    { name: "Temporarily Unavailable", value: tempUnavail.length, color: "#C0D2DE" },
    { name: "Inactive", value: inactive.length - reEngageable.length, color: "#CECFD3" },
    { name: "Re-Engageable", value: reEngageable.length, color: "#79C3D0" },
  ];

  return (
    <DashboardLayout>
      <PageHeader title="Donor Capacity" subtitle="Understand your donor network's real-time availability and re-engagement potential." />

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-[#C0D2DE]/60 p-6">
          <h3 className="text-sm font-semibold text-[#021734] mb-5">Network Capacity Overview</h3>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="55%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #C0D2DE", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3 flex-1">
              {pieData.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: d.color }} />
                  <span className="text-xs text-[#021734]/60 flex-1">{d.name}</span>
                  <span className="text-sm font-bold text-[#021734]">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {[
            { label: "Active Donors", count: active.length, desc: "Eligible and available to donate now", color: "bg-[#1C8791]" },
            { label: "Available Now", count: active.length, desc: "Responded available in last check-in", color: "bg-[#036D7D]" },
            { label: "Temporarily Unavailable", count: tempUnavail.length, desc: "Set as unavailable — check back later", color: "bg-amber-400" },
            { label: "Inactive", count: inactive.length, desc: "No activity in 6+ months", color: "bg-[#CECFD3]" },
            { label: "Potentially Re-engageable", count: reEngageable.length, desc: "Inactive with prior donation history", color: "bg-[#79C3D0]" },
          ].map(({ label, count, desc, color }) => (
            <div key={label} className="bg-white rounded-xl border border-[#C0D2DE]/60 p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${color}`}>
                {count}
              </div>
              <div>
                <p className="text-sm font-semibold text-[#021734]">{label}</p>
                <p className="text-xs text-[#021734]/50 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Re-engageable donors */}
      {reEngageable.length > 0 && (
        <div className="mt-6 bg-white rounded-xl border border-[#C0D2DE]/60 p-5">
          <h3 className="text-sm font-semibold text-[#021734] mb-4">Re-Engagement Opportunities</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {reEngageable.map((d) => (
              <div key={d.id} className="bg-[#F0F6F8] rounded-lg p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#021734] text-white text-xs flex items-center justify-center font-bold">
                  {d.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#021734]">{d.name}</p>
                  <p className="text-[10px] text-[#021734]/50">{d.bloodGroup} · {d.donationsCount} donations · {d.area}</p>
                </div>
                <button className="text-xs text-[#036D7D] hover:underline whitespace-nowrap">Re-engage</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
