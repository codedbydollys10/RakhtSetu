import React, { useState } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import DashboardLayout, { PageHeader } from "../../components/layout/DashboardLayout";
import { analyticsData } from "../../data/mockData";

const PALETTE = ["#036D7D", "#1C8791", "#79C3D0", "#C0D2DE", "#CECFD3", "#258D98", "#057080", "#011E40"];
const dateFilters = ["7 days", "30 days", "90 days", "Custom"];

export default function NGOAnalytics() {
  const [dateFilter, setDateFilter] = useState("30 days");

  return (
    <DashboardLayout>
      <PageHeader
        title="NGO Analytics"
        subtitle="Meaningful insights into your donor network and coordination effectiveness."
        actions={
          <div className="flex gap-2">
            {dateFilters.map((f) => (
              <button key={f} onClick={() => setDateFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${dateFilter === f ? "bg-[#036D7D] text-white" : "bg-white border border-[#C0D2DE] text-[#021734]/60 hover:border-[#036D7D]/50"}`}>
                {f}
              </button>
            ))}
          </div>
        }
      />

      {/* Top stats */}
      <div className="grid sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Fulfillment Rate", value: "91%", trend: "+3% this month" },
          { label: "Avg Response Time", value: "2.5h", trend: "↓ Improving" },
          { label: "Active Donors", value: "68%", trend: "of total network" },
          { label: "Requests Handled", value: "142", trend: "this year" },
        ].map(({ label, value, trend }) => (
          <div key={label} className="bg-white rounded-xl border border-[#C0D2DE]/60 p-4">
            <p className="text-xs text-[#021734]/50 mb-1">{label}</p>
            <p className="text-2xl font-display font-bold text-[#021734]">{value}</p>
            <p className="text-xs text-[#036D7D] mt-1">{trend}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Fulfillment rate trend */}
        <div className="bg-white rounded-xl border border-[#C0D2DE]/60 p-5">
          <h3 className="text-sm font-semibold text-[#021734] mb-4">Request Fulfillment Rate (%)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={analyticsData.fulfillmentRate}>
              <CartesianGrid strokeDasharray="3 3" stroke="#C0D2DE40" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#021734" }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#021734" }} tickLine={false} axisLine={false} domain={[60, 100]} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #C0D2DE", fontSize: 12 }} />
              <Line type="monotone" dataKey="rate" stroke="#036D7D" strokeWidth={2.5} dot={{ r: 3, fill: "#036D7D" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Blood group requests */}
        <div className="bg-white rounded-xl border border-[#C0D2DE]/60 p-5">
          <h3 className="text-sm font-semibold text-[#021734] mb-4">Blood Requests by Group</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={analyticsData.bloodGroupRequests} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="#C0D2DE40" vertical={false} />
              <XAxis dataKey="group" tick={{ fontSize: 11, fill: "#021734" }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#021734" }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #C0D2DE", fontSize: 12 }} />
              <Bar dataKey="requests" fill="#036D7D" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Donor availability */}
        <div className="bg-white rounded-xl border border-[#C0D2DE]/60 p-5">
          <h3 className="text-sm font-semibold text-[#021734] mb-4">Donor Availability</h3>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={180}>
              <PieChart>
                <Pie data={analyticsData.donorAvailability} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                  {analyticsData.donorAvailability.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #C0D2DE", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3 flex-1">
              {analyticsData.donorAvailability.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: d.color }} />
                  <span className="text-xs text-[#021734]/60 flex-1">{d.name}</span>
                  <span className="text-xs font-semibold text-[#021734]">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Monthly activity */}
        <div className="bg-white rounded-xl border border-[#C0D2DE]/60 p-5">
          <h3 className="text-sm font-semibold text-[#021734] mb-4">Monthly Donation Activity</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={analyticsData.monthlyActivity} barSize={10} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#C0D2DE40" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#021734" }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#021734" }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #C0D2DE", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="donations" fill="#036D7D" radius={[3, 3, 0, 0]} name="Donations" />
              <Bar dataKey="requests" fill="#79C3D0" radius={[3, 3, 0, 0]} name="Requests" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Response time */}
        <div className="bg-white rounded-xl border border-[#C0D2DE]/60 p-5">
          <h3 className="text-sm font-semibold text-[#021734] mb-4">Average Response Time (hours)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={analyticsData.responseTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="#C0D2DE40" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#021734" }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#021734" }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #C0D2DE", fontSize: 12 }} />
              <Line type="monotone" dataKey="hours" stroke="#1C8791" strokeWidth={2.5} dot={{ r: 3, fill: "#1C8791" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Urgency breakdown */}
        <div className="bg-white rounded-xl border border-[#C0D2DE]/60 p-5">
          <h3 className="text-sm font-semibold text-[#021734] mb-4">Requests by Urgency</h3>
          <div className="space-y-3">
            {analyticsData.urgencyBreakdown.map(({ urgency, count }) => {
              const total = analyticsData.urgencyBreakdown.reduce((a, b) => a + b.count, 0);
              const pct = Math.round((count / total) * 100);
              const color = urgency === "Critical" ? "bg-red-500" : urgency === "Urgent" ? "bg-amber-400" : "bg-[#036D7D]";
              return (
                <div key={urgency}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#021734]/60 font-medium">{urgency}</span>
                    <span className="text-[#021734] font-semibold">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-[#C0D2DE]/30 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
