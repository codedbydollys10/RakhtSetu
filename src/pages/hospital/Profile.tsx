import React from "react";
import DashboardLayout, { PageHeader } from "../../components/layout/DashboardLayout";
import { VerificationBadge } from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { Building2 } from "lucide-react";

export default function HospitalProfile() {
  return (
    <DashboardLayout>
      <PageHeader title="Hospital Profile" />
      <div className="max-w-xl">
        <div className="bg-white rounded-xl border border-[#C0D2DE]/60 p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-[#021734] rounded-xl flex items-center justify-center">
              <Building2 size={28} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-[#021734]">CityCare Hospital</h2>
              <p className="text-sm text-[#021734]/50">Andheri, Mumbai</p>
              <div className="mt-1.5"><VerificationBadge type="Hospital" /></div>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            {[
              { label: "Registration No.", value: "MH-HOS-2019-0042" },
              { label: "Blood Bank License", value: "CDSCO-BBL-MH-2244" },
              { label: "Network Status", value: "Online" },
              { label: "Blood Bank Status", value: "Critical" },
              { label: "Requests Coordinated", value: "34" },
              { label: "Partner NGOs", value: "4" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between py-2.5 border-b border-[#C0D2DE]/40 last:border-0">
                <span className="text-[#021734]/50">{label}</span>
                <span className="font-medium text-[#021734]">{value}</span>
              </div>
            ))}
          </div>
          <div className="mt-5">
            <Button variant="outline" size="sm">Edit Profile</Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
