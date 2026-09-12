"use client";

import * as React from "react";

import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type DropdownOption = {
  value: string;
  label: string;
  icon?: string;
};

type DropdownListProps = Omit<
  React.SelectHTMLAttributes<HTMLSelectElement>,
  "value" | "onChange" | "children" | "onClick"
> & {
  options: DropdownOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  addLabel?: string;
  onAddNew?: () => void;
  trigger?: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLElement>;
};

const ADD_NEW_VALUE = "__add_new__";

export function DropdownList({
  options,
  value,
  onValueChange,
  placeholder,
  addLabel,
  onAddNew,
  trigger,
  className,
  onClick,
  ...rest
}: DropdownListProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    if (next === ADD_NEW_VALUE) {
      onAddNew?.();
      return;
    }
    onValueChange(next);
  };

  const optionNodes = (
    <>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
      {addLabel && onAddNew && <option value={ADD_NEW_VALUE}>+ {addLabel}</option>}
    </>
  );

  if (!trigger) {
    // ponytail: visible native select, label text only — emoji live in the
    // trigger/wrapper world, not inside <option>.
    return (
      <Select className={className} value={value} onChange={handleChange} {...rest}>
        {optionNodes}
      </Select>
    );
  }

  // ponytail: a real native <select> is overlaid invisibly on top of the
  // visible trigger icon, so the OS picker opens while the icon and the
  // options stay separate.
  const ariaLabel =
    (rest as React.SelectHTMLAttributes<HTMLSelectElement>)["aria-label"] ??
    placeholder ??
    "Actions";

  return (
    <div
      onClick={onClick}
      className={cn("relative inline-flex items-center justify-center", className)}
    >
      <span aria-hidden="true" className="pointer-events-none flex items-center justify-center">
        {trigger}
      </span>
      <Select
        {...rest}
        aria-label={ariaLabel}
        value={value}
        onChange={handleChange}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      >
        {optionNodes}
      </Select>
    </div>
  );
}
