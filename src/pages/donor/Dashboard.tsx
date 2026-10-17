import React, { useEffect, useMemo, useState } from "react"

import { motion } from "framer-motion"

import { Link } from "react-router-dom"

import {
  Activity,
  ArrowRight,
  Award,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  Droplet,
  Heart,
  MapPin,
  Navigation,
  Search,
  ShieldCheck,
  UsersRound,
  X,
} from "lucide-react"

import DashboardLayout from "../../components/layout/DashboardLayout"

import DonorImpactChart from "../../components/donor/DonorImpactChart"

import { donorRewards, urgencyLabel } from "../../data/donorDashboardData"

import type { BloodGroup, BloodRequest, Urgency } from "../../data/mockData"

import { useApp } from "../../context/AppContext"

import { useDonorPortal } from "../../context/DonorPortalContext"

import { useDonationHistory } from "../../hooks/useDonationHistory"

const bloodGroups: BloodGroup[] = [
  "O+",

  "O-",

  "A+",

  "A-",

  "B+",

  "B-",

  "AB+",

  "AB-",
]

const activeStatuses = new Set([
  "Verification Pending",

  "Verified",

  "Matching",

  "Donors Contacted",

  "Donor Confirmed",

  "Hospital Confirmation",
])

function formatDate(value?: string | null) {
  if (!value || value === "Not recorded") return "Not recorded"

  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-IN", {
        day: "numeric",

        month: "short",

        year: "numeric",
      })
}

function urgencyTone(urgency: Urgency) {
  if (urgency === "CRITICAL") return "border-red-200 bg-red-50 text-red-700"

  if (urgency === "URGENT") return "border-amber-200 bg-amber-50 text-amber-800"

  return "border-emerald-200 bg-emerald-50 text-emerald-700"
}

