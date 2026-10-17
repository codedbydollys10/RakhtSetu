import { createClient } from "@supabase/supabase-js"

const confirmation = "I_UNDERSTAND_DEMO_ONLY"

const supabaseUrl = process.env.SUPABASE_URL

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const allowedProjectHost = process.env.DEMO_SEED_ALLOWED_PROJECT_HOST

const testPassword = process.env.DEMO_SEED_TEST_PASSWORD

if (process.env.DEMO_SEED_CONFIRM !== confirmation) {
  throw new Error(
    `Set DEMO_SEED_CONFIRM=${confirmation} only for a dedicated demo project.`,
  )
}

if (!supabaseUrl || !serviceRoleKey || !allowedProjectHost || !testPassword) {
  throw new Error(
    "Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEMO_SEED_ALLOWED_PROJECT_HOST, and DEMO_SEED_TEST_PASSWORD in the process environment.",
  )
}

if (testPassword.length < 12) {
  throw new Error("DEMO_SEED_TEST_PASSWORD must be at least 12 characters.")
}

const projectHost = new URL(supabaseUrl).hostname

if (projectHost !== allowedProjectHost) {
  throw new Error(
    `Refusing to seed ${projectHost}; it does not match DEMO_SEED_ALLOWED_PROJECT_HOST.`,
  )
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const targets = [
  ["hospital", 50],

  ["ngo", 70],

  ["donor", 200],
]

async function listUsersByEmail() {
  const users = new Map()

  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,

      perPage: 1000,
    })

    if (error) throw error

    for (const user of data.users) {
      users.set(user.email?.toLowerCase(), user)
    }

    if (data.users.length < 1000) return users
  }
}

const existingUsers = await listUsersByEmail()

let created = 0

let alreadyProvisioned = 0

for (const [role, count] of targets) {
  for (let number = 1; number <= count; number += 1) {
    const demoId = `${role}-${String(number).padStart(3, "0")}`

    const email = `${demoId}@example.invalid`

    const existing = existingUsers.get(email)

    if (existing) {
      if (
        existing.user_metadata?.demo_dataset_id !== demoId ||
        existing.user_metadata?.role !== role
      ) {
        throw new Error(
          `Refusing to alter existing Auth account ${email}: demo marker or role does not match.`,
        )
      }

      alreadyProvisioned += 1

      continue
    }

    const displayName = `RakhtSetu Synthetic ${role} ${String(number).padStart(3, "0")}`

    const userMetadata = {
      demo_dataset_id: demoId,

      demo_synthetic: true,

      role,

      full_name: displayName,

      phone: "0000000000",

      ...(role === "hospital"
        ? {
            hospital_name: `RakhtSetu Demo Hospital ${String(number).padStart(3, "0")}`,
          }
        : {}),

      ...(role === "ngo"
        ? {
            organisation_name: `RakhtSetu Demo NGO ${String(number).padStart(3, "0")}`,
          }
        : {}),

      ...(role === "donor" ? { blood_group: "O+" } : {}),
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,

      password: testPassword,

      email_confirm: true,

      user_metadata: userMetadata,
    })

    if (error) {
      throw new Error(`Could not provision ${demoId}: ${error.message}`)
    }

    existingUsers.set(email, data.user)

    created += 1
  }
}

console.log(
  `Demo Auth provisioning complete for ${projectHost}: ${created} created, ${alreadyProvisioned} already present. No accounts were deleted or overwritten.`,
)
