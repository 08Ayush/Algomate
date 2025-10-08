import { Button } from "@/components/ui/button";
import { TimetableGrid } from "@/features/timetable/TimetableGrid";
import ConflictHighlighter from "@/features/timetable/ConflictHighlighter";
import { useGetTimetableByIdQuery, useListTimetablesQuery } from "@/store/api";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Bot, Plus, ArrowLeft } from "lucide-react";
import { NewGenerationButton } from "@/components/creator/NewGenerationButton";
import { SessionSelectionDashboard } from "@/components/creator/SessionSelectionDashboard";
import { SemesterSelectionDashboard } from "@/components/creator/SemesterSelectionDashboard";
import { SemesterTimetablePage } from "./SemesterTimetablePage";

export default function TimetablesPage() {
  const { data: timetablesRaw, isLoading } = useListTimetablesQuery({});
  const timetables = Array.isArray(timetablesRaw) ? timetablesRaw : (timetablesRaw && typeof timetablesRaw === 'object' && 'results' in timetablesRaw ? (timetablesRaw as any).results : timetablesRaw && typeof timetablesRaw === 'object' && 'data' in timetablesRaw ? (timetablesRaw as any).data : []);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showSessionSelection, setShowSessionSelection] = useState(true);
  const [showSemesterSelection, setShowSemesterSelection] = useState(false);
  const [selectedSession, setSelectedSession] = useState<'odd' | 'even' | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<string | null>(null);
  const { data: detailRaw } = useGetTimetableByIdQuery(selectedId!, { skip: !selectedId });
  const detail = detailRaw ?? undefined;
  const detailClasses = Array.isArray((detail as any)?.classes) ? (detail as any).classes : [];

  const handleSessionSelect = (sessionType: 'odd' | 'even') => {
    setSelectedSession(sessionType);
    setShowSessionSelection(false);
    setShowSemesterSelection(true);
  };

  const handleSemesterSelect = (semester: string) => {
    setSelectedSemester(semester);
    setShowSemesterSelection(false);
  };

  const handleBackToSessionSelection = () => {
    setShowSessionSelection(true);
    setShowSemesterSelection(false);
    setSelectedSession(null);
    setSelectedSemester(null);
    setSelectedId(null);
  };

  const handleBackToSemesterSelection = () => {
    setShowSemesterSelection(true);
    setSelectedSemester(null);
    setSelectedId(null);
  };

  // Show session selection dashboard first
  if (showSessionSelection) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-4 py-8">
          <SessionSelectionDashboard onSessionSelect={handleSessionSelect} />
        </div>
      </div>
    );
  }

  // Show semester selection after session is chosen
  if (showSemesterSelection && selectedSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-4 py-8">
          <SemesterSelectionDashboard 
            sessionType={selectedSession}
            onSemesterSelect={handleSemesterSelect}
            onBackToSessionSelection={handleBackToSessionSelection}
          />
        </div>
      </div>
    );
  }

  // Show semester timetable page after semester is chosen
  if (selectedSession && selectedSemester) {
    return (
      <SemesterTimetablePage 
        sessionType={selectedSession}
        semester={selectedSemester}
        onBack={handleBackToSemesterSelection}
      />
    );
  }

  // Show original timetable view (fallback)
  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleBackToSemesterSelection}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Semester Selection
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Timetables</h1>
            {selectedSession && selectedSemester && (
              <p className="text-sm text-muted-foreground">
                {selectedSession === 'odd' ? 'After Summer Session (Odd Semesters)' : 'Winter/Spring Session (Even Semesters)'} 
                {selectedSemester === 'all' ? ' - All Semesters' : ` - ${selectedSemester}${selectedSemester === '1' || selectedSemester === '21' || selectedSemester === '31' ? 'st' : selectedSemester === '2' || selectedSemester === '22' ? 'nd' : selectedSemester === '3' || selectedSemester === '23' ? 'rd' : 'th'} Semester`}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild className="gradient-primary">
            <Link to="/timetables/create">
              <Bot className="h-4 w-4 mr-2" />
              Create New Timetable
            </Link>
          </Button>
          <NewGenerationButton />
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-4">
        <div className="md:col-span-1 rounded-xl border p-4">
          <div className="text-sm font-semibold mb-2">All Timetables</div>
          <div className="space-y-2">
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : timetables.length === 0 ? (
              <div className="text-sm text-muted-foreground">None yet</div>
            ) : (
              timetables.map((t: any) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={`w-full text-left rounded-md border p-3 transition-colors ${selectedId === t.id ? "bg-secondary" : "hover:bg-accent"}`}
                >
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-muted-foreground flex gap-3 mt-1">
                    <span>{t.status}</span>
                    <span>QS: {t.quality_score?.toFixed?.(2) ?? "-"}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="md:col-span-3 space-y-4">
          {!selectedId ? (
            <div className="rounded-xl border p-6 text-sm text-muted-foreground">Select a timetable to view the grid.</div>
          ) : !detail ? (
            <div className="rounded-xl border p-6 text-sm text-muted-foreground">Loading timetable...</div>
          ) : (
            <>
              <ConflictHighlighter classes={detailClasses as any} />
              <div className="rounded-xl border p-4">
                <TimetableGrid classes={detailClasses as any} highlightConflicts />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
