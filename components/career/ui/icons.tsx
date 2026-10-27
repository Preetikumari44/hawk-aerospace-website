import type { SVGProps } from "react";

const common = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;
type P = SVGProps<SVGSVGElement>;

export const ArrowRightIcon = (p: P) => (<svg {...common} strokeWidth={2.2} {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>);
export const ArrowLeftIcon = (p: P) => (<svg {...common} strokeWidth={2.2} {...p}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>);
export const MenuIcon = (p: P) => (<svg {...common} strokeWidth={2} {...p}><path d="M4 6h16M4 12h16M4 18h16" /></svg>);
export const CloseIcon = (p: P) => (<svg {...common} strokeWidth={2} {...p}><path d="M18 6L6 18M6 6l12 12" /></svg>);
export const GlobeIcon = (p: P) => (<svg {...common} strokeWidth={2} {...p}><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 000 20 14.5 14.5 0 000-20M2 12h20" /></svg>);
export const MailIcon = (p: P) => (<svg {...common} strokeWidth={2} {...p}><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7" /></svg>);
export const CapIcon = (p: P) => (<svg {...common} {...p}><path d="M22 10L12 5 2 10l10 5 10-5z" /><path d="M6 12v5c3 2 9 2 12 0v-5" /></svg>);
export const BriefcaseIcon = (p: P) => (<svg {...common} {...p}><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2M2 13h20" /></svg>);
export const DocCheckIcon = (p: P) => (<svg {...common} {...p}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6M9 15l2 2 4-4" /></svg>);
export const UsersIcon = (p: P) => (<svg {...common} {...p}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>);
export const RouteIcon = (p: P) => (<svg {...common} {...p}><circle cx="6" cy="19" r="3" /><path d="M9 19h8.5a3.5 3.5 0 000-7h-11a3.5 3.5 0 010-7H15" /><circle cx="18" cy="5" r="3" /></svg>);
export const UploadIcon = (p: P) => (<svg {...common} {...p}><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" /></svg>);
export const CheckCircleIcon = (p: P) => (<svg {...common} strokeWidth={2.4} {...p}><circle cx="12" cy="12" r="9" /><path d="M8 12.5l3 3 5-6" /></svg>);
export const AlertCircleIcon = (p: P) => (<svg {...common} strokeWidth={2.2} {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.5h.01" /></svg>);
export const WarnIcon = (p: P) => (<svg {...common} strokeWidth={2.2} {...p}><path d="M12 3.5l9.5 16.5h-19L12 3.5z" /><path d="M12 10v4.5M12 17.5h.01" /></svg>);
