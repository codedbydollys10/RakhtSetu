import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const migration = await readFile(
  new URL(
    "../supabase/donor-request-geographic-matching-migration.sql",
    import.meta.url,
  ),
  "utf8",
)
const distributionMigration = await readFile(
  new URL("../supabase/request-distribution-migration.sql", import.meta.url),
  "utf8",
)
const profileMigration = await readFile(
  new URL("../supabase/donor-profile-migration.sql", import.meta.url),
  "utf8",
)
const appContext = await readFile(
  new URL("../src/context/AppContext.tsx", import.meta.url),
  "utf8",
)
const donorDashboard = await readFile(
  new URL("../src/pages/donor/Dashboard.tsx", import.meta.url),
  "utf8",
)
const donorAvailabilityPage = await readFile(
  new URL("../src/pages/donor/Availability.tsx", import.meta.url),
  "utf8",
)
const locationFixMigration = await readFile(
  new URL(
    "../supabase/donor-request-location-matching-fix.sql",
    import.meta.url,
  ),
  "utf8",
)
const eligibilityReconciliationMigration = await readFile(
  new URL(
    "../supabase/donor-request-eligibility-reconciliation-migration.sql",
    import.meta.url,
  ),
  "utf8",
)
const donorPortalContext = await readFile(
  new URL("../src/context/DonorPortalContext.tsx", import.meta.url),
  "utf8",
)

test("donor eligibility uses request and donor coordinates within both radius limits", () => {
  assert.match(migration, /r\.latitude is not null/)
  assert.match(migration, /d\.approximate_latitude is not null/)
  assert.match(migration, /coalesce\(r\.search_radius_km, 25\)/)
  assert.match(migration, /coalesce\(d\.radius_km, d\.radius, r\.search_radius_km, 25\)/)
})

test("city matching is retained when a hospital or donor has no coordinates", () => {
  assert.match(migration, /r\.latitude is null/)
  assert.match(migration, /lower\(regexp_replace\(/)
  assert.match(migration, /split_part\(trim\(d\.city\), ',', 1\)/)
})

test("request inbox notifications are reconciled against the final eligibility rule", () => {
  assert.match(migration, /delete from public\.notifications notification/)
  assert.match(migration, /not public\.is_eligible_blood_request\(/)
  assert.match(migration, /insert into public\.notifications \(user_id, request_id, type, title, body\)/)
  assert.match(migration, /as eligible_donors/)
  assert.match(migration, /as notified_eligible_donors/)
})

test("hospital request insertion notifies eligible donors and feeds the donor inbox", () => {
  assert.match(
    distributionMigration,
    /create or replace function public\.notify_eligible_donors_on_request\(\)/,
  )
  assert.match(
    distributionMigration,
    /insert into public\.notifications \(user_id, request_id, type, title, body\)[\s\S]*?public\.is_eligible_blood_request\(new\.id, d\.id\)/,
  )
  assert.match(
    distributionMigration,
    /create or replace function public\.get_eligible_blood_requests\(\)[\s\S]*?where public\.is_eligible_blood_request\(r\.id, v_donor_id\)/,
  )
})

test("donor profile saves persist matching fields and account details together", () => {
  assert.match(profileMigration, /create or replace function public\.update_donor_profile\(/)
  assert.match(profileMigration, /update public\.donors[\s\S]*?blood_group = p_blood_group/)
  assert.match(profileMigration, /approximate_latitude = case/)
  assert.match(profileMigration, /update public\.profiles[\s\S]*?full_name = trim\(p_full_name\)/)
  assert.match(profileMigration, /grant execute on function public\.update_donor_profile\(/)
})

test("donor eligibility matches the request area as well as the hospital city", () => {
  assert.match(locationFixMigration, /values \(r\.area\), \(h\.city\)/)
  assert.match(locationFixMigration, /values \(d\.area\), \(d\.city\)/)
  assert.match(locationFixMigration, /upper\(trim\(r\.blood_group\)\) = upper\(trim\(d\.blood_group\)\)/)
  assert.match(locationFixMigration, /and d\.available/)
  assert.match(locationFixMigration, /and d\.consent/)
  assert.match(locationFixMigration, /not public\.is_donor_recovery_restricted\(d\.id\)/)
})

test("donor inbox shows the request location and reflects area matches", () => {
  assert.match(
    locationFixMigration,
    /coalesce\(nullif\(trim\(r\.area\), ''\), nullif\(trim\(h\.city\), ''\), 'Nearby'\)/,
  )
  assert.match(
    locationFixMigration,
    /where public\.is_eligible_blood_request\(r\.id, v_donor_id\)/,
  )
})

test("matching location changes trigger notifications for existing requests", () => {
  assert.match(
    locationFixMigration,
    /update of status, blood_group, component, area, latitude,[\s\S]*?on public\.blood_requests/,
  )
  assert.match(
    locationFixMigration,
    /approximate_latitude, approximate_longitude, city, area, radius, radius_km/,
  )
  assert.match(
    locationFixMigration,
    /delete from public\.notifications notification[\s\S]*?insert into public\.notifications/,
  )
})

test("latest eligibility migration reconciles profile-area matches into the donor feed", () => {
  assert.match(
    eligibilityReconciliationMigration,
    /request\.component = 'WHOLE_BLOOD'/,
  )
  assert.match(
    eligibilityReconciliationMigration,
    /upper\(trim\(request\.blood_group\)\) = upper\(trim\(donor\.blood_group\)\)/,
  )
  assert.match(
    eligibilityReconciliationMigration,
    /values \(request\.area\), \(hospital\.city\)/,
  )
  assert.match(
    eligibilityReconciliationMigration,
    /values \(donor\.area\), \(donor\.city\)/,
  )
  assert.match(
    eligibilityReconciliationMigration,
    /create or replace function public\.get_eligible_blood_requests\(\)/,
  )
  assert.match(
    eligibilityReconciliationMigration,
    /insert into public\.notifications[\s\S]*?public\.is_eligible_blood_request\(request\.id, donor\.id\)/,
  )
  assert.match(
    eligibilityReconciliationMigration,
    /as eligible_donors[\s\S]*?as notified_eligible_donors/,
  )
})

test("saving donor matching fields immediately refreshes the donor request feed", () => {
  const updateProfileStart = donorPortalContext.indexOf("updateProfile: async")
  const updateProfileEnd = donorPortalContext.indexOf(
    "updateSettings:",
    updateProfileStart,
  )
  assert.notEqual(updateProfileStart, -1)
  assert.notEqual(updateProfileEnd, -1)
  const updateProfile = donorPortalContext.slice(
    updateProfileStart,
    updateProfileEnd,
  )
  assert.match(updateProfile, /await updateDonorProfile\(/)
  assert.match(updateProfile, /void refreshRequests\(\)\.catch/)
})

test("donor availability UI reflects persisted status and failed updates", () => {
  assert.match(donorDashboard, /const available =\s*donorAvailability \?\?/)
  assert.match(
    donorAvailabilityPage,
    /const available = donorAvailability \?\? me\?\.available \?\? false/,
  )
  assert.match(appContext, /const toggleDonorAvailability = async/)
  assert.match(appContext, /if \(error\) throw error/)
  assert.match(appContext, /if \(!data\) throw new Error/)
})
