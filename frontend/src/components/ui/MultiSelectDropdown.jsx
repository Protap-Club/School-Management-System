import * as React from "react";
import { Check, ChevronDown, X, CheckSquare, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function MultiSelectDropdown({
  options = [],
  selected = [],
  onChange,
  placeholder = "Select options",
  label = "Options",
  className,
  disabled = false,
}) {
  const isAllSelected = options.length > 0 && selected.length === options.length;
  const isNoneSelected = selected.length === 0;

  const toggleOption = (value) => {
    const next = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value];
    onChange(next);
  };

  const toggleSelectAll = () => {
    if (isAllSelected) {
      onChange([]);
    } else {
      onChange(options.map((opt) => opt.value));
    }
  };

  const getDisplayLabel = () => {
    if (isNoneSelected) return placeholder;
    if (isAllSelected) return "All Selected";
    if (selected.length === 1) {
      const opt = options.find((o) => o.value === selected[0]);
      return opt ? opt.label : selected[0];
    }
    return `${selected.length} Selected`;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn(
            "flex h-12 w-full items-center justify-between overflow-hidden rounded-xl bg-white px-4 py-2 text-left text-sm font-semibold transition-all hover:bg-gray-50 focus:ring-2 focus:ring-primary/20",
            selected.length > 0 ? "border-primary/30 ring-1 ring-primary/10" : "border-gray-200",
            className
          )}
        >
          <div className="flex items-center gap-2 overflow-hidden truncate">
            {selected.length > 0 && (
              <Badge variant="secondary" className="h-5 rounded-md bg-primary/10 px-1.5 text-[10px] font-bold text-primary border-none">
                {selected.length}
              </Badge>
            )}
            <span className={cn("truncate", isNoneSelected ? "text-gray-400 font-medium" : "text-gray-900")}>
              {getDisplayLabel()}
            </span>
          </div>
          <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform text-gray-400", disabled && "opacity-50")} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[200px] p-1 shadow-xl rounded-xl z-[200]">
        <DropdownMenuCheckboxItem
          checked={isAllSelected}
          onSelect={(e) => e.preventDefault()}
          onCheckedChange={toggleSelectAll}
          className="font-bold text-primary focus:bg-primary/5 focus:text-primary rounded-lg flex items-center gap-2 [&>span[data-slot=dropdown-menu-checkbox-item-indicator]]:hidden"
        >
          <div className="flex items-center gap-2 flex-1">
            {isAllSelected ? (
              <CheckSquare className="h-4 w-4 text-primary" />
            ) : (
              <Square className="h-4 w-4 text-gray-300" />
            )}
            <span>Select All</span>
          </div>
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <div className="p-1">
          {options.map((option) => {
            const isSelected = selected.includes(option.value);
            return (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={isSelected}
                onSelect={(e) => e.preventDefault()}
                onCheckedChange={() => toggleOption(option.value)}
                className="rounded-lg transition-colors focus:bg-gray-50 flex items-center gap-2 [&>span[data-slot=dropdown-menu-checkbox-item-indicator]]:hidden"
              >
                <div className="flex items-center gap-2 flex-1">
                  {isSelected ? (
                    <CheckSquare className="h-4 w-4 text-primary" />
                  ) : (
                    <Square className="h-4 w-4 text-gray-300" />
                  )}
                  <span className={cn(isSelected ? "text-gray-900 font-medium" : "text-gray-600")}>
                    {option.label}
                  </span>
                </div>
              </DropdownMenuCheckboxItem>
            );
          })}
          {options.length === 0 && (
            <div className="px-2 py-4 text-center text-xs text-gray-400 italic">
              No options available
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
