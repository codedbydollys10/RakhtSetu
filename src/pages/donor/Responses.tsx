import { useMemo, useState } from "react"

import { AnimatePresence, motion } from "framer-motion"

import { ArrowRight, CheckCircle2, Clock3, X } from "lucide-react"

import DashboardLayout, {
  PageHeader,
} from "../../components/layout/DashboardLayout"

import { useApp } from "../../context/AppContext"

import {
  useDonorPortal,
  type DonorResponseStatus,
} from "../../context/DonorPortalContext"

import type { BloodRequest } from "../../data/mockData"

const tabs = ["All", "Pending", "Confirmed", "Completed", "Cancelled"] as const

type Tab = typeof tabs[number]

const statusTone: Record<DonorResponseStatus, string> = {
  "Response Sent": "bg-amber-50 text-amber-700",

  "Hospital Confirmed": "bg-blue-50 text-blue-700",

  "Coordination in Progress": "bg-violet-50 text-violet-700",

  Completed: "bg-[#ECFDF3] text-[#16803C]",

  Cancelled: "bg-[#F5F8FA] text-[#617587]",
}

export default function DonorResponses() {
  const { requests, requestFeedError } = useApp()

  const { responses, responsesError, updateResponse } = useDonorPortal()

  const [tab, setTab] = useState<Tab>("All")

  const [withdrawing, setWithdrawing] = useState<string | null>(null)

  const [details, setDetails] = useState<BloodRequest | null>(null)

  const [toast, setToast] = useState("")

  const records = useMemo(
    () =>
      responses
        .map((response) => ({
          response,

          request: requests.find((item) => item.id === response.requestId),
        }))
        .filter(
          (item): item is {
            response: typeof responses[number]
            request: BloodRequest
          } => Boolean(item.request),
        )

        .filter(
          ({ response }) =>
            tab === "All" ||
            (tab === "Pending" && response.status === "Response Sent") ||
            (tab === "Confirmed" &&
              ["Hospital Confirmed", "Coordination in Progress"].includes(
                response.status,
              )) ||
            (tab === "Completed" && response.status === "Completed") ||
            (tab === "Cancelled" && response.status === "Cancelled"),
        ),

    [requests, responses, tab],
  )

  const withdraw = async () => {
    if (!withdrawing) return

    try {
      await updateResponse(withdrawing, "Cancelled")
    } catch (error) {
      setToast(
        error instanceof Error
          ? error.message
          : "Unable to withdraw your response.",
      )
      return
    }

    setWithdrawing(null)

    setToast("Your response was withdrawn.")

    window.setTimeout(() => setToast(""), 3000)
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="My Responses"
        subtitle="Track the requests you’ve responded to and manage your coordination status."
      />
      {(responsesError || requestFeedError) && (
        <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {responsesError
            ? `Responses could not be loaded: ${responsesError}`
            : `Requests could not be loaded: ${requestFeedError}`}
        </p>
      )}
      <div className="mb-4 flex gap-2 overflow-x-auto border-b border-[#D8E3EA]">
        {tabs.map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-xs font-semibold ${
              tab === item
                ? "border-[#E51C3D] text-[#E51C3D]"
                : "border-transparent text-[#617587] hover:text-[#031A36]"
            }`}
          >
            {item}
            <span className="ml-1.5 text-[10px] text-[#9AA9B5]">
              {item === "All"
                ? responses.length
                : responses.filter(({ status }) =>
                    item === "Pending"
                      ? status === "Response Sent"
                      : item === "Confirmed"
                        ? [
                            "Hospital Confirmed",
                            "Coordination in Progress",
                          ].includes(status)
                        : status === item,
                  ).length}
            </span>
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {records.map(({ response, request }, index) => (
          <motion.article
            key={response.requestId}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            className="rounded-xl border border-[#D8E3EA] bg-white p-4 shadow-[0_2px_8px_rgba(3,26,54,0.035)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] text-[#617587]">
                    {request.id}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusTone[response.status]}`}
                  >
                    {response.status}
                  </span>
                </div>
                <h2 className="mt-2 font-display text-base font-bold text-[#031A36]">
                  {request.bloodGroup} blood · {request.hospitalName}
                </h2>
                <p className="mt-1 text-xs text-[#617587]">
                  {request.units} {request.units === 1 ? "unit" : "units"} ·{" "}
                  {request.area} ·{" "}
                  {new Date(response.updatedAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <Clock3 size={18} className="text-[#9AA9B5]" />
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setDetails(request)}
                className="flex items-center gap-1 rounded-lg border border-[#D8E3EA] px-3 py-2 text-xs font-semibold text-[#062847] hover:bg-[#F5F8FA]"
              >
                View details <ArrowRight size={13} />
              </button>
              {response.status === "Response Sent" && (
                <button
                  onClick={() => setWithdrawing(response.requestId)}
                  className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-[#C91836] hover:bg-[#FFF1F3]"
                >
                  Withdraw response
                </button>
              )}
            </div>
          </motion.article>
        ))}
        {!records.length && (
          <div className="rounded-xl border border-dashed border-[#D8E3EA] bg-white p-10 text-center">
            <CheckCircle2 size={23} className="mx-auto text-[#9AA9B5]" />
            <p className="mt-3 text-sm font-semibold text-[#021734]">
              No {tab === "All" ? "" : tab.toLowerCase()} responses yet
            </p>
            <p className="mt-1 text-xs text-[#617587]">
              Requests you respond to will appear here.
            </p>
          </div>
        )}
      </div>
      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-6 right-5 z-40 rounded-xl bg-[#031A36] px-4 py-3 text-xs font-semibold text-white shadow-xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
      {withdrawing && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#031A36]/45 p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
          >
            <div className="flex justify-between">
              <h2 className="font-display text-lg font-bold text-[#031A36]">
                Withdraw response?
              </h2>
              <button
                onClick={() => setWithdrawing(null)}
                aria-label="Close dialog"
              >
                <X size={17} />
              </button>
            </div>
            <p className="mt-2 text-sm text-[#617587]">
              The hospital team will no longer expect your response for this
              request.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setWithdrawing(null)}
                className="rounded-lg border border-[#D8E3EA] px-3 py-2 text-xs font-semibold text-[#617587]"
              >
                Keep response
              </button>
              <button
                onClick={withdraw}
                className="rounded-lg bg-[#E51C3D] px-3 py-2 text-xs font-bold text-white"
              >
                Withdraw
              </button>
            </div>
          </div>
        </div>
      )}
      {details && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#031A36]/45 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDetails(null)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
          >
            <div className="flex justify-between">
              <h2 className="font-display text-lg font-bold text-[#031A36]">
                {details.id} · {details.bloodGroup}
              </h2>
              <button
                onClick={() => setDetails(null)}
                aria-label="Close details"
              >
                <X size={17} />
              </button>
            </div>
            <p className="mt-2 text-sm text-[#617587]">
              {details.hospitalName} · {details.units} units · {details.area}
            </p>
            <p className="mt-3 rounded-lg bg-[#F5F8FA] p-3 text-xs text-[#617587]">
              {details.notes ||
                "The verified hospital will share coordination details directly."}
            </p>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
