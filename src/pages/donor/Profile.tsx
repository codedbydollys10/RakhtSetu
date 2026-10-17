import { useEffect, useMemo, useState } from "react"

import { Check, MapPin, UserRound } from "lucide-react"

import DashboardLayout, {
  PageHeader,
} from "../../components/layout/DashboardLayout"
import DonorBadgeGallery from "../../components/donor/DonorBadgeGallery"

import { useApp } from "../../context/AppContext"

import {
  useDonorPortal,
  type DonorProfileEdits,
} from "../../context/DonorPortalContext"

import type { BloodGroup } from "../../data/mockData"
import { getDonorBadgeStats } from "../../data/donorBadges"
import {
  MapLocationPicker,
  type Coordinates,
} from "../../components/hospital/InteractiveMap"

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

function donorCoordinates(
  values: DonorProfileEdits,
): Coordinates | null {
  if (
    typeof values.latitude !== "number" ||
    typeof values.longitude !== "number"
  ) {
    return null
  }

  return { latitude: values.latitude, longitude: values.longitude }
}

export default function DonorProfile() {
  const { donors, currentUser, roleDetails, requests } = useApp()

  const { profile, updateProfile, responses } = useDonorPortal()

  const donor = donors.find((item) => item.id === currentUser?.id)

  const values: DonorProfileEdits = {
    name: profile.name ?? currentUser?.name ?? "",

    phone: profile.phone ?? String(roleDetails?.phone ?? donor?.phone ?? ""),

    bloodGroup:
      profile.bloodGroup ??
      roleDetails?.blood_group as BloodGroup | undefined ??
      donor?.bloodGroup,

    city: profile.city ?? String(roleDetails?.city ?? donor?.city ?? ""),

    area: profile.area ?? String(roleDetails?.area ?? donor?.area ?? ""),

    emergencyContact:
      profile.emergencyContact ??
      String(roleDetails?.emergency_contact ?? ""),

    latitude:
      profile.latitude ??
      (typeof roleDetails?.approximate_latitude === "number"
        ? roleDetails.approximate_latitude
        : null),

    longitude:
      profile.longitude ??
      (typeof roleDetails?.approximate_longitude === "number"
        ? roleDetails.approximate_longitude
        : null),

    mapLocation:
      profile.mapLocation ??
      String(roleDetails?.map_location ?? ""),
  }

  const badgeStats = useMemo(
    () =>
      getDonorBadgeStats({
        totalDonations: donor?.donationsCount ?? 0,
        donorId: currentUser?.id ?? "",
        requests,
        responses,
      }),
    [currentUser?.id, donor?.donationsCount, requests, responses],
  )

  const [draft, setDraft] = useState(values)

  const [errors, setErrors] = useState<Record<string, string>>({})

  const [saved, setSaved] = useState(false)

  const [saving, setSaving] = useState(false)

  const [saveError, setSaveError] = useState<string | null>(null)

  const [location, setLocation] = useState<Coordinates | null>(
    donorCoordinates(values),
  )

  const [mapLocation, setMapLocation] = useState(values.mapLocation ?? "")

  useEffect(
    () => {
      setDraft(values)
      setLocation(donorCoordinates(values))
      setMapLocation(values.mapLocation ?? "")
    },
    [currentUser?.id, profile, roleDetails, donor],
  )

  const change = (field: keyof DonorProfileEdits, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }))

    setSaved(false)
  }

  const save = async (event: React.FormEvent) => {
    event.preventDefault()

    const nextErrors: Record<string, string> = {}

    if (!draft.name?.trim()) nextErrors.name = "Enter your name."

    if (draft.phone && !/^[+\d][\d\s()-]{7,19}$/.test(draft.phone))
      nextErrors.phone = "Enter a valid phone number."

    if (
      draft.emergencyContact &&
      !/^[+\d][\d\s()-]{7,19}$/.test(draft.emergencyContact)
    )
      nextErrors.emergencyContact = "Enter a valid emergency contact number."

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length) return

    if (!draft.bloodGroup) {
      setErrors({ bloodGroup: "Select your blood group." })
      return
    }

    setSaving(true)
    setSaveError(null)
    try {
      await updateProfile({
        name: draft.name?.trim(),
        phone: draft.phone?.trim(),
        bloodGroup: draft.bloodGroup,
        city: draft.city?.trim(),
        area: draft.area?.trim(),
        emergencyContact: draft.emergencyContact?.trim(),
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
        mapLocation,
      })
      setSaved(true)
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Unable to save your donor profile.",
      )
    } finally {
      setSaving(false)
    }
  }

  const cancel = () => {
    setDraft(values)
    setLocation(donorCoordinates(values))
    setMapLocation(values.mapLocation ?? "")
    setErrors({})
    setSaved(false)
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="My Profile"
        subtitle="Keep your donor details current for request coordination."
      />
      <form
        onSubmit={save}
        className="max-w-3xl rounded-2xl border border-[#D8E3EA] bg-white p-5 shadow-[0_2px_8px_rgba(3,26,54,0.035)] md:p-6"
      >
        <div className="mb-6 flex items-center gap-3 border-b border-[#D8E3EA] pb-5">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EAF0F5] text-[#062847]">
            <UserRound size={20} />
          </span>
          <div>
            <p className="font-display text-base font-bold text-[#031A36]">
              {draft.name || "Donor"}
            </p>
            <p className="text-xs text-[#617587]">
              Donor profile · Private to your account
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold text-[#062847]">
            Full name
            <input
              value={draft.name ?? ""}
              onChange={(event) => change("name", event.target.value)}
              autoComplete="name"
              className="mt-1.5 w-full rounded-lg border border-[#D8E3EA] px-3 py-2.5 text-sm font-normal outline-none focus:border-[#E51C3D]"
            />
            {errors.name && (
              <span className="mt-1 block text-[10px] text-[#C91836]">
                {errors.name}
              </span>
            )}
          </label>
          <label className="text-xs font-semibold text-[#062847]">
            Email address
            <input
              value={String(roleDetails?.email ?? "")}
              readOnly
              className="mt-1.5 w-full rounded-lg border border-[#D8E3EA] bg-[#F5F8FA] px-3 py-2.5 text-sm font-normal text-[#617587]"
            />
            <span className="mt-1 block text-[10px] font-normal text-[#617587]">
              Managed through your signed-in account.
            </span>
          </label>
          <label className="text-xs font-semibold text-[#062847]">
            Phone number
            <input
              value={draft.phone ?? ""}
              onChange={(event) => change("phone", event.target.value)}
              autoComplete="tel"
              className="mt-1.5 w-full rounded-lg border border-[#D8E3EA] px-3 py-2.5 text-sm font-normal outline-none focus:border-[#E51C3D]"
            />
            {errors.phone && (
              <span className="mt-1 block text-[10px] text-[#C91836]">
                {errors.phone}
              </span>
            )}
          </label>
          <label className="text-xs font-semibold text-[#062847]">
            Blood group
            <select
              value={draft.bloodGroup ?? ""}
              onChange={(event) => change("bloodGroup", event.target.value)}
              aria-invalid={Boolean(errors.bloodGroup)}
              className="mt-1.5 w-full rounded-lg border border-[#D8E3EA] bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-[#E51C3D]"
            >
              <option value="">Select blood group</option>
              {bloodGroups.map((group) => (
                <option key={group}>{group}</option>
              ))}
            </select>
            {errors.bloodGroup && (
              <span className="mt-1 block text-[10px] text-[#C91836]">
                {errors.bloodGroup}
              </span>
            )}
          </label>
          <label className="text-xs font-semibold text-[#062847]">
            City
            <input
              value={draft.city ?? ""}
              onChange={(event) => change("city", event.target.value)}
              autoComplete="address-level2"
              className="mt-1.5 w-full rounded-lg border border-[#D8E3EA] px-3 py-2.5 text-sm font-normal outline-none focus:border-[#E51C3D]"
            />
          </label>
          <label className="text-xs font-semibold text-[#062847]">
            Area / neighbourhood
            <input
              value={draft.area ?? ""}
              onChange={(event) => change("area", event.target.value)}
              autoComplete="address-line2"
              className="mt-1.5 w-full rounded-lg border border-[#D8E3EA] px-3 py-2.5 text-sm font-normal outline-none focus:border-[#E51C3D]"
            />
            <span className="mt-1 block text-[10px] font-normal text-[#617587]">
              Only an approximate area is used for matching.
            </span>
          </label>
          <label className="text-xs font-semibold text-[#062847] sm:col-span-2">
            Emergency contact (optional)
            <input
              value={draft.emergencyContact ?? ""}
              onChange={(event) =>
                change("emergencyContact", event.target.value)
              }
              autoComplete="tel"
              className="mt-1.5 w-full rounded-lg border border-[#D8E3EA] px-3 py-2.5 text-sm font-normal outline-none focus:border-[#E51C3D]"
            />
            {errors.emergencyContact && (
              <span className="mt-1 block text-[10px] text-[#C91836]">
                {errors.emergencyContact}
              </span>
            )}
          </label>
          <div className="sm:col-span-2">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[#062847]">
              <MapPin size={14} />
              Approximate donation location
            </div>
            <MapLocationPicker
              initialLocation={location}
              initialAddress={mapLocation}
              onChange={(value) => {
                setLocation({
                  latitude: value.latitude,
                  longitude: value.longitude,
                })
                setMapLocation(value.address)
              }}
            />
            <p className="mt-1 text-[10px] font-normal text-[#617587]">
              This approximate location and your city are used to route nearby
              requests. Your exact address is not shared with donors.
            </p>
          </div>
        </div>
        <p className="mt-4 rounded-lg bg-[#F5F8FA] p-3 text-[10px] leading-relaxed text-[#617587]">
          Your blood group and approximate location help hospitals route
          requests. Your exact address and emergency contact are not shown to
          other donors.
        </p>
        {saveError && (
          <p role="alert" className="mt-3 text-xs font-medium text-[#C91836]">
            {saveError}
          </p>
        )}
        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={cancel}
            className="rounded-lg border border-[#D8E3EA] px-4 py-2.5 text-xs font-semibold text-[#617587] hover:bg-[#F5F8FA]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[#E51C3D] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#C91836] disabled:cursor-wait disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          {saved && (
            <span
              role="status"
              className="flex items-center gap-1 text-xs font-semibold text-[#16803C]"
            >
              <Check size={14} />
              Profile saved
            </span>
          )}
        </div>
      </form>
      <div className="max-w-5xl">
        <DonorBadgeGallery stats={badgeStats} compact />
      </div>
    </DashboardLayout>
  )
}
