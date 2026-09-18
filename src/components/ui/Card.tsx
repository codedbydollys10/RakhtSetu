import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export default function Card({ children, className = "", hover }: CardProps) {
  return (
    <div
      className={`bg-white rounded-xl border border-[#C0D2DE]/60 shadow-sm ${hover ? "transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#C0D2DE]/60 shadow-sm p-5 flex items-start gap-4">
      {icon && (
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accent || "bg-[#036D7D]/10 text-[#036D7D]"}`}>
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[#021734]/50 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-[#021734] mt-0.5 font-display">{value}</p>
        {sub && <p className="text-xs text-[#021734]/50 mt-1">{sub}</p>}
      </div>
    </div>
  );
}
