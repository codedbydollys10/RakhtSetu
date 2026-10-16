import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export default function Card({ children, className = "", hover }: CardProps) {
  return (
    <div
      className={`bg-(--surface) rounded-xl border border-(--border) shadow-sm ${hover ? "transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer" : ""} ${className}`}
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
    <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm p-5 flex items-start gap-4">
      {icon && (
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accent || "bg-(--teal-soft) text-(--teal)"}`}>
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-(--text-secondary) font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-(--text-primary) mt-0.5 font-display">{value}</p>
        {sub && <p className="text-xs text-(--text-secondary) mt-1">{sub}</p>}
      </div>
    </div>
  );
}