function SectionHeading({
  title,

  subtitle,

  to,

  linkLabel = "View all",
}: {
  title: string

  subtitle?: string

  to?: string

  linkLabel?: string
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-lg font-bold text-[#021734]">
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-xs text-[#617587]">{subtitle}</p>}
      </div>
      {to && (
        <Link
          to={to}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#E51C3D] hover:underline"
        >
          {linkLabel}
          <ArrowRight size={13} />
        </Link>
      )}
    </div>
  )
}

function StatTile({
  label,

  value,

  note,

  icon: Icon,

  tone = "red",
}: {
  label: string

  value: string | number

  note: string

  icon: typeof Droplet

  tone?: "red" | "green" | "navy" | "amber"
}) {
  const tones = {
    red: "bg-[#FFF1F3] text-[#E51C3D]",

    green: "bg-[#ECFDF3] text-[#16A34A]",

    navy: "bg-[#EAF0F5] text-[#062847]",

    amber: "bg-amber-50 text-amber-600",
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl border border-[#D8E3EA] bg-white p-4 shadow-[0_4px_18px_rgba(3,26,54,0.05)] transition-shadow hover:shadow-[0_8px_22px_rgba(3,26,54,0.08)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#617587]">
            {label}
          </p>
          <p className="mt-2 truncate font-display text-2xl font-extrabold text-[#021734]">
            {value}
          </p>
        </div>
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}
        >
          <Icon size={17} />
        </div>
      </div>
      <p className="mt-2 text-xs text-[#617587]">{note}</p>
    </motion.div>
  )
}

function ModalShell({
  title,

  description,

  onClose,

  children,
}: {
  title: string

  description: string

  onClose: () => void

  children: React.ReactNode
}) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#031A36]/45 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="donor-modal-title"
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-md rounded-2xl border border-[#D8E3EA] bg-white p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="donor-modal-title"
              className="font-display text-lg font-bold text-[#021734]"
            >
              {title}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-[#617587]">
              {description}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-[#617587] hover:bg-[#F5F8FA] focus-visible:outline-2 focus-visible:outline-[#E51C3D]"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mt-5">{children}</div>
      </motion.div>
    </div>
  )
}

function RequestCard({
  request,

  responded,

  onDetails,

  onHelp,

  onDecline,
}: {
  request: BloodRequest

  responded: boolean

  onDetails: (request: BloodRequest) => void

  onHelp: (request: BloodRequest) => void

  onDecline: (requestId: string) => void
}) {
  return (
    <article
      className={`rounded-xl border bg-white p-4 shadow-[0_2px_8px_rgba(3,26,54,0.035)] ${
        request.urgency === "CRITICAL" ? "border-red-200" : "border-[#D8E3EA]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF1F3] text-[#E51C3D]">
            <Droplet size={19} fill="currentColor" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${urgencyTone(request.urgency)}`}
              >
                {urgencyLabel[request.urgency]}
              </span>
            </div>
            <h3 className="mt-2 font-display text-base font-bold text-[#021734]">
              {request.bloodGroup} blood required
            </h3>
            <p className="mt-0.5 text-xs text-[#617587]">
              {request.hospitalName} · {request.area}
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-md bg-[#F5F8FA] px-2 py-1 text-xs font-semibold text-[#062847]">
          {request.units} {request.units === 1 ? "unit" : "units"}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#617587]">
        <span className="inline-flex items-center gap-1">
          <MapPin size={13} />
          {request.distanceKm != null
            ? `Approx. ${request.distanceKm} km`
            : "Same city; exact distance unavailable"}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock3 size={13} />
          {request.status}
        </span>
      </div>
      {responded ? (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-[#ECFDF3] px-3 py-2.5 text-xs font-semibold text-[#16803C]">
          <CheckCircle2 size={15} /> Response sent — the coordination team has
          been notified.
        </div>
      ) : (
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => onHelp(request)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#E51C3D] px-3 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#C91836] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E51C3D]"
          >
            <Heart size={14} /> I can help
          </button>
          <button
            onClick={() => onDecline(request.id)}
            className="rounded-lg border border-[#D8E3EA] px-3 py-2.5 text-xs font-semibold text-[#617587] hover:bg-[#F5F8FA] focus-visible:outline-2 focus-visible:outline-[#E51C3D]"
          >
            Not available
          </button>
          <button
            onClick={() => onDetails(request)}
            aria-label={`View details for ${request.hospitalName}`}
            className="rounded-lg border border-[#D8E3EA] p-2.5 text-[#062847] hover:bg-[#F5F8FA] focus-visible:outline-2 focus-visible:outline-[#E51C3D]"
          >
            <ArrowRight size={14} />
          </button>
        </div>
      )}
    </article>
  )
}

function NearbyMap({ location }: { location: string }) {
  return (
    <div
      className="relative h-48 overflow-hidden rounded-xl border border-[#D8E3EA] bg-[#F0F6F8]"
      role="img"
      aria-label={`Illustrative nearby network map for ${location}`}
    >
      <div className="absolute inset-0 opacity-70" aria-hidden="true">
        <svg viewBox="0 0 360 190" className="h-full w-full">
          <path
            d="M-10 135 C60 100 90 160 145 118 S245 45 370 76"
            fill="none"
            stroke="#CAD8E0"
            strokeWidth="18"
          />
          <path
            d="M42 -10 C75 48 130 65 113 116 S154 163 165 205"
            fill="none"
            stroke="#fff"
            strokeWidth="8"
          />
          <path
            d="M235 -10 C214 50 263 89 221 122 S234 168 260 205"
            fill="none"
            stroke="#fff"
            strokeWidth="7"
          />
          <path
            d="M-10 57 C65 75 94 34 170 61 S273 110 370 106"
            fill="none"
            stroke="#fff"
            strokeWidth="6"
          />
        </svg>
      </div>
      <span
        className="absolute left-[46%] top-[43%] z-10 flex h-9 w-9 items-center justify-center rounded-full border-4 border-white bg-[#031A36] text-white shadow-md"
        title="Your approximate area"
      >
        <Navigation size={14} fill="white" />
      </span>
      <span
        className="absolute left-[19%] top-[29%] flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#E51C3D] text-white shadow"
        title="Request location"
      >
        <Droplet size={12} fill="white" />
      </span>
      <span
        className="absolute right-[19%] top-[54%] flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#16A34A] text-white shadow"
        title="Hospital"
      >
        <ShieldCheck size={12} />
      </span>
      <span
        className="absolute left-[62%] top-[18%] flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#E51C3D] text-white shadow"
        title="Request location"
      >
        <Droplet size={12} fill="white" />
      </span>
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between rounded-lg bg-white/95 px-3 py-2 text-[10px] text-[#617587] shadow-sm">
        <span className="font-semibold text-[#021734]">
          {location || "Your area"} · Network preview
        </span>
        <span className="flex items-center gap-2">
          <i className="h-2 w-2 rounded-full bg-[#E51C3D]" />
          Requests <i className="h-2 w-2 rounded-full bg-[#16A34A]" />
          Hospital
        </span>
      </div>
    </div>
  )
}

export default function DonorDashboard() {
  const {
    donors,

    requests,

    currentUser,

    roleDetails,

    donorAvailability,

    toggleDonorAvailability,

    requestFeedError,
  } = useApp()

  const donorPortal = useDonorPortal()

  const donationHistory = useDonationHistory()

  const [availabilityOpen, setAvailabilityOpen] = useState(false)

  const [availabilityMode, setAvailabilityMode] =
    useState<"available" | "temporary" | "unavailable">(
      donorAvailability === true ? "available" : "unavailable",
    )

  const [savedUntil, setSavedUntil] = useState(donorPortal.availabilityUntil)
  const [availabilityError, setAvailabilityError] = useState("")
  const [availabilitySaving, setAvailabilitySaving] = useState(false)

  const [selectedRequest, setSelectedRequest] = useState<BloodRequest | null>(
    null,
  )

  const [confirmRequest, setConfirmRequest] = useState<BloodRequest | null>(
    null,
  )

  const [availabilityChoice, setAvailabilityChoice] =
    useState<"available" | "temporary" | "unavailable">("available")

  const [declinedIds, setDeclinedIds] = useState<string[]>([])

  const [bloodFilter, setBloodFilter] = useState("All blood groups")

  const [urgencyFilter, setUrgencyFilter] = useState("All urgency")

  const [nearbyQuery, setNearbyQuery] = useState("")

  const [toast, setToast] = useState("")

  const [profileMenuOpen, setProfileMenuOpen] = useState(false)

  useEffect(() => {
    if (donorAvailability !== null) {
      setAvailabilityMode(
        donorAvailability
          ? "available"
          : donorPortal.availabilityStatus === "temporary"
            ? "temporary"
            : "unavailable",
      )
    }

    setSavedUntil(donorPortal.availabilityUntil)
  }, [
    donorPortal.availabilityStatus,

    donorPortal.availabilityUntil,

    donorAvailability,
  ])

  const donorRecord = donors.find((donor) => donor.id === currentUser?.id)

  const donorName = donorPortal.profile.name ?? currentUser?.name ?? "Donor"

  const profileBloodGroup = roleDetails?.blood_group

  const bloodGroup =
    donorPortal.profile.bloodGroup ??
    (typeof profileBloodGroup === "string" &&
    bloodGroups.includes(profileBloodGroup as BloodGroup)
      ? profileBloodGroup
      : donorRecord?.bloodGroup) ??
    "Not set"

  const city =
    donorPortal.profile.city ??
    String(roleDetails?.city ?? donorRecord?.city ?? "")

  const area = donorRecord?.area ?? ""

  const available =
    donorAvailability ??
    (typeof roleDetails?.available === "boolean"
      ? roleDetails.available
      : undefined) ??
    donorRecord?.available ??
    false

  const donationCount =
    donorRecord?.donationsCount ??
    (Number(roleDetails?.donations_count ?? 0) || 0)

  const lastDonation =
    donorRecord?.lastDonation ??
    String(roleDetails?.last_donation_date ?? "Not recorded")

  const hasBloodGroup = bloodGroups.includes(bloodGroup as BloodGroup)

  const matchingRequests = useMemo(
    () =>
      requests.filter(
        (request) =>
          hasBloodGroup &&
          activeStatuses.has(request.status) &&
          request.status !== "Fulfilled" &&
          !declinedIds.includes(request.id),
      ),

    [bloodGroup, declinedIds, hasBloodGroup, requests],
  )

  const filteredRequests = matchingRequests.filter(
    (request) =>
      (bloodFilter === "All blood groups" ||
        request.bloodGroup === bloodFilter) &&
      (urgencyFilter === "All urgency" ||
        urgencyLabel[request.urgency] === urgencyFilter),
  )

  const nearbyRequests = requests

    .filter(
      (request) =>
        hasBloodGroup &&
        activeStatuses.has(request.status) &&
        request.status !== "Fulfilled" &&
        `${request.hospitalName} ${request.area}`

          .toLowerCase()

          .includes(nearbyQuery.toLowerCase()),
    )

    .slice(0, 4)

  const responses = requests.filter(
    (request) =>
      donorPortal.responses.some(
        (response) =>
          response.requestId === request.id && response.status !== "Cancelled",
      ) ||
      request.confirmedDonor === currentUser?.id ||
      (request.matchedDonors?.includes(currentUser?.id ?? "") &&
        request.status === "Donor Confirmed"),
  )

  const respondedIds = donorPortal.responses

    .filter((response) => response.status !== "Cancelled")

    .map((response) => response.requestId)

  const communityDonors = donors.filter(
    (donor) => donor.bloodGroup === bloodGroup && donor.id !== currentUser?.id,
  )

  const communityAvailable = communityDonors.filter(
    (donor) => donor.available,
  ).length

  const communityUnavailable = communityDonors.length - communityAvailable

  const networkAvailability = communityDonors.length
    ? Math.round((communityAvailable / communityDonors.length) * 100)
    : 0

  const reachedEstimate = donationCount * 3

  const openAvailability = () => {
    const currentChoice = available
      ? "available"
      : availabilityMode === "temporary"
        ? "temporary"
        : "unavailable"

    setAvailabilityChoice(currentChoice)

    setSavedUntil(donorPortal.availabilityUntil)
    setAvailabilityError("")

    setAvailabilityOpen(true)
  }

  const saveAvailability = async () => {
    const nextAvailable = availabilityChoice === "available"

    setAvailabilitySaving(true)
    setAvailabilityError("")
    try {
      if (nextAvailable !== available && currentUser)
        await toggleDonorAvailability(currentUser.id)

      setAvailabilityMode(availabilityChoice)
      donorPortal.setAvailability(nextAvailable, savedUntil, availabilityChoice)
      setAvailabilityOpen(false)
    } catch (error) {
      setAvailabilityError(
        error instanceof Error
          ? error.message
          : "Your availability could not be updated.",
      )
    } finally {
      setAvailabilitySaving(false)
    }
  }

  const confirmResponse = async () => {
    if (!confirmRequest) return

    try {
      await donorPortal.recordResponse(confirmRequest.id)
    } catch (error) {
      setToast(
        error instanceof Error
          ? error.message
          : "Unable to send your response.",
      )

      return
    }

    setToast("Your response was sent to the hospital.")

    window.setTimeout(() => setToast(""), 3500)

    setConfirmRequest(null)
  }

  if (!currentUser) return null

  return (
    <DashboardLayout>
      {requestFeedError && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          Requests could not be loaded: {requestFeedError}
        </p>
      )}
      <div className="w-full space-y-7 pb-8">
        <section className="flex w-full min-w-0 flex-col gap-5 rounded-[20px] border border-[#FFD1D9] bg-[#FFF1F3] px-5 py-5 shadow-[0_4px_18px_rgba(3,26,54,0.04)] md:flex-row md:items-center md:justify-between md:gap-6 md:px-7 md:py-6">
          <div className="flex min-w-0 items-start gap-4">
            <span
              aria-hidden="true"
              className="mt-1 h-12 w-1 shrink-0 rounded-full bg-[#E51C3D]"
            />
            <div className="min-w-0">
              <h1 className="font-display text-[28px] font-extrabold leading-tight tracking-tight text-[#031A36] sm:text-[30px] xl:text-[34px]">
                Good{" "}
                {new Date().getHours() < 12
                  ? "morning"
                  : new Date().getHours() < 17
                    ? "afternoon"
                    : "evening"}
                , {donorName.split(" ")[0]} <span aria-hidden="true">👋</span>
              </h1>
              <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-[#617587]">
                Your readiness can help someone when they need it most.
              </p>
            </div>
          </div>
          <div className="relative grid min-w-0 grid-cols-1 gap-2.5 min-[420px]:grid-cols-2 md:flex md:shrink-0 md:items-center">
            <div className="flex min-w-0 items-center gap-2 rounded-xl border border-[#D8E3EA] bg-white px-3 py-2.5">
              <MapPin size={15} className="text-[#E51C3D]" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#021734]">
                  {city || "Location not set"}
                </p>
                <p
                  className={`mt-0.5 flex items-center gap-1 text-[10px] font-semibold ${
                    available ? "text-[#16A34A]" : "text-[#617587]"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      available ? "bg-[#16A34A]" : "bg-[#9AA9B5]"
                    }`}
                  />
                  {available ? "Available" : "Unavailable"}
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-expanded={profileMenuOpen}
              aria-label={`${donorName}, donor profile menu`}
              onClick={() => setProfileMenuOpen((open) => !open)}
              className="flex min-w-0 items-center gap-3 rounded-xl border border-[#F4C8CF] bg-[#FFF6F7] px-3 py-2.5 text-left transition-colors hover:bg-[#FFF1F3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E51C3D]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E51C3D] font-display text-base font-extrabold text-white shadow-sm">
                {donorName.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block max-w-32 truncate text-xs font-bold text-[#021734]">
                  {donorName}
                </span>
                <span className="block text-[10px] font-semibold text-[#C91836]">
                  Donor
                </span>
              </span>
              <ChevronDown
                size={15}
                className={`text-[#C91836] transition-transform ${
                  profileMenuOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {profileMenuOpen && (
              <div className="absolute right-0 top-full z-30 mt-2 w-48 rounded-xl border border-[#D8E3EA] bg-white p-2 shadow-[0_8px_24px_rgba(3,26,54,0.12)]">
                <Link
                  to="/donor/profile"
                  onClick={() => setProfileMenuOpen(false)}
                  className="block rounded-lg px-3 py-2 text-xs font-semibold text-[#062847] hover:bg-[#F5F8FA]"
                >
                  View profile
                </Link>
                <Link
                  to="/donor/settings"
                  onClick={() => setProfileMenuOpen(false)}
                  className="block rounded-lg px-3 py-2 text-xs font-semibold text-[#062847] hover:bg-[#F5F8FA]"
                >
                  Donor settings
                </Link>
              </div>
            )}
          </div>
        </section>

        <section
          aria-label="Donor statistics"
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        >
          <StatTile
            label="Blood group"
            value={bloodGroup}
            note="Your registered blood group"
            icon={Droplet}
          />
          <StatTile
            label="Donation readiness"
            value={available ? "READY" : "PAUSED"}
            note={
              available
                ? "Available to be contacted"
                : "Not visible to new requests"
            }
            icon={Activity}
            tone={available ? "green" : "amber"}
          />
          <StatTile
            label="Total donations"
            value={String(donationCount).padStart(2, "0")}
            note="Recorded contributions"
            icon={Heart}
            tone="navy"
          />
          <StatTile
            label="Last donation"
            value={
              lastDonation === "Not recorded"
                ? "Not recorded"
                : formatDate(lastDonation)
            }
            note="Medical eligibility is confirmed at the donation site"
            icon={CalendarDays}
            tone="amber"
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
          <div className="rounded-2xl border border-[#D8E3EA] bg-white p-5 shadow-[0_2px_8px_rgba(3,26,54,0.035)] md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#617587]">
                  Live donor readiness
                </p>
                <div className="mt-3 flex items-center gap-2.5">
                  <span
                    className={`relative flex h-3 w-3 rounded-full ${
                      available ? "bg-[#16A34A]" : "bg-[#9AA9B5]"
                    }`}
                  >
                    <span
                      className={`absolute inset-0 animate-ping rounded-full ${
                        available ? "bg-[#16A34A]/45" : "hidden"
                      }`}
                    />
                  </span>
                  <h2 className="font-display text-xl font-extrabold text-[#031A36]">
                    {available
                      ? "AVAILABLE TO HELP"
                      : availabilityMode === "temporary"
                        ? "TEMPORARILY UNAVAILABLE"
                        : "CURRENTLY UNAVAILABLE"}
                  </h2>
                </div>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-[#617587]">
                  {available
                    ? "Matching requests for your registered blood group can reach you."
                    : "You won’t be shown to new matching requests until you update your availability."}
                </p>
              </div>
              <span className="rounded-full bg-[#ECFDF3] px-3 py-1.5 text-[11px] font-semibold text-[#16803C]">
                <ShieldCheck size={13} className="mr-1 inline" />
                Coordination active
              </span>
            </div>
            <div className="mt-6 grid gap-4 border-t border-[#D8E3EA] pt-5 sm:grid-cols-3">
              {[
                ["Blood group", bloodGroup],

                ["Last donation", formatDate(lastDonation)],

                [
                  "Visibility",

                  available ? "Visible to matching requests" : "Hidden",
                ],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#617587]">
                    {label}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#021734]">
                    {value}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-xl bg-[#F5F8FA] p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#062847]">
                  Availability status
                </span>
                <span className="font-bold text-[#16A34A]">
                  {available ? "Active" : "Paused"}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#D8E3EA]">
                <div
                  className={`h-full rounded-full transition-all ${
                    available ? "w-full bg-[#16A34A]" : "w-1/4 bg-[#9AA9B5]"
                  }`}
                />
              </div>
              <p className="mt-2 text-[10px] text-[#617587]">
                This shows your contact availability, not medical eligibility.
              </p>
            </div>
            <button
              onClick={openAvailability}
              className="mt-4 rounded-lg bg-[#E51C3D] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#C91836] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E51C3D]"
            >
              Update availability
            </button>
            {savedUntil && available && (
              <p className="mt-2 text-[11px] text-[#617587]">
                Available until {formatDate(savedUntil)} (this session).
              </p>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl bg-[#031A36] p-5 text-white md:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/55">
                  A little reminder
                </p>
                <h2 className="mt-2 font-display text-xl font-bold">
                  One donation.
                  <br />
                  One more chance.
                </h2>
              </div>
              <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[#FF7184]">
                <span className="absolute inset-1 animate-pulse rounded-full border border-[#E51C3D]/25" />
                <Droplet
                  size={24}
                  fill="currentColor"
                  className="animate-[pulse_4s_ease-in-out_infinite]"
                />
              </div>
            </div>
            <p className="mt-4 max-w-sm text-xs leading-relaxed text-white/65">
              A request is a chance to make a meaningful connection. Thank you
              for being part of your community.
            </p>
            <div className="mt-5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-white/50">
              <Heart size={12} className="text-[#FF7184]" /> The SAHAYOG
              community
            </div>
          </div>
        </section>

        <DonorImpactChart />

        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-[#021734]">
                Emergency requests
              </h2>
              <p className="mt-1 text-xs text-[#617587]">
                Requests that match your registered blood group.
              </p>
            </div>
            <div className="flex gap-2">
              <label className="sr-only" htmlFor="donor-blood-filter">
                Filter by blood group
              </label>
              <select
                id="donor-blood-filter"
                value={bloodFilter}
                onChange={(event) => setBloodFilter(event.target.value)}
                className="rounded-lg border border-[#D8E3EA] bg-white px-3 py-2 text-xs text-[#062847] focus:border-[#E51C3D] focus:outline-none"
              >
                <option>All blood groups</option>
                {bloodGroups.map((group) => (
                  <option key={group}>{group}</option>
                ))}
              </select>
              <label className="sr-only" htmlFor="donor-urgency-filter">
                Filter by urgency
              </label>
              <select
                id="donor-urgency-filter"
                value={urgencyFilter}
                onChange={(event) => setUrgencyFilter(event.target.value)}
                className="rounded-lg border border-[#D8E3EA] bg-white px-3 py-2 text-xs text-[#062847] focus:border-[#E51C3D] focus:outline-none"
              >
                {["All urgency", "Urgent", "High", "Normal"].map((urgency) => (
                  <option key={urgency}>{urgency}</option>
                ))}
              </select>
            </div>
          </div>
          {filteredRequests.length ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {filteredRequests.slice(0, 4).map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  responded={respondedIds.includes(request.id)}
                  onDetails={setSelectedRequest}
                  onHelp={setConfirmRequest}
                  onDecline={(id) => setDeclinedIds((ids) => [...ids, id])}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[#D8E3EA] bg-white px-6 py-9 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F8FA] text-[#617587]">
                <CircleHelp size={19} />
              </div>
              <p className="mt-3 text-sm font-semibold text-[#021734]">
                {hasBloodGroup
                  ? "No matching active requests right now"
                  : "Add your blood group to see matching requests"}
              </p>
              <p className="mt-1 text-xs text-[#617587]">
                We’ll show needs when they’re available in your network.
              </p>
            </div>
          )}
          <Link
            to="/donor/emergency-requests"
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#E51C3D] hover:underline"
          >
            Browse all requests <ArrowRight size={13} />
          </Link>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
          <div className="rounded-2xl border border-[#D8E3EA] bg-white p-5 shadow-[0_2px_8px_rgba(3,26,54,0.035)]">
            <SectionHeading
              title="Nearby blood requests"
              subtitle="A compact view of matching nearby needs."
              to="/donor/nearby"
            />
            <div className="relative mb-3">
              <Search
                size={15}
                className="absolute left-3 top-2.5 text-[#9AA9B5]"
              />
              <label className="sr-only" htmlFor="nearby-request-search">
                Search nearby hospitals or areas
              </label>
              <input
                id="nearby-request-search"
                value={nearbyQuery}
                onChange={(event) => setNearbyQuery(event.target.value)}
                placeholder="Search hospital or area"
                className="w-full rounded-lg border border-[#D8E3EA] py-2 pl-9 pr-3 text-xs text-[#062847] outline-none placeholder:text-[#9AA9B5] focus:border-[#E51C3D]"
              />
            </div>
            {nearbyRequests.length ? (
              <div className="divide-y divide-[#D8E3EA]">
                {nearbyRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-1"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FFF1F3] text-xs font-extrabold text-[#E51C3D]">
                        {request.bloodGroup}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-[#021734]">
                          {request.hospitalName}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#617587]">
                          {request.units}{" "}
                          {request.units === 1 ? "unit" : "units"} ·{" "}
                          {request.area}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[#617587]">
                        {request.distanceKm != null
                          ? `Approx. ${request.distanceKm} km`
                          : "Same city; distance unavailable"}
                      </span>
                      <span
                        className={`rounded-full px-2 py-1 text-[9px] font-bold ${urgencyTone(request.urgency)}`}
                      >
                        {urgencyLabel[request.urgency]}
                      </span>
                      <button
                        onClick={() => setSelectedRequest(request)}
                        className="rounded-lg border border-[#D8E3EA] p-1.5 text-[#062847] hover:bg-[#F5F8FA]"
                        aria-label={`View ${request.id} request`}
                      >
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-7 text-center text-xs text-[#617587]">
                No nearby requests match your filters.
              </p>
            )}
          </div>
          <div className="rounded-2xl border border-[#D8E3EA] bg-white p-5 shadow-[0_2px_8px_rgba(3,26,54,0.035)]">
            <SectionHeading
              title="Nearby network"
              subtitle="Approximate preview · not live navigation"
              to="/donor/network"
            />
            <NearbyMap location={area || city} />
            <p className="mt-2 text-[10px] leading-relaxed text-[#617587]">
              Markers are illustrative. Exact donor locations are never shown.
            </p>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-2">
          <div className="rounded-2xl border border-[#D8E3EA] bg-white p-5 shadow-[0_2px_8px_rgba(3,26,54,0.035)]">
            <SectionHeading
              title="My responses"
              subtitle="Follow the status of requests you’ve responded to."
              to="/donor/responses"
            />
            {responses.length ? (
              <div className="space-y-2">
                {responses.slice(0, 3).map((response) => (
                  <button
                    key={response.id}
                    onClick={() => setSelectedRequest(response)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#D8E3EA] p-3 text-left hover:bg-[#F5F8FA]"
                  >
                    <span className="min-w-0">
                      <span className="block text-xs font-bold text-[#021734]">
                        {response.bloodGroup} · {response.hospitalName}
                      </span>
                      <span className="mt-1 block text-[11px] text-[#617587]">
                        {response.units} units · {response.area}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-[#ECFDF3] px-2.5 py-1 text-[10px] font-bold text-[#16803C]">
                      {response.status === "Fulfilled"
                        ? "Completed"
                        : "Response sent"}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-xl bg-[#F5F8FA] p-5 text-center">
                <UsersRound size={20} className="mx-auto text-[#9AA9B5]" />
                <p className="mt-2 text-xs font-semibold text-[#062847]">
                  No responses yet
                </p>
                <p className="mt-1 text-[11px] text-[#617587]">
                  Your confirmed requests will appear here.
                </p>
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-[#D8E3EA] bg-white p-5 shadow-[0_2px_8px_rgba(3,26,54,0.035)]">
            <SectionHeading
              title="Donation history"
              subtitle="A record of your past contributions."
              to="/donor/history"
            />
            <div className="space-y-3">
              {donationHistory.records.slice(0, 3).map((entry) => (
                <div
                  key={entry.donation_id}
                  className="flex items-center gap-3"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFF1F3] text-[#E51C3D]">
                    <Droplet size={16} fill="currentColor" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[#021734]">
                      {entry.hospital_name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#617587]">
                      {formatDate(entry.donated_at)} ·{" "}
                      {entry.component.replace(/_/g, " ").toLowerCase()}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#ECFDF3] px-2 py-1 text-[9px] font-bold text-[#16803C]">
                    Confirmed
                  </span>
                </div>
              ))}
              {donationHistory.error && (
                <p
                  role="alert"
                  className="py-4 text-center text-xs text-rose-700"
                >
                  Donation history could not be loaded: {donationHistory.error}
                </p>
              )}
              {!donationHistory.loading &&
                !donationHistory.error &&
                donationHistory.records.length === 0 && (
                  <p className="py-4 text-center text-xs text-[#617587]">
                    No hospital-confirmed donation records yet.
                  </p>
                )}
              {donationHistory.loading && (
                <p className="py-4 text-center text-xs text-[#617587]">
                  Loading donation history…
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
          <div className="rounded-2xl border border-[#D8E3EA] bg-white p-5 shadow-[0_2px_8px_rgba(3,26,54,0.035)]">
            <SectionHeading
              title="Community network"
              subtitle={`Aggregated ${bloodGroup} donor availability · no personal details`}
              to="/donor/network"
            />
            <div className="grid grid-cols-3 gap-2">
              {[
                ["Ready", communityAvailable, "bg-[#ECFDF3] text-[#16803C]"],

                ["Recently donated", "—", "bg-amber-50 text-amber-700"],

                [
                  "Unavailable",

                  communityUnavailable,

                  "bg-[#F5F8FA] text-[#617587]",
                ],
              ].map(([label, value, tone]) => (
                <div key={label} className={`rounded-xl p-3 ${tone}`}>
                  <p className="font-display text-2xl font-extrabold">
                    {value}
                  </p>
                  <p className="mt-1 text-[10px] font-semibold">{label}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="font-semibold text-[#062847]">
                Network availability
              </span>
              <span className="font-bold text-[#062847]">
                {networkAvailability}%
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#EAF0F5]">
              <div
                className="h-full rounded-full bg-[#16A34A] transition-[width]"
                style={{ width: `${networkAvailability}%` }}
              />
            </div>
            <p className="mt-2 text-[10px] text-[#617587]">
              Based on available donor records in the current network view.
            </p>
          </div>
          <div className="rounded-2xl border border-[#D8E3EA] bg-white p-5 shadow-[0_2px_8px_rgba(3,26,54,0.035)]">
            <SectionHeading
              title="Rewards & impact"
              subtitle="Every response strengthens the community."
              to="/donor/rewards"
              linkLabel="View rewards"
            />
            <div className="grid grid-cols-2 gap-2">
              {[
                ["Total donations", donationCount],

                ["Requests responded", responses.length],

                [
                  "Successful responses",

                  requests.filter(
                    (request) =>
                      request.status === "Fulfilled" &&
                      (respondedIds.includes(request.id) ||
                        request.confirmedDonor === currentUser.id),
                  ).length,
                ],

                ["Estimated community reach", `${reachedEstimate}*`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-[#F5F8FA] p-3">
                  <p className="font-display text-xl font-extrabold text-[#031A36]">
                    {value}
                  </p>
                  <p className="mt-1 text-[10px] leading-relaxed text-[#617587]">
                    {label}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[9px] text-[#617587]">
              *Estimate only; not a guaranteed patient count.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {donorRewards.map((reward) => (
                <span
                  key={reward.name}
                  title={reward.description}
                  className="inline-flex items-center gap-1 rounded-full border border-[#D8E3EA] px-2.5 py-1.5 text-[10px] font-semibold text-[#062847]"
                >
                  <Award size={12} className="text-[#E51C3D]" />
                  {reward.name}
                </span>
              ))}
            </div>
            <div className="mt-4 rounded-xl bg-[#FFF1F3] p-3">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-[#062847]">
                  Next reward · Community Champion
                </span>
                <span className="font-bold text-[#E51C3D]">
                  {Math.min(donationCount * 10, 100)}%
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-[#E51C3D]"
                  style={{ width: `${Math.min(donationCount * 10, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        <p className="flex items-start gap-2 rounded-xl border border-[#D8E3EA] bg-white px-4 py-3 text-[10px] leading-relaxed text-[#617587]">
          <CircleHelp size={14} className="mt-0.5 shrink-0" />
          Availability is for coordination only. Donation eligibility and timing
          are determined by qualified medical professionals. Your exact location
          and private contact details are not displayed on this dashboard.
        </p>
      </div>

      {availabilityOpen && (
        <ModalShell
          title="Update your availability"
          description="Choose how organisations can reach you. This setting can be changed at any time."
          onClose={() => setAvailabilityOpen(false)}
        >
          {availabilityError && (
            <p
              role="alert"
              className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800"
            >
              {availabilityError}
            </p>
          )}
          <div className="space-y-2">
            {([
              [
                "available",

                "Available",

                "Let matching requests for my blood group reach me.",

                "bg-[#16A34A]",
              ],

              [
                "temporary",

                "Temporarily unavailable",

                "Pause new requests for now.",

                "bg-amber-500",
              ],

              [
                "unavailable",

                "Not available",

                "Hide my availability from new requests.",

                "bg-[#9AA9B5]",
              ],
            ] as const).map(([value, label, details, dot]) => (
              <button
                key={value}
                onClick={() => setAvailabilityChoice(value)}
                className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                  availabilityChoice === value
                    ? "border-[#E51C3D] bg-[#FFF1F3]/60"
                    : "border-[#D8E3EA] hover:bg-[#F5F8FA]"
                }`}
              >
                <span
                  className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${dot}`}
                />
                <span className="flex-1">
                  <span className="block text-sm font-bold text-[#021734]">
                    {label}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-[#617587]">
                    {details}
                  </span>
                </span>
                {availabilityChoice === value && (
                  <Check size={16} className="mt-0.5 text-[#E51C3D]" />
                )}
              </button>
            ))}
          </div>
          <label className="mt-4 block text-xs font-semibold text-[#062847]">
            Available until / again on (optional)
            <input
              type="date"
              value={savedUntil}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(event) => setSavedUntil(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[#D8E3EA] px-3 py-2.5 text-sm font-normal text-[#062847] focus:border-[#E51C3D] focus:outline-none"
            />
          </label>
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setAvailabilityOpen(false)}
              className="rounded-lg border border-[#D8E3EA] px-4 py-2.5 text-xs font-semibold text-[#617587] hover:bg-[#F5F8FA]"
            >
              Cancel
            </button>
            <button
              onClick={saveAvailability}
              disabled={availabilitySaving}
              className="rounded-lg bg-[#E51C3D] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#C91836]"
            >
              {availabilitySaving ? "Saving…" : "Save status"}
            </button>
          </div>
        </ModalShell>
      )}

      {confirmRequest && (
        <ModalShell
          title="Respond to this request?"
          description="You’re letting the hospital and coordination team know you may be able to help."
          onClose={() => setConfirmRequest(null)}
        >
          <div className="space-y-3 rounded-xl bg-[#F5F8FA] p-4 text-xs">
            {[
              ["Hospital", confirmRequest.hospitalName],

              ["Blood group", confirmRequest.bloodGroup],

              [
                "Units",

                `${confirmRequest.units} ${
                  confirmRequest.units === 1 ? "unit" : "units"
                }`,
              ],

              ["Location", `${confirmRequest.area}, ${city || "Mumbai"}`],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <span className="text-[#617587]">{label}</span>
                <span className="text-right font-semibold text-[#021734]">
                  {value}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-[#617587]">
            Sending a response is not a medical eligibility confirmation. The
            hospital will follow up with next steps.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setConfirmRequest(null)}
              className="rounded-lg border border-[#D8E3EA] px-4 py-2.5 text-xs font-semibold text-[#617587] hover:bg-[#F5F8FA]"
            >
              Cancel
            </button>
            <button
              onClick={confirmResponse}
              className="rounded-lg bg-[#E51C3D] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#C91836]"
            >
              Confirm response
            </button>
          </div>
        </ModalShell>
      )}

      {selectedRequest && (
        <ModalShell
          title={`${selectedRequest.bloodGroup} blood request`}
          description={selectedRequest.hospitalName}
          onClose={() => setSelectedRequest(null)}
        >
          <div className="space-y-3 rounded-xl bg-[#F5F8FA] p-4 text-xs">
            {[
              ["Request ID", selectedRequest.id],

              ["Units needed", `${selectedRequest.units}`],

              ["Urgency", urgencyLabel[selectedRequest.urgency]],

              ["Location", `${selectedRequest.area}, ${city || "Mumbai"}`],

              ["Status", selectedRequest.status],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <span className="text-[#617587]">{label}</span>
                <span className="text-right font-semibold text-[#021734]">
                  {value}
                </span>
              </div>
            ))}
          </div>
          {!respondedIds.includes(selectedRequest.id) && (
            <button
              onClick={() => {
                setConfirmRequest(selectedRequest)

                setSelectedRequest(null)
              }}
              className="mt-4 w-full rounded-lg bg-[#E51C3D] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#C91836]"
            >
              I can help
            </button>
          )}
        </ModalShell>
      )}
      {toast && (
        <motion.div
          role="status"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-5 right-5 z-[70] rounded-xl bg-[#062847] px-4 py-3 text-sm font-semibold text-white shadow-xl"
        >
          {toast}
        </motion.div>
      )}
    </DashboardLayout>
  )
}
