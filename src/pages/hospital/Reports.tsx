import { useEffect, useMemo, useState } from "react"

import { Activity, TrendingUp } from "lucide-react"

import DashboardLayout, {
  PageHeader,
} from "../../components/layout/DashboardLayout"

import { useApp } from "../../context/AppContext"

import { supabase } from "../../lib/supabase"

import type { BloodRequest } from "../../data/mockData"

type Range = "7" | "30" | "90" | "custom"

type ResponseRecord = {
  request_id: string
  responded_at: string
}

function inProgress(request: BloodRequest) {
  return [
    "Donor Confirmed",

    "Hospital Confirmation",

    "Matching",

    "Donors Contacted",
  ].includes(request.status)
}

function BarGroup({
  title,

  entries,

  color = "bg-rose-500",
}: {
  title: string

  entries: [string, number][]

  color?: string
}) {
  const max = Math.max(1, ...entries.map(([, value]) => value))

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="font-semibold text-[#102A43]">{title}</h2>
      <div className="mt-4 space-y-3">
        {entries.map(([label, value]) => (
          <div
            key={label}
            className="grid grid-cols-[100px_1fr_32px] items-center gap-3 text-xs"
          >
            <span className="truncate text-slate-500">{label}</span>
            <span className="h-2 overflow-hidden rounded-full bg-slate-100">
              <span
                className={`block h-full rounded-full ${color}`}
                style={{ width: `${(value / max) * 100}%` }}
              />
            </span>
            <span className="text-right font-semibold text-slate-700">
              {value}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function HospitalReports() {
  const { requests, hospitalRecordId, hospitalRequestsLoading } = useApp()

  const [range, setRange] = useState<Range>("30")

  const [customFrom, setCustomFrom] = useState("")

  const [customTo, setCustomTo] = useState("")

  const [responses, setResponses] = useState<ResponseRecord[]>([])

  const [responseError, setResponseError] = useState<string | null>(null)

  const [loadingResponses, setLoadingResponses] = useState(false)

  const ownRequests = useMemo(
    () => requests.filter((request) => request.hospitalId === hospitalRecordId),

    [requests, hospitalRecordId],
  )

  useEffect(() => {
    let cancelled = false

    const ids = ownRequests.map((request) => request.id)

    if (!ids.length) {
      setResponses([])

      setLoadingResponses(false)

      return
    }

    setLoadingResponses(true)

    void supabase

      .from("donor_responses")

      .select("request_id,responded_at")

      .in("request_id", ids)

      .then(({ data, error }) => {
        if (cancelled) return

        if (error) setResponseError(error.message)
        else {
          setResponseError(null)

          setResponses((data ?? []) as ResponseRecord[])
        }

        setLoadingResponses(false)
      })

    return () => {
      cancelled = true
    }
  }, [ownRequests.map((request) => request.id).join("|")])

  const filtered = useMemo(() => {
    const now = new Date()

    const start =
      range === "custom"
        ? customFrom
          ? new Date(`${customFrom}T00:00:00`)
          : null
        : new Date(now.getTime() - Number(range) * 86400000)

    const end =
      range === "custom"
        ? customTo
          ? new Date(`${customTo}T23:59:59`)
          : now
        : now

    return ownRequests.filter((request) => {
      const created = new Date(request.createdAt)

      return (!start || created >= start) && created <= end
    })
  }, [ownRequests, range, customFrom, customTo])

  const fulfilled = filtered.filter(
    (request) => request.status === "Fulfilled",
  ).length

  const responseDurations = responses.flatMap((response) => {
    const request = filtered.find((item) => item.id === response.request_id)

    const minutes = request
      ? (Date.parse(response.responded_at) - Date.parse(request.createdAt)) /
        60000
      : Number.NaN

    return Number.isFinite(minutes) && minutes >= 0 ? [minutes] : []
  })

  const averageResponse = responseDurations.length
    ? `${Math.round(responseDurations.reduce((sum, value) => sum + value, 0) / responseDurations.length)} mins`
    : "—"

  const fulfillmentRate = filtered.length
    ? Math.round((fulfilled / filtered.length) * 100)
    : 0

  const groups = ["O+", "A+", "B+", "AB+", "O-", "A-", "B-", "AB-"]

  const groupedByDay = new Map<string, number>()

  filtered.forEach((request) => {
    const date = new Date(request.createdAt)

    const key = date.toLocaleDateString("en-IN", {
      day: "2-digit",

      month: "short",
    })

    groupedByDay.set(key, (groupedByDay.get(key) ?? 0) + 1)
  })

  const dateSeries: [string, number][] = [...groupedByDay.entries()].slice(-10)

  const statusEntries: [string, number][] = [
    [
      "Active",

      filtered.filter(
        (request) =>
          !["Fulfilled", "Cancelled"].includes(request.status) &&
          !inProgress(request),
      ).length,
    ],

    ["In Progress", filtered.filter(inProgress).length],

    ["Fulfilled", fulfilled],

    [
      "Cancelled",

      filtered.filter((request) => request.status === "Cancelled").length,
    ],
  ]

  return (
    <DashboardLayout>
      <PageHeader
        title="Hospital Reports"
        subtitle="Analytics calculated from your saved blood request and donor response records."
      />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap gap-2">
          {(["7", "30", "90", "custom"] as Range[]).map((item) => (
            <button
              key={item}
              onClick={() => setRange(item)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold ${
                range === item
                  ? "bg-[#101A36] text-white"
                  : "border border-slate-200 text-slate-600"
              }`}
            >
              {item === "custom" ? "Custom" : `${item} days`}
            </button>
          ))}
        </div>
        {range === "custom" && (
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-slate-500">
              From
              <input
                type="date"
                value={customFrom}
                onChange={(event) => setCustomFrom(event.target.value)}
                className="ml-2 rounded border border-slate-200 p-1.5 text-slate-700"
              />
            </label>
            <label className="text-xs text-slate-500">
              To
              <input
                type="date"
                value={customTo}
                onChange={(event) => setCustomTo(event.target.value)}
                className="ml-2 rounded border border-slate-200 p-1.5 text-slate-700"
              />
            </label>
          </div>
        )}
      </div>
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total Requests", filtered.length],

          ["Successful Fulfillments", fulfilled],

          ["Average Response Time", loadingResponses ? "…" : averageResponse],

          ["Fulfillment Rate", `${fulfillmentRate}%`],
        ].map(([title, value]) => (
          <article
            key={String(title)}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <p className="text-xs font-semibold text-slate-500">{title}</p>
            <p className="mt-2 text-2xl font-bold text-[#102A43]">
              {hospitalRequestsLoading ? "…" : value}
            </p>
          </article>
        ))}
      </div>
      {responseError && (
        <p
          role="alert"
          className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700"
        >
          Donor response analytics could not be loaded: {responseError}
        </p>
      )}
      {hospitalRequestsLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="h-56 animate-pulse rounded-xl border border-slate-200 bg-white"
            />
          ))}
        </div>
      ) : ownRequests.length === 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <Activity className="mx-auto text-slate-300" size={28} />
          <h2 className="mt-3 font-semibold text-slate-800">
            No reports to show yet
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Reports will populate as your hospital creates requests.
          </p>
        </section>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <BarGroup
            title="Requests over time"
            entries={dateSeries.length ? dateSeries : [["No requests", 0]]}
            color="bg-[#E11D48]"
          />
          <BarGroup
            title="Blood group demand"
            entries={groups.map((group) => [
              group,

              filtered.filter((request) => request.bloodGroup === group).length,
            ])}
            color="bg-violet-500"
          />
          <BarGroup
            title="Urgency distribution"
            entries={[
              [
                "Critical",

                filtered.filter((request) => request.urgency === "CRITICAL")
                  .length,
              ],

              [
                "High",

                filtered.filter((request) => request.urgency === "URGENT")
                  .length,
              ],

              [
                "Normal",

                filtered.filter((request) => request.urgency === "NORMAL")
                  .length,
              ],
            ]}
            color="bg-amber-500"
          />
          <BarGroup
            title="Fulfillment status"
            entries={statusEntries}
            color="bg-green-500"
          />
        </div>
      )}
      <p className="mt-5 flex items-center gap-2 text-xs text-slate-500">
        <TrendingUp size={14} /> Charts and summary values are based on the
        selected date range.
      </p>
    </DashboardLayout>
  )
}
