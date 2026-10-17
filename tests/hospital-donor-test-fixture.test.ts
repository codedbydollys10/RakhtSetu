import assert from "node:assert/strict"

import { readFile } from "node:fs/promises"

import test from "node:test"

const seed = await readFile(
  new URL(
    "../supabase/seed_hospital_donor_test_data.sql",

    import.meta.url,
  ),

  "utf8",
)

const integration = await readFile(
  new URL(
    "../supabase/tests/hospital_donor_network.integration.sql",

    import.meta.url,
  ),

  "utf8",
)

const provisioner = await readFile(
  new URL(
    "../scripts/provision-hospital-donor-test-users.mjs",

    import.meta.url,
  ),

  "utf8",
)

const networkMigration = await readFile(
  new URL("../supabase/hospital-network-migration.sql", import.meta.url),

  "utf8",
)

const directoryMap = await readFile(
  new URL(
    "../src/components/hospital/HospitalDirectoryMap.tsx",

    import.meta.url,
  ),

  "utf8",
)

const requestMatchingMigration = await readFile(
  new URL(
    "../supabase/donor-request-geographic-matching-migration.sql",

    import.meta.url,
  ),

  "utf8",
)
const responseContactMigration = await readFile(
  new URL("../supabase/donor-response-contact-migration.sql", import.meta.url),
  "utf8",
)
const donorRequestsPage = await readFile(
  new URL("../src/pages/donor/Requests.tsx", import.meta.url),
  "utf8",
)
const donorDashboardPage = await readFile(
  new URL("../src/pages/donor/Dashboard.tsx", import.meta.url),
  "utf8",
)
const donorHistoryPage = await readFile(
  new URL("../src/pages/donor/History.tsx", import.meta.url),
  "utf8",
)
const hospitalRequestsPage = await readFile(
  new URL("../src/pages/hospital/Requests.tsx", import.meta.url),
  "utf8",
)
const hospitalDashboardPage = await readFile(
  new URL("../src/pages/hospital/Dashboard.tsx", import.meta.url),
  "utf8",
)

