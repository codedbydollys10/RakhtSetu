import { useMemo, useState } from "react"

import {
  Bell,
  Check,
  CheckCheck,
  Droplet,
  HeartHandshake,
  Settings2,
  Trash2,
} from "lucide-react"

import DashboardLayout, {
  PageHeader,
} from "../../components/layout/DashboardLayout"

import Button from "../../components/ui/Button"

import { useApp } from "../../context/AppContext"

import { useDonorPortal } from "../../context/DonorPortalContext"

const categories = ["All", "Requests", "Responses", "System"] as const

type Category = typeof categories[number]

export default function DonorNotifications() {
  const {
    notifications,
    notificationsError,
    markNotificationRead,
    markNotificationsRead,
  } = useApp()

  const { deletedNotifications, deleteNotification } = useDonorPortal()

  const [category, setCategory] = useState<Category>("All")
  const [error, setError] = useState<string | null>(null)

  const visible = useMemo(
    () =>
      notifications.filter(
        (notice) =>
          !deletedNotifications.includes(notice.id) &&
          (category === "All" ||
            (category === "Requests" && notice.type === "request") ||
            (category === "Responses" && notice.type === "match") ||
            (category === "System" &&
              ["system", "verified"].includes(notice.type))),
      ),
    [category, deletedNotifications, notifications],
  )

  const markOne = async (id: string) => {
    setError(null)
    try {
      await markNotificationRead(id)
    } catch (readError) {
      setError(
        readError instanceof Error
          ? readError.message
          : "Unable to update this notification.",
      )
    }
  }

  const markAll = async () => {
    setError(null)
    try {
      await markNotificationsRead(visible.map((notice) => notice.id))
    } catch (readError) {
      setError(
        readError instanceof Error
          ? readError.message
          : "Unable to update notifications.",
      )
    }
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Notifications"
        subtitle="Updates about verified requests, responses and your account."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void markAll()}
          >
            <CheckCheck size={14} className="mr-1.5" />
            Mark all read
          </Button>
        }
      />
      {(notificationsError || error) && (
        <p role="alert" className="mb-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
          {notificationsError
            ? `Notifications could not be loaded: ${notificationsError}`
            : error}
        </p>
      )}
      <div className="mb-4 flex gap-2 overflow-x-auto border-b border-[#D8E3EA]">
        {categories.map((item) => (
          <button
            key={item}
            onClick={() => setCategory(item)}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-xs font-semibold ${
              category === item
                ? "border-[#E51C3D] text-[#E51C3D]"
                : "border-transparent text-[#617587]"
            }`}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {visible.map((notice) => {
          const read = notice.read

          const Icon =
            notice.type === "request"
              ? Droplet
              : notice.type === "match"
                ? HeartHandshake
                : notice.type === "system"
                  ? Settings2
                  : Bell

          return (
            <article
              key={notice.id}
              className={`flex items-start gap-3 rounded-xl border bg-white p-4 ${
                read
                  ? "border-[#D8E3EA]"
                  : "border-[#F5BAC4] shadow-[0_2px_8px_rgba(229,28,61,0.05)]"
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  notice.type === "request"
                    ? "bg-[#FFF1F3] text-[#E51C3D]"
                    : "bg-[#EAF0F5] text-[#062847]"
                }`}
              >
                <Icon size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-bold text-[#021734]">
                    {notice.title}
                  </h2>
                  {!read && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#E51C3D]" />
                  )}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-[#617587]">
                  {notice.body}
                </p>
                <p className="mt-2 text-[10px] text-[#9AA9B5]">
                  {new Date(notice.timestamp).toLocaleString("en-IN", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  aria-label={read ? "Already read" : "Mark as read"}
                  title={read ? "Read" : "Mark as read"}
                  disabled={read}
                  onClick={() => void markOne(notice.id)}
                  className="rounded-lg p-2 text-[#617587] hover:bg-[#F5F8FA] disabled:opacity-30"
                >
                  <Check size={14} />
                </button>
                <button
                  aria-label="Delete notification"
                  title="Delete notification"
                  onClick={() => deleteNotification(notice.id)}
                  className="rounded-lg p-2 text-[#617587] hover:bg-[#FFF1F3] hover:text-[#E51C3D]"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </article>
          )
        })}
        {!visible.length && (
          <div className="rounded-xl border border-dashed border-[#D8E3EA] bg-white p-10 text-center">
            <Bell size={22} className="mx-auto text-[#9AA9B5]" />
            <p className="mt-3 text-sm font-semibold text-[#021734]">
              No notifications here
            </p>
            <p className="mt-1 text-xs text-[#617587]">
              New updates will appear in this inbox.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
