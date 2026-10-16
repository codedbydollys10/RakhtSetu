import { useEffect, useMemo, useState } from "react"

import { Link } from "react-router-dom"

import {
  Activity,
  ArrowRight,
  Bell,
  Check,
  CircleCheck,
  Clock3,
  Droplets,
  Plus,
  ShieldCheck,
  Timer,
} from "lucide-react"

import DashboardLayout from "../../components/layout/DashboardLayout"

import { useApp } from "../../context/AppContext"

import { supabase } from "../../lib/supabase"

import type { BloodRequest } from "../../data/mockData"

import InteractiveNetworkMap, {
  type Coordinates,
} from "../../components/hospital/InteractiveMap"

type DonorResponseRow = {
  request_id: string

  status: string

  responded_at: string
}

const card =
  "rounded-xl border border-[#E2E8F0] bg-white shadow-[0_2px_8px_rgba(15,25,51,0.05)]"

const groups = ["O+", "A+", "B+", "AB+", "O-", "A-", "B-", "AB-"]

function greeting() {
  const hour = new Date().getHours()

  if (hour < 5) return "Good night"

  if (hour < 12) return "Good morning"

  if (hour < 17) return "Good afternoon"

  if (hour < 21) return "Good evening"

  return "Good night"
}

function dateText(value: string) {
  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
}

function statusFor(request: BloodRequest) {
  if (request.status === "Fulfilled") return "Fulfilled"

  if (request.status === "Cancelled") return "Cancelled"

  if (
    [
      "Donor Confirmed",

      "Hospital Confirmation",

      "Matching",

      "Donors Contacted",
    ].includes(request.status)
  )
    return "In Progress"

  return "Active"
}

