import type { BloodRequest, RequestStatus, Urgency } from "../../data/mockData.ts"
import {
  isRequestFulfilled,
  qualifiesForFulfillment,
} from "../../lib/bloodRequestFulfillment.ts"

export type HospitalRequestFilter =
  | "All"
  | "Active"
  | "In Progress"
  | "Fulfilled"
  | "Cancelled"

export type HospitalRequestSort =
  | "createdAt"
  | "urgency"
  | "bloodGroup"
  | "status"

export const bloodGroups = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"] as const

export const urgencyOrder: Record<Urgency, number> = {
  CRITICAL: 0,
  URGENT: 1,
  NORMAL: 2,
}

export function requestStatusCategory(
  requestOrStatus: BloodRequest | RequestStatus,
): HospitalRequestFilter {
  const request =
    typeof requestOrStatus === "string" ? null : requestOrStatus
  const status = request?.status ?? (requestOrStatus as RequestStatus)
  if (status === "Fulfilled") {
    return request && qualifiesForFulfillment(request)
      ? "Fulfilled"
      : "In Progress"
  }
  if (status === "Cancelled") return status
  if (
    ["Matching", "Donors Contacted", "Donor Confirmed", "Hospital Confirmation"].includes(
      status,
    )
  ) {
    return "In Progress"
  }
  return "Active"
}

export function filterAndSortHospitalRequests(
  requests: BloodRequest[],
  filter: HospitalRequestFilter,
  search: string,
  sort: HospitalRequestSort,
  direction: "asc" | "desc",
) {
  const normalizedSearch = search.trim().toLocaleLowerCase()

  return requests
    .filter((request) => {
      const matchesFilter =
        filter === "All" || requestStatusCategory(request) === filter
      const searchable = [
        request.id,
        request.bloodGroup,
        request.component ?? "WHOLE_BLOOD",
        request.department ?? "",
        request.area,
        request.urgency,
        request.status,
        request.validDonorResponseCount ?? 0,
      ]
        .join(" ")
        .toLocaleLowerCase()

      return matchesFilter && (!normalizedSearch || searchable.includes(normalizedSearch))
    })
    .sort((left, right) => {
      let comparison = 0
      if (sort === "createdAt") {
        comparison =
          (Date.parse(left.createdAt) || 0) - (Date.parse(right.createdAt) || 0)
      } else if (sort === "urgency") {
        comparison = urgencyOrder[left.urgency] - urgencyOrder[right.urgency]
      } else {
        comparison = left[sort].localeCompare(right[sort])
      }
      if (comparison === 0) comparison = left.id.localeCompare(right.id)
      return direction === "asc" ? comparison : -comparison
    })
}

export function getDateRange(
  range: "7" | "30" | "90" | "custom",
  from: string,
  to: string,
  now = new Date(),
) {
  if (range === "custom") {
    const parsedStart = from ? new Date(`${from}T00:00:00`) : null
    const parsedEnd = to ? new Date(`${to}T23:59:59.999`) : now
    const start =
      parsedStart && !Number.isNaN(parsedStart.getTime()) ? parsedStart : null
    const end =
      !Number.isNaN(parsedEnd.getTime()) ? parsedEnd : now
    return {
      start,
      end,
      valid:
        (!from || Boolean(start)) &&
        (!to || !Number.isNaN(parsedEnd.getTime())) &&
        !(start && end < start),
    }
  }

  return {
    start: new Date(now.getTime() - Number(range) * 86400000),
    end: now,
    valid: true,
  }
}

export function requestsInDateRange(
  requests: BloodRequest[],
  range: ReturnType<typeof getDateRange>,
) {
  if (!range.valid) return []
  return requests.filter((request) => {
    const date = new Date(request.createdAt)
    return (
      !Number.isNaN(date.getTime()) &&
      (!range.start || date >= range.start) &&
      date <= range.end
    )
  })
}

export function requestStatusCounts(requests: BloodRequest[]) {
  const categories: HospitalRequestFilter[] = [
    "Active",
    "In Progress",
    "Fulfilled",
    "Cancelled",
  ]
  return categories.map((status) => ({
    status,
    count: requests.filter(
      (request) =>       requestStatusCategory(request) === status,
    ).length,
  }))
}

export function requestMetrics(requests: BloodRequest[]) {
  const fulfilled = requests.filter(isRequestFulfilled).length
  const cancelled = requests.filter((request) => request.status === "Cancelled").length
  const denominator = requests.length - cancelled
  return {
    total: requests.length,
    open: requests.length - fulfilled - cancelled,
    fulfilled,
    cancelled,
    fulfillmentRate: denominator ? Math.round((fulfilled / denominator) * 100) : 0,
  }
}

export function paginateHospitalRequests<T>(
  requests: T[],
  page: number,
  pageSize: number,
) {
  const safePageSize = Number.isFinite(pageSize) && pageSize > 0
    ? Math.floor(pageSize)
    : 10
  const pageCount = Math.ceil(requests.length / safePageSize)
  const currentPage = pageCount
    ? Math.min(Math.max(0, Math.floor(page) || 0), pageCount - 1)
    : 0
  return {
    items: requests.slice(
      currentPage * safePageSize,
      (currentPage + 1) * safePageSize,
    ),
    page: currentPage,
    pageSize: safePageSize,
    pageCount,
    total: requests.length,
  }
}
