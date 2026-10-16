import React from "react"

import { useLocation } from "react-router-dom"

import Sidebar from "./Sidebar"
import { useApp } from "../../context/AppContext"
import VascularBackground from "../ui/VascularBackground"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { role } = useApp()
  const location = useLocation()
  const hospitalDashboard =
    role === "hospital" && location.pathname === "/hospital/dashboard"

  return (
    <div className="dashboard-shell relative isolate flex h-screen overflow-hidden">
      <Sidebar />
      <main
        className="dashboard-main relative min-w-0 flex-1 overflow-y-auto bg-transparent"
        style={
          hospitalDashboard
            ? {
                backgroundImage:
                  "linear-gradient(var(--dashboard-image-overlay), var(--dashboard-image-overlay)), url('/sounds/hospital.jpg')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundAttachment: "fixed",
              }
            : undefined
        }
      >
        <VascularBackground />
        <div className="dashboard-main-content relative z-10 min-h-full p-4 pt-14 md:p-6">
          {children}
        </div>
      </main>
    </div>
  )
}

export function PageHeader({
  title,

  subtitle,

  actions,
}: {
  title: string

  subtitle?: string

  actions?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-xl font-bold text-(--text-primary) md:text-2xl">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-(--text-secondary) mt-1">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 flex-wrap">{actions}</div>
      )}
    </div>
  )
}
