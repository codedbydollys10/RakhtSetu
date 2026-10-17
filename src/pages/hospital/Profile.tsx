import { Building2, CheckCircle2, MapPin, Pencil } from "lucide-react"
import { Link } from "react-router-dom"

import DashboardLayout, {
  PageHeader,
} from "../../components/layout/DashboardLayout"
import { useApp } from "../../context/AppContext"

function valueOrFallback(value: unknown) {
  return typeof value === "string" && value.trim() ? value : "Not provided"
}

export default function HospitalProfile() {
  const { roleDetails, requests, hospitalRecordId } = useApp()

  const hospitalRequests = requests.filter(
    (request) => request.hospitalId === hospitalRecordId,
  )
  const activeRequests = hospitalRequests.filter(
    (request) => !["Fulfilled", "Cancelled"].includes(request.status),
  )
  const name = valueOrFallback(roleDetails?.hospital_name)
  const city = valueOrFallback(roleDetails?.city)
  const address = valueOrFallback(roleDetails?.street_address)
  const verified = roleDetails?.verified === true

  const details: [string, unknown][] = [
    ["Hospital type", roleDetails?.hospital_type],
    ["Registration ID", roleDetails?.registration_id],
    ["Contact person", roleDetails?.contact_person],
    ["Phone", roleDetails?.phone],
    ["Email", roleDetails?.email],
    ["Address", roleDetails?.street_address],
    ["City", roleDetails?.city],
    ["Blood bank", roleDetails?.blood_bank],
    ["Operating hours", roleDetails?.operating_hours],
  ]

  return (
    <DashboardLayout>
      <PageHeader
        title="Hospital Profile"
        subtitle="Your registered hospital details and current request activity."
        actions={
          <Link
            to="/hospital/settings"
            className="inline-flex items-center gap-2 rounded-lg border border-[#D8E3EA] bg-white px-3 py-2 text-xs font-semibold text-[#062847] hover:bg-[#F5F8FA]"
          >
            <Pencil size={14} />
            Edit profile
          </Link>
        }
      />
      <div className="max-w-4xl space-y-5">
        <section className="rounded-2xl border border-[#D8E3EA] bg-white p-5 shadow-[0_2px_8px_rgba(3,26,54,0.035)] md:p-6">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#062847] text-white">
              <Building2 size={26} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-xl font-bold text-[#021734]">
                {name}
              </h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-[#617587]">
                <MapPin size={14} />
                {address !== "Not provided" ? `${address}, ` : ""}
                {city}
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                verified
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              <CheckCircle2 size={14} />
              {verified ? "Verified" : "Verification pending"}
            </span>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[#D8E3EA] bg-white p-4">
            <p className="text-xs font-medium text-[#617587]">
              Requests coordinated
            </p>
            <p className="mt-1 text-2xl font-bold text-[#021734]">
              {hospitalRequests.length}
            </p>
          </div>
          <div className="rounded-xl border border-[#D8E3EA] bg-white p-4">
            <p className="text-xs font-medium text-[#617587]">
              Active requests
            </p>
            <p className="mt-1 text-2xl font-bold text-[#021734]">
              {activeRequests.length}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-[#D8E3EA] bg-white p-5 md:p-6">
          <h3 className="mb-3 font-display text-base font-bold text-[#021734]">
            Hospital information
          </h3>
          <dl className="divide-y divide-[#E8EEF2]">
            {details.map(([label, value]) => (
              <div
                key={label}
                className="grid gap-1 py-3 text-sm sm:grid-cols-[minmax(10rem,1fr)_2fr]"
              >
                <dt className="text-[#617587]">{label}</dt>
                <dd className="break-words font-medium text-[#021734]">
                  {valueOrFallback(value)}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </DashboardLayout>
  )
}
