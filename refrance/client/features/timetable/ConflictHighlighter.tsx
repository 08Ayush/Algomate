import { ScheduledClass } from "@/store/api";

export function findConflicts(classes: ScheduledClass[]): number[] {
  const conflicts = new Set<number>();
  const byKey = new Map<string, ScheduledClass[]>();
  const keyFor = (c: ScheduledClass, dims: (keyof ScheduledClass)[]) =>
    dims.map((d) => String(c[d])).join("|") + "|" + c.time_slot_id;

  const dimsList: (keyof ScheduledClass)[][] = [
    ["faculty_id"],
    ["batch_id"],
    ["classroom_id"],
  ];

  for (const dims of dimsList) {
    byKey.clear();
    for (const c of classes) {
      const k = keyFor(c, dims);
      const arr = byKey.get(k) ?? [];
      arr.push(c);
      byKey.set(k, arr);
    }
    for (const [, group] of byKey) {
      if (group.length > 1) group.forEach((c) => conflicts.add(c.id));
    }
  }
  return [...conflicts];
}

export default function ConflictHighlighter({ classes }: { classes: ScheduledClass[] }) {
  const conflicts = findConflicts(classes);
  if (conflicts.length === 0) return (
    <div className="rounded-md border bg-green-50 text-green-800 px-4 py-2 text-sm">No conflicts detected</div>
  );
  return (
    <div className="rounded-md border bg-destructive/10 text-destructive px-4 py-2 text-sm">
      {conflicts.length} conflicts detected across faculty, batches, and classrooms.
    </div>
  );
}
