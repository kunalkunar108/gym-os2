"use client";

export default function PrintReceiptButton() {
  return <button type="button" onClick={() => window.print()} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black">Print receipt</button>;
}
