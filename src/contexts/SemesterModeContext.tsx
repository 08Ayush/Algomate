'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
export type SemesterMode = 'odd' | 'even' | 'all';

interface SemesterModeContextType {
    /** Current mode: 'odd' | 'even' | 'all' */
    semesterMode: SemesterMode;
    /** Set the active mode and persist it */
    setSemesterMode: (mode: SemesterMode) => void;
    /** The actual semester numbers that are currently active */
    activeSemesters: number[];
    /** Returns true if a given semester number is active in the current mode */
    isSemesterActive: (sem: number) => boolean;
    /** Human-readable label for the current mode */
    modeLabel: string;
}

const ODD_SEMESTERS = [1, 3, 5, 7];
const EVEN_SEMESTERS = [2, 4, 6, 8];
const ALL_SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

const STORAGE_KEY = 'ac_semester_mode';

// ─── Context ──────────────────────────────────────────────────────────────────
const SemesterModeContext = createContext<SemesterModeContextType>({
    semesterMode: 'all',
    setSemesterMode: () => { },
    activeSemesters: ALL_SEMESTERS,
    isSemesterActive: () => true,
    modeLabel: 'All Semesters',
});

// ─── Provider ─────────────────────────────────────────────────────────────────
export function SemesterModeProvider({ children }: { children: ReactNode }) {
    const [semesterMode, setMode] = useState<SemesterMode>('all');

    // Read persisted value on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY) as SemesterMode | null;
            if (stored && ['odd', 'even', 'all'].includes(stored)) {
                setMode(stored);
            }
        } catch {
            // localStorage unavailable (SSR or private mode)
        }
    }, []);

    const setSemesterMode = (mode: SemesterMode) => {
        setMode(mode);
        try {
            localStorage.setItem(STORAGE_KEY, mode);
        } catch { }
    };

    const activeSemesters =
        semesterMode === 'odd' ? ODD_SEMESTERS :
            semesterMode === 'even' ? EVEN_SEMESTERS :
                ALL_SEMESTERS;

    const isSemesterActive = (sem: number) =>
        semesterMode === 'all' || activeSemesters.includes(sem);

    const modeLabel =
        semesterMode === 'odd' ? 'Odd Semesters (1,3,5,7)' :
            semesterMode === 'even' ? 'Even Semesters (2,4,6,8)' :
                'All Semesters';

    return (
        <SemesterModeContext.Provider
            value={{ semesterMode, setSemesterMode, activeSemesters, isSemesterActive, modeLabel }}
        >
            {children}
        </SemesterModeContext.Provider>
    );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useSemesterMode() {
    return useContext(SemesterModeContext);
}
