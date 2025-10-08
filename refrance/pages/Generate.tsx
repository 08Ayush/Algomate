import { Button } from "@/components/ui/button";
import { useGenerateTimetableMutation, useGetGenerationStatusQuery } from "@/store/api";
import { useEffect, useState } from "react";

export default function GeneratePage() {
  const [generate, { isLoading }] = useGenerateTimetableMutation();
  const [taskId, setTaskId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { data: status } = useGetGenerationStatusQuery(taskId!, { skip: !taskId, pollingInterval: 1500 });

  useEffect(() => {
    if (status?.status === "SUCCESS" || status?.status === "FAILURE") {
      // stop polling by clearing taskId; user can navigate to the new timetable if provided
    }
  }, [status]);

  const onStart = async () => {
    setErrorMsg(null);
    try {
      const res = await generate({ name: `Run ${new Date().toISOString()}`, year: new Date().getFullYear(), semester: 1 }).unwrap();
      if (res?.task_id) setTaskId(res.task_id);
    } catch (err: any) {
      // RTK Query returns a serialized error object; surface the most useful fields
      const msg = err?.data?.error || err?.data || err?.error || err?.status || String(err);
      setErrorMsg(typeof msg === "string" ? msg : JSON.stringify(msg));
    }
  };

  return (
    <>
      <h1 className="text-2xl font-bold">Generate Timetable</h1>
      <p className="mt-2 text-muted-foreground">Triggers an asynchronous CSP + GA scheduling task via Celery. Track progress below.</p>

      <div className="mt-6 rounded-xl border p-6 space-y-4">
        <Button onClick={onStart} disabled={isLoading || !!taskId}>Start Generation</Button>

        {errorMsg && (
          <div className="rounded-md border p-4 bg-destructive/10 text-destructive text-sm">
            Error starting generation: {errorMsg}. This usually means the backend endpoint <code>/api/timetables/generate/</code> is not available. Ensure the Django API + Celery worker are running.
          </div>
        )}

        {taskId && (
          <div className="rounded-md border p-4">
            <div className="text-sm">Task ID: <span className="font-mono">{taskId}</span></div>
            <div className="mt-2 text-sm">Status: {status?.status ?? "PENDING"} {status?.progress ? `(${status.progress})` : ""}</div>
            {status?.status === "SUCCESS" && status.new_timetable_id && (
              <a className="mt-3 inline-block text-primary underline" href={`/timetables`}>View timetables</a>
            )}
            {status?.status === "FAILURE" && (
              <div className="mt-3 text-destructive">Generation failed{status.error ? `: ${status.error}` : ""}</div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
