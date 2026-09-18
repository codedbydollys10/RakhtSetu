import React from "react";
import { motion } from "framer-motion";
import { Bell, CheckCircle, Zap, MessageSquare, Settings } from "lucide-react";
import DashboardLayout, { PageHeader } from "../../components/layout/DashboardLayout";
import Button from "../../components/ui/Button";
import { useApp } from "../../context/AppContext";

const typeIcon = { request: Zap, match: CheckCircle, verified: CheckCircle, message: MessageSquare, system: Settings };
const typeColor = { request: "text-red-500 bg-red-50", match: "text-emerald-600 bg-emerald-50", verified: "text-[#036D7D] bg-[#036D7D]/10", message: "text-[#1C8791] bg-[#1C8791]/10", system: "text-gray-500 bg-gray-50" };

export default function HospitalNotifications() {
  const { notifications, markNotificationRead } = useApp();
  return (
    <DashboardLayout>
      <PageHeader title="Notifications" subtitle="Alerts and updates from your network." actions={
        <Button variant="outline" size="sm" onClick={() => notifications.forEach(n => markNotificationRead(n.id))}>Mark all read</Button>
      } />
      <div className="max-w-2xl space-y-3">
        {notifications.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#C0D2DE]/60 p-10 text-center">
            <Bell size={28} className="text-[#C0D2DE] mx-auto mb-3" />
            <p className="text-sm text-[#021734]/50">No notifications</p>
          </div>
        ) : notifications.map((n, i) => {
          const Icon = typeIcon[n.type] || Bell;
          const color = typeColor[n.type] || "text-gray-500 bg-gray-50";
          return (
            <motion.div key={n.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className={`bg-white rounded-xl border p-4 flex gap-3 ${!n.read ? "border-[#036D7D]/30" : "border-[#C0D2DE]/60 opacity-60"}`}>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#021734]">{n.title}</p>
                <p className="text-xs text-[#021734]/50 mt-0.5 leading-relaxed">{n.body}</p>
                <p className="text-xs text-[#021734]/30 mt-1.5">
                  {new Date(n.timestamp).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              {!n.read && (
                <button onClick={() => markNotificationRead(n.id)} className="text-xs text-[#036D7D] hover:underline self-start flex-shrink-0">Mark read</button>
              )}
            </motion.div>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
