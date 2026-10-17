import { useEffect, useMemo, useState } from "react"

import { AnimatePresence, motion } from "framer-motion"
import { Link } from "react-router-dom"

import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Droplet,
  MapPin,
  Search,
  X,
} from "lucide-react"

import DashboardLayout, {
  PageHeader,
} from "../../components/layout/DashboardLayout"

import { useApp } from "../../context/AppContext"

import { useDonorPortal } from "../../context/DonorPortalContext"

import type { BloodGroup, BloodRequest, Urgency } from "../../data/mockData"

import { urgencyLabel } from "../../data/donorDashboardData"

const groups: BloodGroup[] = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"]

const active = new Set([
  "Verification Pending",

  "Verified",

  "Matching",

  "Donors Contacted",

  "Donor Confirmed",

  "Hospital Confirmation",
])

const filters = ["All", "Urgent", "High", "Normal"]

const tone = (urgency: Urgency) =>
  urgency === "CRITICAL"
    ? "border-red-200 bg-red-50 text-red-700"
    : urgency === "URGENT"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-emerald-200 bg-emerald-50 text-emerald-700"

function RequestDetails({
  request,

  onClose,
}: {
  request: BloodRequest

  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#031A36]/45 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-details-title"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl border border-[#D8E3EA] bg-white p-5 shadow-xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#E51C3D]">
              {urgencyLabel[request.urgency]} request
            </p>
            <h2
              id="request-details-title"
              className="mt-1 font-display text-xl font-bold text-[#031A36]"
            >
              {request.bloodGroup} blood required
            </h2>
            <p className="mt-1 text-sm text-[#617587]">
              {request.hospitalName}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close request details"
            className="rounded-lg p-1.5 text-[#617587] hover:bg-[#F5F8FA]"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mt-4 space-y-3 rounded-xl bg-[#F5F8FA] p-4 text-xs">
          {[
            ["Request ID", request.id],

            [
              "Units",

              `${request.units} ${request.units === 1 ? "unit" : "units"}`,
            ],

            [
              "Component",

              (request.component ?? "WHOLE_BLOOD").replace(/_/g, " "),
            ],

            ["Location", request.area],

            [
              "Distance",

              request.distanceKm != null
                ? `Approx. ${request.distanceKm} km`
                : "Same-city match; exact distance unavailable",
            ],

            [
              "Required by",

              request.requiredBy
                ? new Date(request.requiredBy).toLocaleString("en-IN", {
                    dateStyle: "medium",

                    timeStyle: "short",
                  })
                : "As soon as possible",
            ],

            ["Status", request.status],

            [
              "Posted",

              new Date(request.createdAt).toLocaleString("en-IN", {
                dateStyle: "medium",

                timeStyle: "short",
              }),
            ],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4">
              <span className="text-[#617587]">{label}</span>
              <span className="text-right font-semibold text-[#021734]">
                {value}
              </span>
            </div>
          ))}
        </div>
        {request.notes && (
          <p className="mt-3 rounded-lg border border-[#D8E3EA] p-3 text-xs leading-relaxed text-[#617587]">
            {request.notes}
          </p>
        )}
        <p className="mt-3 text-[10px] leading-relaxed text-[#617587]">
          Patient and donor private details are not displayed. Medical
          eligibility is confirmed at the donation site.
        </p>
      </motion.div>
    </div>
  )
}