function StatCard({
  title,

  value,

  helper,

  icon: Icon,

  color,

  loading,
}: {
  title: string

  value: string | number

  helper: string

  icon: typeof Droplets

  color: "red" | "green" | "purple"

  loading?: boolean
}) {
  const styles = {
    red: "bg-rose-50 text-[#E11D48]",

    green: "bg-green-50 text-[#16A34A]",

    purple: "bg-purple-50 text-[#7C3AED]",
  }

  return (
    <article
      className={`${card} flex min-h-[122px] items-center gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-md sm:p-5`}
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${styles[color]}`}
      >
        <Icon size={20} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wide text-[#64748B]">
          {title}
        </p>
        {loading ? (
          <span className="mt-2 block h-7 w-20 animate-pulse rounded bg-slate-100" />
        ) : (
          <p className="mt-1 font-display text-[27px] font-extrabold leading-none text-[#102A43]">
            {value}
          </p>
        )}
        <p className="mt-2 text-xs text-[#64748B]">{helper}</p>
      </div>
    </article>
  )
}

export default function HospitalDashboard() {
  const {
    requests,

    currentUser,

    roleDetails,

    hospitalRecordId,

    hospitalRequestsLoading,

    hospitalRequestsError,
  } = useApp()

  const [responseRows, setResponseRows] = useState<DonorResponseRow[]>([])

  const [responseLoading, setResponseLoading] = useState(false)

  const [responseError, setResponseError] = useState<string | null>(null)

  const hospitalRequests = useMemo(
    () => requests.filter((request) => request.hospitalId === hospitalRecordId),

    [requests, hospitalRecordId],
  )

  const activeRequests = hospitalRequests.filter(
    (request) => !["Fulfilled", "Cancelled"].includes(request.status),
  )

  const fulfilled = hospitalRequests.filter(
    (request) => request.status === "Fulfilled",
  )

  const now = new Date()

  const fulfilledThisMonth = fulfilled.filter((request) => {
    if (!request.fulfilledAt) return false

    const completed = new Date(request.fulfilledAt)

    return (
      completed.getMonth() === now.getMonth() &&
      completed.getFullYear() === now.getFullYear()
    )
  }).length

  const inProgress = hospitalRequests.filter(
    (request) => statusFor(request) === "In Progress",
  )

  const active = hospitalRequests.filter(
    (request) => statusFor(request) === "Active",
  )

  const hospitalName =
    typeof roleDetails?.hospital_name === "string"
      ? roleDetails.hospital_name
      : (currentUser?.name ?? "Hospital")

  const contactName =
    typeof roleDetails?.contact_person === "string"
      ? roleDetails.contact_person
      : (currentUser?.name ?? "Hospital Admin")

  const doctorName = contactName.toLowerCase().startsWith("dr.")
    ? contactName
    : `Dr. ${contactName}`

  const parsedMapLocation =
    typeof roleDetails?.map_location === "string"
      ? roleDetails.map_location.match(
          /\(?\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*\)?\s*$/,
        )
      : null

  const hospitalLatitude =
    typeof roleDetails?.latitude === "number"
      ? roleDetails.latitude
      : parsedMapLocation
        ? Number(parsedMapLocation[1])
        : null

  const hospitalLongitude =
    typeof roleDetails?.longitude === "number"
      ? roleDetails.longitude
      : parsedMapLocation
        ? Number(parsedMapLocation[2])
        : null

  const hospitalLocation: Coordinates | null =
    hospitalLatitude != null &&
    hospitalLongitude != null &&
    Number.isFinite(hospitalLatitude) &&
    Number.isFinite(hospitalLongitude)
      ? { latitude: hospitalLatitude, longitude: hospitalLongitude }
      : null

  const recentRequests = [...hospitalRequests]

    .sort(
      (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
    )

    .slice(0, 6)

  const recentActivity = [
    ...hospitalRequests.map((request) => ({
      key: `created-${request.id}`,

      title: "Blood request created",

      description: `${request.id.slice(0, 12)} · ${request.bloodGroup} · ${request.units} units`,

      timestamp: request.createdAt,

      icon: Droplets,
    })),

    ...responseRows

      .filter((response) => response.status !== "Cancelled")

      .map((response) => ({
        key: `response-${response.request_id}-${response.responded_at}`,

        title: "Donor response received",

        description: `A donor responded to ${response.request_id.slice(0, 12)}`,

        timestamp: response.responded_at,

        icon: Check,
      })),

    ...fulfilled

      .filter((request): request is BloodRequest & { fulfilledAt: string } =>
        Boolean(request.fulfilledAt),
      )

      .map((request) => ({
        key: `fulfilled-${request.id}`,

        title: "Request fulfilled",

        description: `${request.id.slice(0, 12)} · ${request.bloodGroup}`,

        timestamp: request.fulfilledAt,

        icon: CircleCheck,
      })),
  ]

    .sort(
      (left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp),
    )

    .slice(0, 3)

  useEffect(() => {
    let cancelled = false

    const requestIds = hospitalRequests.map((request) => request.id)

    if (!requestIds.length) {
      setResponseRows([])

      setResponseError(null)

      setResponseLoading(false)

      return
    }

    setResponseLoading(true)

    setResponseError(null)

    const loadResponses = () => {
      void supabase

        .from("donor_responses")

        .select("request_id,status,responded_at")

        .in("request_id", requestIds)

        .then(({ data, error }) => {
          if (cancelled) return

          if (error) {
            setResponseError(error.message)

            setResponseRows([])
          } else setResponseRows((data ?? []) as DonorResponseRow[])

          setResponseLoading(false)
        })
    }

    loadResponses()

    const interval = window.setInterval(loadResponses, 30000)

    return () => {
      cancelled = true

      window.clearInterval(interval)
    }
  }, [hospitalRequests.map((request) => request.id).join("|")])

  const notified = activeRequests.reduce(
    (total, request) => total + (request.matchedDonors?.length ?? 0),

    0,
  )

  const activeRequestIds = new Set(activeRequests.map((request) => request.id))

  const activeResponses = responseRows.filter(
    (response) =>
      activeRequestIds.has(response.request_id) &&
      response.status !== "Cancelled",
  )

  const responded = activeResponses.length

  const confirmed = activeResponses.filter((response) =>
    ["Hospital Confirmed", "Coordination in Progress", "Completed"].includes(
      response.status,
    ),
  ).length

  const respondedRequests = new Set(
    activeResponses.map((response) => response.request_id),
  ).size

  const responseRate = activeRequests.length
    ? Math.round((respondedRequests / activeRequests.length) * 100)
    : 0

  const responseDurations = responseRows

    .filter((response) => response.status !== "Cancelled")

    .flatMap((response) => {
      const respondedAt = new Date(response.responded_at)

      if (
        respondedAt.getMonth() !== now.getMonth() ||
        respondedAt.getFullYear() !== now.getFullYear()
      )
        return []

      const request = hospitalRequests.find(
        (item) => item.id === response.request_id,
      )

      if (!request) return []

      const elapsed =
        Date.parse(response.responded_at) - Date.parse(request.createdAt)

      return Number.isFinite(elapsed) && elapsed >= 0 ? [elapsed / 60000] : []
    })

  const averageResponse = responseDurations.length
    ? `${Math.round(responseDurations.reduce((sum, value) => sum + value, 0) / responseDurations.length)} mins`
    : "—"

  const isLoading = hospitalRequestsLoading

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-[1600px] space-y-5">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/80 bg-white/90 p-5 shadow-sm backdrop-blur-sm md:p-6">
          <div className="min-w-0">
            <p className="mb-2 text-[10px] font-bold tracking-[0.2em] text-[#E11D48]">
              HOSPITAL OPERATIONS
            </p>
            <h1 className="font-display text-3xl font-bold tracking-tight text-[#101A36] md:text-4xl">
              {greeting()}, {doctorName}
            </h1>
            <p className="mt-2 text-sm text-[#64748B]">
              Here&apos;s what&apos;s happening at your hospital today.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Manage requests, track responses and save lives.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 text-[#E11D48]">
                <ShieldCheck size={18} />
              </span>
              <div>
                <p className="max-w-48 truncate text-xs font-bold text-[#102A43]">
                  {hospitalName}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-[#16A34A]">
                  <Check size={12} /> Verified Hospital
                </p>
                <p className="text-[10px] text-slate-500">{contactName}</p>
              </div>
            </div>
            <Link
              to="/hospital/post-request"
              className="inline-flex items-center gap-2 rounded-lg bg-[#E11D48] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#BE123C]"
            >
              <Plus size={16} /> New Request
            </Link>
          </div>
        </header>

        {hospitalRequestsError && (
          <div
            role="alert"
            className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          >
            Hospital data could not be loaded: {hospitalRequestsError}
          </div>
        )}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            title="Active Requests"
            value={activeRequests.length}
            helper={`${hospitalRequests.filter((request) => request.status !== "Cancelled" && request.urgency === "CRITICAL").length} critical`}
            icon={Droplets}
            color="red"
            loading={isLoading}
          />
          <StatCard
            title="Successful Fulfillments"
            value={fulfilledThisMonth}
            helper="This month"
            icon={CircleCheck}
            color="green"
            loading={isLoading}
          />
          <StatCard
            title="Average Response Time"
            value={responseLoading ? "…" : averageResponse}
            helper={
              responseDurations.length
                ? "Based on donor responses"
                : "No response-time data yet"
            }
            icon={Timer}
            color="purple"
            loading={isLoading}
          />
        </section>

        <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(310px,0.9fr)]">
          <div className={`${card} min-w-0 overflow-hidden`}>
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
              <div>
                <h2 className="font-display text-base font-bold text-[#102A43]">
                  Recent Requests
                </h2>
                <p className="mt-0.5 text-xs text-[#64748B]">
                  Track blood requirements and fulfillment status.
                </p>
              </div>
              <Link
                to="/hospital/requests"
                className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#E11D48] hover:underline"
              >
                View All <ArrowRight size={13} />
              </Link>
            </div>
            {isLoading ? (
              <div className="space-y-3 p-5">
                {Array.from({ length: 5 }, (_, index) => (
                  <div
                    key={index}
                    className="h-9 animate-pulse rounded bg-slate-100"
                  />
                ))}
              </div>
            ) : recentRequests.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      {[
                        "Date & Time",

                        "Blood Group",

                        "Units",

                        "Urgency",

                        "Status",

                        "Actions",
                      ].map((label) => (
                        <th key={label} className="px-3 py-3">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentRequests.map((request) => (
                      <tr key={request.id} className="hover:bg-slate-50/60">
                        <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-600">
                          {dateText(request.createdAt)}
                        </td>
                        <td className="px-3 py-3">
                          <span className="rounded-md bg-rose-50 px-2 py-1 text-xs font-bold text-[#E11D48]">
                            {request.bloodGroup}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs font-semibold">
                          {request.units}
                        </td>
                        <td className="px-3 py-3 text-xs">
                          {request.urgency === "CRITICAL"
                            ? "Critical"
                            : request.urgency === "URGENT"
                              ? "High"
                              : "Normal"}
                        </td>
                        <td className="px-3 py-3">
                          <span className="whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-700">
                            {statusFor(request)}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <Link
                            to={`/hospital/requests?request=${encodeURIComponent(request.id)}`}
                            className="rounded-md bg-[#E11D48] px-3 py-1.5 text-[10px] font-bold text-white hover:bg-[#BE123C]"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-6 py-10 text-center">
                <Droplets size={25} className="mx-auto text-rose-300" />
                <p className="mt-3 text-sm font-semibold text-[#102A43]">
                  No blood requests yet
                </p>
                <p className="mt-1 text-xs text-[#64748B]">
                  Create a request to begin coordinating with your donor
                  network.
                </p>
                <Link
                  to="/hospital/post-request"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#E11D48] px-4 py-2 text-xs font-semibold text-white"
                >
                  Create a Request <ArrowRight size={13} />
                </Link>
              </div>
            )}
          </div>

          <div className="space-y-5">
            <section className={`${card} p-5`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-base font-bold text-[#102A43]">
                    Live Donor Response
                  </h2>
                  <p className="mt-1 text-[11px] text-[#64748B]">
                    Response activity across your active blood requests.
                  </p>
                </div>
                <span className="rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-semibold text-green-700">
                  Live
                </span>
              </div>
              {isLoading || responseLoading ? (
                <div className="mt-5 space-y-3">
                  <div className="mx-auto h-28 w-28 animate-pulse rounded-full bg-slate-100" />
                  <div className="h-8 animate-pulse rounded bg-slate-100" />
                </div>
              ) : activeRequests.length === 0 ? (
                <div className="mt-5 rounded-lg bg-slate-50 px-4 py-6 text-center">
                  <Activity className="mx-auto text-slate-300" size={22} />
                  <p className="mt-2 text-sm font-semibold text-slate-700">
                    No active donor response data
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Response activity appears when there are active requests.
                  </p>
                </div>
              ) : responseError ? (
                <p
                  role="alert"
                  className="mt-4 rounded-lg bg-rose-50 p-3 text-xs text-rose-700"
                >
                  Response records unavailable: {responseError}
                </p>
              ) : (
                <div className="mt-5 flex items-center gap-5">
                  <div
                    role="img"
                    aria-label={`${responseRate}% of active requests have a donor response`}
                    className="grid h-28 w-28 shrink-0 place-items-center rounded-full"
                    style={{
                      background: `conic-gradient(#E11D48 ${responseRate * 3.6}deg, #F1F5F9 ${responseRate * 3.6}deg)`,
                    }}
                  >
                    <div className="grid h-[84px] w-[84px] content-center justify-items-center rounded-full bg-white">
                      <span className="font-display text-xl font-extrabold text-[#102A43]">
                        {responseLoading ? "…" : `${responseRate}%`}
                      </span>
                      <span className="mt-0.5 text-center text-[9px] font-medium text-[#64748B]">
                        Requests with response
                      </span>
                    </div>
                  </div>
                  <div className="grid flex-1 gap-3">
                    {[
                      { value: notified, label: "Matched donors", icon: Bell },

                      { value: responded, label: "Responded", icon: Check },

                      {
                        value: confirmed,

                        label: "Confirmed",

                        icon: ShieldCheck,
                      },
                    ].map(({ value, label, icon: Icon }) => (
                      <div
                        key={label}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="flex items-center gap-2 text-[11px] text-[#64748B]">
                          <Icon size={13} className="text-[#E11D48]" />
                          {label}
                        </span>
                        <span className="text-sm font-bold text-[#102A43]">
                          {responseLoading ? "…" : value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <p className="mt-4 flex items-center gap-1.5 border-t border-slate-100 pt-3 text-[10px] text-[#64748B]">
                <Clock3 size={12} /> Response counts use saved donor response
                records.
              </p>
            </section>
            <section className={`${card} p-5`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-base font-bold text-[#102A43]">
                    Blood Requirement Overview
                  </h2>
                  <p className="mt-1 text-[11px] text-[#64748B]">
                    Active requests by blood group.
                  </p>
                </div>
                <Droplets className="text-[#E11D48]" size={18} />
              </div>
              {isLoading ? (
                <div className="mt-5 space-y-3">
                  {groups.slice(0, 5).map((group) => (
                    <div
                      key={group}
                      className="h-3 animate-pulse rounded bg-slate-100"
                    />
                  ))}
                </div>
              ) : activeRequests.length === 0 ? (
                <p className="mt-5 rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  No blood requirements yet
                </p>
              ) : (
                <div className="mt-5 space-y-2.5">
                  {groups.map((group) => {
                    const count = activeRequests.filter(
                      (request) => request.bloodGroup === group,
                    ).length

                    const maximum = Math.max(
                      1,

                      ...groups.map(
                        (item) =>
                          activeRequests.filter(
                            (request) => request.bloodGroup === item,
                          ).length,
                      ),
                    )

                    return (
                      <div
                        key={group}
                        className="grid grid-cols-[34px_1fr_24px] items-center gap-2 text-xs"
                      >
                        <span className="font-semibold text-slate-600">
                          {group}
                        </span>
                        <span className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <span
                            className="block h-full rounded-full bg-[#E11D48]"
                            style={{ width: `${(count / maximum) * 100}%` }}
                          />
                        </span>
                        <span className="text-right font-semibold text-slate-700">
                          {count}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_1.35fr]">
          <div className={`${card} p-5`}>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 text-[#E11D48]">
              <Droplets size={19} />
            </div>
            <h2 className="mt-3 font-display text-base font-bold text-[#102A43]">
              Need to Post a New Request?
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[#64748B]">
              Quickly submit a verified blood requirement and connect with
              available donors.
            </p>
            <Link
              to="/hospital/post-request"
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-[#E11D48] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#BE123C]"
            >
              <Plus size={15} /> Post Requirement
            </Link>
          </div>
          <div className={`${card} p-5`}>
            <h2 className="font-display text-base font-bold text-[#102A43]">
              Request Fulfillment
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Current status across all hospital requests.
            </p>
            <div className="mt-5 grid grid-cols-3 gap-3">
              {[
                { name: "Active", count: active.length, color: "bg-rose-500" },

                {
                  name: "In Progress",

                  count: inProgress.length,

                  color: "bg-amber-500",
                },

                {
                  name: "Fulfilled",

                  count: fulfilled.length,

                  color: "bg-green-500",
                },
              ].map((item) => (
                <div key={item.name} className="rounded-lg bg-slate-50 p-3">
                  <div
                    className={`mb-2 h-1.5 w-8 rounded-full ${item.color}`}
                  />
                  <p className="text-xs text-slate-500">{item.name}</p>
                  <p className="mt-1 text-lg font-bold text-[#102A43]">
                    {isLoading ? "…" : item.count}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {currentUser && (
          <InteractiveNetworkMap
            hospitalId={hospitalRecordId ?? ""}
            hospitalLocation={hospitalLocation}
            hospitalName={hospitalName}
            requests={hospitalRequests}
          />
        )}

        <section className={`${card} p-5`}>
          <div className="mb-4 flex items-center gap-2">
            <Activity size={17} className="text-[#E11D48]" />
            <div>
              <h2 className="font-display text-base font-bold text-[#102A43]">
                Recent Activity
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Activity available from saved request records.
              </p>
            </div>
          </div>
          {isLoading ? (
            <div className="h-16 animate-pulse rounded bg-slate-100" />
          ) : recentActivity.length ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {recentActivity.map((event) => (
                <article
                  key={event.key}
                  className="flex gap-3 rounded-lg bg-slate-50 p-3"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-50 text-[#E11D48]">
                    <event.icon size={15} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800">
                      {event.title}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-500">
                      {event.description}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-400">
                      {dateText(event.timestamp)}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              No recent activity to show.
            </p>
          )}
        </section>
      </div>
    </DashboardLayout>
  )
}
