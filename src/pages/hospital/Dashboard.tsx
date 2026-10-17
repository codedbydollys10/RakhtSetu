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
  Handshake,
  MapPin,
  Phone,
  Plus,
  ShieldCheck,
} from "lucide-react"

import DashboardLayout from "../../components/layout/DashboardLayout"

import { useApp } from "../../context/AppContext"

import { supabase } from "../../lib/supabase"

import type { BloodRequest } from "../../data/mockData"
import {
  MINIMUM_VALID_DONOR_RESPONSES,
  isRequestFulfilled,
  requestDisplayStatus,
} from "../../lib/bloodRequestFulfillment"

import InteractiveNetworkMap, {
  type Coordinates,
} from "../../components/hospital/InteractiveMap"

type DonorResponseRow = {
  request_id: string
  request_blood_group: string
  request_component: string
  request_area: string | null
  donor_id: string
  donor_name: string | null
  donor_phone: string | null
  donor_blood_group: string
  donor_city: string | null
  donor_area: string | null
  response_status: string
  responded_at: string
  donation_recorded: boolean
}

type RecentNgoResponse = {
  response_id: string
  request_id: string
  ngo_name: string
  response_type: "potential_donor" | "unable_to_help"
  response_status: string
  potential_donor_count: number | null
  responded_at: string
}

