import React, { useState } from "react";
import { motion } from "framer-motion";
import { Search, Filter, MapPin, Droplets, User } from "lucide-react";
import DashboardLayout, { PageHeader } from "../../components/layout/DashboardLayout";
import Badge from "../../components/ui/Badge";
import { useApp } from "../../context/AppContext";
import { type BloodGroup } from "../../data/mockData";

const areas = ["All", "Andheri", "Bandra", "Borivali", "Thane", "Mulund", "Ghatkopar", "Dadar", "Kurla"];
const groups = ["All", "O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"] as const;

export default function NGODonors() {
  const { donors } = useApp();
  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState("All");
  const [groupFilter, setGroupFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const filtered = donors.filter((d) => {
    if (search && !d.name.toLowerCase().includes(search.toLowerCase()) && !d.bloodGroup.includes(search)) return false;
    if (areaFilter !== "All" && d.area !== areaFilter) return false;
    if (groupFilter !== "All" && d.bloodGroup !== groupFilter) return false;
    if (statusFilter === "Available" && !d.available) return false;
    if (statusFilter === "Unavailable" && d.available) return false;
    return true;
  });

  return (
    <DashboardLayout>
      <PageHeader title="Donor Network" subtitle={`${donors.length} donors across your network.`} />

      {/* Filters */}
      <div className="bg-white rounded-xl border border-[#C0D2DE]/60 p-4 mb-6 space-y-3">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#021734]/30" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or blood group..."
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-[#C0D2DE] text-sm focus:outline-none focus:ring-2 focus:ring-[#036D7D]/30" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[#C0D2DE] text-sm focus:outline-none focus:ring-2 focus:ring-[#036D7D]/30 bg-white">
            <option value="All">All Status</option>
            <option value="Available">Available</option>
            <option value="Unavailable">Unavailable</option>
          </select>
        </div>
        <div className="flex gap-2 flex-wrap">
          {groups.map((g) => (
            <button key={g} onClick={() => setGroupFilter(g)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${groupFilter === g ? "bg-[#036D7D] text-white" : "bg-[#F0F6F8] text-[#021734]/60 hover:bg-[#C0D2DE]/40"}`}>
              {g}
            </button>
          ))}
          <span className="w-px bg-[#C0D2DE]" />
          {areas.map((a) => (
            <button key={a} onClick={() => setAreaFilter(a)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${areaFilter === a ? "bg-[#021734] text-white" : "bg-[#F0F6F8] text-[#021734]/60 hover:bg-[#C0D2DE]/40"}`}>
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Donor grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl border border-[#C0D2DE]/60 p-10 text-center">
            <User size={28} className="text-[#C0D2DE] mx-auto mb-3" />
            <p className="text-sm text-[#021734]/50">No donors match your filters.</p>
          </div>
        ) : filtered.map((d, i) => (
          <motion.div key={d.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="bg-white rounded-xl border border-[#C0D2DE]/60 p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#021734] text-white flex items-center justify-center font-bold flex-shrink-0">
                {d.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-[#021734] text-sm">{d.name}</p>
                  <Badge variant={d.available ? "active" : d.status === "Inactive" ? "inactive" : "unavailable"}
                    label={d.available ? "Available" : d.status} />
                </div>
                <div className="flex items-center gap-2 text-xs text-[#021734]/50 mt-1 flex-wrap">
                  <span className="font-mono font-semibold text-[#036D7D]">{d.bloodGroup}</span>
                  <span className="flex items-center gap-1"><MapPin size={10} />{d.area}</span>
                </div>
                <p className="text-xs text-[#021734]/40 mt-1">{d.donationsCount} donations</p>
              </div>
            </div>
            {d.matchScore && (
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-[#C0D2DE]/40 rounded-full overflow-hidden">
                  <div className="h-full bg-[#036D7D] rounded-full transition-all" style={{ width: `${d.matchScore}%` }} />
                </div>
                <span className="text-xs font-mono text-[#036D7D] font-semibold">{d.matchScore}%</span>
              </div>
            )}
            <p className="text-[10px] text-[#021734]/30 mt-1">Coordination score only</p>
          </motion.div>
        ))}
      </div>
    </DashboardLayout>
  );
}
