import DashboardLayout, { PageHeader } from "../../components/layout/DashboardLayout";
import { Droplets } from "lucide-react";

export default function DonorHistory() {
  return (
    <DashboardLayout>
      <PageHeader title="Donation History" subtitle="Your completed donations will appear here." />
      <div className="max-w-2xl space-y-3">
        <div className="bg-white rounded-xl border border-[#C0D2DE]/60 p-10 text-center">
          <Droplets size={28} className="text-[#C0D2DE] mx-auto mb-3" />
          <p className="text-sm text-[#021734]/50">No donation history is available yet.</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
