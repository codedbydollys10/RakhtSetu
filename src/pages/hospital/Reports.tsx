import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Activity, AlertCircle, Clock, HeartHandshake, Inbox, RefreshCw } from "lucide-react"
import DashboardLayout, { PageHeader } from "../../components/layout/DashboardLayout"
import { useApp } from "../../context/AppContext"
import { supabase } from "../../lib/supabase"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { requestMetrics, requestStatusCounts } from "./hospitalAnalytics"

/* ───────────────────────── Types ───────────────────────── */

type ResponseRecord = {
  request_id: string
  responded_at: string
  response_status: string
}

type NGOCoordinationSummary = {
  response_count: number
  donor_response_count: number
  potential_donor_count: number
  potential_people_count: number
  awaiting_coordination: number
  coordination_in_progress: number
  donations_verified: number
  unable_to_help: number
}

/* ───────────────────────── Design tokens ───────────────────────── */

const C = {
  surface: "#101B23",
  inset: "#0B141C",
  border: "#253540",
  grid: "#253540",
  text: "#E8F0F5",
  muted: "#A9BBC8",
  axis: "#B7C6D1",
  blue: "#38BDF8",
  // Semantic colours: colour carries meaning, not decoration
  critical: "#F87171",
  high: "#E51C3D",
  normal: "#38BDF8",
  good: "#34D399",
  neutral: "#94A3B8",
  dim: "#64748B",
}

const tooltipStyle = {
  background: C.inset,
  border: "1px solid #496172",
  borderRadius: 8,
  color: C.text,
  fontSize: 12,
  boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
}

const BLOOD_GROUPS = ["O+", "A+", "B+", "AB+", "O-", "A-", "B-", "AB-"]

const statusColor = (status: string, fallbackIndex: number) => {
  const s = status.toLowerCase()
  if (s.includes("fulfil") || s.includes("complete")) return C.good
  if (s.includes("partial")) return C.high
  if (s.includes("cancel")) return C.neutral
  if (s.includes("expire")) return C.dim
  if (s.includes("open") || s.includes("pending") || s.includes("active")) return C.blue
  return [C.blue, "#7DD3FC", C.neutral, C.dim][fallbackIndex % 4]
}

/* ───────────────────────── Small building blocks ───────────────────────── */

function Card({
  title,
  description,
  children,
  className = "",
}: {
  title: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section
      aria-label={title}
      className={`rounded-xl border p-5 ${className}`}
      style={{ backgroundColor: C.surface, borderColor: C.border }}
    >
      <h2 className="text-base font-semibold" style={{ color: C.text }}>
        {title}
      </h2>
      {description && (
        <p className="mt-1 text-xs leading-relaxed" style={{ color: C.muted }}>
          {description}
        </p>
      )}
      {children}
    </section>
  )
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="mb-4 flex items-start gap-2 rounded-lg border p-3 text-sm"
      style={{ background: "rgba(248,113,113,0.1)", borderColor: "rgba(248,113,113,0.4)", color: "#FCA5A5" }}
    >
      <AlertCircle size={16} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </p>
  )
}

