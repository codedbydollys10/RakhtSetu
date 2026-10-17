import { useEffect, useState } from "react"

import { motion } from "framer-motion"

import { AlertCircle, CheckCircle, MapPin } from "lucide-react"

import DashboardLayout, {
  PageHeader,
} from "../../components/layout/DashboardLayout"

import { UrgencyBadge } from "../../components/ui/Badge"

import { useApp } from "../../context/AppContext"

import { supabase } from "../../lib/supabase"

type DonorMatch = {
  donor_id: string

  blood_group: string

  city: string | null

  notified: boolean

  response_status: string | null
}

export default function NGOMatching() {
  const { requests, requestFeedError } = useApp()

  const [selectedReq, setSelectedReq] = useState<string | null>(null)

  const [matches, setMatches] = useState<DonorMatch[]>([])

  const [loading, setLoading] = useState(false)

  const [error, setError] = useState<string | null>(null)

  const matchableRequests = requests.filter((request) =>
    [
      "Verification Pending",
      "Verified",

      "Matching",

      "Donors Contacted",

      "Donor Confirmed",

      "Hospital Confirmation",
    ].includes(request.status),
  )

  useEffect(() => {
    if (!selectedReq) {
      setMatches([])

      setError(null)

      return
    }

    let active = true

    setLoading(true)

    setError(null)

    void supabase

      .rpc("get_ngo_donor_matches", { p_request_id: selectedReq })

      .then(
        ({ data, error: matchError }) => {
          if (!active) return

          if (matchError) {
            setError(matchError.message)

            setMatches([])
          } else {
            setMatches((data ?? []) as DonorMatch[])
          }

          setLoading(false)
        },

        (matchError: unknown) => {
          if (!active) return

          setError(
            matchError instanceof Error
              ? matchError.message
              : "Donor matches could not be loaded.",
          )

          setMatches([])

          setLoading(false)
        },
      )

    return () => {
      active = false
    }
  }, [selectedReq])

  return (
    <DashboardLayout>
      <PageHeader
        title="Donor Matching"
        subtitle="Eligible donors are matched automatically for active requests."
      />

      {(requestFeedError || error) && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          {requestFeedError
            ? `Requests could not be loaded: ${requestFeedError}`
            : `Donor matches could not be loaded: ${error}`}
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-[#021734]">
            Select a request
          </h2>
          <div className="space-y-2">
            {matchableRequests.length === 0 ? (
              <div className="rounded-xl border border-[#C0D2DE]/60 bg-white p-8 text-center">
                <p className="text-sm text-[#021734]/50">
                  No active requests are available to match.
                </p>
              </div>
            ) : (
              matchableRequests.map((request) => (
                <button
                  key={request.id}
                  onClick={() =>
                    setSelectedReq(
                      request.id === selectedReq ? null : request.id,
                    )
                  }
                  className={`w-full rounded-xl border bg-white p-4 text-left transition-all ${
                    selectedReq === request.id
                      ? "border-[#036D7D] ring-2 ring-[#036D7D]/30"
                      : "border-[#C0D2DE]/60 hover:border-[#036D7D]/40"
                  }`}
                >
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <UrgencyBadge urgency={request.urgency} />
                    <span className="font-mono text-xs text-[#021734]/40">
                      {request.id}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-[#021734]">
                    {request.bloodGroup} · {request.units} units
                  </p>
                  <p className="text-xs text-[#021734]/50">
                    {request.hospitalName} · {request.area}
                  </p>
                </button>
              ))
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-[#021734]">
            {selectedReq
              ? `Eligible donors (${matches.length})`
              : "Select a request to see eligible donors"}
          </h2>
          {!selectedReq ? (
            <div className="rounded-xl border border-[#C0D2DE]/60 bg-white p-6 text-center text-xs text-[#021734]/40">
              Donors are matched using blood-group compatibility, availability,
              consent, recovery eligibility, and approximate distance.
            </div>
          ) : loading ? (
            <div className="rounded-xl border border-[#C0D2DE]/60 bg-white p-6 text-sm text-[#021734]/50">
              Loading eligible donor matches…
            </div>
          ) : matches.length === 0 ? (
            <div className="rounded-xl border border-[#C0D2DE]/60 bg-white p-6 text-center">
              <AlertCircle size={24} className="mx-auto mb-2 text-[#C0D2DE]" />
              <p className="text-sm text-[#021734]/50">
                No currently eligible donors match this request.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs italic text-[#021734]/60">
                Matching is for coordination only, not medical eligibility.
                Donor names, contact details, and precise locations are not
                shared.
              </p>
              {matches.map((match, index) => (
                <motion.article
                  key={match.donor_id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="rounded-xl border border-[#C0D2DE]/60 bg-white p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EAF0F5] text-[#062847]">
                      <CheckCircle size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#021734]">
                        Eligible donor
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[#021734]/50">
                        <span className="font-mono text-[#036D7D]">
                          {match.blood_group}
                        </span>
                        {match.city && (
                          <span className="flex items-center gap-1">
                            <MapPin size={10} />
                            {match.city}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
                      {match.response_status ??
                        (match.notified ? "Notified" : "Matched")}
                    </span>
                  </div>
                </motion.article>
              ))}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  )
}
