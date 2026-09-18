import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import DashboardLayout, { PageHeader } from "../../components/layout/DashboardLayout";
import { Heart, Award, Globe } from "lucide-react";

const yearData = [
  { month: "Oct", donations: 1 }, { month: "Nov", donations: 0 }, { month: "Dec", donations: 0 },
  { month: "Jan", donations: 0 }, { month: "Feb", donations: 1 }, { month: "Mar", donations: 1 },
  { month: "Apr", donations: 0 }, { month: "May", donations: 0 }, { month: "Jun", donations: 1 },
  { month: "Jul", donations: 0 }, { month: "Aug", donations: 0 }, { month: "Sep", donations: 0 },
];

export default function DonorImpact() {
  return (
    <DashboardLayout>
      <PageHeader title="My Impact" subtitle="How your donations have contributed to the community." />
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {[
          { icon: Heart, label: "Total Donations", value: "7", sub: "Since Jan 2023" },
          { icon: Globe, label: "Lives Potentially Helped", value: "21+", sub: "3 per donation on average" },
          { icon: Award, label: "Coordination Score", value: "92%", sub: "Not medical eligibility" },
        ].map(({ icon: Icon, label, value, sub }) => (
          <div key={label} className="bg-white rounded-xl border border-[#C0D2DE]/60 p-5 text-center">
            <div className="w-10 h-10 bg-[#036D7D]/10 text-[#036D7D] rounded-lg flex items-center justify-center mx-auto mb-3">
              <Icon size={18} />
            </div>
            <p className="text-3xl font-display font-bold text-[#021734]">{value}</p>
            <p className="text-sm text-[#021734]/60 mt-1">{label}</p>
            <p className="text-xs text-[#021734]/30 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-[#C0D2DE]/60 p-5 max-w-2xl">
        <h3 className="text-sm font-semibold text-[#021734] mb-4">Donation Activity (Last 12 months)</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={yearData} barSize={20}>
            <CartesianGrid strokeDasharray="3 3" stroke="#C0D2DE40" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#021734" }} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#021734" }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #C0D2DE", fontSize: 12 }} />
            <Bar dataKey="donations" fill="#036D7D" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 bg-[#021734] rounded-xl p-5 max-w-2xl">
        <p className="text-white font-display text-lg font-bold mb-2">"Technology should disappear behind the human connection."</p>
        <p className="text-white/50 text-sm">Your contributions keep communities connected when every minute matters. Thank you.</p>
      </div>
    </DashboardLayout>
  );
}
