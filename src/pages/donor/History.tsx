import React from "react";
import DashboardLayout, { PageHeader } from "../../components/layout/DashboardLayout";
import { Droplets } from "lucide-react";

const history = [
  { id: "DON-001", date: "15 Jun 2026", hospital: "CityCare Hospital", bloodGroup: "O+", units: 1, status: "Completed" },
  { id: "DON-002", date: "5 Feb 2026", hospital: "Lilavati Medical Centre", bloodGroup: "O+", units: 1, status: "Completed" },
  { id: "DON-003", date: "20 Oct 2025", hospital: "Jupiter Hospital", bloodGroup: "O+", units: 1, status: "Completed" },
  { id: "DON-004", date: "3 Jul 2025", hospital: "Kohinoor Hospital", bloodGroup: "O+", units: 1, status: "Completed" },
  { id: "DON-005", date: "12 Mar 2025", hospital: "CityCare Hospital", bloodGroup: "O+", units: 1, status: "Completed" },
  { id: "DON-006", date: "18 Nov 2024", hospital: "Jupiter Hospital", bloodGroup: "O+", units: 1, status: "Completed" },
  { id: "DON-007", date: "2 Aug 2024", hospital: "Thane Civil Hospital", bloodGroup: "O+", units: 1, status: "Completed" },
];

export default function DonorHistory() {
  return (
    <DashboardLayout>
      <PageHeader title="Donation History" subtitle={`${history.length} donations — thank you for your continued generosity.`} />
      <div className="max-w-2xl space-y-3">
        {history.map((d) => (
          <div key={d.id} className="bg-white rounded-xl border border-[#C0D2DE]/60 p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-[#036D7D]/10 text-[#036D7D] rounded-lg flex items-center justify-center flex-shrink-0">
              <Droplets size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[#021734] text-sm">{d.hospital}</p>
              <p className="text-xs text-[#021734]/50 mt-0.5">{d.bloodGroup} · {d.units} unit · {d.date}</p>
            </div>
            <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">{d.status}</span>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
