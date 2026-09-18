import React, { useState } from "react";
import { Lock, Shield } from "lucide-react";
import DashboardLayout, { PageHeader } from "../../components/layout/DashboardLayout";

export default function DonorPrivacy() {
  const [settings, setSettings] = useState({
    showArea: true,
    allowContact: true,
    showDonationCount: false,
    allowReEngagement: true,
  });

  const toggle = (key: keyof typeof settings) =>
    setSettings((s) => ({ ...s, [key]: !s[key] }));

  return (
    <DashboardLayout>
      <PageHeader title="Privacy Controls" subtitle="Control what information is shared with verified organisations." />
      <div className="max-w-xl space-y-5">
        <div className="bg-[#021734] rounded-xl p-5 flex items-start gap-4">
          <Shield size={20} className="text-[#79C3D0] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-white font-semibold text-sm">Your privacy is protected by design.</p>
            <p className="text-white/50 text-xs mt-1 leading-relaxed">
              Your exact location is never publicly displayed. Organisations only see information necessary for coordination.
              Medical eligibility is not determined by this platform.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#C0D2DE]/60 divide-y divide-[#C0D2DE]/40">
          {[
            { key: "showArea" as const, label: "Show my area", desc: "Organisations can see your neighbourhood (e.g. Andheri) for coordination" },
            { key: "allowContact" as const, label: "Allow contact requests", desc: "Verified NGOs can contact you for matching blood requests" },
            { key: "showDonationCount" as const, label: "Show donation history count", desc: "Show total number of prior donations to partner organisations" },
            { key: "allowReEngagement" as const, label: "Allow re-engagement outreach", desc: "If inactive, allow NGOs to send a single re-engagement message" },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center gap-4 p-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#021734]">{label}</p>
                <p className="text-xs text-[#021734]/50 mt-0.5 leading-relaxed">{desc}</p>
              </div>
              <button onClick={() => toggle(key)}
                className={`relative w-12 h-6 rounded-full transition-all flex-shrink-0 ${settings[key] ? "bg-[#1C8791]" : "bg-[#CECFD3]"}`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${settings[key] ? "left-[calc(100%-1.375rem)]" : "left-0.5"}`} />
              </button>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-[#C0D2DE]/60 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-[#021734] flex items-center gap-2"><Lock size={14} />What is always protected</h3>
          {[
            "Your exact address or GPS location is never shared",
            "Your full phone number is not visible until a request is confirmed by you",
            "Patient identity is minimised to what's necessary for coordination",
            "Your medical history is not accessible to any organisation",
            "AI is not used to determine your medical eligibility",
          ].map((t) => (
            <div key={t} className="flex items-start gap-2 text-xs text-[#021734]/60">
              <Shield size={12} className="text-[#036D7D] mt-0.5 flex-shrink-0" />
              {t}
            </div>
          ))}
        </div>

        <p className="text-xs text-[#021734]/30 leading-relaxed">
          Final medical eligibility and transfusion decisions remain with authorised medical and blood-bank professionals.
          RakSetu is a coordination platform only.
        </p>
      </div>
    </DashboardLayout>
  );
}
