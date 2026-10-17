import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

import type { BloodRequest } from "../src/data/mockData.ts"
import {
  countValidUniqueDonorResponses,
  isRequestFulfilled,
  qualifiesForFulfillment,
} from "../src/lib/bloodRequestFulfillment.ts"
import {
  requestMetrics,
  requestStatusCategory,
  requestStatusCounts,
} from "../src/pages/hospital/hospitalAnalytics.ts"

const request = (
  overrides: Partial<BloodRequest> = {},
): BloodRequest => ({
  id: "request-1",
  hospitalId: "hospital-1",
  hospitalName: "Test Hospital",
  bloodGroup: "B+",
  component: "WHOLE_BLOOD",
  units: 1,
  urgency: "URGENT",
  status: "Matching",
  createdAt: "2026-10-17T10:00:00.000Z",
  area: "Test area",
  validDonorResponseCount: 0,
  verifiedDonationCount: 0,
  donationCompletedAndVerified: false,
  fulfillmentQualified: undefined,
  ...overrides,
})

const donorResponses = (
  count: number,
  status = "Response Sent",
) =>
  Array.from({ length: count }, (_, index) => ({
    donor_id: `donor-${index + 1}`,
    response_status: status,
  }))

test("one valid response without a completed donation does not fulfil", () => {
  const item = request({ validDonorResponseCount: 1 })
  assert.equal(qualifiesForFulfillment(item), false)
  assert.equal(isRequestFulfilled({ ...item, status: "Fulfilled" }), false)
})

test("a completed donation without a valid response remains open and reviewable", () => {
  const item = request({
    verifiedDonationCount: 1,
    donationCompletedAndVerified: true,
    fulfillmentReviewRequired: true,
  })
  assert.equal(qualifiesForFulfillment(item), false)
  assert.equal(isRequestFulfilled({ ...item, status: "Fulfilled" }), false)
  assert.equal(item.fulfillmentReviewRequired, true)
})

test("one valid response and verified donation fulfil only after status is set", () => {
  const item = request({
    validDonorResponseCount: 1,
    verifiedDonationCount: 1,
    donationCompletedAndVerified: true,
    status: "Fulfilled",
  })
  assert.equal(qualifiesForFulfillment(item), true)
  assert.equal(isRequestFulfilled(item), true)
  assert.equal(
    isRequestFulfilled({ ...item, status: "Matching" }),
    false,
  )
})

test("all requested units must have distinct verified donation records", () => {
  const item = request({
    units: 3,
    validDonorResponseCount: 1,
    verifiedDonationCount: 2,
    donationCompletedAndVerified: false,
  })
  assert.equal(qualifiesForFulfillment(item), false)
  assert.equal(
    qualifiesForFulfillment({
      ...item,
      verifiedDonationCount: 3,
      donationCompletedAndVerified: true,
    }),
    true,
  )
})

test("duplicate donor rows do not increase the valid response total", () => {
  const repeated = [
    ...donorResponses(1),
    { donor_id: "donor-1", response_status: "Hospital Confirmed" },
    { donor_id: "donor-2", response_status: "Cancelled" },
  ]
  assert.equal(countValidUniqueDonorResponses(repeated), 1)
})

test("only valid persisted response states count", () => {
  assert.equal(countValidUniqueDonorResponses([
    ...donorResponses(1, "Response Sent"),
    ...donorResponses(1, "Hospital Confirmed").map((row) => ({
      ...row,
      donor_id: "donor-2",
    })),
    { donor_id: "donor-3", response_status: "Cancelled" },
    { donor_id: "donor-4", response_status: "Matched" },
  ]), 2)
})

test("dashboard metrics and report distributions share the qualification rule", () => {
  const invalidLegacy = request({
    id: "legacy",
    status: "Fulfilled",
    validDonorResponseCount: 1,
    verifiedDonationCount: 0,
  })
  const valid = request({
    id: "qualified",
    status: "Fulfilled",
    validDonorResponseCount: 1,
    verifiedDonationCount: 1,
    donationCompletedAndVerified: true,
  })
  assert.equal(requestStatusCategory(invalidLegacy), "In Progress")
  assert.equal(requestStatusCategory(valid), "Fulfilled")
  assert.equal(requestMetrics([invalidLegacy, valid]).fulfilled, 1)
  assert.deepEqual(
    requestStatusCounts([invalidLegacy, valid]).find(
      (entry) => entry.status === "Fulfilled",
    ),
    { status: "Fulfilled", count: 1 },
  )
})

