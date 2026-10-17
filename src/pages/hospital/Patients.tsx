import { useEffect, useMemo, useState, type FormEvent } from "react"

import { Plus, Search, X } from "lucide-react"

import DashboardLayout, {
  PageHeader,
} from "../../components/layout/DashboardLayout"

import { useApp } from "../../context/AppContext"

import { supabase } from "../../lib/supabase"

import type { BloodGroup } from "../../data/mockData"

type PatientRecord = {
  id: string

  patient_name: string

  blood_group: BloodGroup

  request_id: string | null

  units_required: number

  status: string

  created_at: string
}

const groups: BloodGroup[] = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"]

export default function HospitalPatients() {
  const { currentUser, requests, hospitalRecordId } = useApp()

  const [records, setRecords] = useState<PatientRecord[]>([])

  const [loading, setLoading] = useState(true)

  const [saving, setSaving] = useState(false)

  const [error, setError] = useState<string | null>(null)

  const [query, setQuery] = useState("")

  const [showForm, setShowForm] = useState(false)

  const [editing, setEditing] = useState<PatientRecord | null>(null)

  const [selected, setSelected] = useState<PatientRecord | null>(null)

  const [form, setForm] = useState({
    patient_name: "",

    blood_group: "O+" as BloodGroup,

    request_id: "",

    units_required: 1,

    status: "Active",
  })

  const loadPatients = async () => {
    if (!hospitalRecordId) return

    setLoading(true)

    setError(null)

    const { data, error: loadError } = await supabase

      .from("patients")

      .select(
        "id,patient_name,blood_group,request_id,units_required,status,created_at",
      )

      .eq("hospital_id", hospitalRecordId)

      .order("created_at", { ascending: false })

    if (loadError) setError(loadError.message)
    else setRecords((data ?? []) as PatientRecord[])

    setLoading(false)
  }

  useEffect(() => {
    void loadPatients()
  }, [hospitalRecordId])

  const filtered = useMemo(
    () =>
      records.filter((record) =>
        `${record.id} ${record.patient_name} ${record.blood_group} ${record.request_id ?? ""}`

          .toLowerCase()

          .includes(query.toLowerCase()),
      ),

    [records, query],
  )

  const openForm = (record?: PatientRecord) => {
    setEditing(record ?? null)

    setForm(
      record
        ? {
            patient_name: record.patient_name,

            blood_group: record.blood_group,

            request_id: record.request_id ?? "",

            units_required: record.units_required,

            status: record.status,
          }
        : {
            patient_name: "",

            blood_group: "O+",

            request_id: "",

            units_required: 1,

            status: "Active",
          },
    )

    setShowForm(true)
  }

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!currentUser?.id || !hospitalRecordId) return

    setSaving(true)

    setError(null)

    const payload = {
      ...form,

      hospital_id: hospitalRecordId,

      request_id: form.request_id || null,

      patient_name: form.patient_name.trim(),
    }

    const result = editing
      ? await supabase

          .from("patients")

          .update(payload)

          .eq("id", editing.id)

          .eq("hospital_id", hospitalRecordId)
      : await supabase.from("patients").insert(payload)

    if (result.error) setError(result.error.message)
    else {
      setShowForm(false)

      setEditing(null)

      await loadPatients()
    }

    setSaving(false)
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Patient Records"
        subtitle="Manage the minimum patient details needed to coordinate blood requirements."
        actions={
          <button
            onClick={() => openForm()}
            className="inline-flex items-center gap-2 rounded-lg bg-[#E11D48] px-4 py-2.5 text-sm font-semibold text-white"
          >
            <Plus size={16} /> Add Patient
          </button>
        }
      />
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
        >
          Patient records could not be saved or loaded: {error}
        </div>
      )}
      <label className="relative mb-4 block max-w-md">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by patient, ID, or blood group"
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-rose-300"
        />
      </label>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                {[
                  "Patient ID",

                  "Patient Name",

                  "Blood Group",

                  "Request ID",

                  "Required Units",

                  "Status",

                  "Created Date",

                  "Actions",
                ].map((title) => (
                  <th key={title} className="px-4 py-3">
                    {title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading &&
                Array.from({ length: 4 }, (_, index) => (
                  <tr key={index}>
                    {Array.from({ length: 8 }, (_, cell) => (
                      <td key={cell} className="px-4 py-4">
                        <span className="block h-4 animate-pulse rounded bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))}
              {!loading &&
                filtered.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {record.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {record.patient_name}
                    </td>
                    <td className="px-4 py-3 font-bold text-[#E11D48]">
                      {record.blood_group}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {record.request_id ?? "—"}
                    </td>
                    <td className="px-4 py-3">{record.units_required}</td>
                    <td className="px-4 py-3">{record.status}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                      {new Date(record.created_at).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3 text-xs">
                        <button
                          onClick={() => setSelected(record)}
                          className="font-medium text-slate-600 hover:text-[#E11D48]"
                        >
                          View
                        </button>
                        <button
                          onClick={() => openForm(record)}
                          className="font-medium text-[#E11D48]"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-14 text-center text-sm text-slate-500"
                  >
                    {records.length
                      ? "No patient records match this search."
                      : "No patient records yet. Add one when you need to coordinate a blood requirement."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          onClick={() => setShowForm(false)}
        >
          <section
            role="dialog"
            aria-modal="true"
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#101A36]">
                  {editing ? "Edit patient record" : "Add patient"}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Avoid adding contact or identity details that are not needed.
                </p>
              </div>
              <button onClick={() => setShowForm(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={(event) => void save(event)} className="space-y-4">
              <label className="block text-sm font-medium">
                Patient Name
                <input
                  required
                  maxLength={120}
                  value={form.patient_name}
                  onChange={(event) =>
                    setForm({ ...form, patient_name: event.target.value })
                  }
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm font-medium">
                  Blood Group
                  <select
                    value={form.blood_group}
                    onChange={(event) =>
                      setForm({
                        ...form,

                        blood_group: event.target.value as BloodGroup,
                      })
                    }
                    className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5"
                  >
                    {groups.map((group) => (
                      <option key={group}>{group}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium">
                  Required Units
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={form.units_required}
                    onChange={(event) =>
                      setForm({
                        ...form,

                        units_required: Number(event.target.value),
                      })
                    }
                    className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5"
                  />
                </label>
              </div>{" "}
              <label className="block text-sm font-medium">
                Request ID (optional)
                <select
                  value={form.request_id}
                  onChange={(event) =>
                    setForm({ ...form, request_id: event.target.value })
                  }
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5"
                >
                  <option value="">No linked request</option>
                  {requests

                    .filter(
                      (request) => request.hospitalId === hospitalRecordId,
                    )

                    .map((request) => (
                      <option key={request.id} value={request.id}>
                        {request.id} · {request.bloodGroup}
                      </option>
                    ))}
                </select>
              </label>
              <label className="block text-sm font-medium">
                Status
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm({ ...form, status: event.target.value })
                  }
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5"
                >
                  {["Active", "In Progress", "Fulfilled", "Cancelled"].map(
                    (status) => (
                      <option key={status}>{status}</option>
                    ),
                  )}
                </select>
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border px-4 py-2 text-sm"
                >
                  Close
                </button>
                <button
                  disabled={saving}
                  className="rounded-lg bg-[#E11D48] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save Patient"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
          onClick={() => setSelected(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-white p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-rose-600">
                  Patient record
                </p>
                <h2 className="mt-1 text-lg font-bold text-[#101A36]">
                  {selected.patient_name}
                </h2>
              </div>
              <button onClick={() => setSelected(null)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <dl className="mt-5 space-y-3 text-sm">
              {[
                ["Patient ID", selected.id],

                ["Blood Group", selected.blood_group],

                ["Request ID", selected.request_id ?? "Not linked"],

                ["Required Units", String(selected.units_required)],

                ["Status", selected.status],

                [
                  "Created Date",

                  new Date(selected.created_at).toLocaleString("en-IN"),
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between gap-4 border-b border-slate-100 pb-2"
                >
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="text-right font-medium text-slate-800">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      )}
    </DashboardLayout>
  )
}
