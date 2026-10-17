import { useEffect, useMemo, useState, type FormEvent } from "react"

import { Link, useLocation } from "react-router-dom"

import { Check, Clock3, HandHeart, Search, X } from "lucide-react"

import DashboardLayout, {
  PageHeader,
} from "../../components/layout/DashboardLayout"

import { UrgencyBadge } from "../../components/ui/Badge"

import { useApp } from "../../context/AppContext"

import { supabase } from "../../lib/supabase"

type Contribution = {
  response_id: string

  request_id: string

  response_type: "potential_donor" | "unable_to_help"

  response_status: string

  potential_donor_count: number | null

  coordinator_name: string | null

  coordinator_phone: string | null

  coordinator_email: string | null

  expected_time: string | null

  coordination_note: string | null

  unable_reason: string | null

  responded_at: string
}

type FormKind = "potential_donor" | "unable_to_help"

const isFulfilledRequest = (status: string) =>
  status.trim().toLocaleLowerCase() === "fulfilled"

const isCancelledRequest = (status: string) =>
  status.trim().toLocaleLowerCase() === "cancelled"

function responseSaveErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message

  if (typeof error !== "object" || error === null) {
    return "Unable to save the response. Please try again."
  }

  const details = error as Record<string, unknown>

  const message = typeof details.message === "string" ? details.message : null

  const detail = typeof details.details === "string" ? details.details : null

  const hint = typeof details.hint === "string" ? details.hint : null

  const code = typeof details.code === "string" ? details.code : null

  const explanation = [message, detail, hint].filter(Boolean).join(" ")

  if (explanation) {
    return code ? `${explanation} (code ${code})` : explanation
  }

  return "Unable to save the response. Please try again."
}

function dateLabel(value: string) {
  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
}

function activeResponseCannotBeReplaced(contribution?: Contribution) {
  return Boolean(
    contribution &&
      !["Awaiting Hospital Coordination", "Unable to Help"].includes(
        contribution.response_status,
      ),
  )
}

