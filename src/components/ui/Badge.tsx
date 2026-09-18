import React from "react";
import { Shield, CheckCircle } from "lucide-react";

type Variant = "verified" | "pending" | "unverified" | "critical" | "urgent" | "normal" | "active" | "unavailable" | "inactive" | "online" | "offline";

const variantStyles: Record<Variant, string> = {
  verified: "bg-[#1C8791]/15 text-[#036D7D] border border-[#1C8791]/30",
  pending: "bg-amber-50 text-amber-700 border border-amber-200",
  unverified: "bg-gray-100 text-gray-600 border border-gray-200",
  critical: "bg-red-50 text-red-700 border border-red-200 font-semibold",
  urgent: "bg-orange-50 text-orange-700 border border-orange-200",
  normal: "bg-[#C0D2DE]/30 text-[#021734] border border-[#C0D2DE]",
  active: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  unavailable: "bg-amber-50 text-amber-700 border border-amber-200",
  inactive: "bg-gray-100 text-gray-500 border border-gray-200",
  online: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  offline: "bg-gray-100 text-gray-500 border border-gray-200",
};

interface BadgeProps {
  variant: Variant;
  label: string;
  showIcon?: boolean;
}

export default function Badge({ variant, label, showIcon }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${variantStyles[variant]}`}>
      {showIcon && variant === "verified" && <Shield size={10} />}
      {showIcon && variant === "active" && <CheckCircle size={10} />}
      {label}
    </span>
  );
}

export function VerificationBadge({ type }: { type: "Hospital" | "NGO" | "Requirement" | "Network Partner" }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-[#1C8791]/15 text-[#036D7D] border border-[#1C8791]/30">
      <Shield size={10} />
      Verified {type}
    </span>
  );
}

export function UrgencyBadge({ urgency }: { urgency: "CRITICAL" | "URGENT" | "NORMAL" }) {
  const styles = {
    CRITICAL: "bg-red-50 text-red-700 border border-red-300 font-bold tracking-wide",
    URGENT: "bg-orange-50 text-orange-700 border border-orange-200 font-semibold",
    NORMAL: "bg-[#C0D2DE]/30 text-[#021734] border border-[#C0D2DE]",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs uppercase ${styles[urgency]}`}>
      {urgency === "CRITICAL" && <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5" />}
      {urgency}
    </span>
  );
}
