import type { ReactNode } from "react";

const TONES = {
  info: "bg-status-open-bg text-status-open-fg",
  error: "bg-status-rejected-bg text-status-rejected-fg",
  success: "bg-status-approved-bg text-status-approved-fg",
} as const;

export function AuthAlert({
  tone,
  icon,
  children,
}: {
  tone: keyof typeof TONES;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`mb-4 flex items-start gap-2.5 rounded-lg px-3.5 py-3 text-sm leading-normal ${TONES[tone]}`}
    >
      <span className="mt-0.5 [&>svg]:size-[18px]">{icon}</span>
      <div>{children}</div>
    </div>
  );
}