export default function NGORequests() {
  const { requests, requestFeedError, roleDetails, currentUser } = useApp()

  const location = useLocation()

  const [selected, setSelected] = useState<string | null>(
    new URLSearchParams(location.search).get("request"),
  )

  const [search, setSearch] = useState("")

  const [contributions, setContributions] = useState<Contribution[]>([])

  const [loading, setLoading] = useState(true)

  const [loadingError, setLoadingError] = useState<string | null>(null)

  const [actionError, setActionError] = useState<string | null>(null)

  const [notice, setNotice] = useState<string | null>(null)

  const [formKind, setFormKind] = useState<FormKind | null>(null)

  const [saving, setSaving] = useState(false)

  const [potentialCount, setPotentialCount] = useState("1")

  const [expectedTime, setExpectedTime] = useState("")

  const [coordinationNote, setCoordinationNote] = useState("")

  const [shareContact, setShareContact] = useState(false)

  const [unableReason, setUnableReason] = useState("No available donors")

  const loadContributions = async () => {
    setLoading(true)

    setLoadingError(null)

    try {
      const { data, error } = await supabase.rpc(
        "get_ngo_request_contributions",
      )

      if (error) {
        setLoadingError(error.message)

        setContributions([])
      } else {
        setContributions((data ?? []) as Contribution[])
      }
    } catch (error: unknown) {
      setLoadingError(
        error instanceof Error
          ? error.message
          : "Unable to load saved NGO responses.",
      )

      setContributions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadContributions()
  }, [])

  useEffect(() => {
    const requestId = new URLSearchParams(location.search).get("request")

    if (requestId) setSelected(requestId)
  }, [location.search])

  const contributionByRequest = useMemo(
    () => new Map(contributions.map((item) => [item.request_id, item])),

    [contributions],
  )

  const incomingRequests = requests.filter(
    (request) => !isCancelledRequest(request.status),
  )
  const filtered = incomingRequests.filter((request) => {
    const searchText = [
      request.id,

      request.bloodGroup,

      request.component ?? "WHOLE_BLOOD",

      request.hospitalName,

      request.area,

      request.urgency,
    ]

      .join(" ")

      .toLocaleLowerCase()

    return searchText.includes(search.trim().toLocaleLowerCase())
  })

  const selectedRequest = incomingRequests.find(
    (request) => request.id === selected,
  )

  const selectedContribution = selectedRequest
    ? contributionByRequest.get(selectedRequest.id)
    : undefined

  const responseActionsDisabled =
    !selectedRequest ||
    isFulfilledRequest(selectedRequest.status) ||
    activeResponseCannotBeReplaced(selectedContribution)

  const openForm = (kind: FormKind) => {
    if (responseActionsDisabled) return

    setFormKind(kind)

    setActionError(null)

    setNotice(null)

    setPotentialCount("1")

    setExpectedTime("")

    setCoordinationNote("")

    setShareContact(false)

    setUnableReason("No available donors")
  }

  const submitResponse = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedRequest || !formKind || responseActionsDisabled) return

    const count = Number(potentialCount)

    if (
      formKind === "potential_donor" &&
      (!Number.isInteger(count) || count < 1)
    ) {
      setActionError("Enter a whole number of at least one potential donor.")

      return
    }

    if (formKind === "potential_donor" && !shareContact) {
      setActionError(
        "Consent is required to share coordinator contact details.",
      )

      return
    }

    setSaving(true)

    setActionError(null)

    try {
      const { data, error } = await supabase.rpc(
        "submit_ngo_request_response",
        {
          p_request_id: selectedRequest.id,

          p_response_type: formKind,

          p_potential_donor_count:
            formKind === "potential_donor" ? count : null,

          p_expected_time: formKind === "potential_donor" ? expectedTime : null,

          p_coordination_note:
            formKind === "potential_donor" ? coordinationNote : null,

          p_share_contact: formKind === "potential_donor" && shareContact,

          p_unable_reason: formKind === "unable_to_help" ? unableReason : null,
        },
      )

      if (error) throw error

      if (typeof data !== "string" || !data) {
        throw new Error(
          "The server did not confirm saving this response. Refresh the page and check My Contributions before retrying.",
        )
      }

      setFormKind(null)

      setNotice(
        formKind === "potential_donor"
          ? "Potential donor offer saved. The hospital can now coordinate with your NGO; this is not a confirmed donor or donation."
          : "Unable-to-help response saved for this request. The hospital request remains open for other NGOs.",
      )

      await loadContributions()
    } catch (saveError: unknown) {
      setActionError(responseSaveErrorMessage(saveError))
    } finally {
      setSaving(false)
    }
  }

  const profileContactName =
    (typeof roleDetails?.contact_person === "string" &&
      roleDetails.contact_person.trim()) ||
    currentUser?.name ||
    ""

  const profilePhone =
    typeof roleDetails?.phone === "string" ? roleDetails.phone : ""

  const profileEmail =
    typeof roleDetails?.email === "string" ? roleDetails.email : ""

  return (
    <DashboardLayout>
      <PageHeader
        title="Incoming Requests"
        subtitle="Review hospital requests assigned to your NGO and record your response."
        actions={
          <Link
            to="/ngo/contributions"
            className="rounded-lg border border-(--border) bg-(--surface) px-4 py-2.5 text-sm font-semibold text-(--text-primary)"
          >
            My Contributions
          </Link>
        }
      />
      {(requestFeedError || loadingError || actionError) && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          {requestFeedError
            ? `Requests could not be loaded: ${requestFeedError}`
            : loadingError
              ? `NGO responses could not be loaded: ${loadingError}`
              : actionError}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          {notice}
        </p>
      )}
      <label className="relative mb-5 block max-w-lg">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-muted)"
        />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search request, hospital, blood group, or area"
          className="w-full rounded-lg border border-(--border) bg-(--surface) py-2.5 pl-9 pr-3 text-sm text-(--text-primary)"
        />
      </label>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,0.9fr)]">
        <section className="space-y-3">
          {loading ? (
            <p className="rounded-xl border border-(--border) bg-(--surface) p-6 text-sm text-(--text-secondary)">
              Loading NGO responses…
            </p>
          ) : filtered.length ? (
            filtered.map((request) => {
              const contribution = contributionByRequest.get(request.id)

              return (
                <button
                  key={request.id}
                  type="button"
                  onClick={() => setSelected(request.id)}
                  className={`w-full rounded-xl border bg-(--surface) p-4 text-left transition ${
                    selected === request.id
                      ? "border-(--teal) ring-2 ring-(--teal)/20"
                      : "border-(--border) hover:border-(--teal)/60"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <UrgencyBadge urgency={request.urgency} />
                        <span className="font-mono text-xs text-(--text-muted)">
                          {request.id}
                        </span>
                      </div>
                      <h2 className="text-sm font-bold text-(--text-primary)">
                        {request.hospitalName}
                      </h2>
                      <p className="mt-1 text-sm text-(--text-secondary)">
                        {request.bloodGroup} ·{" "}
                        {(request.component ?? "WHOLE_BLOOD").replace(
                          /_/g,
                          " ",
                        )}{" "}
                        · {request.units} units
                      </p>
                      <p className="mt-1 text-xs text-(--text-secondary)">
                        {request.area ||
                          request.locationAddress ||
                          "Location not specified"}{" "}
                        · {dateLabel(request.createdAt)}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        isFulfilledRequest(request.status)
                          ? "bg-emerald-500/10 font-semibold text-emerald-700"
                          : "bg-(--surface-elevated) text-(--text-secondary)"
                      }`}
                    >
                      {isFulfilledRequest(request.status)
                        ? "Fulfilled"
                        : (contribution?.response_status ??
                          "Awaiting Response")}
                    </span>
                  </div>
                </button>
              )
            })
          ) : (
            <div className="rounded-xl border border-(--border) bg-(--surface) p-8 text-center text-sm text-(--text-secondary)">
              No assigned hospital requests match this search.
            </div>
          )}
        </section>
        <aside className="rounded-xl border border-(--border) bg-(--surface) p-5">
          {selectedRequest ? (
            <>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-base font-bold text-(--text-primary)">
                    {selectedRequest.hospitalName}
                  </h2>
                  <p className="mt-1 font-mono text-xs text-(--text-muted)">
                    {selectedRequest.id}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  aria-label="Close request details"
                  className="rounded-md p-1 text-(--text-secondary) hover:bg-(--surface-hover)"
                >
                  <X size={16} />
                </button>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="text-(--text-muted)">Blood group</dt>
                  <dd className="mt-1 font-semibold text-(--text-primary)">
                    {selectedRequest.bloodGroup}
                  </dd>
                </div>
                <div>
                  <dt className="text-(--text-muted)">Component</dt>
                  <dd className="mt-1 font-semibold text-(--text-primary)">
                    {(selectedRequest.component ?? "WHOLE_BLOOD").replace(
                      /_/g,
                      " ",
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-(--text-muted)">Units</dt>
                  <dd className="mt-1 font-semibold text-(--text-primary)">
                    {selectedRequest.units}
                  </dd>
                </div>
                <div>
                  <dt className="text-(--text-muted)">Request status</dt>
                  <dd className="mt-1 font-semibold text-(--text-primary)">
                    {isFulfilledRequest(selectedRequest.status)
                      ? "Fulfilled"
                      : selectedRequest.status}
                  </dd>
                </div>
                <div>
                  <dt className="text-(--text-muted)">Request date</dt>
                  <dd className="mt-1 font-semibold text-(--text-primary)">
                    {dateLabel(selectedRequest.createdAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-(--text-muted)">
                    Location / service area
                  </dt>
                  <dd className="mt-1 font-semibold text-(--text-primary)">
                    {selectedRequest.area ||
                      selectedRequest.locationAddress ||
                      "Not specified"}
                  </dd>
                </div>
              </dl>
              <div className="mt-5 rounded-lg border border-(--border) p-3">
                <p className="text-xs font-semibold text-(--text-primary)">
                  Your response
                </p>
                <p className="mt-1 text-xs text-(--text-secondary)">
                  {contributionByRequest.get(selectedRequest.id)
                    ?.response_status ?? "Awaiting Response"}
                </p>
                {contributionByRequest.get(selectedRequest.id)
                  ?.response_type === "potential_donor" && (
                  <p className="mt-1 text-xs text-(--text-secondary)">
                    {
                      contributionByRequest.get(selectedRequest.id)
                        ?.potential_donor_count
                    }{" "}
                    potential donor(s) identified — not a confirmed donor or
                    donation.
                  </p>
                )}
              </div>
              <div className="mt-4 grid gap-2">
                <button
                  type="button"
                  disabled={responseActionsDisabled}
                  onClick={() => openForm("potential_donor")}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-(--brand) px-3 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <HandHeart size={16} /> I Have a Potential Donor
                </button>
                <button
                  type="button"
                  disabled={responseActionsDisabled}
                  onClick={() => openForm("unable_to_help")}
                  className="rounded-lg border border-(--border) px-3 py-2.5 text-sm font-semibold text-(--text-primary) disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Unable to Help
                </button>
                {isFulfilledRequest(selectedRequest.status) ? (
                  <p className="text-xs text-(--text-muted)">
                    This request is fulfilled and is no longer accepting NGO
                    responses.
                  </p>
                ) : activeResponseCannotBeReplaced(selectedContribution) ? (
                  <p className="text-xs text-(--text-muted)">
                    This response is already being coordinated. Contact the
                    hospital to update its coordination state.
                  </p>
                ) : null}
              </div>
            </>
          ) : (
            <p className="py-8 text-center text-sm text-(--text-secondary)">
              Select a request to review its details and respond.
            </p>
          )}
        </aside>
      </div>
      {formKind && selectedRequest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving)
              setFormKind(null)
          }}
        >
          <form
            onSubmit={(event) => void submitResponse(event)}
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-(--border) bg-(--surface) p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-(--teal)">
                  {selectedRequest.id}
                </p>
                <h2 className="mt-1 font-display text-lg font-bold text-(--text-primary)">
                  {formKind === "potential_donor"
                    ? "Potential donor offer"
                    : "Unable to help"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setFormKind(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            {formKind === "potential_donor" ? (
              <div className="space-y-4">
                <label className="block text-xs font-medium text-(--text-secondary)">
                  Number of potential donors
                  <input
                    type="number"
                    required
                    min={1}
                    step={1}
                    value={potentialCount}
                    onChange={(event) => setPotentialCount(event.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-(--border) bg-(--surface-elevated) px-3 py-2.5 text-sm text-(--text-primary)"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="text-xs text-(--text-secondary)">
                    NGO coordinator
                    <input
                      readOnly
                      value={profileContactName}
                      className="mt-1.5 w-full rounded-lg border border-(--border) bg-(--surface-elevated) px-3 py-2 text-sm text-(--text-primary)"
                    />
                  </label>
                  <label className="text-xs text-(--text-secondary)">
                    Phone
                    <input
                      readOnly
                      value={profilePhone}
                      className="mt-1.5 w-full rounded-lg border border-(--border) bg-(--surface-elevated) px-3 py-2 text-sm text-(--text-primary)"
                    />
                  </label>
                  <label className="text-xs text-(--text-secondary)">
                    Email
                    <input
                      readOnly
                      value={profileEmail}
                      className="mt-1.5 w-full rounded-lg border border-(--border) bg-(--surface-elevated) px-3 py-2 text-sm text-(--text-primary)"
                    />
                  </label>
                </div>
                <label className="block text-xs font-medium text-(--text-secondary)">
                  Expected availability / coordination time
                  <input
                    required
                    value={expectedTime}
                    onChange={(event) => setExpectedTime(event.target.value)}
                    placeholder="For example, available to coordinate today after 4 PM"
                    className="mt-1.5 w-full rounded-lg border border-(--border) bg-(--surface-elevated) px-3 py-2.5 text-sm text-(--text-primary)"
                  />
                </label>
                <label className="block text-xs font-medium text-(--text-secondary)">
                  Coordination note (optional)
                  <textarea
                    rows={3}
                    value={coordinationNote}
                    onChange={(event) =>
                      setCoordinationNote(event.target.value)
                    }
                    className="mt-1.5 w-full rounded-lg border border-(--border) bg-(--surface-elevated) px-3 py-2.5 text-sm text-(--text-primary)"
                  />
                </label>
                <label className="flex items-start gap-2 rounded-lg border border-(--border) p-3 text-xs text-(--text-secondary)">
                  <input
                    type="checkbox"
                    checked={shareContact}
                    onChange={(event) => setShareContact(event.target.checked)}
                    className="mt-0.5 accent-(--teal)"
                  />
                  I explicitly consent to sharing the coordinator contact
                  details above with authorised staff at the requesting hospital
                  for this coordination.
                </label>
                <p className="flex items-start gap-2 rounded-lg bg-(--surface-elevated) p-3 text-xs text-(--text-secondary)">
                  <Clock3 size={14} className="mt-0.5 shrink-0" />
                  This records potential donors for coordination only. It does
                  not confirm a donor or record a donation.
                </p>
              </div>
            ) : (
              <label className="block text-xs font-medium text-(--text-secondary)">
                Reason
                <select
                  value={unableReason}
                  onChange={(event) => setUnableReason(event.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-(--border) bg-(--surface-elevated) px-3 py-2.5 text-sm text-(--text-primary)"
                >
                  <option>No available donors</option>
                  <option>Unavailable blood group</option>
                  <option>Outside service area</option>
                  <option>Other</option>
                </select>
              </label>
            )}
            {actionError && (
              <p
                role="alert"
                className="mt-4 rounded-lg bg-rose-50 p-3 text-xs text-rose-700"
              >
                {actionError}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setFormKind(null)}
                disabled={saving}
                className="rounded-lg border border-(--border) px-4 py-2 text-sm text-(--text-secondary)"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-(--brand) px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                <Check size={15} /> {saving ? "Saving…" : "Save response"}
              </button>
            </div>
          </form>
        </div>
      )}
    </DashboardLayout>
  )
}
