import React, { useEffect, useRef, useState } from "react"

import { Link, useNavigate } from "react-router-dom"

import { motion } from "framer-motion"

import lottie from "lottie-web"

import {
  ArrowLeft,
  Building2,
  Check,
  HeartHandshake,
  Map,
  MapPin,
  X,
  UserRound,
  FileText,
  Upload,
  ExternalLink,
  Trash2,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import L from "leaflet"

import "leaflet/dist/leaflet.css"

import { useApp } from "../context/AppContext"
import { supabase } from "../lib/supabase"

type Role = "hospital" | "ngo" | "donor"

const roles: {
  value: Role
  label: string
  icon: LucideIcon
  description: string
}[] = [
  {
    value: "hospital",
    label: "Hospital",
    icon: Building2,
    description: "Coordinate genuine blood requirements.",
  },

  {
    value: "ngo",
    label: "NGO",
    icon: HeartHandshake,
    description: "Manage donor networks and responses.",
  },

  {
    value: "donor",
    label: "Donor",
    icon: UserRound,
    description: "Help someone when you are available.",
  },
]

function LottieAnimation({ path, label }: { path: string; label: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const animation = lottie.loadAnimation({
      container: containerRef.current,
      renderer: "svg",
      loop: true,
      autoplay: true,
      path,
    })

    return () => animation.destroy()
  }, [path])

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={label}
      className="h-full w-full"
    />
  )
}

const roleMedia: Record<Role, { title: string; description: string; assets: { path: string; label: string }[] }> = {
  donor: {
    title: "Every donation starts a connection.",
    description: "Your time and care can help someone take their next breath.",
    assets: [{ path: "/login.mp4", label: "Donor welcome animation" }],
  },

  hospital: {
    title: "Care moves faster when teams connect.",
    description: "Coordinate critical blood requests with trusted partners.",
    assets: [
      { path: "/Hospital%20(1).json", label: "Hospital animation" },
      { path: "/Online%20Doctor.json", label: "Online doctor animation" },
    ],
  },

  ngo: {
    title: "Small acts build stronger communities.",
    description: "Bring donors, hospitals, and families closer together.",
    assets: [
      { path: "/Home.json", label: "Home animation" },
      {
        path: "/Kids%20Studying%20from%20Home%20(1).json",
        label: "Kids studying from home animation",
      },
    ],
  },
}

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]

const maxDocumentSize = 10 * 1024 * 1024
const acceptedDocumentTypes = ["application/pdf", "image/jpeg", "image/png"]

