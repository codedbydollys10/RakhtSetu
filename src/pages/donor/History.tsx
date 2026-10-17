import { useState } from "react"

import { CalendarDays, Droplet } from "lucide-react"

import DashboardLayout, {
  PageHeader,
} from "../../components/layout/DashboardLayout"

import { supabase } from "../../lib/supabase"

import { useDonationHistory } from "../../hooks/useDonationHistory"

function formatDate(value: string | null | undefined) {
  if (!value) return "To be confirmed"

  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleDateString("en-IN", {
        day: "numeric",

        month: "short",

        year: "numeric",
      })
}

function componentLabel(value: string) {
  return value.replace(/_/g, " ").toLowerCase()
}

export default function DonorHistory() {
  const { records, loading, error } = useDonationHistory()

  const [issueError, setIssueError] = useState<string | null>(null)

  const [issueNotice, setIssueNotice] = useState<string | null>(null)

  const [reportingId, setReportingId] = useState<string | null>(null)

  const reportIssue = async (donationId: string) => {
    const details = window.prompt(
      "Describe what is incorrect in this donation record.",
    )

    if (!details?.trim()) return

    setReportingId(donationId)
    setIssueError(null)
    setIssueNotice(null)
    try {
      const { error: reportError } = await supabase.rpc(
        "report_donation_record_issue",
        { p_donation_id: donationId, p_details: details.trim() },
      )
      if (reportError) {
        setIssueError(reportError.message)
      } else {
        setIssueNotice("Your report was submitted for review.")
      }
    } catch (reportError) {
      setIssueError(
        reportError instanceof Error
          ? reportError.message
          : "Unable to submit the donation-record report.",
      )
    } finally {
      setReportingId(null)
    }
  }

  const stats: Array<{
    label: string
    value: string | number
    icon: typeof Droplet
  }> = [
    { label: "Confirmed donations", value: records.length, icon: Droplet },
    {
      label: "Last donation",
      value: records[0] ? formatDate(records[0].donated_at) : "Not recorded",
      icon: CalendarDays,
    },
  ]

  return (
    <DashboardLayout>
      <PageHeader
        title="Donation History"
        subtitle="Your hospital-confirmed donation records."
      />

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          Donation history could not be loaded: {error}
        </p>
      )}
      {issueError && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          Report could not be submitted: {issueError}
        </p>
      )}
      {issueNotice && (
        <p
          role="status"
          className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          {issueNotice}
        </p>
      )}

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        {stats.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-xl border border-[#D8E3EA] bg-white p-4"
          >
            <Icon size={17} className="text-[#E51C3D]" />
            <p className="mt-3 font-display text-lg font-bold text-[#031A36]">
              {value}
            </p>
            <p className="mt-1 text-[11px] text-[#617587]">{label}</p>
          </div>
        ))}
      </div>

      <p className="mb-4 rounded-lg bg-[#F5F8FA] px-3 py-2 text-xs text-[#617587]">
        This history shows donations confirmed by the hospital.
      </p>

      <div className="rounded-2xl border border-[#D8E3EA] bg-white p-5">
        {loading ? (
          <p className="py-8 text-center text-sm text-[#617587]">
            Loading donation records…
          </p>
        ) : records.length ? (
          <div className="relative ml-2 space-y-5 border-l border-[#D8E3EA] pl-6">
            {records.map((record) => (
              <article
                key={record.donation_id}
                className="relative rounded-xl border border-[#D8E3EA] p-4"
              >
                <span className="absolute -left-[33px] top-4 flex h-4 w-4 items-center justify-center rounded-full border-4 border-white bg-[#E51C3D]" />
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-[#E51C3D]">
                      {formatDate(record.donated_at)}
                    </p>
                    <h2 className="mt-1 font-display text-base font-bold text-[#031A36]">
                      {record.hospital_name}
                    </h2>
                    <p className="mt-1 text-xs capitalize text-[#617587]">
                      {componentLabel(record.component)}
                      {record.volume_ml ? ` · ${record.volume_ml} ml` : ""}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#ECFDF3] px-2.5 py-1 text-[10px] font-bold text-[#16803C]">
                    Hospital confirmed
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-xs text-[#617587] sm:grid-cols-2">
                  <p>Request reference: {record.request_id}</p>
                  {record.volume_ml && (
                    <p>Volume recorded: {record.volume_ml} ml</p>
                  )}
                </div>
                <button
                  disabled={reportingId === record.donation_id}
                  onClick={() => void reportIssue(record.donation_id)}
                  className="mt-3 rounded-lg border border-[#D8E3EA] px-3 py-2 text-xs font-semibold text-[#062847] hover:bg-[#F5F8FA] disabled:opacity-50"
                >
                  {reportingId === record.donation_id
                    ? "Submitting…"
                    : "Report an incorrect record"}
                </button>
              </article>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-[#617587]">
            No hospital-confirmed donation records are available yet.
          </p>
        )}
      </div>
    </DashboardLayout>
  )
}
