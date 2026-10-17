import assert from "node:assert/strict"
import test from "node:test"

import type { BloodRequest } from "../src/data/mockData.ts"
import {
  filterAndSortHospitalRequests,
  getDateRange,
  paginateHospitalRequests,
  requestMetrics,
  requestStatusCategory,
  requestStatusCounts,
  requestsInDateRange,
} from "../src/pages/hospital/hospitalAnalytics.ts"

const request = (
  id: string,
  status: BloodRequest["status"],
  overrides: Partial<BloodRequest> = {},
): BloodRequest => ({
  id,
  hospitalId: "hospital-1",
  hospitalName: "Demo Hospital",
  bloodGroup: "B+",
  component: "WHOLE_BLOOD",
  units: 1,
  urgency: "URGENT",
  status,
  createdAt: "2026-10-10T12:00:00.000Z",
  area: "Andheri",
  ...overrides,
})

test("classifies canonical request statuses consistently", () => {
  assert.equal(requestStatusCategory("Matching"), "In Progress")
  assert.equal(requestStatusCategory("Fulfilled"), "In Progress")
  assert.equal(requestStatusCategory("Cancelled"), "Cancelled")
  assert.equal(requestStatusCategory("Created"), "Active")
})

test("combines status filtering, case-insensitive search, and stable sorting", () => {
  const requests = [
    request("b", "Matching", { urgency: "NORMAL", department: "ICU" }),
    request("a", "Donors Contacted", { urgency: "CRITICAL", department: "ICU" }),
    request("c", "Fulfilled", {
      department: "Ward",
      validDonorResponseCount: 10,
      verifiedDonationCount: 1,
      donationCompletedAndVerified: true,
    }),
  ]

  const filtered = filterAndSortHospitalRequests(
    requests,
    "In Progress",
    "icu",
    "urgency",
    "asc",
  )
  assert.deepEqual(filtered.map(({ id }) => id), ["a", "b"])
})

test("uses inclusive custom date boundaries and rejects reversed ranges", () => {
  const range = getDateRange("custom", "2026-10-10", "2026-10-10")
  const requests = [
    request("before", "Matching", {
      createdAt: new Date(range.start!.getTime() - 1).toISOString(),
    }),
    request("inside", "Matching", { createdAt: range.start!.toISOString() }),
    request("after", "Matching", {
      createdAt: new Date(range.end.getTime() + 1).toISOString(),
    }),
  ]

  assert.deepEqual(
    requestsInDateRange(requests, range).map(({ id }) => id),
    ["inside"],
  )
  assert.equal(getDateRange("custom", "2026-10-11", "2026-10-10").valid, false)
  assert.equal(getDateRange("custom", "not-a-date", "").valid, false)
})

test("status distributions include zero-count categories", () => {
  assert.deepEqual(requestStatusCounts([request("a", "Matching")]), [
    { status: "Active", count: 0 },
    { status: "In Progress", count: 1 },
    { status: "Fulfilled", count: 0 },
    { status: "Cancelled", count: 0 },
  ])
})

test("paginates sorted requests and clamps pages when the result set shrinks", () => {
  const requests = Array.from({ length: 21 }, (_, index) =>
    request(`req-${index}`, "Matching"),
  )
  assert.deepEqual(paginateHospitalRequests(requests, 1, 10).items, requests.slice(10, 20))
  assert.equal(paginateHospitalRequests(requests.slice(0, 3), 8, 10).page, 0)
  assert.equal(paginateHospitalRequests([], 8, 10).pageCount, 0)
})

test("calculates open requests and fulfillment rate without cancelled requests", () => {
  const metrics = requestMetrics([
    request("active", "Created"),
    request("progress", "Matching"),
    request("fulfilled", "Fulfilled", {
      validDonorResponseCount: 10,
      verifiedDonationCount: 1,
      donationCompletedAndVerified: true,
    }),
    request("cancelled", "Cancelled"),
  ])
  assert.deepEqual(metrics, {
    total: 4,
    open: 2,
    fulfilled: 1,
    cancelled: 1,
    fulfillmentRate: 33,
  })
})
