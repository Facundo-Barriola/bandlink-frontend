import { Button } from "@/components/ui/button"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { SlidersHorizontal } from "lucide-react"

type Props = {
  value: "musico" | "estudio";
  onChange: (v: "musico" | "estudio") => void;
};
export function FilterButton({ value, onChange }: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-[#65558F] text-white hover:bg-[#54487b]"
          size="icon"
          variant="secondary"
          aria-label="Abrir filtros"
        >
          <SlidersHorizontal className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-4">
        <h4 className="mb-2 text-sm font-medium">Buscar por</h4>
        <RadioGroup value={value} onValueChange={(v) => onChange(v as any)}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="musico" id="musico" />
            <Label htmlFor="musico">Músico</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="estudio" id="estudio" />
            <Label htmlFor="estudio">Estudio</Label>
          </div>
        </RadioGroup>
      </PopoverContent>
    </Popover>
  )
}
