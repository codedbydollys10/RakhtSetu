import assert from "node:assert/strict"

import { readFile } from "node:fs/promises"

import test from "node:test"

const migration = await readFile(
  new URL(
    "../supabase/ngo-coordination-workflow-migration.sql",
    import.meta.url,
  ),

  "utf8",
)

const reliabilityMigration = await readFile(
  new URL(
    "../supabase/ngo-response-save-reliability-migration.sql",

    import.meta.url,
  ),

  "utf8",
)

const requestsPage = await readFile(
  new URL("../src/pages/ngo/Requests.tsx", import.meta.url),

  "utf8",
)

const hospitalRequestsPage = await readFile(
  new URL("../src/pages/hospital/Requests.tsx", import.meta.url),

  "utf8",
)

const hospitalNotificationsPage = await readFile(
  new URL("../src/pages/hospital/Notifications.tsx", import.meta.url),

  "utf8",
)

test("stores one NGO response per request and scopes submission to assigned NGO", () => {
  assert.match(migration, /unique\s*\(request_id,\s*ngo_id\)/i)

  assert.match(
    migration,

    /where assignment\.request_id = p_request_id\s+and assignment\.ngo_id = v_ngo_id/i,
  )

  assert.match(
    migration,

    /revoke all on public\.ngo_request_responses from anon, authenticated/i,
  )
})

test("hospital contact lookup only exposes details after consent", () => {
  assert.match(
    migration,

    /case when response\.consent_to_share_contact then response\.coordinator_name end/i,
  )

  assert.match(
    migration,

    /case when response\.consent_to_share_contact then response\.coordinator_phone end/i,
  )

  assert.match(
    migration,

    /case when response\.consent_to_share_contact then response\.coordinator_email end/i,
  )
})

test("NGO unable-to-help response is separate from hospital request status", () => {
  const start = migration.indexOf(
    "create or replace function public.submit_ngo_request_response",
  )

  const end = migration.indexOf(
    "create or replace function public.get_ngo_request_contributions",
  )

  assert.notEqual(start, -1)

  assert.notEqual(end, -1)

  const submissionFunction = migration.slice(start, end)

  assert.doesNotMatch(submissionFunction, /update\s+public\.blood_requests/i)

  assert.match(submissionFunction, /'Unable to Help'/)
})

test("fulfilment requires unique donor responses and a hospital-verified donation", () => {
  assert.match(migration, /count\(distinct response\.donor_id\)::integer/i)

  assert.match(migration, /if v_response_count < 1 then/i)

  assert.match(migration, /if not v_has_verified_donation then/i)

  assert.match(
    migration,

    /donation\.confirmed_by is not null\s+and donation\.confirmed_at is not null/i,
  )
})

test("acknowledgements are persisted as copyable, never sent", () => {
  assert.match(migration, /'copyable_not_sent', 'copied'/)

  assert.match(migration, /'copyable_not_sent'\s*\)/)
})

test("fulfilment review status is reconciled when donor response counts change", () => {
  assert.match(
    migration,

    /after insert or update of status or delete on public\.donor_responses/i,
  )

  assert.match(
    migration,

    /then 'ready' else 'needs_more_valid_responses' end/i,
  )
})

