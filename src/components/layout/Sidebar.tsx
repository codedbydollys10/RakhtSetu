import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Droplets, Users, Building2, Network,
  MessageSquare, Bell, History, User, Settings, LogOut,
  ChevronLeft, ChevronRight, BarChart3, Shield, Zap,
  UserCheck, Megaphone, FileCheck, Lock, Menu, X,
} from "lucide-react";
import { useApp } from "../../context/AppContext";

const hospitalNav = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/hospital/dashboard" },
  { icon: Droplets, label: "Blood Requests", to: "/hospital/requests" },
  { icon: Zap, label: "Matches", to: "/hospital/matches" },
  { icon: Network, label: "Network", to: "/hospital/network" },
  { icon: MessageSquare, label: "Messages", to: "/hospital/messages" },
  { icon: Bell, label: "Notifications", to: "/hospital/notifications" },
  { icon: History, label: "History", to: "/hospital/history" },
  { icon: User, label: "Profile", to: "/hospital/profile" },
];

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
];

const donorNav = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/donor/dashboard" },
  { icon: Droplets, label: "Requests", to: "/donor/requests" },
  { icon: UserCheck, label: "Availability", to: "/donor/availability" },
  { icon: History, label: "My History", to: "/donor/history" },
  { icon: BarChart3, label: "My Impact", to: "/donor/impact" },
  { icon: Bell, label: "Notifications", to: "/donor/notifications" },
  { icon: User, label: "Profile", to: "/donor/profile" },
  { icon: Lock, label: "Privacy", to: "/donor/privacy" },
];

const navMap = { hospital: hospitalNav, ngo: ngoNav, donor: donorNav };
const labelMap = { hospital: "Hospital Portal", ngo: "NGO Portal", donor: "Donor Portal" };

export default function Sidebar() {
  const { role, currentUser, logout, unreadCount } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = role ? navMap[role] : [];
  const portalLabel = role ? labelMap[role] : "";
  const donorTheme = role === "donor";

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-2.5 px-4 py-5 border-b ${donorTheme ? "border-white/10" : "border-[#C0D2DE]/40"} ${collapsed ? "justify-center px-2" : ""}`}>
        <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
          <Droplets size={19} className="text-[#D71920]" strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <div>
            <p className="font-display text-base font-bold leading-tight"><span className="text-[#D71920]">Rakht</span><span className={donorTheme ? "text-white" : "text-[#021734]"}>Setu</span></p>
            <p className={`text-[10px] font-medium ${donorTheme ? "text-white/60" : "text-[#036D7D]"}`}>{portalLabel}</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.map(({ icon: Icon, label, to }) => {
          const active = location.pathname === to;
          const isNotif = to.includes("notification");
          return (
            <Link
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-medium transition-all duration-150 ${
                active
                  ? "bg-[#1C8791] text-white shadow-sm"
                  : donorTheme ? "text-white/65 hover:bg-white/10 hover:text-white" : "text-[#021734]/60 hover:bg-[#036D7D]/10 hover:text-[#036D7D]"
              } ${collapsed ? "justify-center" : ""}`}
            >
              <Icon size={17} className="flex-shrink-0" />
              {!collapsed && (
                <span className="flex-1">{label}</span>
              )}
              {!collapsed && isNotif && unreadCount > 0 && (
                <span className="w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                  {unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className={`border-t p-3 ${donorTheme ? "border-white/10" : "border-[#C0D2DE]/40"} ${collapsed ? "flex flex-col items-center gap-2" : ""}`}>
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-[#1C8791] text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
              {currentUser?.name?.[0] || "U"}
            </div>
            <div className="min-w-0">
              <p className={`text-xs font-semibold truncate ${donorTheme ? "text-white" : "text-[#021734]"}`}>{currentUser?.name || "Account"}</p>
              <p className={`text-[10px] capitalize ${donorTheme ? "text-white/45" : "text-[#021734]/40"}`}>{role}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={`flex items-center gap-2 w-full px-3 py-2 text-xs rounded-lg transition-all ${donorTheme ? "text-white/55 hover:text-white hover:bg-white/10" : "text-[#021734]/50 hover:text-red-600 hover:bg-red-50"} ${collapsed ? "justify-center" : ""}`}
        >
          <LogOut size={14} />
          {!collapsed && "Sign Out"}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className={`hidden md:flex absolute -right-3 top-20 w-6 h-6 bg-white border border-[#C0D2DE]/60 rounded-full items-center justify-center shadow-sm text-[#021734]/40 hover:text-[#036D7D] transition-colors`}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 w-9 h-9 bg-[#021734] text-white rounded-lg flex items-center justify-center shadow-lg"
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
            className={`md:hidden fixed left-0 top-0 h-full w-64 ${donorTheme ? "bg-[#021734]" : "bg-[#FBFBFD]"} border-r border-[#C0D2DE]/60 z-50`}
          >
            <SidebarContent />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 220 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`hidden md:flex flex-col h-full ${donorTheme ? "bg-[#021734]" : "bg-[#FBFBFD]"} border-r border-[#C0D2DE]/60 relative flex-shrink-0`}
      >
        <SidebarContent />
      </motion.aside>
    </>
  );
}
