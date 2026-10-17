import { useEffect, useMemo, useState, type FormEvent } from "react"

import { useLocation, useNavigate } from "react-router-dom"

import {
  ArrowLeft,
  CalendarClock,
  Droplets,
  Eye,
  Pencil,
  Plus,
  Search,
  X,
} from "lucide-react"

import DashboardLayout, {
  PageHeader,
} from "../../components/layout/DashboardLayout"

import { useApp } from "../../context/AppContext"

import type {
  BloodGroup,
  BloodRequest,
  RequestStatus,
  Urgency,
} from "../../data/mockData"

import InteractiveNetworkMap, {
  MapLocationPicker,
  type Coordinates,
} from "../../components/hospital/InteractiveMap"

const groups: BloodGroup[] = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"]

const tabs = ["All", "Active", "In Progress", "Fulfilled", "Cancelled"] as const

type RequestTab = typeof tabs[number]

const emptyForm = {
  bloodGroup: "O+" as BloodGroup,

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

function displayStatus(status: RequestStatus) {
  if (status === "Fulfilled" || status === "Cancelled") return status

  if (isInProgress(status)) return "In Progress"

  return "Active"
}

function formatDate(value: string) {
  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
}

export default function HospitalRequests() {
  const {
    requests,

    currentUser,

    roleDetails,

    hospitalRecordId,

    hospitalRequestsLoading,

    hospitalRequestsError,

    createHospitalRequest,

    updateHospitalRequest,

    updateHospitalRequestDetails,
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

  const visibleRequests = ownRequests.filter((request) => {
    const state = displayStatus(request.status)

    const matchesTab = tab === "All" || state === tab

    const matchesSearch =
      !search ||
      `${request.id} ${request.bloodGroup} ${request.department ?? ""}`

        .toLowerCase()

        .includes(search.toLowerCase())

    return matchesTab && matchesSearch
  })

  const selectedRequest = ownRequests.find((request) => request.id === selected)

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

        units,

        urgency: form.urgency,

        area: form.area.trim(),

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
      const message =
        saveError instanceof Error
          ? saveError.message
          : "Unable to save this request."

      setError(message)
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

  return (
    <DashboardLayout>
      <PageHeader
        title={initialCreate ? "Post Blood Requirement" : "My Requests"}
        subtitle={
          initialCreate
            ? "Submit a hospital blood requirement for verification."
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
          <div className="mb-3 flex gap-2">
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
          {viewMode === "map" ? (
            <InteractiveNetworkMap
              hospitalId={hospitalRecordId ?? ""}
              hospitalLocation={registeredLocation}
              hospitalName={currentUser?.name ?? "Hospital"}
              mode="requests"
              requests={visibleRequests}
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
                          {Array.from({ length: 8 }, (_, cell) => (
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
                            <td className="px-4 py-4">{request.units}</td>
                            <td className="px-4 py-4">{request.urgency}</td>
                            <td className="px-4 py-4">
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                                {request.status}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">
                              {formatDate(request.createdAt)}
                            </td>
                            <td className="px-4 py-4">
                              {request.matchedDonors?.length ?? 0}
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
                          <td colSpan={8} className="px-6 py-14 text-center">
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

                ["Units required", `${selectedRequest.units}`],

                ["Urgency", selectedRequest.urgency],

                ["Current status", selectedRequest.status],

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

                  `${selectedRequest.matchedDonors?.length ?? 0}`,
                ],

                [
                  "Fulfillment progress",

                  selectedRequest.status === "Fulfilled"
                    ? "Fulfilled"
                    : displayStatus(selectedRequest.status),
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
            {isInProgress(selectedRequest.status) && (
              <button
                onClick={() => void fulfillRequest(selectedRequest)}
                className="mt-5 w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
              >
                Mark Fulfilled
              </button>
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
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2
                  id="request-form-title"
                  className="text-xl font-bold text-[#101A36]"
                >
                  {editing
                    ? "Edit Blood Requirement"
                    : "Post Blood Requirement"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
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
              <label className="text-sm font-medium text-slate-700">
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
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5"
                >
                  {groups.map((group) => (
                    <option key={group}>{group}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">
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
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5"
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Urgency
                <select
                  value={form.urgency}
                  onChange={(event) =>
                    setForm({ ...form, urgency: event.target.value as Urgency })
                  }
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5"
                >
                  <option value="NORMAL">Normal</option>
                  <option value="URGENT">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">
                Required By
                <input
                  type="datetime-local"
                  value={form.requiredBy}
                  onChange={(event) =>
                    setForm({ ...form, requiredBy: event.target.value })
                  }
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5"
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Hospital Department
                <input
                  value={form.department}
                  onChange={(event) =>
                    setForm({ ...form, department: event.target.value })
                  }
                  placeholder="e.g. Emergency"
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5"
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Area / Location
                <input
                  value={form.area}
                  onChange={(event) =>
                    setForm({ ...form, area: event.target.value })
                  }
                  placeholder="Hospital location or area"
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5"
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Patient Age (optional)
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={form.patientAge}
                  onChange={(event) =>
                    setForm({ ...form, patientAge: event.target.value })
                  }
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5"
                />
              </label>
              <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                Patient Information / Additional Notes
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(event) =>
                    setForm({ ...form, notes: event.target.value })
                  }
                  placeholder="Non-identifying clinical context only"
                  className="mt-1.5 w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5"
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
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setRequestLocation(registeredLocation)

                      setRequestLocationAddress(registeredAddress)
                    }}
                    disabled={!registeredLocation}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 disabled:opacity-50"
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
