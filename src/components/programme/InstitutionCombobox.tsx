import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useProgrammeInstitutions } from "@/hooks/usePrograms";
import { Check, ChevronsUpDown, Building2, X } from "lucide-react";

// A searchable dropdown of the institutions currently under a programme.
// Reused by the budget-item and engagement forms. Optional = a "None" entry.
export default function InstitutionCombobox({
  programmeId,
  value,
  onChange,
  placeholder = "Select institution",
}: {
  programmeId: string;
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
}) {
  const { data: institutions = [] } = useProgrammeInstitutions(programmeId);
  const [open, setOpen] = useState(false);
  const selected = institutions.find((i) => i.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between font-normal mt-1">
          <span className="flex items-center gap-2 truncate">
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate">{selected ? selected.name : placeholder}</span>
          </span>
          <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command
          filter={(itemValue, search) => (itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0)}
        >
          <CommandInput placeholder="Search institution…" />
          <CommandList>
            <CommandEmpty>No institution found.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="__none__" onSelect={() => { onChange(null); setOpen(false); }}>
                <Check className={`mr-2 h-4 w-4 ${value == null ? "opacity-100" : "opacity-0"}`} />
                <span className="text-muted-foreground">None</span>
              </CommandItem>
              {institutions.map((i) => (
                <CommandItem
                  key={i.id}
                  // include contact so search matches name OR contact
                  value={`${i.name} ${i.contact_person ?? ""} ${i.sub_county ?? ""}`}
                  onSelect={() => { onChange(i.id); setOpen(false); }}
                >
                  <Check className={`mr-2 h-4 w-4 ${value === i.id ? "opacity-100" : "opacity-0"}`} />
                  <span className="truncate">
                    {i.name}
                    {i.sub_county && <span className="text-muted-foreground"> · {i.sub_county}</span>}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Multi-select variant: choose several institutions for one record (e.g. a
// budget item shared across sites). Selected show as removable chips.
export function MultiInstitutionCombobox({
  programmeId,
  value,
  onChange,
  placeholder = "Select institutions",
}: {
  programmeId: string;
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
}) {
  const { data: institutions = [] } = useProgrammeInstitutions(programmeId);
  const [open, setOpen] = useState(false);
  const selected = institutions.filter((i) => value.includes(i.id));

  const toggle = (id: string) =>
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  return (
    <div className="mt-1 space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
            <span className="truncate text-muted-foreground">
              {value.length ? `${value.length} selected` : placeholder}
            </span>
            <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command filter={(itemValue, search) => (itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0)}>
            <CommandInput placeholder="Search institution…" />
            <CommandList>
              <CommandEmpty>No institution found.</CommandEmpty>
              <CommandGroup>
                {institutions.map((i) => (
                  <CommandItem
                    key={i.id}
                    value={`${i.name} ${i.contact_person ?? ""} ${i.sub_county ?? ""}`}
                    onSelect={() => toggle(i.id)}
                  >
                    <Check className={`mr-2 h-4 w-4 ${value.includes(i.id) ? "opacity-100" : "opacity-0"}`} />
                    <span className="truncate">
                      {i.name}
                      {i.sub_county && <span className="text-muted-foreground"> · {i.sub_county}</span>}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((i) => (
            <Badge key={i.id} variant="secondary" className="text-[10px] font-normal gap-1">
              <Building2 className="h-3 w-3" />{i.name}
              <button type="button" onClick={() => toggle(i.id)} className="ml-0.5 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