function RegistrationCertificateUpload({
  bucket = "registration-certificates",
  value,
  onChange,
  uploading = false,
}: {
  bucket?: "registration-certificates"
  value: { file: File | null; path: string; name: string }
  onChange: (value: { file: File | null; path: string; name: string }) => void
  uploading?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState("")
  const [viewing, setViewing] = useState(false)

  const selectFile = (file: File | undefined) => {
    if (!file) return
    setError("")
    if (!acceptedDocumentTypes.includes(file.type)) {
      setError("Please choose a PDF, JPG, JPEG, or PNG file.")
      return
    }
    if (file.size > maxDocumentSize) {
      setError("This file is larger than the 10 MB limit.")
      return
    }
    onChange({ file, path: "", name: file.name })
  }

  const viewFile = async () => {
    if (!value.path) return
    setViewing(true)
    const { data, error: signedUrlError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(value.path, 60 * 10)
    setViewing(false)
    if (signedUrlError) {
      setError(signedUrlError.message)
      return
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer")
  }

  return (
    <div className="sm:col-span-2">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={(event) => selectFile(event.target.files?.[0])}
      />
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") inputRef.current?.click()
        }}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          selectFile(event.dataTransfer.files[0])
        }}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition ${dragging ? "border-[#036D7D] bg-[#EFF7FA]" : "border-border hover:border-[#036D7D] hover:bg-[#F8FCFD]"}`}
      >
        <FileText className="mx-auto mb-2 text-[#036D7D]" size={24} />
        {value.name ? (
          <>
            <p className="truncate text-sm font-semibold text-[#021734]">{value.name}</p>
            <p className="mt-1 text-xs text-emerald-600">{uploading ? "Uploading securely..." : value.path ? "Uploaded successfully" : "Ready to upload when registration is completed"}</p>
          </>
        ) : (
          <>
            <p className="text-sm text-[#4B6070]">Click to upload or drag and drop</p>
            <p className="mt-1 text-xs text-[#7A9DAA]">PDF, JPG, PNG up to 10MB</p>
          </>
        )}
      </div>
      {value.name && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {value.path && (
            <button type="button" onClick={(event) => { event.stopPropagation(); void viewFile() }} disabled={viewing} className="inline-flex items-center gap-1.5 rounded-lg bg-[#036D7D] px-3 py-2 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-60">
              <ExternalLink size={13} /> {viewing ? "Opening..." : "View"}
            </button>
          )}
          <button type="button" onClick={(event) => { event.stopPropagation(); inputRef.current?.click() }} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-[#021734] hover:border-[#036D7D]">
            <Upload size={13} /> Replace
          </button>
          <button type="button" onClick={(event) => { event.stopPropagation(); if (inputRef.current) inputRef.current.value = ""; onChange({ file: null, path: "", name: "" }) }} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50">
            <Trash2 size={13} /> Remove
          </button>
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-center text-xs text-red-600">{error}</p>}
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  optional = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  optional?: boolean
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-[#021734]">
        {label}
        {optional && (
          <span className="font-normal text-[#7A9DAA]"> (optional)</span>
        )}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-[#021734] placeholder:text-xs placeholder:text-[#7A9DAA] shadow-[inset_0_2px_5px_rgba(3,26,54,0.04)] outline-none transition focus:border-ink-blue focus:ring-2 focus:ring-ink-blue/20"
      />
    </label>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-[#021734]">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-[#021734] shadow-[inset_0_2px_5px_rgba(3,26,54,0.04)] outline-none transition focus:border-ink-blue focus:ring-2 focus:ring-ink-blue/20"
      >
        <option value="">Select...</option>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  )
}

function LocationPicker({
  address,
  onAddressChange,
  onCityChange,
}: {
  address: string
  onAddressChange: (value: string) => void
  onCityChange?: (value: string) => void
}) {
  const mapRef = useRef<HTMLDivElement>(null)

  const mapInstance = useRef<L.Map | null>(null)

  const markerRef = useRef<L.CircleMarker | null>(null)

  const [locationMessage, setLocationMessage] = useState("")
  const [mapOpen, setMapOpen] = useState(false)
  const [detecting, setDetecting] = useState(false)

  const applyLocation = async (lat: number, lng: number, source: string) => {
    const exactCoordinates = `${lat.toFixed(5)}, ${lng.toFixed(5)}`

    if (mapInstance.current) {
      markerRef.current?.remove()
      markerRef.current = L.circleMarker([lat, lng], {
        radius: 8,
        color: "#031A36",
        fillColor: "#6CC7D3",
        fillOpacity: 1,
        weight: 3,
      }).addTo(mapInstance.current)
      mapInstance.current.setView([lat, lng], 15)
    }

    onAddressChange(exactCoordinates)
    setLocationMessage(`${source}: finding the exact address...`)

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { Accept: "application/json" } },
      )
      if (!response.ok) throw new Error("Reverse geocoding failed")

      const result = (await response.json()) as {
        display_name?: string
        address?: { city?: string; town?: string; village?: string }
      }
      const readableAddress = result.display_name || "Address found"
      onAddressChange(`${readableAddress} (${exactCoordinates})`)
      onCityChange?.(result.address?.city || result.address?.town || result.address?.village || "")
      setLocationMessage(`Exact location: ${readableAddress}`)
    } catch {
      setLocationMessage(`Exact coordinates: ${exactCoordinates}`)
    }
  }

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage("Location detection is not supported by this browser.")
      return
    }

    setDetecting(true)
    setLocationMessage("Detecting your exact location...")
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        void applyLocation(coords.latitude, coords.longitude, "Detected")
        setDetecting(false)
      },
      (error) => {
        setDetecting(false)
        setLocationMessage(
          error.code === error.PERMISSION_DENIED
            ? "Location permission was denied. Please allow access and try again."
            : "Could not detect your location. You can click the map instead.",
        )
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }

  useEffect(() => {
    if (!mapOpen || !mapRef.current || mapInstance.current) return

    const map = L.map(mapRef.current, { zoomControl: true }).setView(
      [20.5937, 78.9629],
      5,
    )

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map)

    map.on("click", (event) => {
      const { lat, lng } = event.latlng
      void applyLocation(lat, lng, "Selected")
    })

    mapInstance.current = map

    return () => {
      map.remove()
      mapInstance.current = null
    }
  }, [mapOpen])

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1"><Field label="Address or location" value={address} onChange={onAddressChange} placeholder="Enter your address" /></div>
        <button
          type="button"
          onClick={() => setMapOpen(true)}
          className="mb-0.5 inline-flex h-11.5 w-22 shrink-0 items-center justify-center gap-1 rounded-xl border border-border bg-white px-2 text-[11px] font-semibold text-ink-blue shadow-[0_2px_4px_rgba(3,26,54,0.06)] transition hover:border-ink-blue"
        >
          <Map size={14} /> Map
        </button>
      </div>
      {address && <p className="flex items-center gap-1.5 text-xs text-[#7A9DAA]"><MapPin size={13} /> Location selected: {address}</p>}
      {mapOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#021734]/35 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-125 rounded-[22px] border border-border bg-[#FBFCFD] p-4 shadow-[0_18px_45px_rgba(3,26,54,0.2)] sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div><h3 className="font-display text-lg font-bold text-[#021734]">Choose your location</h3><p className="mt-1 text-xs text-[#7A9DAA]">Click the map to choose an exact address.</p></div>
              <button type="button" onClick={() => setMapOpen(false)} aria-label="Close map" className="rounded-lg p-2 text-[#4B6070] hover:bg-[#EEF6F8] hover:text-[#021734]"><X size={18} /></button>
            </div>
            <div ref={mapRef} className="h-64 overflow-hidden rounded-xl border-2 border-border shadow-[inset_0_2px_5px_rgba(3,26,54,0.06)]" />
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-center gap-1.5 text-xs text-[#7A9DAA]"><MapPin size={13} /> Click to choose an exact location.</p>
              <button
                type="button"
                onClick={detectLocation}
                disabled={detecting}
                className="inline-flex items-center justify-center rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-ink-blue shadow-[0_2px_4px_rgba(3,26,54,0.06)] transition hover:border-ink-blue disabled:cursor-wait disabled:opacity-60"
              >
                {detecting ? "Detecting..." : "Detect my location"}
              </button>
            </div>
            {locationMessage && <p className="mt-3 text-xs font-medium text-ink-blue">{locationMessage}</p>}
            <button type="button" onClick={() => setMapOpen(false)} className="mt-4 w-full rounded-xl bg-[#031A36] py-3 font-display text-sm font-bold text-white shadow-[0_4px_0_#001126] transition hover:bg-ink-blue">Use this location</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Register() {
  const navigate = useNavigate()

  const { register } = useApp()

  const [role, setRoleChoice] = useState<Role | null>(null)

  const [step, setStep] = useState(0)

  const [form, setForm] = useState<Record<string, string>>({})

  const [bloodGroup, setBloodGroup] = useState("")

  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [confirmationMessage, setConfirmationMessage] = useState("")
  const [registrationComplete, setRegistrationComplete] = useState(false)
  const [registrationDocuments, setRegistrationDocuments] = useState({
    ngo: { file: null as File | null, path: "", name: "" },
    hospital: { file: null as File | null, path: "", name: "" },
  })
  const submissionStarted = useRef(false)

  const activeMedia = roleMedia[role || "hospital"]

  const update = (key: string, value: string) =>
    setForm((current) => ({ ...current, [key]: value }))

  const totalSteps = role === "hospital" ? 5 : role === "ngo" ? 3 : 4

  const stepTitles =
    role === "hospital"
      ? ["Hospital Information", "Location", "Verification", "Review"]
      : role === "ngo"
        ? ["Organisation Details", "Location & Documents"]
        : [
            "Personal Details",
            "Blood & Location",
            "Consent & Privacy",
          ]

  const finish = async () => {
    if (!role || submitting || submissionStarted.current) return
    submissionStarted.current = true
    setSubmitting(true)
    setErrorMessage("")
    setConfirmationMessage("")
    try {
      if (role === "ngo" && !registrationDocuments.ngo.file) {
        throw new Error("Please upload the NGO registration certificate before completing registration.")
      }
      if (role === "hospital" && !registrationDocuments.hospital.file) {
        throw new Error("Please upload the hospital registration certificate before completing registration.")
      }
      const result = await register(role, form, bloodGroup, consent, {
        ngo: registrationDocuments.ngo.file,
        hospital: registrationDocuments.hospital.file,
      })
      if (result.documentPath) {
        const key = role === "ngo" ? "ngo" : role === "hospital" ? "hospital" : null
        if (key) {
          setRegistrationDocuments((current) => ({
            ...current,
            [key]: { ...current[key], path: result.documentPath ?? "" },
          }))
        }
      }
      setRegistrationComplete(true)
      if (result.requiresEmailConfirmation) {
        setConfirmationMessage("Registration succeeded. Check your email to confirm your account, then sign in.")
      } else {
        navigate(`/${role}/dashboard`)
      }
    } catch (error) {
      submissionStarted.current = false
      console.error("REGISTRATION ERROR:", error)
      setErrorMessage(error instanceof Error ? error.message : "Unable to complete registration.")
    } finally {
      setSubmitting(false)
    }
  }

  const roleStep = () => {
    if (role === "hospital") {
      if (step === 2)
        return (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Street Address"
              value={form.streetAddress || ""}
              onChange={(value) => update("streetAddress", value)}
              placeholder="123, Main Street"
            />
            <Field
              label="City"
              value={form.city || ""}
              onChange={(value) => update("city", value)}
              placeholder="Mumbai"
            />
            <LocationPicker
              address={form.mapLocation || ""}
              onAddressChange={(value) => update("mapLocation", value)}
            />
          </div>
        )

      if (step === 3)
        return (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <RegistrationCertificateUpload
              bucket="registration-certificates"
              value={registrationDocuments.hospital}
              uploading={submitting}
              onChange={(value) => setRegistrationDocuments((current) => ({ ...current, hospital: value }))}
            />
            <SelectField
              label="Blood Bank Availability"
              value={form.bloodBank || ""}
              onChange={(value) => update("bloodBank", value)}
              options={[
                "Full blood bank on-site",
                "Partial blood bank",
                "No blood bank — require external supply",
              ]}
            />
            <Field
              label="Operating Hours"
              value={form.operatingHours || ""}
              onChange={(value) => update("operatingHours", value)}
              placeholder="24/7 or 8AM–10PM"
            />
          </div>
        )

      if (step === 4)
        return (
          <Review
            role="Hospital"
            values={[
              ["Hospital Name", form.hospitalName || "Not provided"],
              ["Type", form.hospitalType || "Not provided"],
              ["City", form.city || "Not provided"],
              ["Blood Bank", form.bloodBank || "Not provided"],
            ]}
          />
        )

      return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Hospital Name"
            value={form.hospitalName || ""}
            onChange={(value) => update("hospitalName", value)}
            placeholder="Apollo City Hospital"
          />
          <SelectField
            label="Hospital Type"
            value={form.hospitalType || ""}
            onChange={(value) => update("hospitalType", value)}
            options={[
              "Government",
              "Private",
              "Trust / NGO-run",
              "Multispeciality",
            ]}
          />
          <Field
            label="Registration ID"
            value={form.registrationId || ""}
            onChange={(value) => update("registrationId", value)}
            placeholder="MH-HSP-2024-XXXXX"
          />
          <Field
            label="Full Name"
            value={form.contactPerson || ""}
            onChange={(value) => update("contactPerson", value)}
            placeholder="Dr. Name Surname"
          />
          <Field
            label="Phone"
            value={form.phone || ""}
            onChange={(value) => update("phone", value)}
            placeholder="+91 98765 43210"
            type="tel"
          />
          <Field
            label="Email"
            value={form.email || ""}
            onChange={(value) => update("email", value)}
            placeholder="admin@hospital.com"
            type="email"
          />
          <Field
            label="Password"
            value={form.password || ""}
            onChange={(value) => update("password", value)}
            placeholder="Create a password"
            type="password"
          />
          <Field
            label="Confirm Password"
            value={form.confirmPassword || ""}
            onChange={(value) => update("confirmPassword", value)}
            placeholder="Re-enter your password"
            type="password"
          />
        </div>
      )
    }

    if (role === "ngo") {
      if (step === 2)
        return (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <LocationPicker
              address={form.mapLocation || ""}
              onAddressChange={(value) => update("mapLocation", value)}
              onCityChange={(value) => update("city", value)}
            />
            <Field
              label="City"
              value={form.city || ""}
              onChange={(value) => update("city", value)}
              placeholder="Mumbai"
            />
            <Field
              label="Street Address"
              value={form.streetAddress || ""}
              onChange={(value) => update("streetAddress", value)}
              placeholder="123, NGO Lane"
            />
            <Field
              label="Areas Served"
              value={form.areasServed || ""}
              onChange={(value) => update("areasServed", value)}
              placeholder="Andheri, Bandra, Juhu"
            />
            <RegistrationCertificateUpload
              bucket="registration-certificates"
              value={registrationDocuments.ngo}
              uploading={submitting}
              onChange={(value) => setRegistrationDocuments((current) => ({ ...current, ngo: value }))}
            />
          </div>
        )

      return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Organisation Name"
            value={form.organisationName || ""}
            onChange={(value) => update("organisationName", value)}
            placeholder="LifeLink Foundation"
          />
          <Field
            label="Registration Number"
            value={form.registrationNumber || ""}
            onChange={(value) => update("registrationNumber", value)}
            placeholder="MH/NGO/2019/XXXX"
          />
          <SelectField
            label="Organisation Type"
            value={form.organisationType || ""}
            onChange={(value) => update("organisationType", value)}
            options={[
              "Blood Donation NGO",
              "Health NGO",
              "Community Welfare",
              "Red Cross Chapter",
              "Other",
            ]}
          />
          <Field
            label="Full Name"
            value={form.contactPerson || ""}
            onChange={(value) => update("contactPerson", value)}
            placeholder="Name Surname"
          />
          <Field
            label="Email"
            value={form.email || ""}
            onChange={(value) => update("email", value)}
            placeholder="contact@ngo.org"
            type="email"
          />
          <Field
            label="Phone"
            value={form.phone || ""}
            onChange={(value) => update("phone", value)}
            placeholder="+91 98765 43210"
            type="tel"
          />
          <Field
            label="Password"
            value={form.password || ""}
            onChange={(value) => update("password", value)}
            placeholder="Create a password"
            type="password"
          />
          <Field
            label="Confirm Password"
            value={form.confirmPassword || ""}
            onChange={(value) => update("confirmPassword", value)}
            placeholder="Re-enter your password"
            type="password"
          />
        </div>
      )
    }

    if (step === 1)
      return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Full Name"
            value={form.fullName || ""}
            onChange={(value) => update("fullName", value)}
            placeholder="Aarav Sharma"
          />
          <Field
            label="Email"
            value={form.email || ""}
            onChange={(value) => update("email", value)}
            placeholder="you@example.com"
            type="email"
          />
          <Field
            label="Phone Number"
            value={form.phone || ""}
            onChange={(value) => update("phone", value)}
            placeholder="+91 98765 43210"
            type="tel"
          />
          <Field
            label="Password"
            value={form.password || ""}
            onChange={(value) => update("password", value)}
            placeholder="Create a password"
            type="password"
          />
          <Field
            label="Confirm Password"
            value={form.confirmPassword || ""}
            onChange={(value) => update("confirmPassword", value)}
            placeholder="Re-enter your password"
            type="password"
          />
          <Field
            label="Age"
            value={form.age || ""}
            onChange={(value) => update("age", value)}
            placeholder="28"
            type="number"
          />
          <SelectField
            label="Category"
            value={form.category || ""}
            onChange={(value) => update("category", value)}
            options={[
              "First-time donor",
              "Regular donor",
              "Voluntary donor",
              "Replacement donor",
            ]}
          />
          <SelectField
            label="Gender"
            value={form.gender || ""}
            onChange={(value) => update("gender", value)}
            options={["Male", "Female", "Non-binary", "Prefer not to say"]}
          />
          <Field
            label="Aadhaar Card Number"
            value={form.aadhaar || ""}
            onChange={(value) => update("aadhaar", value)}
            placeholder="XXXX XXXX XXXX"
            type="text"
          />
        </div>
      )

    if (step === 2)
      return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField label="Blood Group" value={bloodGroup} onChange={setBloodGroup} options={bloodGroups} />
          <LocationPicker
            address={form.mapLocation || ""}
            onAddressChange={(value) => update("mapLocation", value)}
            onCityChange={(value) => update("city", value)}
          />
          <Field
            label="City"
            value={form.city || ""}
            onChange={(value) => update("city", value)}
            placeholder="Mumbai"
          />
          <SelectField
            label="Preferred Donation Radius"
            value={form.radius || ""}
            onChange={(value) => update("radius", value)}
            options={["5 km", "10 km", "25 km", "50 km"]}
          />
        </div>
      )

    return (
      <div className="space-y-4 rounded-2xl bg-[#EFF7FA] p-5">
        <h3 className="font-display font-bold text-[#021734]">
          Consent & Privacy
        </h3>
        <p className="text-sm leading-relaxed text-[#4B6070]">
          Your personal information will be shared only in a privacy-protected
          manner. You can opt out of notifications at any time.
        </p>
        <label className="flex items-start gap-3 text-sm font-medium text-[#021734]">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            className="mt-1 accent-[#031A36]"
          />
          I have read and agree to the above terms.
        </label>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F8FA] lg:flex">
      <motion.aside
        key={role || "hospital"}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35 }}
        className="hidden min-h-screen flex-1 flex-col justify-between overflow-hidden bg-[#031A36] p-12 lg:flex"
      >
        <Link to="/" className="flex items-center gap-2">
          <img
            src="/logo.png"
            alt="RakhtSetu logo"
            className="h-8 w-8 rounded-lg bg-white object-contain"
          />
          <span className="font-display text-xl font-bold text-white">
            RakhtSetu
          </span>
        </Link>
        <div className="flex min-h-0 flex-1 flex-col justify-center py-8">
          <div
            className={`mx-auto flex w-full max-w-155 items-center justify-center gap-2 ${activeMedia.assets.length > 1 ? "h-97.5" : "h-117.5"}`}
          >
            {activeMedia.assets.map((asset) => (
              <div
                key={asset.path}
                className="relative h-full min-w-0 flex-1 overflow-hidden rounded-[28px] border-2 border-cyan/65 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]"
              >
                {asset.path.endsWith(".mp4") ? (
                  <video
                    src={asset.path}
                    aria-label={asset.label}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div
                    className={
                      asset.path === "/Home.json"
                        ? "h-full w-full scale-[1.3]"
                        : "h-full w-full"
                    }
                  >
                    <LottieAnimation path={asset.path} label={asset.label} />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mx-auto mt-8 max-w-145">
            <h2 className="font-display text-2xl font-semibold leading-tight text-white">
              {activeMedia.title}
            </h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-[#B7C8D8]">
              {activeMedia.description}
            </p>
          </div>
        </div>
        <p className="text-xs text-white/45">
          Registration details stay protected.
        </p>
      </motion.aside>
      <main className="flex flex-1 items-center justify-center p-5 sm:p-8">
        <div className="w-full max-w-125">
          <Link
            to="/signin"
            className="mb-6 flex items-center gap-2 text-sm text-[#021734]/50 transition-colors hover:text-ink-blue"
          >
            <ArrowLeft size={14} /> Back to sign in
          </Link>
          <div className="rounded-[22px] border border-border bg-[#FBFCFD] p-4 shadow-[0_18px_45px_rgba(3,26,54,0.10),inset_0_1px_0_rgba(255,255,255,0.95)] sm:p-7">
            <div className="mb-6">
              <h1 className="mb-2 font-display text-3xl font-bold tracking-[-0.02em] text-[#021734]">
                Create your account
              </h1>
              <p className="text-sm text-[#021734]/55">
                Choose your role to get started
              </p>
            </div>
            {step === 0 ? (
              <>
                <div className="space-y-3">
                  {roles.map(({ value, label, icon: Icon, description }) => (
                    <button
                      type="button"
                      key={value}
                      onClick={() => setRoleChoice(value)}
                      className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all ${
                        role === value
                          ? "border-[#031A36] bg-[#EAF4F6] shadow-[inset_0_2px_4px_rgba(3,26,54,0.06)]"
                          : "border-border bg-white hover:border-ink-blue"
                      }`}
                    >
                      <span
                        className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                          role === value
                            ? "bg-[#031A36] text-white"
                            : "bg-[#EEF6F8] text-ink-blue"
                        }`}
                      >
                        <Icon size={21} />
                      </span>
                      <span>
                        <span className="block font-display font-bold text-[#021734]">
                          {label}
                        </span>
                        <span className="mt-0.5 block text-xs text-[#4B6070]">
                          {description}
                        </span>
                      </span>
                      {role === value && (
                        <Check className="ml-auto text-[#031A36]" size={19} />
                      )}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={!role}
                  onClick={() => setStep(1)}
                  className="mt-6 flex w-full items-center justify-center rounded-xl bg-[#031A36] py-3.5 font-display text-sm font-bold text-white shadow-[0_4px_0_#001126,0_7px_13px_rgba(3,26,54,0.18)] transition hover:bg-ink-blue disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Continue
                </button>
              </>
            ) : (
              <>
                {errorMessage && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{errorMessage}</p>}
                {confirmationMessage && <p role="status" className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{confirmationMessage}</p>}
                <div className="mb-6 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setStep((current) => current - 1)}
                    className="flex items-center gap-1.5 text-sm text-[#4B6070] hover:text-[#021734]"
                  >
                    <ArrowLeft size={15} /> Back
                  </button>
                  <span className="text-xs font-semibold text-[#7A9DAA]">
                    Step {step} of {totalSteps}
                  </span>
                </div>
                <h2 className="mb-1 font-display text-2xl font-bold text-[#021734]">
                  {stepTitles[step - 1]}
                </h2>
                <p className="mb-6 text-sm text-[#7A9DAA]">
                  {role?.charAt(0).toUpperCase()}
                  {role?.slice(1)} registration
                </p>
                {roleStep()}
                <button
                  type="button"
                  disabled={submitting || registrationComplete || (role === "donor" && step === 3 && !consent)}
                  onClick={() =>
                    step < totalSteps - 1
                      ? setStep((current) => current + 1)
                      : finish()
                  }
                  className="mt-6 flex w-full items-center justify-center rounded-xl bg-[#031A36] py-3.5 font-display text-sm font-bold text-white shadow-[0_4px_0_#001126,0_7px_13px_rgba(3,26,54,0.18)] transition hover:bg-ink-blue disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {submitting ? "Creating account..." : step < totalSteps - 1 ? "Continue" : "Complete Registration"}
                </button>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

function Review({ role, values }: { role: string; values: string[][] }) {
  return (
    <div className="space-y-3 rounded-2xl bg-[#EFF7FA] p-5">
      <h3 className="font-display font-bold text-[#021734]">
        Review your {role.toLowerCase()} registration
      </h3>
      {values.map(([key, value]) => (
        <div
          key={key}
          className="flex justify-between gap-4 border-b border-border py-2 last:border-0"
        >
          <span className="text-xs text-[#7A9DAA]">{key}</span>
          <span className="text-right text-xs font-semibold text-[#021734]">
            {value}
          </span>
        </div>
      ))}
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
        Your registration will be reviewed after submission.
      </p>
    </div>
  )
}