function Kpi({
  label,
  value,
  hint,
  icon,
  progress,
  loading,
}: {
  label: string
  value: string | number
  hint: string
  icon: ReactNode
  progress?: number
  loading?: boolean
}) {
  return (
    <article className="rounded-xl border p-4" style={{ backgroundColor: C.surface, borderColor: C.border }}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium" style={{ color: C.muted }}>
          {label}
        </p>
        <span style={{ color: C.blue }} aria-hidden>
          {icon}
        </span>
      </div>
      {loading ? (
        <div className="mt-3 h-8 w-24 animate-pulse rounded" style={{ background: C.inset }} />
      ) : (
        <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight" style={{ color: C.text }}>
          {value}
        </p>
      )}
      {progress !== undefined && !loading && (
        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full"
          style={{ background: C.inset }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
        >
          <div className="h-full rounded-full" style={{ width: `${Math.min(100, progress)}%`, background: C.good }} />
        </div>
      )}
      <p className="mt-2 text-xs" style={{ color: C.muted }}>
        {hint}
      </p>
    </article>
  )
}

/** The signature element: blood-group demand as a heat-tile grid. Darker = less, brighter = more. */
function BloodGroupGrid({ counts }: { counts: Record<string, number> }) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  const max = Math.max(1, ...Object.values(counts))
  const top = BLOOD_GROUPS.reduce((a, b) => (counts[b] > counts[a] ? b : a), BLOOD_GROUPS[0])

  return (
    <Card
      title="Blood group demand"
      description={
        total > 0
          ? `${top} is requested most often (${counts[top]} of ${total} requests).`
          : "No requests with a blood group yet."
      }
    >
      <ul className="mt-4 grid grid-cols-4 gap-2" role="list">
        {BLOOD_GROUPS.map((group) => {
          const value = counts[group]
          const ratio = value / max
          const share = total ? Math.round((value / total) * 100) : 0
          const strong = ratio > 0.55
          return (
            <li
              key={group}
              aria-label={`${group}: ${value} requests, ${share}% of total`}
              className="flex aspect-square min-h-[76px] flex-col items-center justify-center rounded-lg border"
              style={{
                background: value ? `rgba(56,189,248,${0.1 + ratio * 0.65})` : C.inset,
                borderColor: value ? "rgba(125,211,252,0.45)" : C.border,
                color: strong ? "#06222F" : C.text,
              }}
            >
              <span className="text-lg font-bold">{group}</span>
              <span className="text-sm font-semibold tabular-nums">{value}</span>
              <span className="text-[11px] tabular-nums" style={{ opacity: 0.8 }}>
                {share}%
              </span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

function UrgencyCard({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  return (
    <Card
      title="Urgency mix"
      description={total ? "How urgent your requests were when created." : "No requests to show yet."}
    >
      <div className="mt-4 h-52" role="img" aria-label={data.map((d) => `${d.label}: ${d.value}`).join(", ")}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 0, bottom: 4 }}>
            <CartesianGrid stroke={C.grid} strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={{ fill: C.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="label" width={64} tick={{ fill: C.axis, fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#34434E" }} />
            <Bar dataKey="value" name="Requests" radius={[0, 4, 4, 0]} barSize={18}>
              {data.map((d) => (
                <Cell key={d.label} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

function StatusCard({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  return (
    <Card title="Request status" description="Where your saved requests stand today.">
      <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row">
        <div className="relative h-48 w-full sm:w-1/2" role="img" aria-label={data.map((d) => `${d.name}: ${d.value}`).join(", ")}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={56} outerRadius={80} paddingAngle={2} stroke={C.surface} strokeWidth={2}>
                {data.map((d, i) => (
                  <Cell key={d.name} fill={statusColor(d.name, i)} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold tabular-nums" style={{ color: C.text }}>
              {total}
            </span>
            <span className="text-xs" style={{ color: C.muted }}>
              requests
            </span>
          </div>
        </div>
        <ul className="w-full space-y-2 text-sm sm:w-1/2">
          {data.map((d, i) => (
            <li key={d.name} className="flex items-center justify-between gap-3" style={{ color: "#C4D2DC" }}>
              <span className="flex items-center gap-2">
                <i className="h-2.5 w-2.5 rounded-sm" style={{ background: statusColor(d.name, i) }} />
                {d.name}
              </span>
              <span className="tabular-nums" style={{ color: C.muted }}>
                {d.value} · {total ? Math.round((d.value / total) * 100) : 0}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}

function NgoCard({
  summary,
  error,
  loading,
}: {
  summary: NGOCoordinationSummary | null
  error: string | null
  loading: boolean
}) {
  const stages = [
    { label: "Awaiting coordination", value: summary?.awaiting_coordination ?? 0, color: C.high },
    { label: "In progress", value: summary?.coordination_in_progress ?? 0, color: C.blue },
    { label: "Donation verified", value: summary?.donations_verified ?? 0, color: C.good },
    { label: "Unable to help", value: summary?.unable_to_help ?? 0, color: C.dim },
  ]
  const stageTotal = stages.reduce((s, x) => s + x.value, 0)

  return (
    <Card
      title="NGO and donor coordination"
      description="All-time saved NGO and donor responses. Potential donors are NGO estimates; verified donations require hospital confirmation."
      className="mb-5"
    >
      {error && (
        <div className="mt-3">
          <Notice>NGO coordination metrics could not be loaded: {error}</Notice>
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[
          ["NGO responses", summary?.response_count],
          ["Donor responses", summary?.donor_response_count],
          ["Potential donors offered by NGOs", summary?.potential_people_count],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-lg border p-3" style={{ background: C.inset, borderColor: C.border }}>
            <p className="text-xs" style={{ color: C.muted }}>
              {label}
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums" style={{ color: C.text }}>
              {loading ? "…" : value ?? "—"}
            </p>
          </div>
        ))}
      </div>

      {/* One segmented bar shows how responses split across coordination stages */}
      <div className="mt-5">
        <p className="mb-2 text-xs font-medium" style={{ color: C.muted }}>
          Combined coordination stages
        </p>
        <div
          className="flex h-3 overflow-hidden rounded-full"
          style={{ background: C.inset }}
          role="img"
          aria-label={stages.map((s) => `${s.label}: ${s.value}`).join(", ")}
        >
          {stageTotal > 0 &&
            stages.map((s) => (
              <div key={s.label} title={`${s.label}: ${s.value}`} style={{ width: `${(s.value / stageTotal) * 100}%`, background: s.color }} />
            ))}
        </div>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {stages.map((s) => (
            <li key={s.label} className="flex items-center justify-between gap-2 text-sm" style={{ color: "#C4D2DC" }}>
              <span className="flex items-center gap-2">
                <i className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
                {s.label}
              </span>
              <span className="font-semibold tabular-nums" style={{ color: C.text }}>
                {loading ? "…" : summary ? s.value : "—"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}

/* ───────────────────────── Page ───────────────────────── */

export default function HospitalReports() {
  const {
    requests,
    hospitalRecordId,
    hospitalRequestsLoading,
    hospitalRequestsError,
  } = useApp()

  const [responses, setResponses] = useState<ResponseRecord[]>([])
  const [responseError, setResponseError] = useState<string | null>(null)
  const [loadingResponses, setLoadingResponses] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  const [ngoSummary, setNgoSummary] = useState<NGOCoordinationSummary | null>(null)
  const [ngoSummaryError, setNgoSummaryError] = useState<string | null>(null)
  const [ngoLoading, setNgoLoading] = useState(true)

  const ownRequests = useMemo(
    () => requests.filter((request) => request.hospitalId === hospitalRecordId),
    [requests, hospitalRecordId],
  )
  const idsKey = useMemo(() => ownRequests.map((r) => r.id).join("|"), [ownRequests])

  /* Donor responses: refresh every 30s */
  useEffect(() => {
    let cancelled = false
    const ids = ownRequests.map((request) => request.id)

    if (!ids.length) {
      setResponses([])
      setResponseError(null)
      setLoadingResponses(false)
      return
    }

    setLoadingResponses(true)

    const loadResponses = () => {
      void supabase
        .rpc("get_hospital_donor_responses", { p_request_id: null })
        .then(({ data, error }) => {
          if (cancelled) return
          if (error) {
            setResponseError(error.message)
            setResponses([])
          } else {
            setResponseError(null)
            const requestIds = new Set(ids)
            setResponses(((data ?? []) as ResponseRecord[]).filter((r) => requestIds.has(r.request_id)))
            setUpdatedAt(new Date())
          }
          setLoadingResponses(false)
        })
    }

    loadResponses()
    const interval = window.setInterval(loadResponses, 30000)
    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey])

  /* NGO summary */
  useEffect(() => {
    let active = true
    setNgoLoading(true)
    const loadSummary = async () => {
      try {
        const { data, error } = await supabase.rpc("get_hospital_ngo_coordination_summary", {
          p_from: null,
          p_to: null,
        })
        if (!active) return
        if (error) {
          setNgoSummary(null)
          setNgoSummaryError(error.message)
        } else {
          setNgoSummaryError(null)
          const row = Array.isArray(data) ? data[0] : data
          setNgoSummary((row as NGOCoordinationSummary | undefined) ?? null)
        }
      } catch (loadError: unknown) {
        if (!active) return
        setNgoSummary(null)
        setNgoSummaryError(loadError instanceof Error ? loadError.message : "Unable to load NGO coordination metrics.")
      } finally {
        if (active) setNgoLoading(false)
      }
    }
    void loadSummary()
    const interval = window.setInterval(() => void loadSummary(), 30000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [hospitalRecordId])

  /* Derived analytics */
  const filtered = ownRequests
  const metrics = requestMetrics(filtered)
  const fulfilled = metrics.fulfilled
  const fulfillmentRate = metrics.fulfillmentRate

  const averageResponse = useMemo(() => {
    const byId = new Map(filtered.map((r) => [r.id, r]))
    const durations = responses.flatMap((response) => {
      const request = byId.get(response.request_id)
      const minutes =
        request && response.response_status !== "Cancelled"
          ? (Date.parse(response.responded_at) - Date.parse(request.createdAt)) / 60000
          : Number.NaN
      return Number.isFinite(minutes) && minutes >= 0 ? [minutes] : []
    })
    if (!durations.length) return "—"
    const mean = Math.round(durations.reduce((s, v) => s + v, 0) / durations.length)
    return mean >= 90 ? `${(mean / 60).toFixed(1)} hrs` : `${mean} mins`
  }, [filtered, responses])

  const bloodCounts = useMemo(() => {
    const counts: Record<string, number> = Object.fromEntries(BLOOD_GROUPS.map((g) => [g, 0]))
    filtered.forEach((r) => {
      if (r.bloodGroup in counts) counts[r.bloodGroup] += 1
    })
    return counts
  }, [filtered])

  const dateSeries = useMemo(() => {
    const byMonth = new Map<string, number>()
    filtered.forEach((request) => {
      const d = new Date(request.createdAt)
      if (Number.isNaN(d.getTime())) return
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      byMonth.set(key, (byMonth.get(key) ?? 0) + 1)
    })
    return [...byMonth.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({
        month: new Date(`${month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
        requests: count,
      }))
  }, [filtered])

  const urgencyData = [
    { label: "Critical", value: filtered.filter((r) => r.urgency === "CRITICAL").length, color: C.critical },
    { label: "High", value: filtered.filter((r) => r.urgency === "URGENT").length, color: C.high },
    { label: "Normal", value: filtered.filter((r) => r.urgency === "NORMAL").length, color: C.normal },
  ]

  const statusData = requestStatusCounts(filtered).map((item) => ({ name: item.status, value: item.count }))

  const loading = hospitalRequestsLoading

  return (
    <DashboardLayout>
      <PageHeader
        title="Hospital reports"
        subtitle="All-time analytics from your saved blood requests and donor responses."
      />

      {updatedAt && (
        <p className="-mt-2 mb-4 flex items-center gap-1.5 text-xs" style={{ color: C.muted }}>
          <RefreshCw size={12} aria-hidden />
          Donor responses updated {updatedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} · refreshes every 30 seconds
        </p>
      )}

      {hospitalRequestsError && (
        <Notice>
          Hospital request analytics could not be loaded: {hospitalRequestsError}
        </Notice>
      )}

      {/* KPIs */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Total requests" value={filtered.length} hint="Every request you have saved" icon={<Inbox size={18} />} loading={loading} />
        <Kpi label="Fulfilled requests" value={fulfilled} hint="Requests closed with donations" icon={<HeartHandshake size={18} />} loading={loading} />
        <Kpi
          label="Average response time"
          value={averageResponse}
          hint="From request to donor response"
          icon={<Clock size={18} />}
          loading={loading || loadingResponses}
        />
        <Kpi
          label="Fulfillment rate"
          value={`${fulfillmentRate}%`}
          hint={`${fulfilled} of ${filtered.length} requests fulfilled`}
          icon={<Activity size={18} />}
          progress={Number(fulfillmentRate) || 0}
          loading={loading}
        />
      </div>

      <NgoCard summary={ngoSummary} error={ngoSummaryError} loading={ngoLoading} />

      {responseError && <Notice>Donor response analytics could not be loaded: {responseError}</Notice>}

      {/* Charts */}
      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2" aria-busy="true" aria-label="Loading charts">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl border" style={{ backgroundColor: C.surface, borderColor: C.border }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <section className="rounded-xl border p-10 text-center" style={{ backgroundColor: C.surface, borderColor: C.border }}>
          <Activity className="mx-auto" style={{ color: C.blue }} size={28} />
          <h2 className="mt-3 font-semibold" style={{ color: C.text }}>
            No requests yet
          </h2>
          <p className="mx-auto mt-1 max-w-sm text-sm" style={{ color: C.muted }}>
            Create your first blood request and this page will show demand, urgency and fulfillment trends.
          </p>
        </section>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card
            title="Requests over time"
            description={dateSeries.length > 1 ? "Saved requests per month." : "More months of data will show a trend here."}
            className="lg:col-span-2"
          >
            <div className="mt-4 h-64" role="img" aria-label={`Monthly requests: ${dateSeries.map((d) => `${d.month} ${d.requests}`).join(", ")}`}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dateSeries} margin={{ top: 8, right: 16, left: -16, bottom: 4 }}>
                  <CartesianGrid stroke={C.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: C.axis, fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis allowDecimals={false} tick={{ fill: C.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line
                    type="monotone"
                    dataKey="requests"
                    name="Requests"
                    stroke={C.blue}
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: C.blue, strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: C.blue, stroke: C.surface, strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <BloodGroupGrid counts={bloodCounts} />
          <UrgencyCard data={urgencyData} />
          <StatusCard data={statusData} />
        </div>
      )}

      <p className="mt-5 text-xs" style={{ color: C.muted }}>
        Figures include every saved request, regardless of date.
      </p>
    </DashboardLayout>
  )
}