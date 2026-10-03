import type { LucideIcon } from "lucide-react";

type Props = { icon: LucideIcon };

export default function GameIcon({ icon: Icon }: Props) {
  return <Icon size={20} strokeWidth={2} aria-hidden="true" focusable="false" style={{ display: "inline-block", verticalAlign: "middle", marginRight: 8, flexShrink: 0 }} />;
}
