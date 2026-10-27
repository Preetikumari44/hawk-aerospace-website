import type { ReactNode } from "react";

export interface NavLink { title: string; href: string }
export interface FooterLink { text: string; href: string; newTab?: boolean }
export interface FooterColumn { title: string; links: FooterLink[] }
export interface LedgerRow { label: string; value: string; total?: boolean }
export interface FaqItem { id: number; question: string; answer: ReactNode }
export type FlagCode = "ee" | "fr" | "de" | "ie" | "nl" | "es" | "gb" | "in";
export type NoticeKind = "error" | "warn" | "success";
export interface Notice { kind: NoticeKind; message: string; okLabel?: string; onClose?: () => void }

/** Result of POST /api/career/applications (Java Spring Boot backend), mapped from its JSON response. */
export type SubmitResult =
  | { status: "ok" }
  | { status: "duplicate" }
  | { status: "error"; message: string }
  | { status: "failed" };
