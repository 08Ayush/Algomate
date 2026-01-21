export interface GenerationInput {
    subjects: any[];
    facultyQualifications: any[];
    classrooms: any[];
    labs: any[];
    semester: number;
    batchInfo: any;
}

export class TimetableGenerationService {
    generate(data: GenerationInput) {
        return this.generateOptimalTimetable(data);
    }

    private generateOptimalTimetable(data: GenerationInput) {
        const { subjects, facultyQualifications, classrooms, labs, semester, batchInfo } = data;

        const schedule: any[] = [];
        const conflicts: any[] = [];
        const facultyWorkload = new Map<string, number>();
        const subjectHoursAssigned = new Map<string, number>();

        // CONSTRAINT: Track which days already have labs (max 1 lab per day)
        const labScheduledDays = new Set<string>();

        // Time slots configuration - matching database structure
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const timeSlots = [
            { time: '09:00', displayTime: '9:00-10:00', slot: 1 },
            { time: '10:00', displayTime: '10:00-11:00', slot: 2 },
            { time: '11:15', displayTime: '11:15-12:15', slot: 3 }, // After break
            { time: '12:15', displayTime: '12:15-1:15', slot: 4 },
            { time: '14:15', displayTime: '2:15-3:15', slot: 5 }, // After lunch
            { time: '15:15', displayTime: '3:15-4:15', slot: 6 }
        ];

        const TOTAL_SLOTS = days.length * timeSlots.length;
        const TARGET_CLASSES = TOTAL_SLOTS;

        // Sort subjects: Theory first, then labs. Higher credits first
        const sortedSubjects = [...subjects].sort((a, b) => {
            if (a.subject_type === 'LAB' && b.subject_type !== 'LAB') return 1;
            if (a.subject_type !== 'LAB' && b.subject_type === 'LAB') return -1;
            return (b.credits_per_week || 4) - (a.credits_per_week || 4);
        });

        let scheduleIndex = 0;

        // PHASE 1: Assign minimum required hours
        for (const subject of sortedSubjects) {
            const creditsNeeded = subject.credits_per_week || 4;
            const isLab = subject.subject_type === 'LAB' || subject.subject_type === 'PRACTICAL';
            const minSessionsNeeded = isLab ? Math.ceil(creditsNeeded / 2) : creditsNeeded;

            const qualifiedFaculty = facultyQualifications.filter(
                (fq: any) => fq.subject_id === subject.id
            );

            if (qualifiedFaculty.length === 0) {
                conflicts.push({
                    type: 'no_faculty',
                    subject: subject.name,
                    message: `No qualified faculty found for ${subject.name}`
                });
                continue;
            }

            const bestFaculty = qualifiedFaculty.sort((a: any, b: any) => {
                const loadA = facultyWorkload.get(a.faculty_id) || 0;
                const loadB = facultyWorkload.get(b.faculty_id) || 0;
                if (loadA !== loadB) return loadA - loadB;
                return (b.proficiency_level || 7) - (a.proficiency_level || 7);
            })[0];

            const faculty = Array.isArray(bestFaculty.faculty)
                ? bestFaculty.faculty[0]
                : bestFaculty.faculty;

            if (!faculty) {
                conflicts.push({
                    type: 'faculty_data_error',
                    subject: subject.name,
                    message: `Faculty data missing for ${subject.name}`
                });
                continue;
            }

            let availableRooms = isLab ? labs : classrooms;
            if (availableRooms.length === 0) {
                availableRooms = isLab ? classrooms : labs;
            }

            if (availableRooms.length === 0) {
                conflicts.push({
                    type: 'no_room',
                    subject: subject.name,
                    message: `No rooms available for ${subject.name}`
                });
                continue;
            }

            const classroom = availableRooms.find((room: any) => {
                if (subject.requires_projector && !room.has_projector) return false;
                return room.capacity >= (batchInfo?.expected_strength || 60);
            }) || availableRooms[0];

            let sessionsAssigned = 0;

            for (let dayIdx = 0; dayIdx < days.length && sessionsAssigned < minSessionsNeeded; dayIdx++) {
                const day = days[dayIdx];

                if (isLab && labScheduledDays.has(day)) continue;

                for (let slotIdx = 0; slotIdx < timeSlots.length && sessionsAssigned < minSessionsNeeded; slotIdx++) {
                    const timeSlot = timeSlots[slotIdx];

                    const slotTaken = schedule.some(
                        s => s.day === day && s.time === timeSlot.time
                    );
                    const facultyBusy = schedule.some(
                        s => s.day === day && s.time === timeSlot.time && s.faculty_id === faculty.id
                    );
                    const classroomBusy = classroom && schedule.some(
                        s => s.day === day && s.time === timeSlot.time && s.classroom_id === classroom.id
                    );

                    if (!slotTaken && !facultyBusy && !classroomBusy) {
                        if (isLab && slotIdx < timeSlots.length - 1) {
                            const nextSlot = timeSlots[slotIdx + 1];
                            const nextSlotTaken = schedule.some(
                                s => s.day === day && s.time === nextSlot.time
                            );
                            const nextFacultyBusy = schedule.some(
                                s => s.day === day && s.time === nextSlot.time && s.faculty_id === faculty.id
                            );
                            const nextClassroomBusy = classroom && schedule.some(
                                s => s.day === day && s.time === nextSlot.time && s.classroom_id === classroom.id
                            );

                            if (!nextSlotTaken && !nextFacultyBusy && !nextClassroomBusy) {
                                schedule.push({
                                    id: `schedule-${scheduleIndex++}`,
                                    subject_id: subject.id,
                                    subject_name: subject.name,
                                    subject_code: subject.code,
                                    subject_type: subject.subject_type,
                                    faculty_id: faculty.id,
                                    faculty_name: `${faculty.first_name} ${faculty.last_name}`,
                                    classroom_id: classroom?.id || null,
                                    classroom_name: classroom?.name || 'TBA',
                                    day: day,
                                    time: timeSlot.time,
                                    displayTime: timeSlot.displayTime,
                                    duration: 2,
                                    semester: semester,
                                    is_lab: true,
                                    session_number: sessionsAssigned + 1
                                });

                                schedule.push({
                                    id: `schedule-${scheduleIndex++}`,
                                    subject_id: subject.id,
                                    subject_name: `${subject.name} (Lab cont.)`,
                                    subject_code: subject.code,
                                    subject_type: subject.subject_type,
                                    faculty_id: faculty.id,
                                    faculty_name: `${faculty.first_name} ${faculty.last_name}`,
                                    classroom_id: classroom?.id || null,
                                    classroom_name: classroom?.name || 'TBA',
                                    day: day,
                                    time: nextSlot.time,
                                    displayTime: nextSlot.displayTime,
                                    duration: 1,
                                    semester: semester,
                                    is_lab: true,
                                    is_continuation: true,
                                    session_number: sessionsAssigned + 1
                                });

                                facultyWorkload.set(faculty.id, (facultyWorkload.get(faculty.id) || 0) + 2);
                                subjectHoursAssigned.set(subject.id, (subjectHoursAssigned.get(subject.id) || 0) + 2);
                                sessionsAssigned += 1;
                                labScheduledDays.add(day);
                                slotIdx++;
                                continue;
                            }
                        }

                        schedule.push({
                            id: `schedule-${scheduleIndex++}`,
                            subject_id: subject.id,
                            subject_name: subject.name,
                            subject_code: subject.code,
                            subject_type: subject.subject_type,
                            faculty_id: faculty.id,
                            faculty_name: `${faculty.first_name} ${faculty.last_name}`,
                            classroom_id: classroom?.id || null,
                            classroom_name: classroom?.name || 'TBA',
                            day: day,
                            time: timeSlot.time,
                            displayTime: timeSlot.displayTime,
                            duration: 1,
                            semester: semester,
                            is_lab: false,
                            session_number: sessionsAssigned + 1
                        });

                        facultyWorkload.set(faculty.id, (facultyWorkload.get(faculty.id) || 0) + 1);
                        subjectHoursAssigned.set(subject.id, (subjectHoursAssigned.get(subject.id) || 0) + 1);
                        sessionsAssigned++;
                    }
                }
            }

            if (sessionsAssigned < minSessionsNeeded) {
                conflicts.push({
                    type: 'insufficient_slots',
                    subject: subject.name,
                    required: minSessionsNeeded,
                    assigned: sessionsAssigned,
                    message: `Could only assign ${sessionsAssigned} out of ${minSessionsNeeded} required sessions for ${subject.name}`
                });
            }
        }

        // PHASE 2: Fill remaining slots
        let attempts = 0;
        const maxAttempts = 200;

        while (schedule.length < TARGET_CLASSES && attempts < maxAttempts) {
            attempts++;
            let slotFilled = false;

            for (const day of days) {
                for (const timeSlot of timeSlots) {
                    if (schedule.length >= TARGET_CLASSES) break;

                    const slotTaken = schedule.some(s => s.day === day && s.time === timeSlot.time);
                    if (slotTaken) continue;

                    const eligibleSubjects = sortedSubjects.filter(subject => {
                        const isLab = subject.subject_type === 'LAB' || subject.subject_type === 'PRACTICAL';
                        const hoursAssigned = subjectHoursAssigned.get(subject.id) || 0;
                        const minRequired = subject.credits_per_week || 3;
                        if (isLab) return hoursAssigned < minRequired;
                        return true;
                    });

                    const subjectsByHours = [...eligibleSubjects].sort((a, b) => {
                        const hoursA = subjectHoursAssigned.get(a.id) || 0;
                        const hoursB = subjectHoursAssigned.get(b.id) || 0;
                        return hoursA - hoursB;
                    });

                    for (const subject of subjectsByHours) {
                        const isLab = subject.subject_type === 'LAB' || subject.subject_type === 'PRACTICAL';
                        const qualifiedFaculty = facultyQualifications.filter(
                            (fq: any) => fq.subject_id === subject.id
                        );
                        if (qualifiedFaculty.length === 0) continue;

                        const availableFaculty = qualifiedFaculty.sort((a: any, b: any) => {
                            const loadA = facultyWorkload.get(a.faculty_id) || 0;
                            const loadB = facultyWorkload.get(b.faculty_id) || 0;
                            return loadA - loadB;
                        });

                        let classAdded = false;

                        for (const fq of availableFaculty) {
                            const faculty = Array.isArray(fq.faculty) ? fq.faculty[0] : fq.faculty;
                            if (!faculty) continue;

                            const facultyBusy = schedule.some(
                                s => s.day === day && s.time === timeSlot.time && s.faculty_id === faculty.id
                            );
                            if (facultyBusy) continue;

                            let availableRooms = isLab ? labs : classrooms;
                            if (availableRooms.length === 0) availableRooms = isLab ? classrooms : labs;
                            if (availableRooms.length === 0) continue;

                            let classroom = availableRooms.find((room: any) => {
                                const roomBusy = schedule.some(
                                    s => s.day === day && s.time === timeSlot.time && s.classroom_id === room.id
                                );
                                const hasProjector = subject.requires_projector ? room.has_projector : true;
                                const hasCapacity = room.capacity >= (batchInfo?.expected_strength || 60);
                                return !roomBusy && hasProjector && hasCapacity;
                            });

                            if (!classroom) {
                                classroom = availableRooms.find((room: any) => {
                                    const roomBusy = schedule.some(
                                        s => s.day === day && s.time === timeSlot.time && s.classroom_id === room.id
                                    );
                                    return !roomBusy;
                                });
                            }

                            if (!classroom) continue;

                            const currentHours = subjectHoursAssigned.get(subject.id) || 0;
                            const currentSlotIndex = timeSlots.findIndex(ts => ts.time === timeSlot.time);

                            if (isLab && labScheduledDays.has(day)) continue;

                            if (isLab && currentSlotIndex < timeSlots.length - 1) {
                                const nextSlot = timeSlots[currentSlotIndex + 1];
                                const nextSlotTaken = schedule.some(s => s.day === day && s.time === nextSlot.time);
                                const nextFacultyBusy = schedule.some(
                                    s => s.day === day && s.time === nextSlot.time && s.faculty_id === faculty.id
                                );
                                const nextRoomBusy = schedule.some(
                                    s => s.day === day && s.time === nextSlot.time && s.classroom_id === classroom.id
                                );

                                if (!nextSlotTaken && !nextFacultyBusy && !nextRoomBusy) {
                                    schedule.push({
                                        id: `schedule-${scheduleIndex++}`,
                                        subject_id: subject.id,
                                        subject_name: subject.name,
                                        subject_code: subject.code,
                                        subject_type: subject.subject_type,
                                        faculty_id: faculty.id,
                                        faculty_name: `${faculty.first_name} ${faculty.last_name}`,
                                        classroom_id: classroom?.id || null,
                                        classroom_name: classroom?.name || 'TBA',
                                        day: day,
                                        time: timeSlot.time,
                                        displayTime: timeSlot.displayTime,
                                        duration: 2,
                                        semester: semester,
                                        is_lab: true,
                                        session_number: currentHours + 1
                                    });

                                    schedule.push({
                                        id: `schedule-${scheduleIndex++}`,
                                        subject_id: subject.id,
                                        subject_name: `${subject.name} (Lab cont.)`,
                                        subject_code: subject.code,
                                        subject_type: subject.subject_type,
                                        faculty_id: faculty.id,
                                        faculty_name: `${faculty.first_name} ${faculty.last_name}`,
                                        classroom_id: classroom?.id || null,
                                        classroom_name: classroom?.name || 'TBA',
                                        day: day,
                                        time: nextSlot.time,
                                        displayTime: nextSlot.displayTime,
                                        duration: 1,
                                        semester: semester,
                                        is_lab: true,
                                        is_continuation: true,
                                        session_number: currentHours + 1
                                    });

                                    facultyWorkload.set(faculty.id, (facultyWorkload.get(faculty.id) || 0) + 2);
                                    subjectHoursAssigned.set(subject.id, currentHours + 2);
                                    slotFilled = true;
                                    classAdded = true;
                                    labScheduledDays.add(day);
                                    break;
                                }
                            }

                            schedule.push({
                                id: `schedule-${scheduleIndex++}`,
                                subject_id: subject.id,
                                subject_name: subject.name,
                                subject_code: subject.code,
                                subject_type: subject.subject_type,
                                faculty_id: faculty.id,
                                faculty_name: `${faculty.first_name} ${faculty.last_name}`,
                                classroom_id: classroom?.id || null,
                                classroom_name: classroom?.name || 'TBA',
                                day: day,
                                time: timeSlot.time,
                                displayTime: timeSlot.displayTime,
                                duration: 1,
                                semester: semester,
                                is_lab: isLab,
                                session_number: currentHours + 1
                            });

                            facultyWorkload.set(faculty.id, (facultyWorkload.get(faculty.id) || 0) + 1);
                            subjectHoursAssigned.set(subject.id, currentHours + 1);
                            slotFilled = true;
                            classAdded = true;
                            break;
                        }

                        if (classAdded) break;
                    }

                    if (schedule.length >= TARGET_CLASSES) break;
                }
            }
            if (!slotFilled) break;
        }

        const uniqueFaculty = new Set(schedule.map(s => s.faculty_id)).size;
        const uniqueSubjects = new Set(schedule.map(s => s.subject_id)).size;

        const statistics = {
            totalSubjects: subjects.length,
            totalAssignments: schedule.length,
            uniqueSessions: schedule.filter(s => !s.is_continuation).length,
            theoryAssignments: schedule.filter((s: any) => !s.is_lab && !s.is_continuation).length,
            labAssignments: schedule.filter((s: any) => s.is_lab && !s.is_continuation).length,
            facultyUtilization: Array.from(facultyWorkload.entries()).map(([id, hours]) => {
                const facultyInfo = facultyQualifications.find((f: any) => f.faculty_id === id);
                const faculty = facultyInfo?.faculty;
                return {
                    faculty_id: id,
                    faculty_name: faculty ? `${faculty.first_name} ${faculty.last_name}` : 'Unknown',
                    hours_assigned: hours
                };
            }),
            subjectDistribution: Array.from(subjectHoursAssigned.entries()).map(([id, hours]) => {
                const subject = subjects.find((s: any) => s.id === id);
                return {
                    subject_id: id,
                    subject_name: subject?.name || 'Unknown',
                    subject_code: subject?.code || 'N/A',
                    hours_assigned: hours
                };
            }),
            conflictsDetected: conflicts.length,
            completionRate: ((schedule.length / TARGET_CLASSES) * 100).toFixed(1),
            gridCoverage: ((schedule.length / TOTAL_SLOTS) * 100).toFixed(1),
            facultyCount: uniqueFaculty,
            subjectsScheduled: uniqueSubjects,
            targetClasses: TARGET_CLASSES,
            actualClasses: schedule.length
        };

        return { schedule, statistics, conflicts };
    }
}
