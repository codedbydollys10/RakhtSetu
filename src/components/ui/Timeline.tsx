import React from "react";
import { CheckCircle, Circle, Clock } from "lucide-react";
import { requestLifecycleSteps, type RequestStatus } from "../../data/mockData";

export default function Timeline({ currentStatus }: { currentStatus: RequestStatus }) {
  const currentIndex = requestLifecycleSteps.indexOf(currentStatus);
  return (
    <div className="flex flex-col gap-0">
      {requestLifecycleSteps.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <div key={step} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${done ? "bg-[#1C8791] text-white" : active ? "bg-[#036D7D] text-white" : "bg-[#C0D2DE]/40 text-[#CECFD3]"}`}>
                {done ? <CheckCircle size={14} /> : active ? <Clock size={14} /> : <Circle size={14} />}
              </div>
              {i < requestLifecycleSteps.length - 1 && (
                <div className={`w-0.5 h-6 mt-1 ${done ? "bg-[#1C8791]" : "bg-[#C0D2DE]/60"}`} />
              )}
            </div>
            <div className="pb-5">
              <p className={`text-sm font-medium leading-7 ${active ? "text-[#036D7D]" : done ? "text-[#021734]" : "text-[#021734]/40"}`}>
                {step}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