test("reliability migration repairs active request assignments before NGO submissions", () => {
  assert.match(
    reliabilityMigration,

    /alter table public\.notifications\s+add column if not exists read boolean not null default false/i,
  )

  assert.match(
    reliabilityMigration,

    /insert into public\.blood_request_ngos \(request_id, ngo_id\)[\s\S]*?cross join public\.ngos ngo[\s\S]*?on conflict \(request_id, ngo_id\) do nothing/i,
  )

  assert.match(
    reliabilityMigration,

    /where request\.status in \([\s\S]*?'Donor Confirmed', 'Hospital Confirmation'/i,
  )

  assert.match(
    reliabilityMigration,

    /insert into public\.blood_request_ngos \(request_id, ngo_id\)\s+values \(p_request_id, v_ngo_id\)\s+on conflict \(request_id, ngo_id\) do nothing/i,
  )
})

test("reliability submission derives NGO identity and persists response, audit, and hospital notification", () => {
  const start = reliabilityMigration.indexOf(
    "create or replace function public.submit_ngo_request_response",
  )

  const end = reliabilityMigration.indexOf(
    "revoke all on function public.submit_ngo_request_response",
  )

  assert.notEqual(start, -1)

  assert.notEqual(end, -1)

  const submissionFunction = reliabilityMigration.slice(start, end)

  assert.match(
    submissionFunction,

    /where ngo\.user_id = v_user_id/i,
  )

  assert.match(submissionFunction, /profile\.role = 'ngo'/i)

  assert.match(submissionFunction, /for update of request/i)

  assert.match(submissionFunction, /insert into public\.ngo_request_responses/i)

  assert.match(
    submissionFunction,

    /insert into public\.ngo_request_response_audit/i,
  )

  assert.match(submissionFunction, /insert into public\.notifications/i)

  assert.match(submissionFunction, /update public\.notifications/i)

  assert.match(submissionFunction, /return v_response_id/i)
})

test("NGO response save reports structured Supabase errors and rejects an empty RPC result", () => {
  assert.match(requestsPage, /typeof details\.message === "string"/)

  assert.match(requestsPage, /typeof details\.details === "string"/)

  assert.match(requestsPage, /typeof details\.hint === "string"/)

  assert.match(
    requestsPage,

    /typeof data !== "string" \|\| !data/,
  )
})

test("fulfilled requests cannot receive NGO responses", () => {
  assert.match(
    requestsPage,

    /const isFulfilledRequest = \(status: string\) =>\s*status\.trim\(\)\.toLocaleLowerCase\(\) === "fulfilled"/,
  )

  assert.match(
    requestsPage,

    /requestActionsDisabled|responseActionsDisabled[\s\S]*isFulfilledRequest\(selectedRequest\.status\)/,
  )

  assert.match(requestsPage, /"Fulfilled"/)

  assert.match(
    requestsPage,
    /This request is fulfilled and is no longer accepting NGO\s+responses\./,
  )
})

test("hospital request list shows saved NGO counts beside donor response progress", () => {
  assert.match(
    hospitalRequestsPage,

    /supabase\.rpc\(\s*"get_hospital_ngo_response_counts"/,
  )

  assert.match(
    hospitalRequestsPage,
    /NGO: \{ngoResponseCounts\[request\.id\] \?\? 0\}/,
  )
  assert.match(hospitalRequestsPage, /DONOR:/)
  assert.match(
    hospitalRequestsPage,
    /get_hospital_ngo_responses[\s\S]*p_request_id: request\.id/,
  )
  const responseCellStart = hospitalRequestsPage.lastIndexOf(
    '<td className="px-4 py-4">',
    hospitalRequestsPage.indexOf("aria-label={`NGO:"),
  )
  const responseCellEnd = hospitalRequestsPage.indexOf(
    "</td>",
    responseCellStart,
  )
  const responseCell = hospitalRequestsPage.slice(
    responseCellStart,
    responseCellEnd,
  )
  assert.doesNotMatch(responseCell, /MINIMUM_VALID_DONOR_RESPONSES/)
  assert.doesNotMatch(responseCell, /role="progressbar"/)
  assert.doesNotMatch(responseCell, /\/ \{MINIMUM_VALID_DONOR_RESPONSES\}/)

  assert.match(
    hospitalRequestsPage,

    /Response notifications/,
  )

  assert.match(hospitalRequestsPage, /donor_response_/)

  assert.match(hospitalRequestsPage, /ngo_potential_donor_/)

  assert.match(hospitalRequestsPage, /ngo_unable_to_help_/)
})

test("hospital notifications include persisted donor and NGO response activity", () => {
  assert.match(
    reliabilityMigration,

    /create or replace function public\.get_hospital_ngo_response_counts\(\)[\s\S]*request\.hospital_id = v_hospital_id[\s\S]*group by response\.request_id/i,
  )

  assert.match(
    reliabilityMigration,

    /create or replace function public\.notify_hospital_of_donor_response\(\)[\s\S]*insert into public\.notifications[\s\S]*'donor_response_' \|\| new\.donor_id::text/i,
  )

  assert.match(
    reliabilityMigration,

    /create trigger notify_hospital_of_donor_response[\s\S]*after insert or update of status on public\.donor_responses/i,
  )

  assert.match(
    hospitalNotificationsPage,

    /function responseKind\(type: string\)[\s\S]*donor_response_[\s\S]*ngo_potential_donor_[\s\S]*ngo_unable_to_help_/,
  )

  assert.match(hospitalNotificationsPage, /View request responses/)
})
