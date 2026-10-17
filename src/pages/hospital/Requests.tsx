import { useEffect, useMemo, useState, type FormEvent } from "react"

import { useLocation, useNavigate } from "react-router-dom"

import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Bell,
  CalendarClock,
  Droplets,
  Eye,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Search,
  X,
} from "lucide-react"

import DashboardLayout, {
  PageHeader,
} from "../../components/layout/DashboardLayout"

import { useApp } from "../../context/AppContext"

import type {
  BloodComponent,
  BloodGroup,
  BloodRequest,
  RequestStatus,
  Urgency,
} from "../../data/mockData"

import InteractiveNetworkMap, {
  MapLocationPicker,
  type Coordinates,
} from "../../components/hospital/InteractiveMap"

import { supabase } from "../../lib/supabase"
import {
  filterAndSortHospitalRequests,
  paginateHospitalRequests,
  type HospitalRequestSort,
} from "./hospitalAnalytics"
import {
  countValidUniqueDonorResponses,
  MINIMUM_VALID_DONOR_RESPONSES,
  requestDisplayStatus,
} from "../../lib/bloodRequestFulfillment"

const groups: BloodGroup[] = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"]

const tabs = ["All", "Active", "In Progress", "Fulfilled", "Cancelled"] as const

type RequestTab = typeof tabs[number]

type HospitalDonorResponse = {
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

type HospitalNgoResponse = {
  response_id: string
  ngo_id: string
  ngo_name: string
  organisation_type: string | null
  city: string | null
  areas_served: string | null
  response_type: "potential_donor" | "unable_to_help"
  response_status: string
  potential_donor_count: number | null
  coordinator_name: string | null
  coordinator_phone: string | null
  coordinator_email: string | null
  contact_shared: boolean
  expected_time: string | null
  coordination_note: string | null
  unable_reason: string | null
  responded_at: string
  updated_at: string
}

type HospitalNgoResponseCount = {
  request_id: string
  response_count: number
}

const emptyForm = {
  bloodGroup: "O+" as BloodGroup,

  component: "WHOLE_BLOOD" as BloodComponent,

  searchRadiusKm: 25,

  units: 1,

  urgency: "URGENT" as Urgency,

  area: "",

  department: "",

  requiredBy: "",

  patientAge: "",

  notes: "",
}

function isInProgress(status: RequestStatus) {
  return [
    "Donor Confirmed",

    "Hospital Confirmation",

    "Matching",

    "Donors Contacted",
  ].includes(status)
}

function formatDate(value: string) {
  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
}

function safePhoneHref(value: string) {
  const normalized = value.trim()
  return /^[+()\d.\-\s]+$/.test(normalized)
    ? `tel:${encodeURIComponent(normalized.replace(/\s+/g, ""))}`
    : null
}

function safeEmailHref(value: string) {
  const normalized = value.trim()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
    ? `mailto:${encodeURIComponent(normalized)}`
    : null
}

function getRequestSaveErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message

  if (error && typeof error === "object") {
    const fields = error as Record<string, unknown>
    const message = typeof fields.message === "string" ? fields.message : null
    const details = typeof fields.details === "string" ? fields.details : null
    const hint = typeof fields.hint === "string" ? fields.hint : null
    const code = typeof fields.code === "string" ? fields.code : null
    const diagnostic = [details, hint, code ? `Code: ${code}` : null]
      .filter(Boolean)
      .join(" ")

    if (message) return diagnostic ? `${message} ${diagnostic}` : message
  }

  return "Unable to save this request. Check the browser console for the database error details."
}

