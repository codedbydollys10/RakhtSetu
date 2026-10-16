import React, { useState } from "react"

import { Link, useLocation, useNavigate } from "react-router-dom"

import { motion, AnimatePresence } from "framer-motion"

import {
  LayoutDashboard,
  Droplets,
  ClipboardList,
  Users,
  Network,
  MessageSquare,
  Bell,
  History,
  User,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  BarChart3,
  Shield,
  Zap,
  UserCheck,
  Megaphone,
  FileCheck,
  Menu,
  X,
  MapPin,
  Award,
} from "lucide-react"

import { useApp } from "../../context/AppContext"
import ThemeToggle from "../ui/ThemeToggle"

const hospitalNav = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/hospital/dashboard" },

  {
    icon: CirclePlus,
    label: "Post Blood Requirement",
    to: "/hospital/post-request",
  },

  { icon: ClipboardList, label: "My Requests", to: "/hospital/requests" },

  { icon: Users, label: "Patient Records", to: "/hospital/patients" },

  { icon: BarChart3, label: "Reports", to: "/hospital/reports" },

  { icon: Settings, label: "Settings", to: "/hospital/settings" },
]

const ngoNav = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/ngo/dashboard" },

  { icon: Users, label: "Donors", to: "/ngo/donors" },

  { icon: Droplets, label: "Requests", to: "/ngo/requests" },

  { icon: FileCheck, label: "Verification", to: "/ngo/verification" },

  { icon: Zap, label: "Matching", to: "/ngo/matching" },

  { icon: BarChart3, label: "Analytics", to: "/ngo/analytics" },

  { icon: Network, label: "Partners", to: "/ngo/partners" },

  { icon: UserCheck, label: "Donor Capacity", to: "/ngo/capacity" },

  { icon: Shield, label: "Outreach Protection", to: "/ngo/outreach" },

  { icon: MessageSquare, label: "Communication", to: "/ngo/communication" },

  { icon: Megaphone, label: "Campaigns", to: "/ngo/campaigns" },

  { icon: User, label: "Profile", to: "/ngo/profile" },
]

const donorNav = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/donor/dashboard" },

  {
    icon: Droplets,
    label: "Emergency Requests",
    to: "/donor/emergency-requests",
  },

  { icon: MapPin, label: "Nearby Requests", to: "/donor/nearby" },

  { icon: UserCheck, label: "My Responses", to: "/donor/responses" },

  { icon: History, label: "Donation History", to: "/donor/history" },

  { icon: Network, label: "Community Network", to: "/donor/network" },

  { icon: Award, label: "Rewards & Impact", to: "/donor/rewards" },

  { icon: Bell, label: "Notifications", to: "/donor/notifications" },

  { icon: User, label: "Profile", to: "/donor/profile" },

  { icon: Settings, label: "Settings", to: "/donor/settings" },
]

const navMap = { hospital: hospitalNav, ngo: ngoNav, donor: donorNav }

const labelMap = {
  hospital: "Hospital Portal",
  ngo: "NGO Portal",
  donor: "Donor Portal",
}

