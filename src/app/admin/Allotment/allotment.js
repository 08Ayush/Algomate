/**
 * Dynamic Elective Allotment Engine
 */
const runDynamicAllotment = (students, subjects, config) => {
    // config could include { minCgpa: 6.0, allowSameDept: false }
    
    const results = {
        allotted: [],     // { studentId, subjectId, preferenceRank }
        rejected: [],     // { studentId, reason }
        subjectStats: {}  // Current Fill Rate
    };

    // 1. Initialize Subject Capacities (Dynamic based on current metadata)
    const subjectPool = new Map(subjects.map(s => [s.id, { 
        ...s, 
        currentSeats: s.maxCapacity 
    }]));

    // 2. Build the Global Priority Queue
    let applicationQueue = [];

    students.forEach(student => {
        student.preferences.forEach((subId, index) => {
            const subject = subjectPool.get(subId);

            // DYNAMIC VALIDATION: Check rules in real-time
            if (!subject) return; // Subject might have been deleted/hidden
            
            // Rule: Cannot take elective from own department
            if (student.departmentId === subject.hostDeptId) return;

            applicationQueue.push({
                studentId: student.id,
                studentCgpa: student.cgpa,
                timestamp: new Date(student.submittedAt).getTime(),
                subjectId: subId,
                preferenceRank: index + 1 // 1 for Choice 1, etc.
            });
        });
    });

    // 3. THE SORTING STRATEGY (The Heart of the Admin Logic)
    // We prioritize Choice first, then Merit (CGPA), then Speed (Timestamp)
    applicationQueue.sort((a, b) => {
        if (a.preferenceRank !== b.preferenceRank) 
            return a.preferenceRank - b.preferenceRank;
        
        if (b.studentCgpa !== a.studentCgpa) 
            return b.studentCgpa - a.studentCgpa;
        
        return a.timestamp - b.timestamp;
    });

    // 4. THE ALLOTMENT LOOP
    const processedStudents = new Set();

    applicationQueue.forEach(app => {
        const subject = subjectPool.get(app.subjectId);

        // Check if student already got a higher preference or subject is full
        if (!processedStudents.has(app.studentId) && subject.currentSeats > 0) {
            results.allotted.push({
                studentId: app.studentId,
                subjectId: app.subjectId,
                prefRank: app.preferenceRank,
                cgpa: app.studentCgpa
            });

            // Update state dynamically
            subject.currentSeats -= 1;
            processedStudents.add(app.studentId);
        }
    });

    // 5. Identify Unallotted Students (For Admin Manual Intervention)
    students.forEach(s => {
        if (!processedStudents.has(s.id)) {
            results.rejected.push({ studentId: s.id, reason: "Capacities Full / Rules Violated" });
        }
    });

    return results;
};