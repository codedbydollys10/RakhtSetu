import React from "react";
import DashboardLayout, { PageHeader } from "../../components/layout/DashboardLayout";
import { VerificationBadge } from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { Users } from "lucide-react";

export default function NGOProfile() {
  return (
    <DashboardLayout>
      <PageHeader title="Organisation Profile" />
      <div className="max-w-xl">
        <div className="bg-white rounded-xl border border-[#C0D2DE]/60 p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-[#036D7D] rounded-xl flex items-center justify-center">
              <Users size={28} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-[#021734]">UPAY Community Network</h2>
              <p className="text-sm text-[#021734]/50">Andheri, Mumbai</p>
              <div className="mt-1.5 flex gap-2 flex-wrap">
                <VerificationBadge type="NGO" />
                <VerificationBadge type="Network Partner" />
              </div>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            {[
              { label: "Registration No.", value: "MH-NGO-2017-1182" },
              { label: "Active Network Status", value: "Online" },
              { label: "Donors Managed", value: "320" },
              { label: "Requests Coordinated", value: "142" },
              { label: "Partner Hospitals", value: "5" },
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
