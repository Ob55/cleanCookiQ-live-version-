import { useState, useMemo } from "react";
import { KENYA_COUNTIES } from "@/lib/counties";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CountyComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
}

export default function CountyCombobox({ value, onValueChange }: CountyComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return KENYA_COUNTIES;
    const q = search.toLowerCase();
    return KENYA_COUNTIES.filter(c => c.toLowerCase().includes(q));
  }, [search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between mt-1 font-normal">
          {value || "Select county..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <div className="p-2">
          <Input
            placeholder="Search county..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9"
            autoFocus
          />
        </div>
        <ScrollArea className="h-[200px]">
          <div className="p-1">
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground px-2 py-4 text-center">No county found.</p>
            )}
            {filtered.map(county => (
              <button
                key={county}
                className={cn(
                  "flex items-center gap-2 w-full rounded-sm px-2 py-1.5 text-sm hover:bg-accent cursor-pointer",
                  value === county && "bg-accent"
                )}
                onClick={() => { onValueChange(county); setOpen(false); setSearch(""); }}
              >
                <Check className={cn("h-4 w-4", value === county ? "opacity-100" : "opacity-0")} />
                {county}
              </button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
