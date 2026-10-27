"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// One reusable confirmation used by the 9-dot workspace launcher for every
// non-current role — never a separate hardcoded dialog per role. The title
// and body text are generated from `roleTitle` so this same component covers
// Drone Pilot, Fleet Manager and Sales Aggregator.
//
// Only Customer has a live login/session in this phase (see
// lib/booking/demo-accounts.ts). The other three workspaces are already
// fully built routes (app/pilot, app/admin, app/workspaces/sales) rather
// than "Coming Soon" stubs, so confirming here navigates straight to that
// workspace — there is nothing fake to gate behind an application form yet.
// A future phase wires this confirmation to the real role-application
// (Google Form) flow instead of navigating directly.

interface RoleSwitchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roleTitle: string;
  onConfirm: () => void;
}

export function RoleSwitchDialog({ open, onOpenChange, roleTitle, onConfirm }: RoleSwitchDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Switch to {roleTitle}?</DialogTitle>
          <DialogDescription>Do you want to switch to the {roleTitle} role?</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false);
              onConfirm();
            }}
          >
            Switch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
