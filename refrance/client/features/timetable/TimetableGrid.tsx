import { ScheduledClass, TimeSlot } from "@/store/api";
import { cn } from "@/lib/utils";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
const HOURS = Array.from({ length: 10 }, (_, i) => 8 + i); // 08:00-18:00

export type TimetableGridProps = {
  classes: (ScheduledClass & { subject_name?: string; faculty_name?: string; room_name?: string; timeslot_detail?: TimeSlot })[];
  highlightConflicts?: boolean;
  conflicts?: number[]; // array of ScheduledClass IDs with conflicts
};

export function TimetableGrid({ classes, highlightConflicts, conflicts = [] }: TimetableGridProps) {
  const getCellClasses = (day: string, hour: number) => {
    return classes.filter((c) => {
      const ts = c.timeslot_detail;
      if (!ts) return false;
      const start = parseInt(ts.start_time.slice(0, 2));
      const end = parseInt(ts.end_time.slice(0, 2));
      return ts.day_of_week === day && hour >= start && hour < end;
    });
  };

  return (
    <div className="w-full overflow-auto">
      <div className="min-w-[900px]">
        <div className="grid timetable-grid">
          <div />
          {HOURS.map((h) => (
            <div key={h} className="sticky top-0 z-10 bg-background p-2 text-center text-xs font-semibold border-b">
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
          {DAYS.map((day) => (
            <div key={day} className="contents">
              <div className="sticky left-0 z-10 bg-background p-2 text-sm font-semibold border-r border-b">
                {day}
              </div>
              {HOURS.map((h) => {
                const cell = getCellClasses(day, h);
                return (
                  <div key={`${day}-${h}`} className="relative h-24 border-b border-r">
                    {cell.map((c) => (
                      <div
                        key={c.id}
                        className={cn(
                          "absolute inset-1 rounded-md p-2 text-xs text-primary-foreground bg-primary/90 shadow-sm",
                          highlightConflicts && conflicts.includes(c.id) && "bg-destructive/90",
                        )}
                      >
                        <div className="font-semibold leading-5 truncate">{c.subject_name ?? `Subject ${c.subject_id}`}</div>
                        <div className="opacity-90 truncate">{c.faculty_name ?? `Faculty ${c.faculty_id}`}</div>
                        <div className="opacity-80 truncate">{c.room_name ?? `Room ${c.classroom_id}`}</div>
                        <div className="opacity-70">{c.class_type}</div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
