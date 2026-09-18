import React, { useState } from "react";
import { Send } from "lucide-react";
import DashboardLayout, { PageHeader } from "../../components/layout/DashboardLayout";
import { useApp } from "../../context/AppContext";

export default function NGOCommunication() {
  const { messages } = useApp();
  const [reply, setReply] = useState("");

  return (
    <DashboardLayout>
      <PageHeader title="Communication" subtitle="Coordinate with hospitals and partner NGOs." />
      <div className="max-w-2xl">
        <div className="bg-white rounded-xl border border-[#C0D2DE]/60 overflow-hidden">
          <div className="bg-[#021734] px-5 py-3">
            <p className="text-sm font-semibold text-white">CityCare Hospital — REQ-1024</p>
            <p className="text-xs text-white/40">Coordination thread</p>
          </div>
          <div className="p-5 space-y-4 min-h-64">
            {messages.map((m) => {
              const isMine = m.from === "UPAY Community Network";
              return (
                <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-xs rounded-xl px-4 py-2.5 text-sm leading-relaxed ${isMine ? "bg-[#036D7D] text-white" : "bg-[#F0F6F8] text-[#021734]"}`}>
                    {!isMine && <p className="text-[10px] font-semibold mb-1 text-[#036D7D]">{m.from}</p>}
                    {m.content}
                    <p className={`text-[10px] mt-1 ${isMine ? "text-white/50" : "text-[#021734]/30"}`}>
                      {new Date(m.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="border-t border-[#C0D2DE]/40 p-4 flex gap-3">
            <input value={reply} onChange={(e) => setReply(e.target.value)}
              placeholder="Message CityCare Hospital..."
              className="flex-1 px-3 py-2 rounded-lg border border-[#C0D2DE] text-sm focus:outline-none focus:ring-2 focus:ring-[#036D7D]/30" />
            <button onClick={() => setReply("")} className="p-2 bg-[#036D7D] text-white rounded-lg hover:bg-[#057080]">
              <Send size={15} />
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
