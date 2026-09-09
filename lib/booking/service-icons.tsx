import { MapIcon, ShieldIcon, SproutIcon, VideoIcon } from "lucide-react";

import type { ServiceKey } from "./types";

// Icon per service, kept alongside (not inside) the plain data module so
// lib/booking/data.ts stays JSX-free. Used by the Choose Service selector.
export const SERVICE_ICONS: Record<ServiceKey, typeof VideoIcon> = {
  videography: VideoIcon,
  spraying: SproutIcon,
  mapping: MapIcon,
  surveillance: ShieldIcon,
};
