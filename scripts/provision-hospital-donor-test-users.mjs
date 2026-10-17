import { createClient } from "@supabase/supabase-js"

const confirmation = "I_UNDERSTAND_HOSPITAL_DONOR_TEST_ONLY"

const bloodGroups = [
  "O+",

  "O+",

  "O+",

  "O+",

  "O-",

  "O-",

  "O-",

  "A+",

  "A+",

  "A+",

  "A-",

  "A-",

  "B+",

  "B+",

  "B+",

  "B-",

  "B-",

  "AB+",

  "AB+",

  "AB-",
]

const supabaseUrl = process.env.SUPABASE_URL

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const allowedProjectHost = process.env.HOSPITAL_DONOR_TEST_ALLOWED_PROJECT_HOST

const testPassword = process.env.HOSPITAL_DONOR_TEST_PASSWORD

if (process.env.HOSPITAL_DONOR_TEST_CONFIRM !== confirmation) {
  throw new Error(
    `Set HOSPITAL_DONOR_TEST_CONFIRM=${confirmation} only for a dedicated test project.`,
  )
}

if (!supabaseUrl || !serviceRoleKey || !allowedProjectHost || !testPassword) {
  throw new Error(
    "Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, HOSPITAL_DONOR_TEST_ALLOWED_PROJECT_HOST, and HOSPITAL_DONOR_TEST_PASSWORD in the process environment.",
  )
}

if (testPassword.length < 12) {
  throw new Error(
    "HOSPITAL_DONOR_TEST_PASSWORD must be at least 12 characters.",
  )
}

const projectUrl = new URL(supabaseUrl)

if (
  !["https:", "http:"].includes(projectUrl.protocol) ||
  (projectUrl.protocol === "http:" &&
    !["localhost", "127.0.0.1"].includes(projectUrl.hostname))
) {
  throw new Error("Use HTTPS, or HTTP on localhost for local testing.")
}

if (projectUrl.hostname !== allowedProjectHost) {
  throw new Error(
    `Refusing to provision ${projectUrl.hostname}; it does not match HOSPITAL_DONOR_TEST_ALLOWED_PROJECT_HOST.`,
  )
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const targets = [
  ...Array.from({ length: 12 }, (_, index) => ({
    role: "hospital",

    number: index + 1,
  })),

  ...Array.from({ length: 20 }, (_, index) => ({
    role: "donor",

    number: index + 1,
  })),
]

async function listUsersByIdentity() {
  const usersByEmail = new Map()

  const usersByFixtureId = new Map()

  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,

      perPage: 1000,
    })

    if (error) {
      throw new Error(`Unable to inspect Auth accounts: ${error.message}`)
    }

    for (const user of data.users) {
      if (user.email) usersByEmail.set(user.email.toLowerCase(), user)

      const fixtureId = user.user_metadata?.network_test_id

      if (typeof fixtureId === "string") {
        if (usersByFixtureId.has(fixtureId)) {
          throw new Error(`Duplicate Auth marker for ${fixtureId}.`)
        }

        usersByFixtureId.set(fixtureId, user)
      }
    }

    if (data.users.length < 1000) {
      return { usersByEmail, usersByFixtureId }
    }
  }
}

const { usersByEmail, usersByFixtureId } = await listUsersByIdentity()

let created = 0

let reused = 0

for (const target of targets) {
  const fixtureId = `${target.role}-${String(target.number).padStart(2, "0")}`

  const email = `${target.role}-test-${String(target.number).padStart(2, "0")}@example.invalid`

  const existingByFixture = usersByFixtureId.get(fixtureId)

  const existingByEmail = usersByEmail.get(email)

  if (existingByFixture && existingByFixture.email?.toLowerCase() !== email) {
    throw new Error(
      `Refusing to reuse ${fixtureId}: its existing Auth account uses a different email.`,
    )
  }

  const existing = existingByFixture ?? existingByEmail

  if (existing) {
    if (
      existing.email?.toLowerCase() !== email ||
      existing.user_metadata?.network_test_fixture !== true ||
      existing.user_metadata?.network_test_id !== fixtureId ||
      existing.user_metadata?.role !== target.role
    ) {
      throw new Error(
        `Refusing to alter existing Auth account ${email}: its test-fixture marker or role does not match.`,
      )
    }

    reused += 1

    continue
  }

  const displayNumber = String(target.number).padStart(2, "0")

  const userMetadata = {
    role: target.role,

    full_name: `Synthetic ${target.role} test ${displayNumber}`,

    phone: null,

    network_test_fixture: true,

    network_test_id: fixtureId,

    ...(target.role === "hospital"
      ? {
          hospital_name: `RakhtSetu Synthetic Hospital ${displayNumber}`,
        }
      : {
          blood_group: bloodGroups[target.number - 1],

          consent: false,
        }),
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,

    password: testPassword,

    email_confirm: true,

    user_metadata: userMetadata,
  })

  if (error) {
    throw new Error(`Could not provision ${fixtureId}: ${error.message}`)
  }

  usersByEmail.set(email, data.user)

  usersByFixtureId.set(fixtureId, data.user)

  created += 1
}

console.log(
  `Test Auth provisioning complete for ${projectUrl.hostname}: ${created} created, ${reused} already present. No existing account was modified or deleted.`,
)
