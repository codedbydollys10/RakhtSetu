import React from "react";
import { AlertCircle, Shield, CheckCircle } from "lucide-react";
import DashboardLayout, { PageHeader } from "../../components/layout/DashboardLayout";
import { useApp } from "../../context/AppContext";

export default function OutreachProtection() {
  const { donors, requests } = useApp();

  const outreachMap = donors.map((d) => ({
    donor: d,
    contacts: d.contactedBy || [],
  })).filter((x) => x.contacts.length > 0);

  return (
    <DashboardLayout>
      <PageHeader title="Outreach Protection" subtitle="Prevent duplicate outreach. Each donor sees only one coordinated request at a time." />

      <div className="max-w-2xl space-y-4">
        <div className="bg-[#021734] rounded-xl p-5 flex items-start gap-4">
          <Shield size={20} className="text-[#79C3D0] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-white font-semibold text-sm">Outreach Protection Active</p>
            <p className="text-white/50 text-xs mt-1 leading-relaxed">
              Before contacting a donor, RakSetu checks if another NGO has already reached out for the same request.
              This prevents donor fatigue and duplicate coordination.
            </p>
          </div>
        </div>

        {outreachMap.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#C0D2DE]/60 p-8 text-center">
            <CheckCircle size={28} className="text-emerald-500 mx-auto mb-3" />
            <p className="text-sm text-[#021734]/50">No duplicate outreach detected.</p>
          </div>
        ) : outreachMap.map(({ donor, contacts }) => (
          <div key={donor.id} className="bg-white rounded-xl border border-amber-200 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-[#021734] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                {donor.name[0]}
              </div>
              <div>
                <p className="text-sm font-semibold text-[#021734]">{donor.name}</p>
                <p className="text-xs text-[#021734]/50">{donor.bloodGroup} · {donor.area}</p>
              </div>
            </div>
            <div className="space-y-2">
              {contacts.map((c) => {
                const [ngo, reqId] = c.split(":");
                return (
                  <div key={c} className="flex items-center gap-2 text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <AlertCircle size={12} className="text-amber-600 flex-shrink-0" />
                    <span className="text-amber-700">Already contacted for <strong>{reqId}</strong> by {ngo}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="bg-white rounded-xl border border-[#C0D2DE]/60 p-5">
          <h3 className="text-sm font-semibold text-[#021734] mb-3">How it works</h3>
          <div className="space-y-3">
            {[
              "Before contacting a donor, the system checks if they've been contacted for the same request ID.",
              "If yes, you see \"Already contacted for REQ-XXXX\" instead of a contact button.",
              "This protects donors from receiving the same request from multiple NGOs.",
              "Coordination is still possible across different request IDs.",
            ].map((t, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-[#021734]/60">
                <div className="w-5 h-5 rounded-full bg-[#036D7D]/10 text-[#036D7D] flex items-center justify-center font-bold flex-shrink-0 text-[10px]">{i + 1}</div>
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
