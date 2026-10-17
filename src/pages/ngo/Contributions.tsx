import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Activity, CheckCircle2, Clock3, HandHeart, Search } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import DashboardLayout, {
  PageHeader,
} from "../../components/layout/DashboardLayout"
import { supabase } from "../../lib/supabase"

type Contribution = {
  response_id: string
  request_id: string
  hospital_name: string
  blood_group: string
  component: string
  units: number
  urgency: string
  request_status: string
  area: string | null
  created_at: string
  response_type: "potential_donor" | "unable_to_help"
  response_status: string
  potential_donor_count: number | null
  coordination_note: string | null
  unable_reason: string | null
  responded_at: string
  updated_at: string
}

const statuses = [
  "All",
  "Awaiting Hospital Coordination",
  "Coordination in Progress",
  "Donation Verified",
  "Unable to Help",
] as const

export default function NGOContributions() {
  const [rows, setRows] = useState<Contribution[]>([])
  const [status, setStatus] = useState<(typeof statuses)[number]>("All")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const { data, error } = await supabase.rpc(
          "get_ngo_request_contributions",
        )
        if (!active) return
        if (error) {
          setError(error.message)
          setRows([])
        } else {
          setError(null)
          setRows((data ?? []) as Contribution[])
        }
      } catch (loadError) {
        if (!active) return
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load contribution history.",
        )
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase()
    return rows.filter((row) => {
      const matchesStatus = status === "All" || row.response_status === status
      const text = [
        row.request_id,
        row.hospital_name,
        row.blood_group,
        row.component,
        row.area ?? "",
        row.response_status,
        row.unable_reason ?? "",
      ].join(" ").toLocaleLowerCase()
      return matchesStatus && (!query || text.includes(query))
    })
  }, [rows, search, status])

  const potentialDonors = rows.reduce(
    (total, row) => total + (row.potential_donor_count ?? 0),
    0,
  )
  const awaiting = rows.filter(
    (row) => row.response_status === "Awaiting Hospital Coordination",
  ).length
  const coordinating = rows.filter(
    (row) => row.response_status === "Coordination in Progress",
  ).length
  const verified = rows.filter(
    (row) => row.response_status === "Donation Verified",
  ).length
  const unable = rows.filter((row) => row.response_status === "Unable to Help").length
  const summary: { label: string; value: number; icon: LucideIcon }[] = [
    { label: "Requests responded to", value: rows.length, icon: Activity },
    { label: "Potential donors identified", value: potentialDonors, icon: HandHeart },
    { label: "Awaiting hospital coordination", value: awaiting, icon: Clock3 },
    { label: "Coordination in progress", value: coordinating, icon: Activity },
    { label: "Donations verified", value: verified, icon: CheckCircle2 },
  ]

  return (
    <DashboardLayout>
      <PageHeader
        title="My Contributions"
        subtitle="Track your NGO's persisted request responses and coordination history."
        actions={
          <Link
            to="/ngo/requests"
            className="rounded-lg bg-(--brand) px-4 py-2.5 text-sm font-semibold text-white"
          >
            Incoming Requests
          </Link>
        }
      />
      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          Contributions could not be loaded: {error}
        </p>
      )}
      <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {summary.map(({ label, value, icon: Icon }) => (
          <article key={label} className="rounded-xl border border-(--border) bg-(--surface) p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-(--text-secondary)">{label}</p>
              <Icon size={16} className="text-(--teal)" />
            </div>
            <p className="mt-2 text-2xl font-bold text-(--text-primary)">
              {loading ? "…" : value}
            </p>
          </article>
        ))}
      </section>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="relative min-w-56 flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-muted)" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search hospital, request, blood group"
            className="w-full rounded-lg border border-(--border) bg-(--surface) py-2.5 pl-9 pr-3 text-sm text-(--text-primary)"
          />
        </label>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as (typeof statuses)[number])}
          className="rounded-lg border border-(--border) bg-(--surface) px-3 py-2.5 text-sm text-(--text-primary)"
          aria-label="Filter contributions by status"
        >
          {statuses.map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      <p className="mb-3 text-xs text-(--text-secondary)">
        Unable-to-help history: {unable}
      </p>
      <section className="overflow-hidden rounded-xl border border-(--border) bg-(--surface)">
        {loading ? (
          <p className="p-6 text-sm text-(--text-secondary)">Loading contribution history…</p>
        ) : filtered.length ? (
          <div className="divide-y divide-(--divider)">
            {filtered.map((row) => (
              <article key={row.response_id} className="flex flex-wrap items-start justify-between gap-4 p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-(--text-primary)">
                      {row.hospital_name} · {row.blood_group} · {row.units} units
                    </h2>
                    <span className="rounded-full bg-(--surface-elevated) px-2.5 py-1 text-[11px] text-(--text-secondary)">
                      {row.response_status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-(--text-secondary)">
                    Request {row.request_id} · {(row.component || "WHOLE_BLOOD").replace(/_/g, " ")} · {row.urgency}
                    {row.area ? ` · ${row.area}` : ""}
                  </p>
                  <p className="mt-1 text-xs text-(--text-muted)">
                    Responded {new Date(row.responded_at).toLocaleString()}
                  </p>
                  {row.potential_donor_count != null && (
                    <p className="mt-2 text-xs text-(--text-secondary)">
                      {row.potential_donor_count} potential donor(s) identified — not proof of a donation.
                    </p>
                  )}
                  {row.unable_reason && (
                    <p className="mt-2 text-xs text-(--text-secondary)">Reason: {row.unable_reason}</p>
                  )}
                  {row.coordination_note && (
                    <p className="mt-2 whitespace-pre-wrap text-xs text-(--text-secondary)">{row.coordination_note}</p>
                  )}
                </div>
                <Link
                  to={`/ngo/requests?request=${encodeURIComponent(row.request_id)}`}
                  className="shrink-0 rounded-lg border border-(--border) px-3 py-2 text-xs font-semibold text-(--text-primary)"
                >
                  View request
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center text-sm text-(--text-secondary)">
            No contribution records match these filters.
          </div>
        )}
      </section>
    </DashboardLayout>
  )
}
