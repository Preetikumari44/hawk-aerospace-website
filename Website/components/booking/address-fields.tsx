"use client";

import type { DetailedAddress } from "@/lib/booking/types";

const inputClass =
  "border-border/70 bg-background/60 focus:border-brand/60 focus:ring-ring h-11 w-full rounded-md border px-3 text-sm outline-none transition-colors focus:ring-1";

interface AddressFieldsProps {
  value: DetailedAddress;
  onChange: (value: DetailedAddress) => void;
}

export function AddressFields({ value, onChange }: AddressFieldsProps) {
  function set(key: keyof DetailedAddress, v: string) {
    onChange({ ...value, [key]: v });
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="booking-address-1" className="text-foreground text-sm font-medium">
        Detailed Address
      </label>
      <input
        id="booking-address-1"
        value={value.addressLine1}
        onChange={(e) => set("addressLine1", e.target.value)}
        placeholder="Flat / house no., street, landmark"
        className={inputClass}
        autoComplete="street-address"
      />
      <input
        id="booking-address-2"
        value={value.addressLine2}
        onChange={(e) => set("addressLine2", e.target.value)}
        placeholder="Area, locality (optional)"
        className={inputClass}
        aria-label="Address line 2"
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          value={value.city}
          onChange={(e) => set("city", e.target.value)}
          placeholder="City"
          className={inputClass}
          aria-label="City"
          autoComplete="address-level2"
        />
        <input
          value={value.state}
          onChange={(e) => set("state", e.target.value)}
          placeholder="State"
          className={inputClass}
          aria-label="State"
          autoComplete="address-level1"
        />
      </div>
      <input
        value={value.pincode}
        onChange={(e) => set("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
        placeholder="Pincode"
        className={inputClass}
        aria-label="Pincode"
        inputMode="numeric"
        autoComplete="postal-code"
      />
    </div>
  );
}
