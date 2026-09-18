import React from "react";
import { motion } from "framer-motion";
import { Bell, Droplets, Heart, CheckCircle } from "lucide-react";
import DashboardLayout, { PageHeader } from "../../components/layout/DashboardLayout";
import Button from "../../components/ui/Button";
import { useApp } from "../../context/AppContext";

export default function DonorNotifications() {
  const { notifications, markNotificationRead } = useApp();
  return (
    <DashboardLayout>
      <PageHeader title="Notifications" actions={<Button variant="outline" size="sm" onClick={() => notifications.forEach(n => markNotificationRead(n.id))}>Mark all read</Button>} />
      <div className="max-w-2xl space-y-3">
        {notifications.map((n, i) => (
          <motion.div key={n.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
            className={`bg-white rounded-xl border p-4 flex gap-3 ${!n.read ? "border-[#036D7D]/30" : "border-[#C0D2DE]/60 opacity-60"}`}>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${n.type === "request" ? "bg-red-50 text-red-500" : "bg-[#036D7D]/10 text-[#036D7D]"}`}>
              {n.type === "request" ? <Droplets size={16} /> : n.type === "match" ? <Heart size={16} /> : <CheckCircle size={16} />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#021734]">{n.title}</p>
              <p className="text-xs text-[#021734]/50 mt-0.5">{n.body}</p>
              <p className="text-xs text-[#021734]/30 mt-1.5">{new Date(n.timestamp).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
            </div>
            {!n.read && <button onClick={() => markNotificationRead(n.id)} className="text-xs text-[#036D7D] hover:underline self-start">Mark read</button>}
          </motion.div>
        ))}
      </div>
    </DashboardLayout>
  );
}