function valueRows(sql: string, tableName: string) {
  const match = sql.match(
    new RegExp(`insert into ${tableName} values([\\s\\S]*?);`, "i"),
  )

  assert.ok(match, `Missing VALUES rows for ${tableName}`)

  return [...match[1].matchAll(/^\s*\(\d+,/gm)]
}

test("fixture defines exactly 12 hospitals and 20 donors across the MMR", () => {
  assert.equal(valueRows(seed, "hospital_donor_test_hospitals").length, 12)

  assert.equal(valueRows(seed, "hospital_donor_test_donors").length, 20)

  for (const locality of [
    "Andheri East",

    "Andheri West",

    "Bandra",

    "Borivali",

    "Dadar",

    "Kurla",

    "Ghatkopar",

    "Powai",

    "Mulund",

    "Thane",

    "Vashi",

    "Nerul",
  ]) {
    assert.ok(seed.includes(`'${locality}'`), `Missing ${locality}`)
  }
})

test("donor fixture covers all blood groups with a varied distribution", () => {
  const rows = seed.match(
    /insert into hospital_donor_test_donors values([\s\S]*?);/i,
  )?.[1]

  assert.ok(rows)

  const distribution = new Map<string, number>()

  for (const [, group] of rows.matchAll(
    /^\s*\(\d+,\s*'(O\+|O-|A\+|A-|B\+|B-|AB\+|AB-)'/gm,
  )) {
    distribution.set(group, (distribution.get(group) ?? 0) + 1)
  }

  assert.deepEqual(Object.fromEntries(distribution), {
    "O+": 4,

    "O-": 3,

    "A+": 3,

    "A-": 2,

    "B+": 3,

    "B-": 2,

    "AB+": 2,

    "AB-": 1,
  })
})

test("hospital donor response overview uses saved response counts and dark theme surfaces", () => {
  const start = hospitalDashboardPage.indexOf("Donor Response Overview")
  const end = hospitalDashboardPage.indexOf(
    "Donor responses and contact",
    start,
  )
  assert.notEqual(start, -1)
  assert.notEqual(end, -1)
  const overview = hospitalDashboardPage.slice(start, end)

  assert.match(
    hospitalDashboardPage,
    /const coordinationRequests = hospitalRequests\.filter\([\s\S]*request\.status !== "Cancelled"/,
  )
  assert.match(
    hospitalDashboardPage,
    /const responded = coordinationResponses\.length/,
  )
  assert.match(
    hospitalDashboardPage,
    /const confirmed = coordinationResponses\.filter/,
  )
  assert.match(
    hospitalDashboardPage,
    /Math\.round\(\(respondedRequests \/ coordinationRequests\.length\) \* 100\)/,
  )
  assert.match(
    hospitalDashboardPage,
    /Response activity across all non-cancelled blood requests\./,
  )
  assert.match(hospitalDashboardPage, /label: "Matched donors"/)
  assert.match(overview, /bg-\[#0B141C\]/)
  assert.match(overview, /#253540/)
  assert.doesNotMatch(overview, /bg-white|#F1F5F9|bg-slate-50|text-\[#102A43\]/)
})

test("seed is fixture-scoped, repeatable, and avoids fabricated requests or donations", () => {
  assert.match(seed, /\bbegin;/i)

  assert.match(seed, /\bcommit;/i)

  assert.match(seed, /network_test_fixture/)

  assert.match(seed, /example\.invalid/)

  assert.match(seed, /verified\s*=\s*false/i)

  assert.match(seed, /not exists\s*\([\s\S]*?SYNTHETIC_NETWORK_TEST/i)

  assert.match(seed, /no unrelated hospitals, donors, NGOs, or blood requests/i)

  assert.match(
    seed,

    /city = case[\s\S]*hospital_fixture\.city[\s\S]*donor_fixture\.city/i,
  )

  assert.doesNotMatch(seed, /insert\s+into\s+(?:public\.)?blood_requests/i)

  assert.doesNotMatch(seed, /insert\s+into\s+(?:public\.)?notifications/i)

  assert.doesNotMatch(seed, /insert\s+into\s+(?:public\.)?donation_records/i)

  assert.doesNotMatch(seed, /insert\s+into\s+auth\.users/i)

  assert.doesNotMatch(seed, /\bdelete\s+from\b/i)
})

test("provisioning is exact-host allowlisted and refuses unmarked account reuse", () => {
  assert.match(provisioner, /I_UNDERSTAND_HOSPITAL_DONOR_TEST_ONLY/)

  assert.match(provisioner, /HOSPITAL_DONOR_TEST_ALLOWED_PROJECT_HOST/)

  assert.match(provisioner, /SUPABASE_SERVICE_ROLE_KEY/)

  assert.match(provisioner, /network_test_fixture !== true/)

  assert.match(
    provisioner,
    /existing\.user_metadata\?\.network_test_id !== fixtureId/,
  )

  assert.match(provisioner, /createUser/)

  assert.doesNotMatch(
    provisioner,
    /deleteUser|updateUserById|process\.env\.VITE_/,
  )

  assert.equal((provisioner.match(/length: 12/g) ?? []).length, 1)

  assert.equal((provisioner.match(/length: 20/g) ?? []).length, 1)
})

test("SQL integration exercises matching, notifications, responses, radius, and RLS", () => {
  for (const expected of [
    "donor-01",

    "donor-02",

    "donor-03",

    "donor-05",

    "donor-08",

    "donor-12",

    "donor-13",

    "donor-15",

    "donor-19",
  ]) {
    assert.ok(integration.includes(expected), `Missing expected ${expected}`)
  }

  assert.match(integration, /public\.is_eligible_blood_request/)

  assert.match(integration, /public\.respond_to_blood_request/)

  assert.match(integration, /public\.get_eligible_blood_requests/)

  assert.match(integration, /public\.hospital_network_directory/)

  assert.match(integration, /public\.hospital_nearby_network/)

  assert.match(integration, /set local role authenticated/i)

  assert.match(integration, /Another hospital can read a private request/)

  assert.match(integration, /A donor can read another donor role record/)

  assert.match(integration, /\brollback;/i)
})

test("network directory redacts contact data and map markers bind to hospital details", () => {
  assert.match(networkMigration, /null::text as phone/)

  assert.match(networkMigration, /null::text as email/)

  assert.match(integration, /contact details/)

  assert.match(networkMigration, /where located\.distance <= search_radius_km/)

  assert.match(directoryMap, /layer\.clearLayers\(\)/)

  assert.match(
    directoryMap,

    /marker\.on\("click", \(\) => onSelectHospital\(hospital\.hospital_id\)\)/,
  )

  assert.match(directoryMap, /hospitals\.length > 0/)

  assert.match(
    directoryMap,

    /hospitalLocation\.latitude, hospitalLocation\.longitude/,
  )
})

test("whole-blood matching retains exact group rules and recovery exclusion", () => {
  assert.match(requestMatchingMigration, /r\.component = 'WHOLE_BLOOD'/)

  assert.match(
    requestMatchingMigration,

    /upper\(trim\(r\.blood_group\)\) = upper\(trim\(d\.blood_group\)\)/,
  )

  assert.match(
    requestMatchingMigration,

    /not public\.is_donor_recovery_restricted\(d\.id\)/,
  )
})

test("phone is required for donor responses and contact lookup is hospital-scoped", () => {
  assert.match(
    responseContactMigration,
    /valid phone number to your donor profile before responding/,
  )
  assert.match(responseContactMigration, /confirm_hospital_donor_response/)
  assert.match(responseContactMigration, /get_hospital_donor_responses/)
  assert.match(responseContactMigration, /request\.hospital_id = v_hospital_id/)
  assert.match(responseContactMigration, /donor_phone text/)
  assert.match(responseContactMigration, /donor_blood_group text/)
  assert.match(responseContactMigration, /donor_city text/)
  assert.match(responseContactMigration, /donor_area text/)
  assert.match(responseContactMigration, /response\.status <> 'Cancelled'/)
  assert.doesNotMatch(
    responseContactMigration,
    /donor\.(?:approximate_latitude|approximate_longitude|emergency_contact|aadhaar|email)/i,
  )
  assert.match(
    responseContactMigration,
    /revoke insert, delete on public\.donor_responses/i,
  )
  assert.match(
    integration,
    /donation acknowledgement did not update donor history/,
  )
  assert.match(
    integration,
    /A donor response alone must not create donation history/,
  )
  assert.match(integration, /other hospital contact lookup to be rejected/)
})

test("donor is informed of shared contact fields and hospital surfaces responses", () => {
  assert.match(
    donorRequestsPage,
    /name,\s*phone number,\s*blood\s+group,\s*city,[\s\S]*area/i,
  )
  assert.match(
    donorRequestsPage,
    /exact coordinates, emergency[\s\S]*not shared/i,
  )
  assert.match(donorRequestsPage, /Add a phone number to your donor profile/)
  assert.match(donorRequestsPage, /disabled={!donorPhone}/)
  assert.doesNotMatch(
    `${donorRequestsPage}\n${donorDashboardPage}\n${donorHistoryPage}`,
    /Recovery Mode|recoveryRestricted|useDonationRecovery|Potential next eligibility/,
  )
  assert.match(hospitalRequestsPage, /Acknowledge response/)
  assert.match(hospitalRequestsPage, /Acknowledge donation/)
  assert.match(
    hospitalRequestsPage,
    /href=\{`tel:\$\{candidate\.donor_phone\}`\}/,
  )
  assert.match(hospitalDashboardPage, /Donor responses and contact/)
  assert.match(hospitalDashboardPage, /get_hospital_donor_responses/)
})