export default function HospitalRequests() {
  const {
    requests,
    notifications,

    currentUser,

    roleDetails,

    hospitalRecordId,

    hospitalRequestsLoading,

    hospitalRequestsError,

    createHospitalRequest,

    updateHospitalRequest,

    updateHospitalRequestDetails,

    refreshHospitalRequests,
  } = useApp()

  const location = useLocation()

  const navigate = useNavigate()

  const initialCreate =
    location.pathname.endsWith("/create") ||
    location.pathname.endsWith("/post-request")

  const storedMapCoordinates =
    typeof roleDetails?.map_location === "string"
      ? roleDetails.map_location.match(
          /\(?\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*\)?\s*$/,
        )
      : null

  const registeredLocation: Coordinates | null =
    typeof roleDetails?.latitude === "number" &&
    typeof roleDetails?.longitude === "number"
      ? {
          latitude: roleDetails.latitude,

          longitude: roleDetails.longitude,
        }
      : storedMapCoordinates
        ? {
            latitude: Number(storedMapCoordinates[1]),

            longitude: Number(storedMapCoordinates[2]),
          }
        : null

  const registeredAddress =
    (typeof roleDetails?.location_address === "string" &&
      roleDetails.location_address) ||
    (typeof roleDetails?.map_location === "string"
      ? roleDetails.map_location.replace(
          /\s*\(?\s*-?\d{1,2}(?:\.\d+)?\s*,\s*-?\d{1,3}(?:\.\d+)?\s*\)?\s*$/,

          "",
        )
      : "")

  const [tab, setTab] = useState<RequestTab>("All")

  const [search, setSearch] = useState("")

  const [sortBy, setSortBy] = useState<HospitalRequestSort>("createdAt")

  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  const [page, setPage] = useState(0)

  const [pageSize, setPageSize] = useState(10)

  const [responseCounts, setResponseCounts] = useState<Record<string, number>>(
    {},
  )

  const [responseCountsError, setResponseCountsError] = useState<string | null>(
    null,
  )

  const [ngoResponseCounts, setNgoResponseCounts] =
    useState<Record<string, number>>({})

  const [ngoResponseCountsError, setNgoResponseCountsError] =
    useState<string | null>(null)

  const [selected, setSelected] = useState<string | null>(
    new URLSearchParams(location.search).get("request"),
  )

  const [editing, setEditing] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(initialCreate)

  const [viewMode, setViewMode] = useState<"list" | "map">("list")

  const [requestLocation, setRequestLocation] = useState<Coordinates | null>(
    registeredLocation,
  )

  const [requestLocationAddress, setRequestLocationAddress] =
    useState(registeredAddress)

  const [form, setForm] = useState(emptyForm)

  const [saving, setSaving] = useState(false)

  const [error, setError] = useState<string | null>(null)

  const [notice, setNotice] = useState<string | null>(null)

  const [donationCandidates, setDonationCandidates] =
    useState<HospitalDonorResponse[]>([])

  const [ngoResponses, setNgoResponses] = useState<HospitalNgoResponse[]>([])

  const [ngoResponsesLoading, setNgoResponsesLoading] = useState(false)

  const [ngoResponsesError, setNgoResponsesError] = useState<string | null>(
    null,
  )

  const [ngoCoordinationBusy, setNgoCoordinationBusy] = useState<string | null>(
    null,
  )

  const [acknowledgementDraft, setAcknowledgementDraft] = useState<{
    responseId: string
    recipientName: string
    messageType: "ngo_appreciation" | "donor_acknowledgement"
    content: string
    savedId?: string
  } | null>(null)

  const [acknowledgementError, setAcknowledgementError] =
    useState<string | null>(null)

  const [acknowledgementBusy, setAcknowledgementBusy] = useState(false)

  const [donationCandidatesLoading, setDonationCandidatesLoading] =
    useState(false)

  const [responseAcknowledgementBusy, setResponseAcknowledgementBusy] =
    useState<string | null>(null)

  const [donationAcknowledgementError, setDonationAcknowledgementError] =
    useState<string | null>(null)

  const [donationAcknowledgementBusy, setDonationAcknowledgementBusy] =
    useState<string | null>(null)

  const [donationComponent, setDonationComponent] =
    useState<BloodComponent>("WHOLE_BLOOD")

  const [donationDateTime, setDonationDateTime] = useState(() => {
    const localDate = new Date(
      Date.now() - new Date().getTimezoneOffset() * 60000,
    )

    return localDate.toISOString().slice(0, 16)
  })

  const [donationVolumeMl, setDonationVolumeMl] = useState("")

  useEffect(() => {
    const id = new URLSearchParams(location.search).get("request")

    if (id) setSelected(id)
  }, [location.search])

  useEffect(() => {
    const routeNotice = (location.state as { successNotice?: unknown } | null)
      ?.successNotice

    if (typeof routeNotice === "string") setNotice(routeNotice)
  }, [location.state])

  const ownRequests = useMemo(
    () => requests.filter((request) => request.hospitalId === hospitalRecordId),

    [requests, hospitalRecordId],
  )

  const filteredRequests = useMemo(
    () =>
      filterAndSortHospitalRequests(
        ownRequests,
        tab,
        search,
        sortBy,
        sortDirection,
      ),
    [ownRequests, tab, search, sortBy, sortDirection],
  )

  const pagination = useMemo(
    () => paginateHospitalRequests(filteredRequests, page, pageSize),
    [filteredRequests, page, pageSize],
  )

  const visibleRequests = pagination.items

  const selectedRequest = ownRequests.find((request) => request.id === selected)
  const customRadius = ![5, 10, 25].includes(form.searchRadiusKm)

  useEffect(() => {
    setPage(0)
  }, [tab, search, sortBy, sortDirection, pageSize])

  useEffect(() => {
    let active = true

    if (!ownRequests.length) {
      setResponseCounts({})
      setResponseCountsError(null)
      return
    }

    const loadResponseCounts = async () => {
      setResponseCountsError(null)
      try {
        const { data, error } = await supabase.rpc(
          "get_hospital_donor_responses",
          { p_request_id: null },
        )
        if (!active) return
        if (error) {
          setResponseCountsError(error.message)
          return
        }

        const requestIds = new Set(ownRequests.map((request) => request.id))
        const responsesByRequest = new Map<string, HospitalDonorResponse[]>()
        for (const response of (data ?? []) as HospitalDonorResponse[]) {
          if (!requestIds.has(response.request_id)) continue
          const rows = responsesByRequest.get(response.request_id) ?? []
          rows.push(response)
          responsesByRequest.set(response.request_id, rows)
        }
        const counts = Object.fromEntries(
          [...responsesByRequest].map(([requestId, rows]) => [
            requestId,
            countValidUniqueDonorResponses(rows),
          ]),
        )
        setResponseCounts(counts)
      } catch (error: unknown) {
        if (active) {
          setResponseCounts({})
          setResponseCountsError(
            error instanceof Error
              ? error.message
              : "Unable to load saved donor response counts.",
          )
        }
      }
    }

    void loadResponseCounts()
    const interval = window.setInterval(loadResponseCounts, 30000)

    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [ownRequests.map((request) => request.id).join("|")])

  useEffect(() => {
    let active = true

    if (!ownRequests.length) {
      setNgoResponseCounts({})
      setNgoResponseCountsError(null)
      return
    }

    const loadNgoResponseCounts = async () => {
      try {
        const { data, error } = await supabase.rpc(
          "get_hospital_ngo_response_counts",
        )
        if (!active) return
        const requestIds = new Set(ownRequests.map((request) => request.id))
        const counts: Record<string, number> = {}
        if (!error) {
          for (const response of (data ?? []) as HospitalNgoResponseCount[]) {
            if (!requestIds.has(response.request_id)) continue
            counts[response.request_id] = response.response_count
          }
        } else {
          const fallbackCounts = await Promise.all(
            ownRequests.map(async (request) => {
              const result = await supabase.rpc("get_hospital_ngo_responses", {
                p_request_id: request.id,
              })
              if (result.error) throw result.error
              return [request.id, (result.data ?? []).length] as const
            }),
          )
          if (!active) return
          for (const [requestId, responseCount] of fallbackCounts) {
            counts[requestId] = responseCount
          }
        }
        setNgoResponseCounts(counts)
        setNgoResponseCountsError(null)
      } catch (error: unknown) {
        if (!active) return
        setNgoResponseCounts({})
        setNgoResponseCountsError(
          error instanceof Error
            ? error.message
            : "Unable to load saved NGO response counts.",
        )
      }
    }

    void loadNgoResponseCounts()
    const interval = window.setInterval(loadNgoResponseCounts, 30000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [ownRequests.map((request) => request.id).join("|")])

  useEffect(() => {
    if (!selectedRequest) {
      setDonationCandidates([])

      setDonationAcknowledgementError(null)

      return
    }

    let active = true

    setDonationCandidatesLoading(true)

    setDonationAcknowledgementError(null)

    setDonationComponent(selectedRequest.component ?? "WHOLE_BLOOD")

    const loadCandidates = async () => {
      const { data, error } = await supabase.rpc(
        "get_hospital_donor_responses",

        { p_request_id: selectedRequest.id },
      )

      if (!active) return

      if (error) {
        setDonationAcknowledgementError(error.message)

        setDonationCandidates([])
      } else {
        setDonationCandidates(data ?? [])
      }

      setDonationCandidatesLoading(false)
    }

    const refreshCandidates = () => {
      void loadCandidates().catch((loadError: unknown) => {
        if (!active) return

        setDonationAcknowledgementError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load confirmed donor responses.",
        )

        setDonationCandidates([])

        setDonationCandidatesLoading(false)
      })
    }

    refreshCandidates()
    const interval = window.setInterval(refreshCandidates, 30000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [selectedRequest?.id])

  useEffect(() => {
    if (!selectedRequest) {
      setNgoResponses([])
      setNgoResponsesError(null)
      setAcknowledgementDraft(null)
      return
    }

    let active = true
    const loadResponses = async () => {
      setNgoResponsesLoading(true)
      setNgoResponsesError(null)
      try {
        const { data, error } = await supabase.rpc(
          "get_hospital_ngo_responses",
          { p_request_id: selectedRequest.id },
        )
        if (!active) return
        if (error) throw error
        setNgoResponses((data ?? []) as HospitalNgoResponse[])
      } catch (loadError) {
        if (!active) return
        setNgoResponses([])
        setNgoResponsesError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load NGO responses.",
        )
      } finally {
        if (active) setNgoResponsesLoading(false)
      }
    }
    void loadResponses()
    const interval = window.setInterval(() => void loadResponses(), 30000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [selectedRequest?.id])

  const acknowledgeResponse = async (donorId: string) => {
    if (!selectedRequest) return

    setResponseAcknowledgementBusy(donorId)
    setDonationAcknowledgementError(null)
    try {
      const { error } = await supabase.rpc("confirm_hospital_donor_response", {
        p_request_id: selectedRequest.id,
        p_donor_id: donorId,
      })
      if (error) throw error

      const { data, error: refreshError } = await supabase.rpc(
        "get_hospital_donor_responses",
        { p_request_id: selectedRequest.id },
      )
      if (refreshError) {
        setDonationAcknowledgementError(
          `Response acknowledged, but donor details could not be refreshed: ${refreshError.message}`,
        )
      } else {
        setDonationCandidates((data ?? []) as HospitalDonorResponse[])
      }
      try {
        await refreshHospitalRequests()
      } catch (refreshError) {
        setDonationAcknowledgementError(
          `Response acknowledged, but request summaries could not be refreshed: ${
            refreshError instanceof Error
              ? refreshError.message
              : "Unknown refresh error."
          }`,
        )
      }
    } catch (responseError) {
      setDonationAcknowledgementError(
        responseError instanceof Error
          ? responseError.message
          : "Unable to acknowledge this donor response.",
      )
    } finally {
      setResponseAcknowledgementBusy(null)
    }
  }

  const acknowledgeDonation = async (donorId: string) => {
    if (!selectedRequest) return
    if (
      !window.confirm(
        "Confirm that this donor's requested blood donation has actually been completed at your hospital? This records a verified donation and cannot be inferred from a response.",
      )
    )
      return

    const donatedAt = new Date(donationDateTime)

    if (Number.isNaN(donatedAt.getTime()) || donatedAt > new Date()) {
      setDonationAcknowledgementError("Enter a valid donation date and time.")

      return
    }

    const volume = donationVolumeMl ? Number(donationVolumeMl) : null

    if (volume !== null && (!Number.isInteger(volume) || volume <= 0)) {
      setDonationAcknowledgementError(
        "Donation volume must be a positive number of millilitres.",
      )

      return
    }

    setDonationAcknowledgementBusy(donorId)
    setDonationAcknowledgementError(null)
    let donationRecorded = false
    try {
      const { error: acknowledgementError } = await supabase.rpc(
        "acknowledge_blood_donation",

        {
          p_request_id: selectedRequest.id,

          p_donor_id: donorId,

          p_component: donationComponent,

          p_donated_at: donatedAt.toISOString(),

          p_volume_ml: volume,
        },
      )

      if (acknowledgementError) {
        setDonationAcknowledgementError(acknowledgementError.message)

        return
      }

      donationRecorded = true

      const { data, error } = await supabase.rpc(
        "get_hospital_donor_responses",

        { p_request_id: selectedRequest.id },
      )

      if (error) {
        setDonationAcknowledgementError(
          `Donation was recorded, but the donor response list could not be refreshed: ${error.message}`,
        )
      } else {
        setDonationCandidates((data ?? []) as HospitalDonorResponse[])
      }
      try {
        await refreshHospitalRequests()
      } catch (refreshError) {
        setDonationAcknowledgementError(
          `Donation recorded, but request details could not be refreshed: ${
            refreshError instanceof Error
              ? refreshError.message
              : "Unknown refresh error."
          }`,
        )
      }
    } catch (acknowledgementError) {
      setDonationAcknowledgementError(
        donationRecorded
          ? `Donation recorded, but follow-up data could not be loaded: ${
              acknowledgementError instanceof Error
                ? acknowledgementError.message
                : "Unknown refresh error."
            }`
          : acknowledgementError instanceof Error
            ? acknowledgementError.message
            : "Unable to record this donation.",
      )
    } finally {
      setDonationAcknowledgementBusy(null)
    }
  }

  const updateNgoCoordination = async (
    responseId: string,
    status: "Coordination in Progress" | "Donation Verified",
  ) => {
    setNgoCoordinationBusy(responseId)
    setNgoResponsesError(null)
    try {
      const { error } = await supabase.rpc("update_hospital_ngo_coordination", {
        p_response_id: responseId,
        p_status: status,
      })
      if (error) throw error
      const { data, error: loadError } = await supabase.rpc(
        "get_hospital_ngo_responses",
        { p_request_id: selectedRequest?.id },
      )
      if (loadError) throw loadError
      setNgoResponses((data ?? []) as HospitalNgoResponse[])
    } catch (updateError) {
      setNgoResponsesError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update NGO coordination.",
      )
    } finally {
      setNgoCoordinationBusy(null)
    }
  }

  const draftNgoAppreciation = (response: HospitalNgoResponse) => {
    if (!selectedRequest || !response.contact_shared) return
    const hospitalName =
      (typeof roleDetails?.hospital_name === "string" &&
        roleDetails.hospital_name) ||
      currentUser?.name ||
      "Our hospital"
    const coordinator = response.coordinator_name || "Coordinator"
    const note = response.coordination_note
      ? ` Your coordination note was: ${response.coordination_note}`
      : ""
    setAcknowledgementError(null)
    setAcknowledgementDraft({
      responseId: response.response_id,
      recipientName: response.ngo_name,
      messageType: "ngo_appreciation",
      content: `Dear ${response.ngo_name} and ${coordinator}, thank you for supporting ${hospitalName} with request ${selectedRequest.id} for ${selectedRequest.bloodGroup} ${selectedRequest.component ?? "WHOLE_BLOOD"} (${selectedRequest.units} units). Your NGO identified ${response.potential_donor_count ?? 0} potential donor(s)${
        response.expected_time
          ? ` and offered to coordinate ${response.expected_time}`
          : ""
      }.${note} We appreciate your coordination. Please note this message acknowledges your offer and does not certify a completed donation.`,
    })
  }

  const draftDonorAcknowledgement = async (
    candidate: HospitalDonorResponse,
  ) => {
    if (!selectedRequest || !candidate.donation_recorded) return
    setAcknowledgementError(null)
    try {
      const { data, error } = await supabase
        .from("donation_records")
        .select("donated_at")
        .eq("request_id", selectedRequest.id)
        .eq("donor_id", candidate.donor_id)
        .maybeSingle()
      if (error) throw error
      if (!data?.donated_at) {
        throw new Error("Verified donation date is unavailable.")
      }
      const hospitalName =
        (typeof roleDetails?.hospital_name === "string" &&
          roleDetails.hospital_name) ||
        currentUser?.name ||
        "Our hospital"
      const donationDate = formatDate(data.donated_at)
      setAcknowledgementDraft({
        responseId: candidate.donor_id,
        recipientName: candidate.donor_name || "Donor",
        messageType: "donor_acknowledgement",
        content: `Dear ${candidate.donor_name || "Donor"}, thank you for your blood donation to ${hospitalName} on ${donationDate}. Your generosity helped support request ${selectedRequest.id} (${selectedRequest.bloodGroup}). We are grateful for your contribution.`,
      })
    } catch (draftError) {
      setAcknowledgementError(
        draftError instanceof Error
          ? draftError.message
          : "Unable to prepare the donor acknowledgement.",
      )
    }
  }

  const saveAcknowledgement = async () => {
    if (!selectedRequest || !acknowledgementDraft) return
    setAcknowledgementBusy(true)
    setAcknowledgementError(null)
    try {
      const { data, error } = await supabase.rpc(
        "save_hospital_acknowledgement",
        {
          p_request_id: selectedRequest.id,
          p_response_id: acknowledgementDraft.responseId,
          p_message_type: acknowledgementDraft.messageType,
          p_recipient_name: acknowledgementDraft.recipientName,
          p_content: acknowledgementDraft.content,
        },
      )
      if (error) throw error
      if (typeof data !== "string") {
        throw new Error("The approved acknowledgement was not saved.")
      }
      setAcknowledgementDraft((draft) =>
        draft ? { ...draft, savedId: data } : null,
      )
    } catch (saveError) {
      setAcknowledgementError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save the approved acknowledgement.",
      )
    } finally {
      setAcknowledgementBusy(false)
    }
  }

  const copyAcknowledgement = async () => {
    if (!acknowledgementDraft?.savedId) return
    try {
      await navigator.clipboard.writeText(acknowledgementDraft.content)
      const { error } = await supabase.rpc(
        "mark_hospital_acknowledgement_copied",
        { p_acknowledgement_id: acknowledgementDraft.savedId },
      )
      if (error) {
        setAcknowledgementError(
          `Message was copied, but the copy status could not be recorded: ${error.message}`,
        )
        return
      }
      setAcknowledgementError(
        "Copied. This message has not been sent; use your configured email or SMS channel to deliver it.",
      )
    } catch (copyError) {
      setAcknowledgementError(
        copyError instanceof Error
          ? `Unable to copy the message: ${copyError.message}`
          : "Unable to copy the message. Your browser may not permit clipboard access.",
      )
    }
  }

  const openEdit = (request: BloodRequest) => {
    setEditing(request.id)

    setRequestLocation(
      request.latitude != null && request.longitude != null
        ? { latitude: request.latitude, longitude: request.longitude }
        : null,
    )

    setRequestLocationAddress(request.locationAddress ?? "")

    setForm({
      bloodGroup: request.bloodGroup,

      component: request.component ?? "WHOLE_BLOOD",

      searchRadiusKm: request.searchRadiusKm ?? 25,

      units: request.units,

      urgency: request.urgency,

      area: request.area ?? "",

      department: request.department ?? "",

      requiredBy: request.requiredBy
        ? new Date(request.requiredBy).toISOString().slice(0, 16)
        : "",

      patientAge: request.patientAge?.toString() ?? "",

      notes: request.notes ?? "",
    })

    setError(null)

    setShowForm(true)
  }

  const closeForm = (successNotice?: string) => {
    setShowForm(false)

    setEditing(null)

    setForm(emptyForm)

    setRequestLocation(registeredLocation)

    setRequestLocationAddress(registeredAddress)

    setError(null)

    if (initialCreate) {
      navigate("/hospital/requests", {
        state: successNotice ? { successNotice } : null,
      })
    } else if (successNotice) {
      setNotice(successNotice)
    }
  }

  const saveRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!currentUser) {
      setError("Sign in to create a hospital request.")

      return
    }

    setSaving(true)

    setError(null)

    setNotice(null)

    try {
      const units = Number(form.units)

      if (!Number.isInteger(units) || units < 1 || units > 20) {
        throw new Error("Enter a valid number of units (1 to 20).")
      }

      if (
        !Number.isInteger(form.searchRadiusKm) ||
        form.searchRadiusKm < 5 ||
        form.searchRadiusKm > 50
      ) {
        throw new Error("Choose a donor search radius from 5 to 50 km.")
      }

      if (
        !form.area.trim() &&
        !requestLocationAddress.trim() &&
        !requestLocation &&
        !(typeof roleDetails?.city === "string" && roleDetails.city.trim())
      ) {
        throw new Error("Add an area or hospital location for this request.")
      }

      const requiredBy = form.requiredBy ? new Date(form.requiredBy) : null

      if (requiredBy && Number.isNaN(requiredBy.getTime())) {
        throw new Error("Enter a valid required-by date and time.")
      }

      const values = {
        bloodGroup: form.bloodGroup,

        component: form.component,

        searchRadiusKm: form.searchRadiusKm,

        units,

        urgency: form.urgency,

        area:
          form.area.trim() ||
          requestLocationAddress.trim() ||
          (typeof roleDetails?.city === "string"
            ? roleDetails.city.trim()
            : ""),

        department: form.department.trim(),

        requiredBy: requiredBy?.toISOString() ?? "",

        patientAge: form.patientAge ? Number(form.patientAge) : undefined,

        notes: form.notes.trim(),

        latitude: requestLocation?.latitude,

        longitude: requestLocation?.longitude,

        locationAddress: requestLocationAddress.trim(),
      }

      if (editing) {
        await updateHospitalRequestDetails(editing, values)

        closeForm("Request changes saved.")
      } else {
        const created = await createHospitalRequest({
          ...values,

          hospitalId: hospitalRecordId ?? "",

          hospitalName: currentUser.name,
        })

        closeForm(
          `Request ${created.id} was saved with status ${created.status}.`,
        )
      }
    } catch (saveError) {
      setError(getRequestSaveErrorMessage(saveError))
    } finally {
      setSaving(false)
    }
  }

  const cancelRequest = async (request: BloodRequest) => {
    if (
      [
        "Fulfilled",

        "Cancelled",

        "Donor Confirmed",

        "Hospital Confirmation",
      ].includes(request.status)
    )
      return

    if (!window.confirm(`Cancel request ${request.id}?`)) return

    setError(null)

    try {
      await updateHospitalRequest(request.id, "Cancelled")

      setNotice(`${request.id} was cancelled.`)
    } catch (cancelError) {
      setError(
        cancelError instanceof Error
          ? cancelError.message
          : "Unable to cancel this request.",
      )
    }
  }

  const fulfillRequest = async (request: BloodRequest) => {
    if (!isInProgress(request.status)) return
    const validResponseCount =
      countValidUniqueDonorResponses(donationCandidates)
    const verifiedDonationCount = new Set(
      donationCandidates
        .filter((candidate) => candidate.donation_recorded)
        .map((candidate) => candidate.donor_id),
    ).size
    const hasVerifiedDonation = verifiedDonationCount >= request.units
    if (
      !hasVerifiedDonation ||
      validResponseCount < MINIMUM_VALID_DONOR_RESPONSES
    ) {
      setDonationAcknowledgementError(
        hasVerifiedDonation
          ? `Donation recorded, but fulfilment requires at least one valid unique donor response; currently ${validResponseCount}. The request remains open for review.`
          : `Fulfilment requires at least one valid unique donor response and hospital-verified donations for all ${request.units} requested unit(s).`,
      )
      return
    }

    if (!window.confirm(`Mark request ${request.id} as fulfilled?`)) return

    setError(null)

    try {
      await updateHospitalRequest(request.id, "Fulfilled")

      setNotice(`${request.id} was marked fulfilled.`)
    } catch (fulfillError) {
      setError(
        fulfillError instanceof Error
          ? fulfillError.message
          : "Unable to update this request.",
      )
    }
  }

  const selectedValidResponseCount =
    countValidUniqueDonorResponses(donationCandidates)
  const selectedVerifiedDonationCount = new Set(
    donationCandidates
      .filter((candidate) => candidate.donation_recorded)
      .map((candidate) => candidate.donor_id),
  ).size
  const fulfillmentReady =
    selectedValidResponseCount >= MINIMUM_VALID_DONOR_RESPONSES &&
    selectedVerifiedDonationCount >= (selectedRequest?.units ?? 0)
  const ownRequestIds = useMemo(
    () => new Set(ownRequests.map((request) => request.id)),
    [ownRequests],
  )
  const responseNotifications = notifications
    .filter(
      (notification) =>
        notification.requestId &&
        ownRequestIds.has(notification.requestId) &&
        (notification.type.startsWith("donor_response_") ||
          notification.type.startsWith("ngo_potential_donor_") ||
          notification.type.startsWith("ngo_unable_to_help_")),
    )
    .slice(0, 5)

  return (
    <DashboardLayout>
      <PageHeader
        title={initialCreate ? "Post Blood Requirement" : "My Requests"}
        subtitle={
          initialCreate
            ? "Submit a hospital blood requirement for immediate coordination."
            : "Review and manage blood requests created by your hospital."
        }
        actions={
          !initialCreate ? (
            <button
              onClick={() => {
                setForm(emptyForm)

                setEditing(null)

                setRequestLocation(registeredLocation)

                setRequestLocationAddress(registeredAddress)

                setShowForm(true)
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-[#E11D48] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#BE123C]"
            >
              <Plus size={16} /> New Request
            </button>
          ) : undefined
        }
      />

      {notice && (
        <div
          role="status"
          className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          {notice}
        </div>
      )}
      {error && !showForm && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          {error}
        </div>
      )}
      {hospitalRequestsError && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          Requests could not be loaded: {hospitalRequestsError}
        </div>
      )}

      {!initialCreate && (
        <>
          <section
            aria-labelledby="request-response-notifications"
            className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2
                  id="request-response-notifications"
                  className="flex items-center gap-2 text-sm font-bold text-[#101A36]"
                >
                  <Bell size={16} className="text-[#036D7D]" />
                  Response notifications
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Saved donor and NGO responses to your requests. Updates
                  refresh periodically.
                </p>
              </div>
            </div>
            {responseNotifications.length ? (
              <ul className="mt-3 divide-y divide-slate-100">
                {responseNotifications.map((notification) => (
                  <li
                    key={notification.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800">
                        {notification.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-600">
                        {notification.body}
                      </p>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {formatDate(notification.timestamp)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setSelected(notification.requestId ?? null)
                      }
                      className="shrink-0 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-[#036D7D] hover:bg-slate-50"
                    >
                      View request
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-slate-500">
                No donor or NGO response notifications for your requests yet.
              </p>
            )}
          </section>
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <label className="relative min-w-52 flex-1">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search request, group, or department"
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
              />
            </label>
            <div className="flex gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-white p-1">
              {tabs.map((item) => (
                <button
                  key={item}
                  onClick={() => setTab(item)}
                  className={`whitespace-nowrap rounded-md px-3 py-2 text-xs font-semibold ${
                    tab === item
                      ? "bg-[#101A36] text-white"
                      : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          {responseCountsError && (
            <p
              role="alert"
              className="mb-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-700"
            >
              Saved donor response counts could not be loaded:{" "}
              {responseCountsError}
            </p>
          )}
          {ngoResponseCountsError && (
            <p
              role="alert"
              className="mb-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-700"
            >
              Saved NGO response counts could not be loaded:{" "}
              {ngoResponseCountsError}
            </p>
          )}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-slate-500">
                Sort by
                <select
                  value={sortBy}
                  onChange={(event) =>
                    setSortBy(event.target.value as HospitalRequestSort)
                  }
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                >
                  <option value="createdAt">Created date</option>
                  <option value="urgency">Urgency</option>
                  <option value="bloodGroup">Blood group</option>
                  <option value="status">Status</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() =>
                  setSortDirection((value) =>
                    value === "asc" ? "desc" : "asc",
                  )
                }
                aria-label={`Sort ${
                  sortDirection === "asc" ? "descending" : "ascending"
                }`}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600"
              >
                {sortDirection === "asc" ? (
                  <ArrowUp size={14} />
                ) : (
                  <ArrowDown size={14} />
                )}
                {sortDirection === "asc" ? "Ascending" : "Descending"}
              </button>
            </div>
            <div className="flex gap-2">
              {(["list", "map"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`rounded-lg px-4 py-2 text-xs font-semibold capitalize ${
                    viewMode === mode
                      ? "bg-[#101A36] text-white"
                      : "border border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  {mode} View
                </button>
              ))}
            </div>
          </div>
          {viewMode === "map" ? (
            <InteractiveNetworkMap
              hospitalId={hospitalRecordId ?? ""}
              hospitalLocation={registeredLocation}
              hospitalName={currentUser?.name ?? "Hospital"}
              mode="requests"
              requests={filteredRequests}
              onViewRequest={setSelected}
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-left text-sm">
                  <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                    <tr>
                      {[
                        "Request ID",

                        "Blood Group",

                        "Component",

                        "Units",

                        "Urgency",

                        "Status",

                        "Created",

                        "Responses",

                        "Actions",
                      ].map((title) => (
                        <th key={title} className="px-4 py-3 font-bold">
                          {title}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {hospitalRequestsLoading &&
                      Array.from({ length: 4 }, (_, index) => (
                        <tr key={index}>
                          {Array.from({ length: 9 }, (_, cell) => (
                            <td key={cell} className="px-4 py-4">
                              <span className="block h-4 animate-pulse rounded bg-slate-100" />
                            </td>
                          ))}
                        </tr>
                      ))}
                    {!hospitalRequestsLoading &&
                      visibleRequests.map((request) => {
                        const editAllowed = ![
                          "Fulfilled",

                          "Cancelled",

                          "Donor Confirmed",

                          "Hospital Confirmation",
                        ].includes(request.status)

                        const cancelAllowed = editAllowed

                        return (
                          <tr key={request.id} className="hover:bg-slate-50/70">
                            <td className="whitespace-nowrap px-4 py-4 font-mono text-xs text-slate-600">
                              {request.id.slice(0, 12)}
                            </td>
                            <td className="px-4 py-4 font-bold text-[#E11D48]">
                              {request.bloodGroup}
                            </td>
                            <td className="px-4 py-4 text-xs text-slate-600">
                              {(request.component ?? "WHOLE_BLOOD").replace(
                                /_/g,
                                " ",
                              )}
                            </td>
                            <td className="px-4 py-4">{request.units}</td>
                            <td className="px-4 py-4">{request.urgency}</td>
                            <td className="px-4 py-4">
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                                {requestDisplayStatus(request)}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">
                              {formatDate(request.createdAt)}
                            </td>
                            <td className="px-4 py-4">
                              <div
                                aria-label={`NGO: ${ngoResponseCounts[request.id] ?? 0}, Donor: ${request.validDonorResponseCount ?? responseCounts[request.id] ?? 0}`}
                                className="flex flex-wrap gap-x-3 gap-y-1 whitespace-nowrap text-xs"
                              >
                                <span className="font-semibold text-[#036D7D]">
                                  NGO: {ngoResponseCounts[request.id] ?? 0}
                                </span>
                                <span className="font-semibold text-slate-600">
                                  DONOR:{" "}
                                  {request.validDonorResponseCount ??
                                    responseCounts[request.id] ??
                                    0}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setSelected(request.id)}
                                  aria-label={`View ${request.id}`}
                                  className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:text-[#E11D48]"
                                >
                                  <Eye size={14} />
                                </button>
                                {editAllowed && (
                                  <button
                                    onClick={() => openEdit(request)}
                                    aria-label={`Edit ${request.id}`}
                                    className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:text-[#E11D48]"
                                  >
                                    <Pencil size={14} />
                                  </button>
                                )}
                                {cancelAllowed && (
                                  <button
                                    onClick={() => void cancelRequest(request)}
                                    className="text-xs font-medium text-rose-600 hover:underline"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    {!hospitalRequestsLoading &&
                      visibleRequests.length === 0 && (
                        <tr>
                          <td colSpan={9} className="px-6 py-14 text-center">
                            <Droplets
                              className="mx-auto mb-3 text-rose-300"
                              size={28}
                            />
                            <p className="font-semibold text-slate-800">
                              {ownRequests.length
                                ? "No requests match these filters"
                                : "No blood requests yet"}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              {ownRequests.length
                                ? "Try another status or search term."
                                : "Create a request to begin coordinating with your donor network."}
                            </p>
                            {!ownRequests.length && (
                              <button
                                onClick={() => setShowForm(true)}
                                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#E11D48] px-4 py-2 text-sm font-semibold text-white"
                              >
                                <Plus size={15} /> Create a Request
                              </button>
                            )}
                          </td>
                        </tr>
                      )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {viewMode === "list" && filteredRequests.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
              <div className="flex items-center gap-3">
                <span>
                  Showing {pagination.page * pagination.pageSize + 1}–
                  {Math.min(
                    (pagination.page + 1) * pagination.pageSize,
                    pagination.total,
                  )}{" "}
                  of {pagination.total}
                </span>
                <label className="flex items-center gap-2">
                  Rows
                  <select
                    value={pagination.pageSize}
                    onChange={(event) =>
                      setPageSize(Number(event.target.value))
                    }
                    className="rounded-md border border-slate-200 bg-white px-2 py-1.5"
                  >
                    {[10, 25, 50].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pagination.page === 0}
                  onClick={() => setPage(pagination.page - 1)}
                  className="rounded-md border border-slate-200 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <span>
                  Page {pagination.page + 1} of {pagination.pageCount}
                </span>
                <button
                  type="button"
                  disabled={pagination.page + 1 >= pagination.pageCount}
                  onClick={() => setPage(pagination.page + 1)}
                  className="rounded-md border border-slate-200 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {initialCreate && (
        <div className="mb-5 flex items-center gap-2 text-sm text-slate-500">
          <ArrowLeft size={15} />
          <button
            onClick={() => navigate("/hospital/requests")}
            className="hover:text-[#E11D48]"
          >
            Back to My Requests
          </button>
        </div>
      )}

      {selectedRequest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          onClick={() => setSelected(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="request-detail-title"
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-rose-600">
                  Request details
                </p>
                <h2
                  id="request-detail-title"
                  className="mt-1 text-xl font-bold text-[#101A36]"
                >
                  {selectedRequest.id}
                </h2>
              </div>
              <button
                onClick={() => setSelected(null)}
                aria-label="Close details"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                ["Blood group", selectedRequest.bloodGroup],

                [
                  "Component",
                  (selectedRequest.component ?? "WHOLE_BLOOD").replace(
                    /_/g,
                    " ",
                  ),
                ],

                ["Units required", `${selectedRequest.units}`],

                ["Search radius", `${selectedRequest.searchRadiusKm ?? 25} km`],

                ["Urgency", selectedRequest.urgency],

                ["Current status", requestDisplayStatus(selectedRequest)],

                ["Department", selectedRequest.department || "Not specified"],

                ["Area", selectedRequest.area || "Not specified"],

                ["Created", formatDate(selectedRequest.createdAt)],

                [
                  "Required by",

                  selectedRequest.requiredBy
                    ? formatDate(selectedRequest.requiredBy)
                    : "Not specified",
                ],

                [
                  "Donor responses",

                  `${
                    selectedRequest.validDonorResponseCount ??
                    responseCounts[selectedRequest.id] ??
                    0
                  } / ${MINIMUM_VALID_DONOR_RESPONSES}`,
                ],
                [
                  "Fulfillment progress",

                  requestDisplayStatus(selectedRequest),
                ],
                [
                  "Verified donations",
                  `${selectedRequest.verifiedDonationCount ?? 0} / ${selectedRequest.units} required units`,
                ],
                [
                  "Donation verified at",
                  selectedRequest.donationCompletedAt
                    ? formatDate(selectedRequest.donationCompletedAt)
                    : "No completed donation verified",
                ],
                [
                  "Latest verifier",
                  selectedRequest.donationVerifiedBy
                    ? `Hospital staff · ${selectedRequest.donationVerifiedBy}`
                    : "No hospital verifier recorded",
                ],
                [
                  "Fulfilment review",
                  selectedRequest.fulfillmentReviewRequired
                    ? "Review required: fulfillment conditions are incomplete"
                    : "No outstanding fulfilment review",
                ],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[11px] text-slate-500">{label}</p>
                  <p className="mt-1 font-semibold text-slate-800">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg border border-slate-100 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-600">
                <CalendarClock size={14} /> Patient / request information
              </div>
              <p className="whitespace-pre-wrap text-sm text-slate-600">
                {selectedRequest.notes ||
                  (selectedRequest.patientAge
                    ? `Patient age: ${selectedRequest.patientAge}`
                    : "No additional patient or clinical notes.")}
              </p>
            </div>
            <section className="mt-5 border-t border-slate-100 pt-4">
              <h3 className="text-sm font-bold text-[#101A36]">
                Confirm an actual donation
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Only confirm a donation after the hospital has completed it. A
                donor response alone does not start a recovery interval.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <label className="text-xs font-medium text-slate-600">
                  Donated component
                  <select
                    disabled
                    value={donationComponent}
                    onChange={(event) =>
                      setDonationComponent(event.target.value as BloodComponent)
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2"
                  >
                    <option value="WHOLE_BLOOD">Whole blood</option>
                    <option value="PLATELETS">Platelets</option>
                    <option value="PLASMA">Plasma</option>
                    <option value="OTHER">Other</option>
                  </select>
                </label>
                <label className="text-xs font-medium text-slate-600">
                  Donation date and time
                  <input
                    type="datetime-local"
                    value={donationDateTime}
                    onChange={(event) =>
                      setDonationDateTime(event.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2"
                  />
                </label>
                <label className="text-xs font-medium text-slate-600">
                  Volume in ml (optional)
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={donationVolumeMl}
                    onChange={(event) =>
                      setDonationVolumeMl(event.target.value)
                    }
                    placeholder="Not recorded"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-2"
                  />
                </label>
              </div>
              {donationAcknowledgementError && (
                <p role="alert" className="mt-3 text-xs text-rose-700">
                  {donationAcknowledgementError}
                </p>
              )}
              {donationCandidatesLoading ? (
                <p className="mt-3 text-xs text-slate-500">
                  Loading donor responses…
                </p>
              ) : donationCandidates.length ? (
                <ul className="mt-3 divide-y divide-slate-100">
                  {donationCandidates.map((candidate) => (
                    <li
                      key={candidate.donor_id}
                      className="flex flex-wrap items-center justify-between gap-3 py-2.5"
                    >
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {candidate.donor_name || "Donor"} ·{" "}
                          {candidate.donor_blood_group}
                        </p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                          <span className="inline-flex items-center gap-1">
                            <Phone size={12} />
                            {candidate.donor_phone ? (
                              <a
                                href={`tel:${candidate.donor_phone}`}
                                className="font-semibold text-blue-700 underline"
                              >
                                {candidate.donor_phone}
                              </a>
                            ) : (
                              "Phone not provided"
                            )}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={12} />
                            {[candidate.donor_area, candidate.donor_city]
                              .filter(Boolean)
                              .join(", ") || "Location not provided"}
                          </span>
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {candidate.response_status} · responded{" "}
                          {formatDate(candidate.responded_at)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {candidate.response_status === "Response Sent" && (
                          <button
                            disabled={responseAcknowledgementBusy !== null}
                            onClick={() =>
                              void acknowledgeResponse(candidate.donor_id)
                            }
                            className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {responseAcknowledgementBusy === candidate.donor_id
                              ? "Acknowledging…"
                              : "Acknowledge response"}
                          </button>
                        )}
                        {[
                          "Hospital Confirmed",
                          "Coordination in Progress",
                        ].includes(candidate.response_status) && (
                          <button
                            disabled={
                              candidate.donation_recorded ||
                              donationAcknowledgementBusy !== null
                            }
                            onClick={() =>
                              void acknowledgeDonation(candidate.donor_id)
                            }
                            className="rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                          >
                            {donationAcknowledgementBusy === candidate.donor_id
                              ? "Recording…"
                              : "Acknowledge donation"}
                          </button>
                        )}
                        {candidate.donation_recorded && (
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
                              Donation verified
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                void draftDonorAcknowledgement(candidate)
                              }
                              className="rounded-lg border border-(--border) px-3 py-2 text-xs font-semibold text-(--text-primary)"
                            >
                              Prepare donor thank-you
                            </button>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-xs text-slate-500">
                  No donor responses have been received for this request.
                </p>
              )}
            </section>
            <section className="mt-5 border-t border-slate-100 pt-4">
              <h3 className="text-sm font-bold text-[#101A36]">
                NGO Responses
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                NGO offers and declines are recorded separately; they do not
                count as donor responses or fulfil a request.
              </p>
              {ngoResponsesError && (
                <p
                  role="alert"
                  className="mt-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-700"
                >
                  NGO responses could not be loaded or updated:{" "}
                  {ngoResponsesError}
                </p>
              )}
              {ngoResponsesLoading ? (
                <p className="mt-3 text-xs text-slate-500">
                  Loading NGO responses…
                </p>
              ) : ngoResponses.length ? (
                <ul className="mt-3 divide-y divide-slate-100">
                  {ngoResponses.map((response) => {
                    const phoneHref = response.coordinator_phone
                      ? safePhoneHref(response.coordinator_phone)
                      : null
                    const emailHref = response.coordinator_email
                      ? safeEmailHref(response.coordinator_email)
                      : null
                    return (
                      <li key={response.response_id} className="py-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800">
                              {response.ngo_name}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {[
                                response.organisation_type,
                                response.city,
                                response.areas_served,
                              ]
                                .filter(Boolean)
                                .join(" · ") ||
                                "Organisation details not provided"}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-slate-700">
                              {response.response_type === "potential_donor"
                                ? `${response.potential_donor_count ?? 0} potential donor(s) · ${response.response_status}`
                                : `Unable to help · ${response.unable_reason || "Reason not supplied"}`}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-500">
                              Responded {formatDate(response.responded_at)}
                            </p>
                            {response.response_type === "potential_donor" && (
                              <>
                                <p className="mt-1 text-xs text-slate-600">
                                  Coordinator:{" "}
                                  {response.contact_shared
                                    ? response.coordinator_name ||
                                      "Name not provided"
                                    : "Contact not shared"}
                                </p>
                                {response.expected_time && (
                                  <p className="mt-1 text-xs text-slate-600">
                                    Availability: {response.expected_time}
                                  </p>
                                )}
                                {response.coordination_note && (
                                  <p className="mt-1 whitespace-pre-wrap text-xs text-slate-600">
                                    Note: {response.coordination_note}
                                  </p>
                                )}
                                {response.contact_shared && (
                                  <div className="mt-2 flex flex-wrap gap-3 text-xs">
                                    {phoneHref && (
                                      <a
                                        className="font-semibold text-blue-700 underline"
                                        href={phoneHref}
                                      >
                                        Call coordinator
                                      </a>
                                    )}
                                    {emailHref && (
                                      <a
                                        className="font-semibold text-blue-700 underline"
                                        href={emailHref}
                                      >
                                        Email coordinator
                                      </a>
                                    )}
                                    {!phoneHref && !emailHref && (
                                      <span className="text-slate-500">
                                        No usable coordinator contact details.
                                      </span>
                                    )}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {response.response_type === "potential_donor" &&
                              response.response_status ===
                                "Awaiting Hospital Coordination" && (
                                <button
                                  type="button"
                                  disabled={ngoCoordinationBusy !== null}
                                  onClick={() =>
                                    void updateNgoCoordination(
                                      response.response_id,
                                      "Coordination in Progress",
                                    )
                                  }
                                  className="rounded-lg border border-teal-200 px-3 py-2 text-xs font-semibold text-teal-800 disabled:opacity-50"
                                >
                                  {ngoCoordinationBusy === response.response_id
                                    ? "Updating…"
                                    : "Start coordination"}
                                </button>
                              )}
                            {response.response_type === "potential_donor" &&
                              response.response_status ===
                                "Coordination in Progress" &&
                              donationCandidates.some(
                                (candidate) => candidate.donation_recorded,
                              ) && (
                                <button
                                  type="button"
                                  disabled={ngoCoordinationBusy !== null}
                                  onClick={() =>
                                    void updateNgoCoordination(
                                      response.response_id,
                                      "Donation Verified",
                                    )
                                  }
                                  className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-800 disabled:opacity-50"
                                >
                                  Confirm NGO contribution supported verified
                                  donation
                                </button>
                              )}
                            {response.response_type === "potential_donor" &&
                              response.contact_shared && (
                                <button
                                  type="button"
                                  onClick={() => draftNgoAppreciation(response)}
                                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
                                >
                                  Prepare NGO appreciation
                                </button>
                              )}
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="mt-3 text-xs text-slate-500">
                  No NGO responses have been received for this request.
                </p>
              )}
            </section>
            <section className="mt-5 border-t border-slate-100 pt-4">
              <h3 className="text-sm font-bold text-[#101A36]">
                Fulfilment verification
              </h3>
              <p className="mt-1 text-xs text-slate-600">
                Valid unique donor responses: {selectedValidResponseCount} /{" "}
                {MINIMUM_VALID_DONOR_RESPONSES} · Verified donations:{" "}
                {selectedVerifiedDonationCount} / {selectedRequest.units} units
              </p>
              <div
                role="progressbar"
                aria-label="Valid unique donor response progress"
                aria-valuemin={0}
                aria-valuemax={MINIMUM_VALID_DONOR_RESPONSES}
                aria-valuenow={Math.min(
                  selectedValidResponseCount,
                  MINIMUM_VALID_DONOR_RESPONSES,
                )}
                className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
              >
                <span
                  className="block h-full rounded-full bg-teal-500"
                  style={{
                    width: `${Math.min(
                      (selectedValidResponseCount /
                        MINIMUM_VALID_DONOR_RESPONSES) *
                        100,
                      100,
                    )}%`,
                  }}
                />
              </div>
              {selectedVerifiedDonationCount > 0 &&
                (selectedValidResponseCount < MINIMUM_VALID_DONOR_RESPONSES ||
                  selectedVerifiedDonationCount < selectedRequest.units) && (
                  <p
                    role="status"
                    className="mt-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800"
                  >
                    Actual donation recorded; valid response and/or
                    requested-unit requirements are not yet met. This request
                    remains open and is flagged for review.
                  </p>
                )}
            </section>
            {acknowledgementDraft && (
              <section className="mt-5 rounded-xl border border-(--border) bg-(--surface-elevated) p-4">
                <h3 className="text-sm font-bold text-(--text-primary)">
                  Review acknowledgement before saving
                </h3>
                <p className="mt-1 text-xs text-(--text-secondary)">
                  To: {acknowledgementDraft.recipientName} ·{" "}
                  {acknowledgementDraft.messageType === "ngo_appreciation"
                    ? "NGO appreciation"
                    : "Donor thank-you"}
                </p>
                <textarea
                  aria-label="Acknowledgement message preview"
                  rows={5}
                  value={acknowledgementDraft.content}
                  onChange={(event) =>
                    setAcknowledgementDraft((draft) =>
                      draft
                        ? {
                            ...draft,
                            content: event.target.value,
                            savedId: undefined,
                          }
                        : null,
                    )
                  }
                  className="mt-3 w-full rounded-lg border border-(--border) bg-(--surface) p-3 text-sm text-(--text-primary)"
                />
                <p className="mt-2 text-[11px] text-(--text-muted)">
                  Email and SMS are not configured here. Saving approves a
                  copyable message; it does not send it.
                </p>
                {acknowledgementError && (
                  <p
                    role="status"
                    className="mt-2 text-xs text-(--text-secondary)"
                  >
                    {acknowledgementError}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={
                      acknowledgementBusy ||
                      !acknowledgementDraft.content.trim()
                    }
                    onClick={() => void saveAcknowledgement()}
                    className="rounded-lg bg-(--brand) px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {acknowledgementBusy
                      ? "Saving…"
                      : acknowledgementDraft.savedId
                        ? "Save edited message"
                        : "Approve and save"}
                  </button>
                  {acknowledgementDraft.savedId && (
                    <button
                      type="button"
                      onClick={() => void copyAcknowledgement()}
                      className="rounded-lg border border-(--border) px-3 py-2 text-xs font-semibold text-(--text-primary)"
                    >
                      Copy message (not sent)
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setAcknowledgementDraft(null)
                      setAcknowledgementError(null)
                    }}
                    className="rounded-lg border border-(--border) px-3 py-2 text-xs text-(--text-secondary)"
                  >
                    Close
                  </button>
                </div>
              </section>
            )}
            {isInProgress(selectedRequest.status) && (
              <>
                <button
                  type="button"
                  disabled={!fulfillmentReady || donationCandidatesLoading}
                  onClick={() => void fulfillRequest(selectedRequest)}
                  className="mt-5 w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: fulfillmentReady ? "#187A76" : "#35434D",
                  }}
                >
                  {donationCandidatesLoading
                    ? "Checking fulfilment requirements…"
                    : "Mark Fulfilled"}
                </button>
                {!fulfillmentReady && (
                  <p className="mt-2 text-center text-xs text-slate-500">
                    Requires at least one valid unique donor response (
                    {selectedValidResponseCount}/1) and verified donations for
                    all {selectedRequest.units} requested unit(s) (
                    {selectedVerifiedDonationCount}/{selectedRequest.units}).
                    This action activates automatically when both requirements
                    are met.
                  </p>
                )}
              </>
            )}
          </section>
        </div>
      )}

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          onClick={() => closeForm()}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="request-form-title"
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-(--border) bg-(--surface) p-6 text-(--text-primary) shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2
                  id="request-form-title"
                  className="text-xl font-bold text-(--text-primary)"
                >
                  {editing
                    ? "Edit Blood Requirement"
                    : "Post Blood Requirement"}
                </h2>
                <p className="mt-1 text-sm text-(--text-secondary)">
                  Share only the minimum patient information needed for
                  coordination.
                </p>
              </div>
              <button onClick={() => closeForm()} aria-label="Close form">
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={(event) => void saveRequest(event)}
              className="grid gap-4 sm:grid-cols-2"
            >
              <label className="text-sm font-medium text-(--text-secondary)">
                Blood Group
                <select
                  required
                  value={form.bloodGroup}
                  onChange={(event) =>
                    setForm({
                      ...form,

                      bloodGroup: event.target.value as BloodGroup,
                    })
                  }
                  className="mt-1.5 w-full rounded-lg border border-(--border) bg-(--surface) px-3 py-2.5 text-(--text-primary)"
                >
                  {groups.map((group) => (
                    <option
                      key={group}
                      style={{
                        backgroundColor: "var(--surface)",
                        color: "var(--text-primary)",
                      }}
                    >
                      {group}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-(--text-secondary)">
                Blood Component
                <select
                  value={form.component}
                  onChange={(event) =>
                    setForm({
                      ...form,

                      component: event.target.value as BloodComponent,
                    })
                  }
                  className="mt-1.5 w-full rounded-lg border border-(--border) bg-(--surface) px-3 py-2.5 text-(--text-primary)"
                >
                  <option
                    value="WHOLE_BLOOD"
                    style={{
                      backgroundColor: "var(--surface)",
                      color: "var(--text-primary)",
                    }}
                  >
                    Whole blood
                  </option>
                  <option
                    value="PLATELETS"
                    style={{
                      backgroundColor: "var(--surface)",
                      color: "var(--text-primary)",
                    }}
                  >
                    Platelets
                  </option>
                  <option
                    value="PLASMA"
                    style={{
                      backgroundColor: "var(--surface)",
                      color: "var(--text-primary)",
                    }}
                  >
                    Plasma
                  </option>
                  <option
                    value="OTHER"
                    style={{
                      backgroundColor: "var(--surface)",
                      color: "var(--text-primary)",
                    }}
                  >
                    Other / requires review
                  </option>
                </select>
                <span className="mt-1 block text-xs font-normal text-(--text-secondary)">
                  Automatic donor matching is currently limited to whole blood.
                  Other components require manual clinical review.
                </span>
              </label>
              <label className="text-sm font-medium text-(--text-secondary)">
                Units Required
                <input
                  required
                  type="number"
                  min={1}
                  max={20}
                  value={form.units}
                  onChange={(event) =>
                    setForm({ ...form, units: Number(event.target.value) })
                  }
                  className="mt-1.5 w-full rounded-lg border border-(--border) bg-(--surface) px-3 py-2.5 text-(--text-primary)"
                />
              </label>
              <label className="text-sm font-medium text-(--text-secondary)">
                Donor Search Radius
                <select
                  value={customRadius ? "custom" : form.searchRadiusKm}
                  onChange={(event) => {
                    const value = event.target.value
                    setForm({
                      ...form,
                      searchRadiusKm: value === "custom" ? 50 : Number(value),
                    })
                  }}
                  className="mt-1.5 w-full rounded-lg border border-(--border) bg-(--surface) px-3 py-2.5 text-(--text-primary)"
                >
                  {[5, 10, 25].map((radius) => (
                    <option
                      key={radius}
                      value={radius}
                      style={{
                        backgroundColor: "var(--surface)",
                        color: "var(--text-primary)",
                      }}
                    >
                      {radius} km
                    </option>
                  ))}
                  <option
                    value="custom"
                    style={{
                      backgroundColor: "var(--surface)",
                      color: "var(--text-primary)",
                    }}
                  >
                    Custom radius (5–50 km)
                  </option>
                </select>
                {customRadius && (
                  <input
                    aria-label="Custom donor search radius in kilometres"
                    type="number"
                    min={5}
                    max={50}
                    step={1}
                    value={form.searchRadiusKm}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        searchRadiusKm: Number(event.target.value),
                      })
                    }
                    className="mt-2 w-full rounded-lg border border-(--border) bg-(--surface) px-3 py-2.5 text-(--text-primary)"
                  />
                )}
              </label>
              <label className="text-sm font-medium text-(--text-secondary)">
                Urgency
                <select
                  value={form.urgency}
                  onChange={(event) =>
                    setForm({ ...form, urgency: event.target.value as Urgency })
                  }
                  className="mt-1.5 w-full rounded-lg border border-(--border) bg-(--surface) px-3 py-2.5 text-(--text-primary)"
                >
                  <option
                    value="NORMAL"
                    style={{
                      backgroundColor: "var(--surface)",
                      color: "var(--text-primary)",
                    }}
                  >
                    Normal
                  </option>
                  <option
                    value="URGENT"
                    style={{
                      backgroundColor: "var(--surface)",
                      color: "var(--text-primary)",
                    }}
                  >
                    High
                  </option>
                  <option
                    value="CRITICAL"
                    style={{
                      backgroundColor: "var(--surface)",
                      color: "var(--text-primary)",
                    }}
                  >
                    Critical
                  </option>
                </select>
              </label>
              <label className="text-sm font-medium text-(--text-secondary)">
                Required By
                <input
                  type="datetime-local"
                  value={form.requiredBy}
                  onChange={(event) =>
                    setForm({ ...form, requiredBy: event.target.value })
                  }
                  className="mt-1.5 w-full rounded-lg border border-(--border) bg-(--surface) px-3 py-2.5 text-(--text-primary)"
                />
              </label>
              <label className="text-sm font-medium text-(--text-secondary)">
                Hospital Department
                <input
                  value={form.department}
                  onChange={(event) =>
                    setForm({ ...form, department: event.target.value })
                  }
                  placeholder="e.g. Emergency"
                  className="mt-1.5 w-full rounded-lg border border-(--border) bg-(--surface) px-3 py-2.5 text-(--text-primary)"
                />
              </label>
              <label className="text-sm font-medium text-(--text-secondary)">
                Area / Location
                <input
                  value={form.area}
                  onChange={(event) =>
                    setForm({ ...form, area: event.target.value })
                  }
                  placeholder="Hospital location or area"
                  className="mt-1.5 w-full rounded-lg border border-(--border) bg-(--surface) px-3 py-2.5 text-(--text-primary)"
                />
              </label>
              <label className="text-sm font-medium text-(--text-secondary)">
                Patient Age (optional)
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={form.patientAge}
                  onChange={(event) =>
                    setForm({ ...form, patientAge: event.target.value })
                  }
                  className="mt-1.5 w-full rounded-lg border border-(--border) bg-(--surface) px-3 py-2.5 text-(--text-primary)"
                />
              </label>
              <label className="text-sm font-medium text-(--text-secondary) sm:col-span-2">
                Patient Information / Additional Notes
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(event) =>
                    setForm({ ...form, notes: event.target.value })
                  }
                  placeholder="Non-identifying clinical context only"
                  className="mt-1.5 w-full resize-y rounded-lg border border-(--border) bg-(--surface) px-3 py-2.5 text-(--text-primary)"
                />
              </label>
              {error && (
                <p
                  role="alert"
                  className="sm:col-span-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-700"
                >
                  {error}
                </p>
              )}
              <div className="sm:col-span-2">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      Hospital Location
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {requestLocationAddress ||
                        "Choose the location for this request."}
                    </p>
                    <p className="mt-1 text-xs text-(--text-secondary)">
                      Registered hospital contact details will be shared with
                      the assigned local NGO.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setRequestLocation(registeredLocation)
                      setRequestLocationAddress(registeredAddress)
                      setForm((current) => ({
                        ...current,
                        area:
                          registeredAddress ||
                          (typeof roleDetails?.city === "string"
                            ? roleDetails.city
                            : ""),
                      }))
                    }}
                    className="rounded-lg border border-(--border) bg-(--surface) px-3 py-2 text-xs font-semibold text-(--text-primary) hover:bg-(--surface-hover)"
                  >
                    Use registered hospital location
                  </button>
                </div>
                <MapLocationPicker
                  initialLocation={requestLocation ?? registeredLocation}
                  initialAddress={requestLocationAddress}
                  onChange={(value) => {
                    setRequestLocation({
                      latitude: value.latitude,

                      longitude: value.longitude,
                    })

                    setRequestLocationAddress(value.address)
                  }}
                />
              </div>
              <div className="flex justify-end gap-2 sm:col-span-2">
                <button
                  type="button"
                  onClick={() => closeForm()}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[#E11D48] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editing
                      ? "Save Changes"
                      : "Post Blood Requirement"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </DashboardLayout>
  )
}