export function DonorRequestWorkspace({
  mode = "emergency",
}: {
  mode?: "emergency" | "nearby"
}) {
  const { requests, currentUser, donors, roleDetails, requestFeedError } =
    useApp()

  const donor = donors.find((item) => item.id === currentUser?.id)

  const { profile, recordResponse, responses } = useDonorPortal()
  const donorPhone =
    profile.phone?.trim() ||
    (typeof roleDetails?.phone === "string" ? roleDetails.phone.trim() : "")

  const bloodGroup = profile.bloodGroup ?? donor?.bloodGroup

  const [query, setQuery] = useState("")

  const [group, setGroup] = useState("All blood groups")

  const [urgency, setUrgency] = useState("All urgency")

  const [distance, setDistance] = useState("Any distance")

  const [hospital, setHospital] = useState("All hospitals")

  const [status, setStatus] = useState("All statuses")

  const [details, setDetails] = useState<BloodRequest | null>(null)

  const [confirm, setConfirm] = useState<BloodRequest | null>(null)

  const [toast, setToast] = useState("")

  const [declined, setDeclined] = useState<string[]>([])

  const hospitals = [
    ...new Set(requests.map((request) => request.hospitalName)),
  ]

  const list = useMemo(
    () =>
      requests

        .filter((request) => {
          const hasExistingResponse = responses.some(
            (response) =>
              response.requestId === request.id &&
              response.status !== "Cancelled" &&
              response.status !== "Completed",
          )

          const isActive =
            (active.has(request.status) && request.status !== "Fulfilled") ||
            (mode === "nearby" &&
              status !== "All statuses" &&
              request.status === status)

          const matchesSearch =
            `${request.id} ${request.hospitalName} ${request.area} ${request.bloodGroup}`

              .toLowerCase()

              .includes(query.toLowerCase())

          const matchesGroup =
            group === "All blood groups" || request.bloodGroup === group

          const matchesUrgency =
            urgency === "All urgency" ||
            urgencyLabel[request.urgency] === urgency

          const matchesDistance =
            distance === "Any distance" ||
            (request.distanceKm != null &&
              request.distanceKm <= Number(distance))

          const matchesHospital =
            hospital === "All hospitals" || request.hospitalName === hospital

          const matchesStatus =
            status === "All statuses" || request.status === status

          return (
            isActive &&
            matchesSearch &&
            matchesGroup &&
            matchesUrgency &&
            matchesDistance &&
            matchesHospital &&
            matchesStatus &&
            !declined.includes(request.id)
          )
        })

        .sort((a, b) => a.urgency.localeCompare(b.urgency)),

    [
      bloodGroup,

      declined,

      distance,

      group,

      hospital,

      mode,

      query,

      requests,

      responses,

      status,

      urgency,
    ],
  )

  const respond = async () => {
    if (!confirm) return
    if (!donorPhone) {
      setToast("Add a phone number to your donor profile before responding.")
      return
    }

    try {
      await recordResponse(confirm.id)
    } catch (error) {
      setToast(
        error instanceof Error
          ? error.message
          : "Unable to send your response.",
      )

      return
    }

    setToast("Response sent. The hospital has been notified.")

    window.setTimeout(() => setToast(""), 3500)

    setConfirm(null)
  }

  const title =
    mode === "nearby" ? "Nearby Blood Requests" : "Emergency Requests"

  const subtitle =
    mode === "nearby"
      ? "Explore nearby blood requests."
      : "Matching requests in your network, grouped by urgency."

  return (
    <DashboardLayout>
      <PageHeader title={title} subtitle={subtitle} />
      {requestFeedError && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          Requests could not be loaded: {requestFeedError}
        </p>
      )}
      <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-[#D8E3EA] bg-white p-3">
        <div className="relative min-w-[190px] flex-1">
          <Search
            size={15}
            className="absolute left-3 top-2.5 text-[#9AA9B5]"
          />
          <label className="sr-only" htmlFor="request-search">
            Search requests
          </label>
          <input
            id="request-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search hospital, area, group…"
            className="w-full rounded-lg border border-[#D8E3EA] py-2 pl-9 pr-3 text-xs outline-none focus:border-[#E51C3D]"
          />
        </div>
        <label className="sr-only" htmlFor="request-group">
          Blood group
        </label>
        <select
          id="request-group"
          value={group}
          onChange={(event) => setGroup(event.target.value)}
          className="rounded-lg border border-[#D8E3EA] bg-white px-3 py-2 text-xs"
        >
          <option>All blood groups</option>
          {groups.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <label className="sr-only" htmlFor="request-urgency">
          Urgency
        </label>
        <select
          id="request-urgency"
          value={urgency}
          onChange={(event) => setUrgency(event.target.value)}
          className="rounded-lg border border-[#D8E3EA] bg-white px-3 py-2 text-xs"
        >
          {["All urgency", ...filters.slice(1)].map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <label className="sr-only" htmlFor="request-distance">
          Distance
        </label>
        <select
          id="request-distance"
          value={distance}
          onChange={(event) => setDistance(event.target.value)}
          className="rounded-lg border border-[#D8E3EA] bg-white px-3 py-2 text-xs"
        >
          {["Any distance", "5", "10"].map((item) => (
            <option key={item} value={item}>
              {item === "Any distance" ? item : `${item} km`}
            </option>
          ))}
        </select>
        {mode === "nearby" && (
          <>
            <label className="sr-only" htmlFor="request-hospital">
              Hospital
            </label>
            <select
              id="request-hospital"
              value={hospital}
              onChange={(event) => setHospital(event.target.value)}
              className="rounded-lg border border-[#D8E3EA] bg-white px-3 py-2 text-xs"
            >
              <option>All hospitals</option>
              {hospitals.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <label className="sr-only" htmlFor="request-status">
              Request status
            </label>
            <select
              id="request-status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-lg border border-[#D8E3EA] bg-white px-3 py-2 text-xs"
            >
              <option>All statuses</option>
              {[...new Set(requests.map((request) => request.status))].map(
                (item) => (
                  <option key={item}>{item}</option>
                ),
              )}
            </select>
          </>
        )}
      </div>
      {mode === "emergency" ? (
        <div className="space-y-6">
          {filters.slice(1).map((priority) => {
            const sectionRequests = list.filter(
              (request) => urgencyLabel[request.urgency] === priority,
            )

            if (!sectionRequests.length) return null

            return (
              <section key={priority}>
                <h2 className="mb-3 flex items-center gap-2 font-display text-base font-bold text-[#021734]">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      priority === "Urgent"
                        ? "bg-[#E51C3D]"
                        : priority === "High"
                          ? "bg-amber-500"
                          : "bg-[#16A34A]"
                    }`}
                  />
                  {priority}{" "}
                  <span className="text-xs font-medium text-[#617587]">
                    ({sectionRequests.length})
                  </span>
                </h2>
                <div className="grid gap-3 lg:grid-cols-2">
                  {sectionRequests.map((request) => (
                    <RequestCard
                      key={request.id}
                      request={request}
                      responded={responses.some(
                        (item) => item.requestId === request.id,
                      )}
                      onDetails={setDetails}
                      onRespond={setConfirm}
                      onDecline={(id) => setDeclined((items) => [...items, id])}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {list.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              responded={responses.some(
                (item) => item.requestId === request.id,
              )}
              onDetails={setDetails}
              onRespond={setConfirm}
              onDecline={(id) => setDeclined((items) => [...items, id])}
            />
          ))}
        </div>
      )}
      {!list.length && (
        <div className="rounded-xl border border-dashed border-[#D8E3EA] bg-white p-10 text-center">
          <Droplet size={23} className="mx-auto text-[#9AA9B5]" />
          <p className="mt-3 text-sm font-semibold text-[#021734]">
            No matching requests
          </p>
          <p className="mt-1 text-xs text-[#617587]">
            Try changing your filters or search.
          </p>
        </div>
      )}
      <p className="mt-4 text-[10px] text-[#617587]">
        Distance is an approximate area-level estimate. Exact donor locations
        are never shown.
      </p>
      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed bottom-6 right-5 z-[90] flex items-center gap-2 rounded-xl bg-[#031A36] px-4 py-3 text-xs font-semibold text-white shadow-xl"
          >
            <CheckCircle2 size={16} className="text-[#4ADE80]" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
      {details && (
        <RequestDetails request={details} onClose={() => setDetails(null)} />
      )}
      {confirm && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#031A36]/45 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setConfirm(null)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
          >
            <h2 className="font-display text-lg font-bold text-[#031A36]">
              I can help
            </h2>
            <p className="mt-1 text-sm text-[#617587]">
              Send a response to {confirm.hospitalName}?
            </p>
            <div className="mt-4 rounded-xl bg-[#F5F8FA] p-3 text-xs">
              <p>
                <b>{confirm.bloodGroup}</b> · {confirm.units} units ·{" "}
                {confirm.area}
              </p>
              <p className="mt-1 text-[#617587]">
                By responding, you agree to share your name, phone number, blood
                group, city, and area with this requesting hospital so it can
                coordinate with you. Your exact coordinates, emergency contact,
                and sensitive personal records are not shared.
              </p>
            </div>
            {!donorPhone && (
              <p role="alert" className="mt-3 text-xs text-rose-700">
                A valid phone number is required to respond. Add it in your{" "}
                <Link
                  to="/donor/profile"
                  onClick={() => setConfirm(null)}
                  className="font-semibold underline"
                >
                  donor profile
                </Link>{" "}
                first.
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirm(null)}
                className="rounded-lg border border-[#D8E3EA] px-4 py-2 text-xs font-semibold text-[#617587]"
              >
                Cancel
              </button>
              <button
                onClick={respond}
                disabled={!donorPhone}
                className="rounded-lg bg-[#E51C3D] px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Confirm response
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

function RequestCard({
  request,

  responded,

  onDetails,

  onRespond,

  onDecline,
}: {
  request: BloodRequest

  responded: boolean

  onDetails: (request: BloodRequest) => void

  onRespond: (request: BloodRequest) => void

  onDecline: (id: string) => void
}) {
  const { profile, updateResponse } = useDonorPortal()

  return (
    <article
      className={`rounded-xl border bg-white p-4 shadow-[0_2px_8px_rgba(3,26,54,0.035)] ${
        request.urgency === "CRITICAL" ? "border-red-200" : "border-[#D8E3EA]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <span
            className={`rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-wide ${tone(request.urgency)}`}
          >
            {urgencyLabel[request.urgency]}
          </span>
          <h3 className="mt-2 font-display text-base font-bold text-[#031A36]">
            {request.bloodGroup} ·{" "}
            {(request.component ?? "WHOLE_BLOOD")
              .replace(/_/g, " ")
              .toLowerCase()}{" "}
            · {request.units} units
          </h3>
          <p className="mt-1 text-xs text-[#617587]">
            {request.hospitalName} · {request.area}
          </p>
        </div>
        <Droplet className="shrink-0 text-[#E51C3D]" size={20} />
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-[#617587]">
        <span className="flex items-center gap-1">
          <MapPin size={12} />
          {request.distanceKm != null
            ? `Approx. ${request.distanceKm} km`
            : "Same city; exact distance unavailable"}
        </span>
        <span>{request.area}</span>
        <span className="flex items-center gap-1">
          <Clock3 size={12} />
          {new Date(request.createdAt).toLocaleDateString("en-IN", {
            day: "numeric",

            month: "short",
          })}
        </span>
      </div>
      {responded ? (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-[#ECFDF3] px-3 py-2 text-xs font-semibold text-[#16803C]">
          <CheckCircle2 size={14} />
          Response sent
        </div>
      ) : (
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => onRespond(request)}
            className="flex-1 rounded-lg bg-[#E51C3D] px-3 py-2.5 text-xs font-bold text-white hover:bg-[#C91836]"
          >
            I can help
          </button>
          <button
            onClick={() => onDecline(request.id)}
            className="rounded-lg border border-[#D8E3EA] px-3 py-2.5 text-xs font-semibold text-[#617587] hover:bg-[#F5F8FA]"
          >
            Not available
          </button>
          <button
            onClick={() => onDetails(request)}
            aria-label={`View ${request.id} details`}
            className="rounded-lg border border-[#D8E3EA] px-3 py-2.5 text-[#062847] hover:bg-[#F5F8FA]"
          >
            <ArrowRight size={14} />
          </button>
        </div>
      )}
    </article>
  )
}

export default function DonorRequests() {
  return <DonorRequestWorkspace mode="emergency" />
}
