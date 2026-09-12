"use client";

import { FiMoreVertical } from "react-icons/fi";

import { DropdownList, type DropdownOption } from "@/components/ui/dropdown-list";

type CardMenuProps = {
  options: DropdownOption[];
  onSelect: (value: string) => void;
  label: string;
};

export function CardMenu({ options, onSelect, label }: CardMenuProps) {
  if (options.length === 0) return null;
  return (
    <DropdownList
      value=""
      placeholder="Actions"
      trigger={<FiMoreVertical className="h-4 w-4" />}
      options={options}
      onValueChange={onSelect}
      aria-label={label}
      // className="h-8 w-8 cursor-pointer shrink-0"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    />
  );
}
