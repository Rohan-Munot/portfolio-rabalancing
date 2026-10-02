import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

type DatePickerProps = {
  value: Date | undefined
  onChange: (date: Date | undefined) => void
  disabled?: (date: Date) => boolean
  placeholder?: string
  className?: string
  "aria-label"?: string
}

export function DatePicker({
  value,
  onChange,
  disabled,
  placeholder = "Pick a date",
  className,
  "aria-label": ariaLabel,
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            aria-label={ariaLabel}
            className={cn(
              "h-9 w-full justify-start rounded-4xl border-input bg-input/30 px-3 text-left font-normal",
              !value && "text-muted-foreground",
              className,
            )}
          />
        }
      >
        <CalendarIcon className="size-4" />
        {value ? format(value, "dd MMM yyyy") : placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          disabled={disabled}
          captionLayout="dropdown"
          defaultMonth={value}
        />
      </PopoverContent>
    </Popover>
  )
}
