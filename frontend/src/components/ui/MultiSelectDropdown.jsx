import * as React from "react";
import { Check, ChevronDown, X, CheckSquare, Square, Search } from "lucide-react";
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
  hideSelectAll = false,
}) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isAllSelected = options.length > 0 && selected.length === options.length;
  const isAllFilteredSelected = filteredOptions.length > 0 && 
    filteredOptions.every((opt) => selected.includes(opt.value));
  const isNoneSelected = selected.length === 0;

  const toggleOption = (value) => {
    const next = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value];
    onChange(next);
  };

  const toggleSelectAll = () => {
    if (searchTerm) {
      if (isAllFilteredSelected) {
        // Deselect only filtered ones
        onChange(selected.filter((val) => !filteredOptions.some((opt) => opt.value === val)));
      } else {
        // Select all filtered ones
        onChange([...new Set([...selected, ...filteredOptions.map((opt) => opt.value)])]);
      }
    } else {
      if (isAllSelected) {
        onChange([]);
      } else {
        onChange(options.map((opt) => opt.value));
      }
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
    <DropdownMenu onOpenChange={(open) => !open && setSearchTerm("")}>
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
        <div className="p-2 pb-1">
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder={`Search ${label.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-gray-100 bg-gray-50/50 py-1.5 pl-8 pr-2 text-xs font-bold outline-none transition-all focus:border-primary/20 focus:bg-white"
              onClick={(e) => e.stopPropagation()}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchTerm("");
                }}
                className="absolute right-2 text-gray-300 hover:text-gray-500"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
        {!hideSelectAll && (
          <>
            <DropdownMenuCheckboxItem
              checked={searchTerm ? isAllFilteredSelected : isAllSelected}
              onSelect={(e) => e.preventDefault()}
              onCheckedChange={toggleSelectAll}
              className="font-bold text-primary focus:bg-primary/5 focus:text-primary rounded-lg flex items-center gap-2 [&>span[data-slot=dropdown-menu-checkbox-item-indicator]]:hidden"
            >
              <div className="flex items-center gap-2 flex-1">
                {(searchTerm ? isAllFilteredSelected : isAllSelected) ? (
                  <CheckSquare className="h-4 w-4 text-primary" />
                ) : (
                  <Square className="h-4 w-4 text-gray-300" />
                )}
                <span>{searchTerm ? "Select Filtered" : "Select All"}</span>
              </div>
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
          </>
        )}
        <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => {
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
                    <span className={cn(isSelected ? "text-gray-900 font-bold" : "text-gray-600 font-bold")}>
                      {option.label}
                    </span>
                  </div>
                </DropdownMenuCheckboxItem>
              );
            })
          ) : (
            <div className="px-2 py-4 text-center text-xs text-gray-400 italic font-bold">
              No options found
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

