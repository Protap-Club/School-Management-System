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
}) {
  const [searchTerm, setSearchTerm] = React.useState("");
  
  const filteredOptions = React.useMemo(() => {
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

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
      <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[200px] p-1 shadow-xl rounded-xl z-[200] max-h-[350px] overflow-hidden flex flex-col">
        <div className="px-2 py-2 sticky top-0 bg-white z-10 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded-lg border border-gray-100 group focus-within:border-primary/30 transition-all">
            <Search size={14} className="text-gray-400 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder={`Search ${label.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent text-[11px] font-medium outline-none placeholder:text-gray-400"
              autoFocus
            />
            {searchTerm && (
              <button 
                type="button"
                onClick={() => setSearchTerm("")} 
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
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
          
          <DropdownMenuSeparator className="my-1" />

          {filteredOptions.map((option) => {
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
          
          {filteredOptions.length === 0 && (
            <div className="px-2 py-8 text-center bg-gray-50/50 rounded-lg border border-dashed border-gray-100 mt-1">
              <Search className="h-6 w-6 text-gray-300 mx-auto mb-2 opacity-50" />
              <div className="text-[11px] text-gray-400 font-medium italic">
                No results for "{searchTerm}"
              </div>
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

