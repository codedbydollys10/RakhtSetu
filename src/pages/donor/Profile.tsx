import React from "react";
import DashboardLayout, { PageHeader } from "../../components/layout/DashboardLayout";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { useApp } from "../../context/AppContext";

export default function DonorProfile() {
  const { donors, currentUser, donorAvailability } = useApp();
  const me = donors.find((d) => d.id === currentUser?.id) ?? (currentUser ? {
    id: currentUser.id,
    name: currentUser.name,
    bloodGroup: "Not available",
    area: "Not available",
    city: "",
    status: "Inactive" as const,
    available: false,
    lastDonation: "Not available",
    donationsCount: 0,
    phone: "",
    matchScore: 0,
  } : null);
  if (!me) return null;
  const available = donorAvailability ?? me.available;
  return (
    <DashboardLayout>
      <PageHeader title="My Profile" />
      <div className="max-w-xl">
        <div className="bg-white rounded-xl border border-[#C0D2DE]/60 p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-[#021734] rounded-full flex items-center justify-center text-white text-2xl font-display font-bold">
              {me.name[0]}
            </div>
            <div>
              <h2 className="text-xl font-display font-bold text-[#021734]">{me.name}</h2>
              <p className="text-sm text-[#021734]/50">{me.area}{me.city ? `, ${me.city}` : ""}</p>
              <div className="mt-1.5">
                <Badge variant={available ? "active" : "unavailable"} label={available ? "Available" : "Unavailable"} />
              </div>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            {[
              { label: "Blood Group", value: me.bloodGroup },
              { label: "Area", value: `${me.area}${me.city ? `, ${me.city}` : ""}` },
              { label: "Total Donations", value: me.donationsCount.toString() },
              { label: "Last Donation", value: me.lastDonation },
              { label: "Coordination Score", value: `${me.matchScore}% (not medical eligibility)` },
              { label: "Member Since", value: "Not available" },
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