export default function Sidebar() {
  const {
    role,
    currentUser,
    roleDetails,
    logout,
    unreadCount,
    donorAvailability,
    donors,
  } = useApp()

  const location = useLocation()

  const navigate = useNavigate()

  const [collapsed, setCollapsed] = useState(false)

  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems = role ? navMap[role] : []

  const portalLabel = role ? labelMap[role] : ""

  const donorTheme = role === "donor"
  const hospitalTheme = role === "hospital"
  const hospitalName =
    typeof roleDetails?.hospital_name === "string"
      ? roleDetails.hospital_name
      : "Hospital Portal"

  const isDonorAvailable =
    donorAvailability ??
    donors.find((donor) => donor.id === currentUser?.id)?.available ??
    false

  const handleLogout = () => {
    logout()

    navigate("/")
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div
        className={`flex items-center gap-2.5 border-b border-white/10 px-4 py-5 ${
          collapsed ? "justify-center px-2" : ""
        }`}
      >
        <div className="theme-preserve-white flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
          <Droplets size={19} className="text-[#E51C3D]" strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <div>
            <p className="font-display text-base font-bold leading-tight">
              <span className="text-[#E51C3D]">Rakht</span>
              <span
                className="text-(--text-primary)"
              >
                Setu
              </span>
            </p>
            <p
              className="text-[10px] font-medium text-(--text-secondary)"
            >
              {portalLabel}
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.map(({ icon: Icon, label, to }) => {
          const active = location.pathname === to

          const isNotif = to.includes("notification")

          return (
            <Link
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              aria-label={collapsed ? label : undefined}
              aria-current={active ? "page" : undefined}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 mx-2 px-3 py-2 rounded-lg mb-0.5 text-sm font-medium transition-all duration-150 ${
                active
                  ? "bg-[#E51C3D] text-white shadow-sm"
                  : "text-(--text-secondary) hover:bg-(--surface-hover) hover:text-(--text-primary)"
              } ${collapsed ? "justify-center" : ""}`}
            >
              <Icon size={17} className="flex-shrink-0" />
              {!collapsed && <span className="flex-1">{label}</span>}
              {!collapsed && isNotif && unreadCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#EF4444] px-1 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {donorTheme && !collapsed && (
        <div className="mx-3 mb-3 rounded-xl border border-(--border) bg-(--surface) p-3">
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-(--text-primary)">
            <span
              className={`h-2 w-2 rounded-full ${
                isDonorAvailable ? "bg-[#16A34A]" : "bg-[#9AA9B5]"
              }`}
            />
            {isDonorAvailable ? "You’re ready" : "Availability paused"}
          </p>
          <p className="mt-1.5 text-[10px] leading-relaxed text-(--text-secondary)">
            Your availability is visible to verified requests.
          </p>
          <Link
            to="/donor/availability"
            className="mt-2 inline-flex rounded-md bg-(--surface-hover) px-2.5 py-1.5 text-[10px] font-semibold text-(--text-primary)"
          >
            Update status
          </Link>
          <div className="mt-3 border-t border-(--divider) pt-3">
            <p className="text-[10px] font-semibold leading-relaxed text-(--text-secondary)">
              One donation. One connection. One more chance.
            </p>
            <Droplets size={12} className="mt-2 text-[#FF7184]" />
          </div>
        </div>
      )}

      {/* User + Logout */}
      <div
        className={`border-t border-(--border) p-3 ${
          collapsed ? "flex flex-col items-center gap-2" : ""
        }`}
      >
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
            <div
              className={`w-7 h-7 rounded-full text-white text-xs flex items-center justify-center font-bold flex-shrink-0 ${
                "bg-[#E51C3D]"
              }`}
            >
              {currentUser?.name?.trim().charAt(0) || "U"}
            </div>
            <div className="min-w-0">
              <p
                className="text-xs font-semibold truncate text-(--text-primary)"
              >
                {currentUser?.name || "Account"}
              </p>
              <p
                className="text-[10px] capitalize text-(--text-secondary)"
              >
                {hospitalTheme
                  ? "Hospital Admin"
                  : role === "donor"
                    ? "Donor"
                    : role}
              </p>
              {hospitalTheme && (
                <p className="max-w-40 truncate text-[9px] text-(--text-muted)">
                  {hospitalName}
                </p>
              )}
            </div>
          </div>
        )}
        <div className={`flex items-center gap-2 ${collapsed ? "flex-col" : ""}`}>
          <button
            onClick={handleLogout}
            className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2 text-xs text-(--text-secondary) transition-all hover:bg-(--surface-hover) hover:text-(--error) ${
              collapsed ? "w-full justify-center" : ""
            }`}
          >
            <LogOut size={14} />
            {!collapsed && "Sign Out"}
          </button>
          <ThemeToggle />
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className={`hidden md:flex absolute -right-3 top-20 w-6 h-6 rounded-full items-center justify-center shadow-sm transition-colors ${
          "border border-(--border) bg-(--surface-elevated) text-(--text-secondary) hover:text-(--text-primary)"
        }`}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </div>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        aria-label={
          mobileOpen ? "Close navigation menu" : "Open navigation menu"
        }
        aria-expanded={mobileOpen}
        className="fixed left-4 top-4 z-50 flex h-9 w-9 items-center justify-center rounded-lg bg-(--brand) text-white shadow-lg md:hidden"
        onClick={() => setMobileOpen((o) => !o)}
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="md:hidden fixed inset-0 bg-black/40 z-40"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed left-0 top-0 z-50 h-full w-[260px] rounded-r-[20px] border-r border-(--border) bg-(--sidebar-bg) shadow-xl md:hidden"
          >
            <SidebarContent />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 260 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative sticky top-0 z-20 hidden h-screen flex-shrink-0 flex-col rounded-r-[20px] border-r border-(--border) bg-(--sidebar-bg) shadow-[4px_0_18px_rgba(3,26,54,0.07)] md:flex"
      >
        <SidebarContent />
      </motion.aside>
    </>
  )
}
