import { useEffect, useState, type FormEvent } from "react"

import {
  Bell,
  Building2,
  LockKeyhole,
  Save,
  Shield,
  LogOut,
} from "lucide-react"

import DashboardLayout, {
  PageHeader,
} from "../../components/layout/DashboardLayout"

import { useApp } from "../../context/AppContext"

import { supabase } from "../../lib/supabase"

import {
  MapLocationPicker,
  type Coordinates,
} from "../../components/hospital/InteractiveMap"

type Preferences = {
  new_donor_response: boolean

  critical_request: boolean

  request_verification: boolean

  request_fulfillment: boolean
}

const defaults: Preferences = {
  new_donor_response: true,

  critical_request: true,

  request_verification: true,

  request_fulfillment: true,
}

export default function HospitalSettings() {
  const {
    currentUser,

    roleDetails,

    hospitalRecordId,

    logout,

    updateHospitalLocation,

    updateHospitalProfile,
  } = useApp()

  const storedCoords =
    typeof roleDetails?.map_location === "string"
      ? roleDetails.map_location.match(
          /\(?\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*\)?\s*$/,
        )
      : null

  const registeredLocation: Coordinates | null =
    typeof roleDetails?.latitude === "number" &&
    typeof roleDetails?.longitude === "number"
      ? { latitude: roleDetails.latitude, longitude: roleDetails.longitude }
      : storedCoords
        ? {
            latitude: Number(storedCoords[1]),

            longitude: Number(storedCoords[2]),
          }
        : null

  const [location, setLocation] = useState<Coordinates | null>(
    registeredLocation,
  )

  const [locationAddress, setLocationAddress] = useState(
    typeof roleDetails?.location_address === "string"
      ? roleDetails.location_address
      : "",
  )

  const [profile, setProfile] = useState({
    hospital_name:
      typeof roleDetails?.hospital_name === "string"
        ? roleDetails.hospital_name
        : "",

    hospital_type:
      typeof roleDetails?.hospital_type === "string"
        ? roleDetails.hospital_type
        : "",

    street_address:
      typeof roleDetails?.street_address === "string"
        ? roleDetails.street_address
        : "",

    city: typeof roleDetails?.city === "string" ? roleDetails.city : "",

    phone: typeof roleDetails?.phone === "string" ? roleDetails.phone : "",

    email: typeof roleDetails?.email === "string" ? roleDetails.email : "",
  })

  const [preferences, setPreferences] = useState(defaults)

  const [password, setPassword] = useState("")

  const [savingProfile, setSavingProfile] = useState(false)

  const [savingPreferences, setSavingPreferences] = useState(false)

  const [savingPassword, setSavingPassword] = useState(false)

  const [error, setError] = useState<string | null>(null)

  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!hospitalRecordId) return

    void supabase

      .from("hospital_notification_preferences")

      .select(
        "new_donor_response,critical_request,request_verification,request_fulfillment",
      )

      .eq("hospital_id", hospitalRecordId)

      .maybeSingle()

      .then(({ data, error: loadError }) => {
        if (loadError)
          setError(
            `Notification preferences could not be loaded: ${loadError.message}`,
          )
        else if (data) setPreferences(data)
      })
  }, [hospitalRecordId])

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!currentUser?.id || !hospitalRecordId) return

    setSavingProfile(true)

    setError(null)

    setMessage(null)

    try {
      await updateHospitalProfile(profile)
      setMessage("Hospital profile saved.")
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save the hospital profile.",
      )
    } finally {
      setSavingProfile(false)
    }
  }

  const savePreferences = async () => {
    if (!currentUser?.id) return

    setSavingPreferences(true)

    setError(null)

    setMessage(null)

    const { error: saveError } = await supabase

      .from("hospital_notification_preferences")

      .upsert(
        {
          hospital_id: hospitalRecordId,

          ...preferences,

          updated_at: new Date().toISOString(),
        },

        { onConflict: "hospital_id" },
      )

    if (saveError) setError(saveError.message)
    else setMessage("Notification preferences saved.")

    setSavingPreferences(false)
  }

  const saveLocation = async () => {
    if (!location) {
      setError("Select a hospital location on the map first.")

      return
    }

    setError(null)

    setMessage(null)

    try {
      await updateHospitalLocation({
        ...location,

        address: locationAddress,
      })

      setMessage("Hospital map location saved.")
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save hospital location.",
      )
    }
  }

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setSavingPassword(true)

    setError(null)

    setMessage(null)

    const { error: passwordError } = await supabase.auth.updateUser({
      password,
    })

    if (passwordError) setError(passwordError.message)
    else {
      setPassword("")

      setMessage("Password updated.")
    }

    setSavingPassword(false)
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Hospital Settings"
        subtitle="Manage your hospital profile, notifications, and account security."
      />
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
        >
          {error}
        </div>
      )}
      {message && (
        <div
          role="status"
          className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
        >
          {message}
        </div>
      )}
      <div className="max-w-4xl space-y-5">
        <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="rounded-lg bg-slate-100 p-2 text-[#101A36]">
              <Building2 size={18} />
            </span>
            <div>
              <h2 className="font-semibold text-[#102A43]">Hospital Profile</h2>
              <p className="text-xs text-slate-500">
                Contact details used for coordination.
              </p>
            </div>
          </div>
          <form
            onSubmit={(event) => void saveProfile(event)}
            className="grid gap-4 sm:grid-cols-2"
          >
            {([
              ["hospital_name", "Hospital name"],

              ["hospital_type", "Hospital type"],

              ["street_address", "Address"],

              ["city", "City"],

              ["phone", "Phone"],

              ["email", "Email"],
            ] as const).map(([key, label]) => (
              <label key={key} className="text-sm font-medium text-slate-700">
                {label}
                <input
                  required={key === "hospital_name"}
                  type={key === "email" ? "email" : "text"}
                  value={profile[key]}
                  onChange={(event) =>
                    setProfile({ ...profile, [key]: event.target.value })
                  }
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 outline-none focus:border-rose-300"
                />
              </label>
            ))}
            <div className="sm:col-span-2">
              <button
                disabled={savingProfile}
                className="inline-flex items-center gap-2 rounded-lg bg-[#E11D48] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                <Save size={15} /> {savingProfile ? "Saving…" : "Save Profile"}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <span className="rounded-lg bg-rose-50 p-2 text-[#E11D48]">
              <Building2 size={18} />
            </span>
            <div>
              <h2 className="font-semibold text-[#102A43]">
                Hospital Map Location
              </h2>
              <p className="text-xs text-slate-500">
                This registered public location centers your nearby network map.
              </p>
            </div>
          </div>
          <MapLocationPicker
            initialLocation={location}
            initialAddress={locationAddress}
            onChange={(value) => {
              setLocation({
                latitude: value.latitude,

                longitude: value.longitude,
              })

              setLocationAddress(value.address)
            }}
          />
          <button
            onClick={() => void saveLocation()}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700"
          >
            <Save size={15} /> Save Hospital Location
          </button>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="rounded-lg bg-rose-50 p-2 text-[#E11D48]">
              <Bell size={18} />
            </span>
            <div>
              <h2 className="font-semibold text-[#102A43]">
                Notification Preferences
              </h2>
              <p className="text-xs text-slate-500">
                Choose which hospital events to receive updates for.
              </p>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {([
              [
                "new_donor_response",

                "New donor response",

                "When a donor responds to a request.",
              ],

              [
                "critical_request",

                "Critical request",

                "Important updates for critical blood requirements.",
              ],

              [
                "request_fulfillment",

                "Request fulfillment",

                "When a request is marked fulfilled.",
              ],
            ] as const).map(([key, label, description]) => (
              <label
                key={key}
                className="flex cursor-pointer items-center justify-between gap-4 py-3"
              >
                <span>
                  <span className="block text-sm font-medium text-slate-800">
                    {label}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {description}
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={preferences[key]}
                  onChange={(event) =>
                    setPreferences({
                      ...preferences,

                      [key]: event.target.checked,
                    })
                  }
                  className="h-4 w-4 accent-[#E11D48]"
                />
              </label>
            ))}
          </div>
          <button
            onClick={() => void savePreferences()}
            disabled={savingPreferences}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-60"
          >
            <Save size={15} />{" "}
            {savingPreferences ? "Saving…" : "Save Preferences"}
          </button>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="rounded-lg bg-violet-50 p-2 text-violet-700">
              <LockKeyhole size={18} />
            </span>
            <div>
              <h2 className="font-semibold text-[#102A43]">Security</h2>
              <p className="text-xs text-slate-500">
                Update your password or sign out of the hospital portal.
              </p>
            </div>
          </div>
          <form
            onSubmit={(event) => void changePassword(event)}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <input
              required
              minLength={8}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="New password (at least 8 characters)"
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
            />
            <button
              disabled={savingPassword}
              className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-60"
            >
              {savingPassword ? "Updating…" : "Change Password"}
            </button>
          </form>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <p className="flex items-center gap-2 text-xs text-slate-500">
              <Shield size={15} /> Account access is managed securely by
              Supabase Auth.
            </p>
            <button
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
            >
              <LogOut size={15} /> Sign Out
            </button>
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}
