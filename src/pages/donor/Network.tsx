import { Network as NetworkIcon, UsersRound } from "lucide-react"

import DashboardLayout, {
  PageHeader,
} from "../../components/layout/DashboardLayout"

import { useApp } from "../../context/AppContext"

import { useDonorPortal } from "../../context/DonorPortalContext"

export default function DonorNetwork() {
  const { donors, currentUser, requests } = useApp()

  const { profile } = useDonorPortal()

  const donor = donors.find((item) => item.id === currentUser?.id)

  const bloodGroup = profile.bloodGroup ?? donor?.bloodGroup

  const community = donors.filter(
    (item) =>
      item.id !== currentUser?.id &&
      (!bloodGroup || item.bloodGroup === bloodGroup),
  )

  const coordinatedRequests = requests.filter(
    (request) => request.status !== "Cancelled",
  )

  const activity = coordinatedRequests.slice(0, 4)

  return (
    <DashboardLayout>
      <PageHeader
        title="Community Network"
        subtitle="See the strength of your nearby donor community without exposing personal information."
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {[
          {
            title: "Donors in community",
            value: community.length,
            icon: UsersRound,
            note: `${bloodGroup ?? "All groups"} network`,
          },

          {
            title: "Available nearby",
            value: community.filter((item) => item.available).length,
            icon: UsersRound,
            note: "Approximate network view",
          },

          {
            title: "Community contributions",
            value: coordinatedRequests.length,
            icon: NetworkIcon,
            note: "Requests coordinated",
          },
        ].map(({ title, value, icon: Icon, note }) => (
          <div
            key={title}
            className="rounded-xl border border-[#D8E3EA] bg-white p-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[#617587]">{title}</p>
              <Icon size={17} className="text-[#E51C3D]" />
            </div>
            <p className="mt-3 font-display text-2xl font-extrabold text-[#031A36]">
              {value}
            </p>
            <p className="mt-1 text-[10px] text-[#617587]">{note}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.1fr_1fr]">
        <section className="rounded-2xl border border-[#D8E3EA] bg-white p-5">
          <h2 className="font-display text-base font-bold text-[#031A36]">
            Nearby donor availability
          </h2>
          <p className="mt-1 text-xs text-[#617587]">
            Anonymous, approximate network examples. No names or contact details
            are displayed.
          </p>
          <div className="mt-4 space-y-2">
            {community.slice(0, 6).map((item, index) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#D8E3EA] p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F5F8FA] text-xs font-bold text-[#062847]">
                    {item.bloodGroup}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-[#021734]">
                      {item.bloodGroup} donor
                    </p>
                    <p className="mt-0.5 text-[10px] text-[#617587]">
                      {index % 2 === 0
                        ? "Nearby donor network"
                        : "Community donor"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-semibold ${
                      item.available ? "text-[#16803C]" : "text-[#617587]"
                    }`}
                  >
                    <i
                      className={`h-1.5 w-1.5 rounded-full ${
                        item.available ? "bg-[#16A34A]" : "bg-[#9AA9B5]"
                      }`}
                    />
                    {item.available ? "Available" : "Unavailable"}
                  </span>
                  <p className="mt-1 text-[10px] text-[#617587]">
                    {["2.4 km", "4.1 km", "5.8 km"][index % 3]}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {!community.length && (
            <p className="mt-4 rounded-lg bg-[#F5F8FA] p-4 text-xs text-[#617587]">
              No aggregate donor records are available for this group yet.
            </p>
          )}
          <p className="mt-3 text-[10px] text-[#617587]">
            Distance and availability are approximate coordination information
            only. Donor identities remain private.
          </p>
        </section>
        <section className="rounded-2xl border border-[#D8E3EA] bg-white p-5">
          <h2 className="font-display text-base font-bold text-[#031A36]">
            Community activity
          </h2>
          <p className="mt-1 text-xs text-[#617587]">
            Recent request coordination activity.
          </p>
          <div className="mt-4 space-y-3">
            {activity.map((request) => (
              <div
                key={request.id}
                className="flex gap-3 rounded-xl bg-[#F5F8FA] p-3"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#16A34A]">
                  <NetworkIcon size={15} />
                </span>
                <div>
                  <p className="text-xs font-semibold text-[#021734]">
                    Blood request coordinated
                  </p>
                  <p className="mt-1 text-[11px] text-[#617587]">
                    {request.bloodGroup} · {request.area} · {request.units}{" "}
                    units
                  </p>
                </div>
              </div>
            ))}
          </div>
          {!activity.length && (
            <p className="mt-4 text-xs text-[#617587]">
              No recent activity to show.
            </p>
          )}
        </section>
      </div>
    </DashboardLayout>
  )
}
