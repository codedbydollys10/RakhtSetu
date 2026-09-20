import React from "react";
import DashboardLayout, { PageHeader } from "../../components/layout/DashboardLayout";
import { UrgencyBadge } from "../../components/ui/Badge";
import { useApp } from "../../context/AppContext";
import { CheckCircle } from "lucide-react";

export default function HospitalHistory() {
  const { requests, currentUser } = useApp();
  const fulfilled = requests.filter((r) => r.hospitalId === currentUser?.id && r.status === "Fulfilled");
  return (
    <DashboardLayout>
      <PageHeader title="Request History" subtitle={`${fulfilled.length} fulfilled requests from CityCare Hospital.`} />
      <div className="space-y-3 max-w-2xl">
        {fulfilled.map((req) => (
          <div key={req.id} className="bg-white rounded-xl border border-[#C0D2DE]/60 p-4 flex items-start gap-4">
            <div className="w-9 h-9 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <CheckCircle size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-mono text-xs text-[#021734]/40">{req.id}</span>
                <UrgencyBadge urgency={req.urgency} />
              </div>
              <p className="font-semibold text-[#021734] text-sm">{req.bloodGroup} · {req.units} units</p>
              {req.verifiedBy && <p className="text-xs text-[#036D7D] mt-0.5">Verified by {req.verifiedBy}</p>}
              <p className="text-xs text-[#021734]/30 mt-1">
                {new Date(req.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
            <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">Fulfilled</span>
          </div>
        ))}
        {fulfilled.length === 0 && (
          <div className="bg-white rounded-xl border border-[#C0D2DE]/60 p-10 text-center">
            <p className="text-sm text-[#021734]/50">No fulfilled requests yet.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