const card =
  "rounded-xl border border-[#E2E8F0] bg-white shadow-[0_2px_8px_rgba(15,25,51,0.05)]"

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
  if (isRequestFulfilled(request)) return "Fulfilled"

  if (request.status === "Fulfilled") return "Fulfillment Review"

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

  const [recentNgoResponses, setRecentNgoResponses] = useState<
    RecentNgoResponse[]
  >([])

  const [ngoResponsesError, setNgoResponsesError] = useState<string | null>(null)

  const hospitalRequests = useMemo(
    () => requests.filter((request) => request.hospitalId === hospitalRecordId),

    [requests, hospitalRecordId],
  )

  const activeRequests = hospitalRequests.filter(
    (request) =>
      request.status !== "Cancelled" && !isRequestFulfilled(request),
  )

  const fulfilled = hospitalRequests.filter(isRequestFulfilled)

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

      .filter((response) => response.response_status !== "Cancelled")

      .map((response) => ({
        key: `response-${response.request_id}-${response.responded_at}`,

        title: "Donor response received",

        description: `${response.donor_name || "A donor"} responded to ${response.request_id.slice(0, 12)}`,

        timestamp: response.responded_at,

        icon: Check,
      })),

    ...recentNgoResponses.map((response) => ({
      key: `ngo-${response.response_id}`,
      title:
        response.response_type === "potential_donor"
          ? "NGO potential donor offer"
          : "NGO unable-to-help response",
      description:
        response.response_type === "potential_donor"
          ? `${response.ngo_name} identified ${response.potential_donor_count ?? 0} potential donor(s) for ${response.request_id.slice(0, 12)}`
          : `${response.ngo_name} cannot assist with ${response.request_id.slice(0, 12)}`,
      timestamp: response.responded_at,
      icon: Handshake,
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
        .rpc("get_hospital_donor_responses", { p_request_id: null })
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

  useEffect(() => {
    let cancelled = false
    const loadNgoResponses = () => {
      void (async () => {
        try {
          const { data, error } = await supabase.rpc(
            "get_hospital_recent_ngo_responses",
          )
          if (cancelled) return
          if (error) {
            setNgoResponsesError(error.message)
            setRecentNgoResponses([])
          } else {
            setNgoResponsesError(null)
            setRecentNgoResponses((data ?? []) as RecentNgoResponse[])
          }
        } catch (loadError: unknown) {
          if (cancelled) return
          setNgoResponsesError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load NGO response activity.",
          )
          setRecentNgoResponses([])
        }
      })()
    }
    loadNgoResponses()
    const interval = window.setInterval(loadNgoResponses, 30000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [hospitalRecordId])

  const coordinationRequests = hospitalRequests.filter(
    (request) => request.status !== "Cancelled",
  )

  const notified = coordinationRequests.reduce(
    (total, request) => total + (request.matchedDonors?.length ?? 0),

    0,
  )

  const coordinationRequestIds = new Set(
    coordinationRequests.map((request) => request.id),
  )

  const coordinationResponses = responseRows.filter(
    (response) =>
      coordinationRequestIds.has(response.request_id) &&
      response.response_status !== "Cancelled",
  )

  const responded = coordinationResponses.length

  const confirmed = coordinationResponses.filter((response) =>
    ["Hospital Confirmed", "Coordination in Progress", "Completed"].includes(
      response.response_status,
    ),
  ).length

  const respondedRequests = new Set(
    coordinationResponses.map((response) => response.request_id),
  ).size

  const responseRate = coordinationRequests.length
    ? Math.round((respondedRequests / coordinationRequests.length) * 100)
    : 0

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
                  <Check size={12} /> Hospital Account
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

                        "Responses",

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
                          <div className="w-24">
                            <div className="flex justify-between text-[10px] text-slate-600">
                              <span>
                                {request.validDonorResponseCount ?? 0}{" "}
                                / {MINIMUM_VALID_DONOR_RESPONSES}
                              </span>
                            </div>
                            <div
                              role="progressbar"
                              aria-label={`Valid donor responses for ${request.id}`}
                              aria-valuemin={0}
                              aria-valuemax={MINIMUM_VALID_DONOR_RESPONSES}
                              aria-valuenow={Math.min(
                                request.validDonorResponseCount ?? 0,
                                MINIMUM_VALID_DONOR_RESPONSES,
                              )}
                              className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"
                            >
                              <span
                                className="block h-full rounded-full bg-teal-500"
                                style={{
                                  width: `${Math.min(
                                    ((request.validDonorResponseCount ?? 0) /
                                      MINIMUM_VALID_DONOR_RESPONSES) *
                                      100,
                                    100,
                                  )}%`,
                                }}
                              />
                            </div>
                            {requestDisplayStatus(request) ===
                              "Fulfillment Review" && (
                              <span className="mt-1 block text-[9px] font-semibold text-amber-700">
                                Evidence incomplete
                              </span>
                            )}
                          </div>
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
            <section className="rounded-xl border border-[#253540] bg-[#101B23] p-5 shadow-[0_2px_8px_rgba(0,0,0,0.18)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-base font-bold text-[#E8F0F5]">
                    Donor Response Overview
                  </h2>
                  <p className="mt-1 text-[11px] text-[#A9BBC8]">
                    Response activity across all non-cancelled blood requests.
                  </p>
                </div>
                <span className="rounded-full border border-teal-400/20 bg-teal-400/10 px-2.5 py-1 text-[10px] font-semibold text-teal-300">
                  Refreshes every 30s
                </span>
              </div>
              {isLoading || responseLoading ? (
                <div className="mt-5 space-y-3">
                  <div className="mx-auto h-28 w-28 animate-pulse rounded-full bg-[#1B2A34]" />
                  <div className="h-8 animate-pulse rounded bg-[#1B2A34]" />
                </div>
              ) : coordinationRequests.length === 0 ? (
                <div className="mt-5 rounded-lg border border-[#253540] bg-[#0B141C] px-4 py-6 text-center">
                  <Activity className="mx-auto text-[#64748B]" size={22} />
                  <p className="mt-2 text-sm font-semibold text-[#D6E1E8]">
                    No donor response data
                  </p>
                  <p className="mt-1 text-xs text-[#A9BBC8]">
                    Response activity appears when your hospital has requests.
                  </p>
                </div>
              ) : responseError ? (
                <p
                  role="alert"
                  className="mt-4 rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-xs text-rose-200"
                >
                  Response records unavailable: {responseError}
                </p>
              ) : (
                <div className="mt-5 flex items-center gap-5">
                  <div
                    role="img"
                    aria-label={`${responseRate}% of non-cancelled requests have a donor response`}
                    className="grid h-28 w-28 shrink-0 place-items-center rounded-full"
                    style={{
                      background: `conic-gradient(#E51C3D ${responseRate * 3.6}deg, #253540 ${responseRate * 3.6}deg)`,
                    }}
                  >
                    <div className="grid h-[84px] w-[84px] content-center justify-items-center rounded-full border border-[#253540] bg-[#0B141C]">
                      <span className="font-display text-xl font-extrabold text-[#E8F0F5]">
                        {responseLoading ? "…" : `${responseRate}%`}
                      </span>
                      <span className="mt-0.5 text-center text-[9px] font-medium text-[#A9BBC8]">
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
                        <span className="flex items-center gap-2 text-[11px] text-[#A9BBC8]">
                          <Icon size={13} className="text-[#E51C3D]" />
                          {label}
                        </span>
                        <span className="text-sm font-bold text-[#E8F0F5]">
                          {responseLoading ? "…" : value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!responseLoading && responseRows.length > 0 && (
                <div className="mt-5 space-y-3 border-t border-[#253540] pt-4">
                  <h3 className="text-xs font-bold text-[#E8F0F5]">
                    Donor responses and contact
                  </h3>
                  {coordinationResponses.slice(0, 3).map((response) => (
                    <article
                      key={`${response.request_id}-${response.donor_id}`}
                      className="rounded-lg border border-[#253540] bg-[#0B141C] p-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-[#E8F0F5]">
                            {response.donor_name || "Donor"} ·{" "}
                            {response.donor_blood_group}
                          </p>
                          <p className="mt-1 flex items-center gap-1 text-[11px] text-[#A9BBC8]">
                            <Phone size={12} />
                            {response.donor_phone ? (
                              <a
                                href={`tel:${response.donor_phone}`}
                                className="font-semibold text-sky-300 underline"
                              >
                                {response.donor_phone}
                              </a>
                            ) : (
                              "Phone not provided"
                            )}
                          </p>
                          <p className="mt-1 flex items-center gap-1 text-[11px] text-[#A9BBC8]">
                            <MapPin size={12} />
                            {[response.donor_area, response.donor_city]
                              .filter(Boolean)
                              .join(", ") || "Location not provided"}
                          </p>
                          <p className="mt-1 text-[10px] text-[#A9BBC8]">
                            {response.response_status} · Request{" "}
                            {response.request_id.slice(0, 12)}
                          </p>
                        </div>
                        <Link
                          to={`/hospital/requests?request=${encodeURIComponent(response.request_id)}`}
                          className="rounded-md border border-[#334856] bg-[#14232D] px-2.5 py-1.5 text-[10px] font-semibold text-[#D6E1E8] hover:bg-[#1B2A34]"
                        >
                          Review response
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              <p className="mt-4 flex items-center gap-1.5 border-t border-slate-100 pt-3 text-[10px] text-[#64748B]">
                <Clock3 size={12} /> Response counts use saved donor response
                records.
              </p>
            </section>
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
          {ngoResponsesError && (
            <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-700">
              NGO response activity could not be loaded: {ngoResponsesError}
            </p>
          )}
        </section>
      </div>
    </DashboardLayout>
  )
}
