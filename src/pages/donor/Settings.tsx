import { useEffect, useState } from "react"

import { Check, LockKeyhole, Save } from "lucide-react"

import DashboardLayout, {
  PageHeader,
} from "../../components/layout/DashboardLayout"

import {
  useDonorPortal,
  type DonorSettings as SettingsModel,
} from "../../context/DonorPortalContext"

const fields: {
  section: string
  key: keyof SettingsModel
  label: string
  description: string
}[] = [
  {
    section: "Notifications",
    key: "emergencyNotifications",
    label: "Emergency request alerts",
    description:
      "Get notified when an urgent request matches your blood group.",
  },

  {
    section: "Notifications",
    key: "nearbyNotifications",
    label: "Nearby request alerts",
    description: "Receive updates about verified needs in your area.",
  },

  {
    section: "Notifications",
    key: "communityUpdates",
    label: "Community updates",
    description: "Hear about local donor drives and verified network activity.",
  },

  {
    section: "Notifications",
    key: "rewardNotifications",
    label: "Reward updates",
    description: "Get a note when you reach a community milestone.",
  },

  {
    section: "Privacy",
    key: "showAvailability",
    label: "Show availability to verified requests",
    description:
      "Let approved hospitals and coordinators know whether you can be contacted.",
  },

  {
    section: "Privacy",
    key: "showApproximateDistance",
    label: "Show approximate distance",
    description:
      "Share a broad distance estimate only; your exact location remains private.",
  },

  {
    section: "Privacy",
    key: "allowVerifiedContact",
    label: "Allow verified hospital contact",
    description:
      "Allow verified organisations to contact you for coordination.",
  },
]

export default function DonorSettings() {
  const { settings, updateSettings } = useDonorPortal()

  const [draft, setDraft] = useState<SettingsModel>(settings)

  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setDraft(settings)
  }, [settings])

  const toggle = (key: keyof SettingsModel) => {
    setDraft((current) => ({ ...current, [key]: !current[key] }))

    setSaved(false)
  }

  const save = () => {
    updateSettings(draft)

    setSaved(true)

    window.setTimeout(() => setSaved(false), 2500)
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Donor Settings"
        subtitle="Manage how SAHAYOG contacts you and what verified partners can see."
        actions={
          <button
            onClick={save}
            className="inline-flex items-center gap-2 rounded-lg bg-[#E51C3D] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#C91836]"
          >
            <Save size={14} />
            Save settings
          </button>
        }
      />
      <div className="max-w-3xl space-y-5">
        {["Notifications", "Privacy"].map((section) => (
          <section
            key={section}
            className="overflow-hidden rounded-2xl border border-[#D8E3EA] bg-white"
          >
            <div className="border-b border-[#D8E3EA] px-5 py-4">
              <h2 className="font-display text-sm font-bold text-[#031A36]">
                {section}
              </h2>
            </div>
            <div className="divide-y divide-[#E8EEF2]">
              {fields
                .filter((field) => field.section === section)
                .map(({ key, label, description }) => (
                  <div key={key} className="flex items-center gap-4 px-5 py-4">
                    <span className="flex-1">
                      <span className="block text-xs font-semibold text-[#021734]">
                        {label}
                      </span>
                      <span className="mt-1 block text-[11px] leading-relaxed text-[#617587]">
                        {description}
                      </span>
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={draft[key]}
                      aria-label={label}
                      onClick={() => toggle(key)}
                      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-[#E51C3D] ${
                        draft[key] ? "bg-[#16A34A]" : "bg-[#B7C4CE]"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                          draft[key] ? "translate-x-[22px]" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                ))}
            </div>
          </section>
        ))}
        <div className="flex items-start gap-3 rounded-xl border border-[#D8E3EA] bg-[#F5F8FA] p-4">
          <LockKeyhole size={17} className="mt-0.5 shrink-0 text-[#062847]" />
          <p className="text-xs leading-relaxed text-[#617587]">
            <b className="text-[#021734]">Privacy by default.</b> Your exact
            address, phone number, and donor identity are never shown on public
            network cards. Local preferences are saved in this browser.
          </p>
        </div>
        {saved && (
          <p
            role="status"
            className="flex items-center gap-2 text-xs font-semibold text-[#16803C]"
          >
            <Check size={14} />
            Settings saved.
          </p>
        )}
      </div>
    </DashboardLayout>
  )
}
