type Status = "Pending" | "Blending" | "Ready" | "Completed";

const config: Record<Status, { label: string; className: string }> = {
  Pending:   { label: "รอชำระ",    className: "bg-amber-100 text-amber-700" },
  Blending:  { label: "กำลังปั่น", className: "bg-blue-100 text-blue-700" },
  Ready:     { label: "พร้อมรับ",  className: "bg-green-100 text-green-700" },
  Completed: { label: "เสร็จแล้ว", className: "bg-zinc-100 text-zinc-500" },
};

export function OrderStatusBadge({ status }: { status: Status }) {
  const { label, className } = config[status] ?? config.Pending;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
