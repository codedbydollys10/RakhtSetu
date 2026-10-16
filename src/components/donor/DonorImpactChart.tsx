import { motion } from "framer-motion"

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import {
  demoDonationActivity,
  demoImpactMetrics,
} from "../../data/donorDashboardData"

export default function DonorImpactChart() {
  return (
    <section className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-[#D8E3EA] bg-white p-5 shadow-[0_2px_8px_rgba(3,26,54,0.035)]"
      >
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#E51C3D]">
              DONATION & IMPACT
            </p>
            <h2 className="mt-1 font-display text-lg font-bold text-[#021734]">
              Donation Activity
            </h2>
            <p className="mt-1 text-xs text-[#617587]">
              Last six months · illustrative demo data
            </p>
          </div>
          <span className="rounded-full bg-[#FFF1F3] px-2.5 py-1 text-[10px] font-semibold text-[#C91836]">
            12 donations
          </span>
        </div>
        <div
          className="h-56 w-full"
          role="img"
          aria-label="Line chart showing illustrative demo donation activity over the last six months"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={demoDonationActivity}
              margin={{ top: 8, right: 8, left: -22, bottom: 0 }}
            >
              <CartesianGrid
                stroke="var(--divider)"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "var(--text-secondary)" }}
              />
              <Tooltip
                contentStyle={{
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--surface-elevated)",
                  color: "var(--text-primary)",
                  borderRadius: 10,
                  fontSize: 12,
                }}
              />
              <Line
                dataKey="donations"
                name="Donations"
                type="monotone"
                stroke="var(--brand)"
                strokeWidth={3}
                dot={{
                  r: 4,
                  fill: "var(--brand)",
                  stroke: "var(--surface)",
                  strokeWidth: 2,
                }}
                activeDot={{
                  r: 6,
                  fill: "var(--brand-hover)",
                  stroke: "var(--surface)",
                  strokeWidth: 2,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
      <div className="grid grid-cols-2 gap-3">
        {demoImpactMetrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className="flex flex-col justify-between rounded-xl border border-[#D8E3EA] bg-white p-4 shadow-[0_2px_8px_rgba(3,26,54,0.035)]"
          >
            <span className="h-1 w-8 rounded-full bg-[#E51C3D]" />
            <div className="mt-4">
              <p className="font-display text-2xl font-extrabold text-[#031A36]">
                {metric.value}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-[#617587]">
                {metric.label}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