test("backend status API and trigger enforce the shared fulfilment rule", async () => {
  const migration = await readFile(
    new URL(
      "../supabase/fulfillment-business-rule-migration.sql",
      import.meta.url,
    ),
    "utf8",
  )
  assert.match(migration, /count\(distinct response\.donor_id\)::integer/i)
  assert.match(migration, /response\.status in \([\s\S]*'Response Sent'[\s\S]*'Completed'/i)
  assert.match(migration, /coalesce\(response_count\.total, 0\) >= 1/i)
  assert.match(migration, /coalesce\(donation_summary\.total, 0\) >= coalesce\(request_row\.units, 1\)/i)
  assert.match(migration, /if not coalesce\(v_state\.fulfillment_qualified, false\) then/i)
  assert.match(migration, /public\.update_hospital_blood_request_status/i)
  assert.match(migration, /public\.guard_hospital_request_fulfillment/i)
  assert.doesNotMatch(
    migration,
    /update\s+public\.blood_requests\s+set\s+status\s*=\s*'Fulfilled'/i,
  )
  const appContext = await readFile(
    new URL("../src/context/AppContext.tsx", import.meta.url),
    "utf8",
  )
  const mutationStart = appContext.indexOf("const updateHospitalRequest = async")
  const mutationEnd = appContext.indexOf(
    "const updateHospitalRequestDetails",
    mutationStart,
  )
  const mutation = appContext.slice(mutationStart, mutationEnd)
  assert.match(mutation, /rpc\(\s*"update_hospital_blood_request_status"/)
  assert.doesNotMatch(mutation, /\.from\("blood_requests"\)[\s\S]*\.update\(/)
})

test("incremental migration applies the one-donor threshold to server guards and reviews", async () => {
  const migration = await readFile(
    new URL(
      "../supabase/fulfillment-single-donor-rule-migration.sql",
      import.meta.url,
    ),
    "utf8",
  )
  assert.match(migration, /coalesce\(response_count\.total, 0\) >= 1/i)
  assert.match(migration, /public\.update_hospital_blood_request_status/i)
  assert.match(migration, /public\.guard_hospital_request_fulfillment/i)
  assert.match(migration, /valid_unique_response_count < 1/i)
  assert.match(migration, /coalesce\(donation_summary\.total, 0\) >= coalesce\(request_row\.units, 1\)/i)
  assert.doesNotMatch(migration, /coalesce\(response_count\.total, 0\) >= 10/i)
})

test("completed donor responses never set the request to fulfilled automatically", async () => {
  const migration = await readFile(
    new URL(
      "../supabase/fulfillment-business-rule-migration.sql",
      import.meta.url,
    ),
    "utf8",
  )
  const start = migration.indexOf(
    "create or replace function public.sync_blood_request_from_donor_response",
  )
  const end = migration.indexOf(
    "create or replace function public.flag_donation_below_response_threshold",
    start,
  )
  assert.notEqual(start, -1)
  assert.notEqual(end, -1)
  const syncFunction = migration.slice(start, end)
  assert.match(syncFunction, /if new\.status = 'Completed' then\s+return new;/i)
  assert.doesNotMatch(syncFunction, /when 'Completed' then 'Fulfilled'/i)
  assert.doesNotMatch(syncFunction, /fulfilled_at\s*=\s*now\(\)/i)
})

test("hospital-only donation recording and request ownership are server-checked", async () => {
  const migration = await readFile(
    new URL(
      "../supabase/fulfillment-business-rule-migration.sql",
      import.meta.url,
    ),
    "utf8",
  )
  const donationMigration = await readFile(
    new URL("../supabase/donation-recovery-migration.sql", import.meta.url),
    "utf8",
  )
  assert.match(migration, /profile\.role = 'hospital'[\s\S]*hospital\.user_id = auth\.uid\(\)/i)
  assert.match(migration, /request\.hospital_id = v_hospital_id/i)
  assert.match(donationMigration, /where r\.id = p_request_id and h\.user_id = auth\.uid\(\)/i)
  assert.match(donationMigration, /confirmed_by, rule_id,[\s\S]*confirmed_at/i)
})

test("hospital fulfil action activates after one valid response and all donations are verified", async () => {
  const requestsPage = await readFile(
    new URL("../src/pages/hospital/Requests.tsx", import.meta.url),
    "utf8",
  )
  assert.match(
    requestsPage,
    /const fulfillmentReady =\s*selectedValidResponseCount >= MINIMUM_VALID_DONOR_RESPONSES[\s\S]*selectedVerifiedDonationCount >= \(selectedRequest\?\.units \?\? 0\)/,
  )
  assert.match(
    requestsPage,
    /disabled=\{!fulfillmentReady \|\| donationCandidatesLoading\}/,
  )
  assert.match(requestsPage, /This action activates automatically when both requirements/)
  assert.match(requestsPage, /setInterval\(refreshCandidates, 30000\)/)
  assert.match(requestsPage, /await updateHospitalRequest\(request\.id, "Fulfilled"\)/)
})

test("hospital reports use the app's dark card surface and refresh saved metrics", async () => {
  const reportsPage = await readFile(
    new URL("../src/pages/hospital/Reports.tsx", import.meta.url),
    "utf8",
  )
  const coordinationMigration = await readFile(
    new URL(
      "../supabase/hospital-coordination-report-migration.sql",
      import.meta.url,
    ),
    "utf8",
  )
  assert.match(reportsPage, /surface: "#101B23"/)
  assert.match(reportsPage, /requests\.filter\(\(request\) => request\.hospitalId === hospitalRecordId\)/)
  assert.match(reportsPage, /get_hospital_donor_responses/)
  assert.match(reportsPage, /get_hospital_ngo_coordination_summary/)
  assert.match(reportsPage, /Donor responses/)
  assert.match(reportsPage, /Combined coordination stages/)
  assert.match(reportsPage, /setInterval\(\(\) => void loadSummary\(\), 30000\)/)
  assert.match(reportsPage, /hospitalRequestsError/)
  assert.match(reportsPage, /high: "#E51C3D"/)
  assert.match(coordinationMigration, /from public\.ngo_request_responses/)
  assert.match(coordinationMigration, /from public\.donor_responses/)
  assert.match(coordinationMigration, /where status = 'Response Sent'/)
  assert.match(coordinationMigration, /status = 'Completed' and donation_verified/)
  assert.match(coordinationMigration, /donation\.confirmed_by is not null/)
})

test("legacy fulfilled rows are audited and reopened without fabricated donation records", async () => {
  const migration = await readFile(
    new URL(
      "../supabase/fulfillment-business-rule-migration.sql",
      import.meta.url,
    ),
    "utf8",
  )
  assert.match(migration, /blood_request_fulfillment_audit/i)
  assert.match(migration, /set status = 'Donors Contacted',\s+fulfilled_at = null/i)
  assert.match(migration, /verified_donation_count,\s+required_units,\s+reason/i)
  assert.doesNotMatch(migration, /insert into public\.donation_records/i)
})
