import React from "react";
import { motion } from "framer-motion";
import DashboardLayout, { PageHeader } from "../../components/layout/DashboardLayout";
import { useApp } from "../../context/AppContext";

export default function DonorAvailability() {
  const { donors, toggleDonorAvailability } = useApp();
  const me = donors.find((d) => d.id === "d1")!;

  return (
    <DashboardLayout>
      <PageHeader title="Availability" subtitle="Control when and how you appear to the matching system." />
      <div className="max-w-lg space-y-5">
        {/* Main toggle */}
        <div className={`rounded-xl p-6 ${me.available ? "bg-[#021734]" : "bg-white border border-[#C0D2DE]/60"}`}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className={`text-lg font-display font-bold ${me.available ? "text-white" : "text-[#021734]"}`}>
                {me.available ? "Available to donate" : "Currently unavailable"}
              </p>
              <p className={`text-xs mt-1.5 leading-relaxed ${me.available ? "text-white/50" : "text-[#021734]/50"}`}>
                {me.available
                  ? "You can be matched with verified blood requests from hospitals in your network."
                  : "Your profile is hidden from matching. No requests will be sent to you."}
              </p>
            </div>
            <button onClick={() => toggleDonorAvailability("d1")}
              className={`relative w-16 h-8 rounded-full transition-all duration-300 flex-shrink-0 ${me.available ? "bg-[#1C8791]" : "bg-[#CECFD3]"}`}>
              <motion.div layout transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-sm"
                style={{ left: me.available ? "calc(100% - 1.75rem)" : "0.25rem" }} />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#C0D2DE]/60 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-[#021734]">Availability Settings</h3>
          {[
            { label: "Blood Group", value: me.bloodGroup, readonly: true },
            { label: "Donation Area", value: me.area },
            { label: "Last Donation Date", value: "15 June 2026", readonly: true },
            { label: "Minimum days between donations", value: "90 days", readonly: true },
          ].map(({ label, value, readonly }) => (
            <div key={label} className="flex items-center justify-between py-2.5 border-b border-[#C0D2DE]/40 last:border-0">
              <span className="text-xs text-[#021734]/50">{label}</span>
              <span className={`text-xs font-semibold text-[#021734] ${readonly ? "opacity-50" : ""}`}>{value}</span>
            </div>
          ))}
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-700 leading-relaxed">
          Your availability toggle controls coordination matching only. Final medical eligibility is determined by medical professionals at the donation point.
        </div>
      </div>
    </DashboardLayout>
  );
}
