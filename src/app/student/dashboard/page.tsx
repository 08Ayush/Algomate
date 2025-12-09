// 'use client';

// import React, { useState, useEffect } from 'react';
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { Button } from "@/components/ui/button";
// import { useRouter } from 'next/navigation';
// import { Header } from '@/components/Header';
// import { 
//   Calendar, 
//   Clock, 
//   MapPin,
//   BookOpen,
//   GraduationCap,
//   Building,
//   FileText,
//   FileSpreadsheet,
//   ChevronDown,
//   Loader2
// } from "lucide-react";

// // Types
// interface FacultyMember {
//   id: string;
//   first_name: string;
//   last_name: string;
//   email: string;
//   college_uid: string;
//   faculty_type?: string;
//   department_id: string;
//   departments?: {
//     name: string;
//     code: string;
//   };
// }

// interface DashboardData {
//   user: any;
//   additionalData: {
//     batch?: any;
//     batchId?: string;
//     facultyCount?: number;
//     facultyMembers?: FacultyMember[];
//   };
//   events: any[];
// }

// interface PublishedTimetable {
//   id: string;
//   title: string;
//   academic_year: string;
//   semester: number;
//   fitness_score: number;
//   batches: {
//     id: string;
//     name: string;
//     section: string;
//     semester: number;
//   };
// }

// interface TimetableClass {
//   id: string;
//   subjectCode: string;
//   subjectName: string;
//   subjectType: string;
//   facultyName: string;
//   classroomName: string;
//   building: string;
//   day: string;
//   startTime: string;
//   endTime: string;
//   isBreak: boolean;
//   isLunch: boolean;
//   isLab: boolean;
//   isContinuation: boolean;
// }

// interface ElectiveBucket {
//   id: string;
//   bucket_name: string;
//   description?: string;
//   max_selection: number;
//   min_selection: number;
//   batch_id: string;
//   batches?: {
//     name: string;
//     semester: number;
//   };
//   created_at: string;
// }

// interface Subject {
//   id: string;
//   code: string;
//   name: string;
//   credits?: number;
//   credit_value?: number;
//   nep_category: string;
//   subject_type: string;
//   course_group_id: string;
//   semester: number;
//   description?: string;
// }

// interface StudentSelection {
//   id: string;
//   student_id: string;
//   subject_id: string;
//   semester: number;
//   academic_year: string;
//   selection_date: string;
//   subjects?: Subject;
// }

// export default function StudentDashboard() {
//   const router = useRouter();
//   const [user, setUser] = useState<any>(null);
//   const [loading, setLoading] = useState(true);
//   const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
//   const [publishedTimetables, setPublishedTimetables] = useState<PublishedTimetable[]>([]);
//   const [availableBatches, setAvailableBatches] = useState<any[]>([]);
//   const hasFetchedData = React.useRef(false);
//   const [selectedTimetable, setSelectedTimetable] = useState<PublishedTimetable | null>(null);
//   const [timetableClasses, setTimetableClasses] = useState<TimetableClass[]>([]);
//   const [timeSlots, setTimeSlots] = useState<string[]>([]);
//   const [days] = useState(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
//   const [loadingTimetable, setLoadingTimetable] = useState(false);
//   const [showFacultyList, setShowFacultyList] = useState(false);

//   // NEP Curriculum Selection States
//   const [electiveBuckets, setElectiveBuckets] = useState<ElectiveBucket[]>([]);
//   const [bucketSubjects, setBucketSubjects] = useState<{ [bucketId: string]: Subject[] }>({});
//   const [studentSelections, setStudentSelections] = useState<StudentSelection[]>([]);
//   const [selectedSubjects, setSelectedSubjects] = useState<{ [bucketId: string]: string[] }>({});
//   const [loadingBuckets, setLoadingBuckets] = useState(false);
//   const [loadingSelections, setLoadingSelections] = useState(false);
//   const [showNepCurriculum, setShowNepCurriculum] = useState(false);

//   useEffect(() => {
//     // Prevent duplicate fetches
//     if (hasFetchedData.current) {
//       return;
//     }

//     const userData = localStorage.getItem('user');
//     if (!userData) {
//       router.push('/login');
//       return;
//     }

//     const parsedUser = JSON.parse(userData);
    
//     // Allow students and general/guest faculty to access this dashboard
//     const isStudent = parsedUser.role === 'student';
//     const isGeneralFaculty = parsedUser.role === 'faculty' && 
//                             (parsedUser.faculty_type === 'general' || 
//                              parsedUser.faculty_type === 'guest' || 
//                              !parsedUser.faculty_type);
    
//     if (!isStudent && !isGeneralFaculty) {
//       router.push('/login');
//       return;
//     }

//     setUser(parsedUser);
//     fetchDashboardData(parsedUser);
//     hasFetchedData.current = true;
//   }, [router]);

//   // Fetch NEP curriculum data when dashboard data is loaded
//   useEffect(() => {
//     if (user?.role === 'student' && dashboardData?.additionalData?.batch && !loadingBuckets && electiveBuckets.length === 0 && hasFetchedData.current) {
//       console.log('🎓 Fetching NEP curriculum data...');
//       fetchNepCurriculumData(user);
//     }
//   }, [user?.id, dashboardData?.additionalData?.batchId, loadingBuckets, electiveBuckets.length]);

//   const fetchDashboardData = async (user: any) => {
//     try {
//       setLoading(true);
      
//       // Fetch user profile and events
//       const response = await fetch(
//         `/api/student/dashboard?userId=${user.id}&role=${user.role}`
//       );
      
//       if (!response.ok) {
//         throw new Error('Failed to fetch dashboard data');
//       }
      
//       const data = await response.json();
//       console.log('📥 Dashboard data received:', data);
//       setDashboardData(data);

//       // Update localStorage with complete user data including course info
//       let finalUser = user;
//       if (data.user) {
//         const updatedUser = {
//           ...user,
//           college_uid: data.user.college_uid,
//           current_semester: data.user.current_semester || data.additionalData?.batch?.semester,
//           course: data.user.course,
//           course_id: data.user.course_id
//         };
//         console.log('🔄 User course_id from API:', data.user.course_id, 'vs localStorage:', user.course_id);
//         localStorage.setItem('user', JSON.stringify(updatedUser));
//         finalUser = updatedUser;
//         setUser(updatedUser);
//       } else {
//         console.warn('⚠️ No user data in API response, keeping original user');
//       }

//       // Fetch published timetables for the course - use finalUser to ensure we have the latest course_id
//       const courseIdToUse = finalUser.course_id || user.course_id;
//       console.log('🔍 Fetching timetables with courseId:', courseIdToUse);
//       const timetablesResponse = await fetch(
//         `/api/student/published-timetables?courseId=${courseIdToUse}${user.role === 'student' && data.additionalData.batch ? `&semester=${data.additionalData.batch.semester}` : ''}`
//       );
      
//       if (timetablesResponse.ok) {
//         const timetablesData = await timetablesResponse.json();
//         console.log('📚 Published timetables received:', {
//           count: timetablesData.timetables?.length || 0,
//           timetables: timetablesData.timetables,
//           batches: timetablesData.batches?.length || 0
//         });
        
//         // Only update if we actually got data
//         if (timetablesData.timetables) {
//           setPublishedTimetables(timetablesData.timetables);
//         }
//         if (timetablesData.batches) {
//           setAvailableBatches(timetablesData.batches);
//         }
        
//         // Auto-select student's own timetable or first available
//         if (user.role === 'student' && data.additionalData.batchId) {
//           const studentTimetable = timetablesData.timetables.find(
//             (tt: PublishedTimetable) => tt.batches?.id === data.additionalData.batchId
//           );
//           if (studentTimetable) {
//             console.log('✅ Auto-selecting student timetable:', studentTimetable.id);
//             setSelectedTimetable(studentTimetable);
//             fetchTimetableClasses(studentTimetable.id);
//           } else {
//             console.warn('⚠️ No timetable found for student batch:', data.additionalData.batchId);
//           }
//         } else if (timetablesData.timetables.length > 0) {
//           console.log('✅ Auto-selecting first timetable:', timetablesData.timetables[0].id);
//           setSelectedTimetable(timetablesData.timetables[0]);
//           fetchTimetableClasses(timetablesData.timetables[0].id);
//         } else {
//           console.warn('⚠️ No published timetables available');
//         }
//       } else {
//         console.error('❌ Failed to fetch published timetables:', timetablesResponse.status);
//       }
//     } catch (error) {
//       console.error('Error fetching dashboard data:', error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchTimetableClasses = async (timetableId: string) => {
//     try {
//       setLoadingTimetable(true);
//       console.log('📅 Fetching timetable classes for timetableId:', timetableId);
//       const response = await fetch(
//         `/api/student/timetable-classes?timetableId=${timetableId}`
//       );
      
//       if (!response.ok) {
//         console.error('❌ Failed to fetch timetable classes:', response.status, response.statusText);
//         throw new Error('Failed to fetch timetable classes');
//       }
      
//       const data = await response.json();
//       console.log('✅ Timetable classes received:', {
//         classesCount: data.classes?.length || 0,
//         timeSlotsCount: data.timeSlots?.length || 0
//       });
//       setTimetableClasses(data.classes || []);
//       setTimeSlots(data.timeSlots || []);
//     } catch (error) {
//       console.error('❌ Error fetching timetable classes:', error);
//     } finally {
//       setLoadingTimetable(false);
//     }
//   };

//   const handleTimetableChange = (timetable: PublishedTimetable) => {
//     setSelectedTimetable(timetable);
//     fetchTimetableClasses(timetable.id);
//   };

//   // NEP Curriculum Functions
//   const fetchNepCurriculumData = async (user: any) => {
//     console.log('🎯 fetchNepCurriculumData called with user:', {
//       userId: user.id,
//       course_id: user.course_id,
//       email: user.email,
//       role: user.role
//     });
    
//     if (!dashboardData?.additionalData?.batch) {
//       console.error('❌ No batch data found in dashboardData:', dashboardData);
//       return;
//     }
    
//     try {
//       setLoadingBuckets(true);
      
//       // Get user's current semester from batch
//       const semester = dashboardData.additionalData.batch.semester;
//       const batchInfo = dashboardData.additionalData.batch;
      
//       console.log('📚 Fetching buckets with params:', {
//         courseId: user.course_id,
//         semester: semester,
//         studentId: user.id,
//         batchInfo: batchInfo
//       });
      
//       // Fetch elective buckets for student's semester using batchId
//       const bucketsResponse = await fetch(
//         `/api/nep/buckets?batchId=${dashboardData.additionalData.batchId}&studentId=${user.id}`
//       );
      
//       console.log('📡 Buckets API response status:', bucketsResponse.status);
      
//       if (bucketsResponse.ok) {
//         const bucketsData = await bucketsResponse.json();
//         console.log('✅ Buckets data received:', {
//           count: Array.isArray(bucketsData) ? bucketsData.length : 0,
//           data: bucketsData
//         });
        
//         setElectiveBuckets(bucketsData || []);
        
//         // Extract subjects from buckets response (subjects are already included)
//         const subjectsMap = (bucketsData || []).reduce((acc: any, bucket: any) => {
//           acc[bucket.id] = bucket.subjects || [];
//           console.log(`  Bucket "${bucket.bucket_name}" has ${bucket.subjects?.length || 0} subjects`);
//           return acc;
//         }, {} as { [bucketId: string]: Subject[] });
        
//         setBucketSubjects(subjectsMap);
//         console.log('✅ Final state:', {
//           bucketsCount: bucketsData.length,
//           totalSubjects: Object.values(subjectsMap).reduce((sum: number, subjects: any) => sum + subjects.length, 0)
//         });
//       } else {
//         const errorData = await bucketsResponse.json();
//         console.error('❌ Buckets API error:', errorData);
//       }
      
//       // Fetch student's existing selections
//       const selectionsResponse = await fetch(
//         `/api/student/selections?studentId=${user.id}&semester=${semester}`
//       );
      
//       if (selectionsResponse.ok) {
//         const selectionsData = await selectionsResponse.json();
//         setStudentSelections(selectionsData.selections || []);
        
//         // Initialize selected subjects state
//         const initialSelections = (selectionsData.selections || []).reduce((acc: any, selection: StudentSelection) => {
//           if (selection.subjects?.course_group_id) {
//             if (!acc[selection.subjects.course_group_id]) {
//               acc[selection.subjects.course_group_id] = [];
//             }
//             acc[selection.subjects.course_group_id].push(selection.subject_id);
//           }
//           return acc;
//         }, {});
        
//         setSelectedSubjects(initialSelections);
//       }
//     } catch (error) {
//       console.error('Error fetching NEP curriculum data:', error);
//     } finally {
//       setLoadingBuckets(false);
//     }
//   };

//   const handleSubjectSelection = async (bucketId: string, subjectId: string, isSelected: boolean) => {
//     try {
//       setLoadingSelections(true);
      
//       const bucket = electiveBuckets.find(b => b.id === bucketId);
//       if (!bucket) return;
      
//       const currentSelections = selectedSubjects[bucketId] || [];
      
//       if (isSelected) {
//         // Check if we can add more selections
//         if (currentSelections.length >= bucket.max_selection) {
//           alert(`You can only select ${bucket.max_selection} subjects from this bucket.`);
//           return;
//         }
        
//         // Add selection
//         const response = await fetch('/api/student/selections', {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({
//             student_id: user.id,
//             subject_id: subjectId,
//             semester: dashboardData?.additionalData?.batch?.semester,
//             academic_year: dashboardData?.additionalData?.batch?.academic_year || '2025-26'
//           })
//         });
        
//         if (response.ok) {
//           setSelectedSubjects(prev => ({
//             ...prev,
//             [bucketId]: [...currentSelections, subjectId]
//           }));
//         }
//       } else {
//         // Remove selection
//         const response = await fetch('/api/student/selections', {
//           method: 'DELETE',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({
//             student_id: user.id,
//             subject_id: subjectId
//           })
//         });
        
//         if (response.ok) {
//           setSelectedSubjects(prev => ({
//             ...prev,
//             [bucketId]: currentSelections.filter(id => id !== subjectId)
//           }));
//         }
//       }
//     } catch (error) {
//       console.error('Error handling subject selection:', error);
//     } finally {
//       setLoadingSelections(false);
//     }
//   };

//   const getClassForSlot = (day: string, timeSlot: string): TimetableClass | undefined => {
//     const [startTime] = timeSlot.split('-');
//     const normalizeTime = (time: string) => time.substring(0, 5);
    
//     return timetableClasses.find(
//       cls => cls.day === day && normalizeTime(cls.startTime) === normalizeTime(startTime)
//     );
//   };

//   const getClassColor = (subjectType: string, index: number) => {
//     const colors = [
//       'bg-blue-100 text-blue-800',
//       'bg-green-100 text-green-800',
//       'bg-purple-100 text-purple-800',
//       'bg-orange-100 text-orange-800',
//       'bg-red-100 text-red-800',
//       'bg-indigo-100 text-indigo-800',
//       'bg-teal-100 text-teal-800',
//       'bg-pink-100 text-pink-800',
//     ];
    
//     if (subjectType === 'LAB') {
//       return 'bg-indigo-100 text-indigo-800';
//     }
    
//     return colors[index % colors.length];
//   };

//   // Export to PDF function
//   const exportToPDF = () => {
//     if (!selectedTimetable) return;
    
//     let htmlContent = `
//       <html>
//         <head>
//           <title>Class Timetable - ${selectedTimetable.batches?.name} ${selectedTimetable.batches?.section}</title>
//           <style>
//             body { font-family: Arial, sans-serif; margin: 20px; }
//             h1 { color: #333; text-align: center; margin-bottom: 30px; }
//             table { width: 100%; border-collapse: collapse; margin: 20px 0; }
//             th, td { border: 1px solid #ddd; padding: 12px; text-align: center; }
//             th { background-color: #f5f5f5; font-weight: bold; }
//             .subject-cell { background-color: #f8f9fa; padding: 8px; }
//             .break-cell { background-color: #e9ecef; font-style: italic; }
//             .course-code { font-weight: bold; font-size: 0.9em; }
//             .course-title { font-size: 0.8em; margin: 2px 0; }
//             .faculty { font-size: 0.7em; color: #666; }
//             .room { font-size: 0.7em; color: #888; }
//           </style>
//         </head>
//         <body>
//           <h1>Weekly Class Schedule</h1>
//           <p style="text-align: center; margin-bottom: 20px;">
//             ${dashboardData?.user.department?.name} • Batch ${selectedTimetable.batches?.name} ${selectedTimetable.batches?.section} • ${selectedTimetable.academic_year}
//           </p>
//           <table>
//             <thead>
//               <tr>
//                 <th>Time / Day</th>`;
    
//     days.forEach(day => {
//       htmlContent += `<th>${day}</th>`;
//     });
    
//     htmlContent += `</tr></thead><tbody>`;
    
//     timeSlots.forEach(timeSlot => {
//       htmlContent += `<tr><td style="font-weight: bold; background-color: #f5f5f5;">${timeSlot}</td>`;
      
//       days.forEach(day => {
//         const slot = getClassForSlot(day, timeSlot);
//         if (!slot) {
//           htmlContent += '<td>-</td>';
//         } else if (slot.isBreak || slot.isLunch) {
//           htmlContent += `<td class="break-cell">${slot.isLunch ? 'Lunch Break' : 'Break'}</td>`;
//         } else {
//           htmlContent += `
//             <td class="subject-cell">
//               <div class="course-code">${slot.subjectCode}</div>
//               <div class="course-title">${slot.subjectName}</div>
//               <div class="faculty">${slot.facultyName}</div>
//               <div class="room">${slot.classroomName}</div>
//             </td>
//           `;
//         }
//       });
      
//       htmlContent += '</tr>';
//     });
    
//     htmlContent += `</tbody></table></body></html>`;

//     const blob = new Blob([htmlContent], { type: 'text/html' });
//     const url = URL.createObjectURL(blob);
//     const link = document.createElement('a');
//     link.href = url;
//     link.download = `timetable-${selectedTimetable.batches?.name}-${selectedTimetable.batches?.section}.html`;
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//     URL.revokeObjectURL(url);
//   };

//   // Export to Excel (CSV format)
//   const exportToExcel = () => {
//     if (!selectedTimetable) return;
    
//     let csvContent = `Weekly Class Schedule - ${selectedTimetable.batches?.name} ${selectedTimetable.batches?.section}\n`;
//     csvContent += `${dashboardData?.user.department?.name} • ${selectedTimetable.academic_year}\n\n`;
    
//     csvContent += 'Time / Day,' + days.join(',') + '\n';
    
//     timeSlots.forEach(timeSlot => {
//       let row = timeSlot;
//       days.forEach(day => {
//         const slot = getClassForSlot(day, timeSlot);
//         if (!slot) {
//           row += ',-';
//         } else if (slot.isBreak || slot.isLunch) {
//           row += `,"${slot.isLunch ? 'Lunch Break' : 'Break'}"`;
//         } else {
//           row += `,"${slot.subjectCode} - ${slot.subjectName} (${slot.facultyName}, ${slot.classroomName})"`;
//         }
//       });
//       csvContent += row + '\n';
//     });

//     const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
//     const url = URL.createObjectURL(blob);
//     const link = document.createElement('a');
//     link.href = url;
//     link.download = `timetable-${selectedTimetable.batches?.name}-${selectedTimetable.batches?.section}.csv`;
//     document.body.appendChild(link);
//     link.click();
//     document.body.removeChild(link);
//     URL.revokeObjectURL(url);
//   };

//   const getEventTypeColor = (type: string) => {
//     switch (type.toLowerCase()) {
//       case 'workshop': return 'bg-blue-100 text-blue-800 border-blue-200';
//       case 'event': return 'bg-green-100 text-green-800 border-green-200';
//       case 'seminar': return 'bg-purple-100 text-purple-800 border-purple-200';
//       case 'academic': return 'bg-orange-100 text-orange-800 border-orange-200';
//       default: return 'bg-gray-100 text-gray-800 border-gray-200';
//     }
//   };

//   if (!user || loading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
//         <div className="text-center">
//           <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
//           <p className="text-gray-600 dark:text-gray-300">Loading dashboard...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <>
//       <Header />
//       <div className="space-y-6 p-6">
//         {/* Welcome Section */}
//         <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-purple-950/20 rounded-2xl p-6 border border-blue-100 dark:border-blue-800">
//         <div className="flex items-center gap-4">
//           <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
//             <GraduationCap className="h-8 w-8 text-white" />
//           </div>
//           <div className="flex-1">
//             <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
//               Welcome back, {user?.first_name || user?.name || (user?.role === 'faculty' ? 'Faculty' : 'Student')}! 👋
//             </h1>
//             <p className="text-gray-600 dark:text-gray-300 mt-1">
//               {user?.role === 'faculty' 
//                 ? 'View your teaching schedule and department information'
//                 : 'Ready to explore your Computer Science Engineering dashboard'}
//             </p>
//             <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
//               {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
//             </p>
//           </div>
//           <div className="text-right">
//             <div className="text-sm text-gray-500 dark:text-gray-400">Your Course</div>
//             <Badge className="bg-blue-500 text-white mt-1">
//               {dashboardData?.user.course?.code || 'N/A'}
//             </Badge>
//             {user?.role === 'student' && dashboardData?.additionalData.batch?.semester && (
//               <div className="mt-2">
//                 <div className="text-sm text-gray-500 dark:text-gray-400">Current Semester</div>
//                 <Badge className="bg-green-500 text-white mt-1">
//                   Semester {dashboardData.additionalData.batch.semester}
//                 </Badge>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* Course Info Card */}
//       <Card className="border-blue-200 dark:border-blue-800">
//         <CardHeader>
//           <CardTitle className="flex items-center gap-2">
//             <BookOpen className="h-5 w-5 text-blue-600" />
//             {dashboardData?.user.course?.title || 'Course'}
//           </CardTitle>
//           <div className="text-sm text-gray-600 dark:text-gray-300">
//             {dashboardData?.user.college?.name || 'College'} • {dashboardData?.user.course?.nature_of_course || 'Program'}
//           </div>
//         </CardHeader>
//         <CardContent>
//           <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//             {user?.role === 'student' && (
//               <>
//                 <div className="text-center">
//                   <div className="text-2xl font-bold text-blue-600">
//                     {dashboardData?.additionalData.batch?.semester || user.current_semester || '-'}
//                   </div>
//                   <div className="text-sm text-gray-500">Current Semester</div>
//                 </div>
//                 <div className="text-center">
//                   <div className="text-2xl font-bold text-green-600">
//                     {dashboardData?.additionalData.batch?.course?.code
//                       ? `${dashboardData.additionalData.batch.course.code}-${dashboardData.additionalData.batch.section || 'A'}`
//                       : dashboardData?.additionalData.batch?.name && dashboardData?.additionalData.batch?.section 
//                       ? `${dashboardData.additionalData.batch.name} ${dashboardData.additionalData.batch.section}`
//                       : '-'}
//                   </div>
//                   <div className="text-sm text-gray-500">Batch</div>
//                 </div>
//                 <div className="text-center">
//                   <div className="text-2xl font-bold text-purple-600">
//                     {dashboardData?.user.college_uid?.toUpperCase() || user.college_uid?.toUpperCase() || user.email?.split('@')[0]?.toUpperCase() || '-'}
//                   </div>
//                   <div className="text-sm text-gray-500">UID</div>
//                 </div>
//               </>
//             )}
//             {user?.role === 'faculty' && (
//               <>
//                 <div className="text-center">
//                   <div className="text-2xl font-bold text-purple-600">
//                     {user.college_uid?.toUpperCase() || user.uid?.toUpperCase() || '-'}
//                   </div>
//                   <div className="text-sm text-gray-500">College UID</div>
//                 </div>
//                 <div className="text-center">
//                   <div className="text-2xl font-bold text-blue-600">
//                     {user.faculty_type?.toUpperCase() || 'GENERAL'}
//                   </div>
//                   <div className="text-sm text-gray-500">Faculty Type</div>
//                 </div>
//                 <div className="text-center">
//                   <div className="text-2xl font-bold text-green-600">
//                     {dashboardData?.user.department?.name || user.department_name || '-'}
//                   </div>
//                   <div className="text-sm text-gray-500">Department</div>
//                 </div>
//               </>
//             )}
//             <div className="text-center">
//               <div className="text-2xl font-bold text-orange-600 cursor-pointer hover:text-orange-700 transition-colors" onClick={() => setShowFacultyList(!showFacultyList)}>
//                 {dashboardData?.additionalData.facultyCount || 0}
//               </div>
//               <div className="text-sm text-gray-500">
//                 Faculty Members
//                 <button 
//                   onClick={() => setShowFacultyList(!showFacultyList)}
//                   className="ml-1 text-xs text-blue-600 hover:text-blue-700"
//                 >
//                   {showFacultyList ? '▼' : '▶'}
//                 </button>
//               </div>
//             </div>
//           </div>
          
//           {/* Faculty Members List */}
//           {showFacultyList && dashboardData?.additionalData.facultyMembers && dashboardData.additionalData.facultyMembers.length > 0 && (
//             <div className="mt-6 pt-6 border-t">
//               <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
//                 <GraduationCap className="h-5 w-5 text-orange-600" />
//                 Faculty Members ({dashboardData.additionalData.facultyCount})
//               </h3>
//               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
//                 {dashboardData.additionalData.facultyMembers.map((faculty: FacultyMember) => (
//                   <div key={faculty.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:shadow-md transition-shadow">
//                     <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-semibold">
//                       {faculty.first_name.charAt(0)}{faculty.last_name.charAt(0)}
//                     </div>
//                     <div className="flex-1 min-w-0">
//                       <div className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
//                         {faculty.first_name} {faculty.last_name}
//                       </div>
//                       <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
//                         {faculty.email}
//                       </div>
//                       <div className="flex items-center gap-2 mt-1">
//                         {faculty.faculty_type && (
//                           <Badge variant="outline" className="text-xs py-0 px-1">
//                             {faculty.faculty_type}
//                           </Badge>
//                         )}
//                         {faculty.departments && (
//                           <span className="text-xs text-gray-500 dark:text-gray-400">
//                             {faculty.departments.code}
//                           </span>
//                         )}
//                       </div>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           )}
//         </CardContent>
//       </Card>

//       {/* Upcoming Events Section */}
//       <Card>
//         <CardHeader>
//           <CardTitle className="flex items-center gap-2">
//             <Calendar className="h-5 w-5" />
//             Upcoming Events & Workshops
//             <Badge variant="secondary" className="ml-auto">
//               {dashboardData?.events.length || 0} Events
//             </Badge>
//           </CardTitle>
//           <div className="text-sm text-gray-600 dark:text-gray-300">
//             Important upcoming activities and events in {dashboardData?.user.department?.name}
//           </div>
//         </CardHeader>
//         <CardContent>
//           {dashboardData?.events && dashboardData.events.length > 0 ? (
//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
//               {dashboardData.events.map((event: any) => (
//                 <Card key={event.id} className="hover:shadow-md transition-shadow">
//                   <CardContent className="p-4">
//                     <div className="space-y-3">
//                       <div className="flex items-center justify-between">
//                         <Badge className={getEventTypeColor(event.event_type || 'other')}>
//                           {event.event_type || 'Event'}
//                         </Badge>
//                         <Badge variant="outline" className="text-green-600 border-green-200">
//                           {event.status || 'Published'}
//                         </Badge>
//                       </div>
                      
//                       <div>
//                         <h4 className="font-medium text-sm leading-tight">{event.title}</h4>
//                         {event.description && (
//                           <p className="text-xs text-gray-500 mt-1 line-clamp-2">{event.description}</p>
//                         )}
//                       </div>
                      
//                       <div className="space-y-1">
//                         <div className="flex items-center gap-2 text-xs text-gray-600">
//                           <Calendar className="h-3 w-3" />
//                           <span>{new Date(event.start_date).toLocaleDateString()}</span>
//                         </div>
//                         <div className="flex items-center gap-2 text-xs text-gray-600">
//                           <Clock className="h-3 w-3" />
//                           <span>{event.start_time?.substring(0, 5)} - {event.end_time?.substring(0, 5)}</span>
//                         </div>
//                         <div className="flex items-center gap-2 text-xs text-gray-600">
//                           <MapPin className="h-3 w-3" />
//                           <span>{event.venue || 'TBA'}</span>
//                         </div>
//                       </div>
                      
//                       {event.creator && (
//                         <div className="text-xs text-gray-500 pt-2 border-t">
//                           By: {event.creator.first_name} {event.creator.last_name}
//                           {event.creator.faculty_type && (
//                             <Badge variant="outline" className="ml-1 text-xs">
//                               {event.creator.faculty_type}
//                             </Badge>
//                           )}
//                         </div>
//                       )}
//                     </div>
//                   </CardContent>
//                 </Card>
//               ))}
//             </div>
//           ) : (
//             <div className="text-center py-8 text-gray-500">
//               <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
//               <p>No upcoming events available</p>
//             </div>
//           )}
//         </CardContent>
//       </Card>

//       {/* Weekly Timetable Section */}
//       <Card>
//         <CardHeader>
//           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
//             <div className="flex-1">
//               <CardTitle className="flex items-center gap-2">
//                 <Clock className="h-5 w-5" />
//                 Published Timetables
//               </CardTitle>
//               <p className="text-sm text-muted-foreground mt-1">
//                 {selectedTimetable 
//                   ? `${selectedTimetable.batches?.name} ${selectedTimetable.batches?.section} • ${selectedTimetable.academic_year}`
//                   : 'Select a batch to view timetable'}
//               </p>
//             </div>
            
//             {/* Batch Selector */}
//             <div className="flex items-center gap-2 flex-wrap">
//               {publishedTimetables.length > 1 && (
//                 <div className="relative">
//                   <select
//                     value={selectedTimetable?.id || ''}
//                     onChange={(e) => {
//                       const selected = publishedTimetables.find(tt => tt.id === e.target.value);
//                       if (selected) handleTimetableChange(selected);
//                     }}
//                     className="px-3 py-2 pr-8 border border-gray-300 rounded-md text-sm appearance-none bg-white dark:bg-gray-800 dark:border-gray-600 cursor-pointer"
//                   >
//                     {publishedTimetables.map((tt) => (
//                       <option key={tt.id} value={tt.id}>
//                         Batch {tt.batches?.name} {tt.batches?.section} (Sem {tt.semester})
//                       </option>
//                     ))}
//                   </select>
//                   <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 pointer-events-none" />
//                 </div>
//               )}
              
//               {selectedTimetable && (
//                 <>
//                   <Button 
//                     variant="outline" 
//                     size="sm"
//                     onClick={exportToPDF}
//                     disabled={loadingTimetable}
//                     className="flex items-center gap-1"
//                   >
//                     <FileText className="h-4 w-4" />
//                     PDF
//                   </Button>
//                   <Button 
//                     variant="outline" 
//                     size="sm"
//                     onClick={exportToExcel}
//                     disabled={loadingTimetable}
//                     className="flex items-center gap-1"
//                   >
//                     <FileSpreadsheet className="h-4 w-4" />
//                     Excel
//                   </Button>
//                   <Badge variant="secondary">
//                     {timetableClasses.filter(c => !c.isBreak && !c.isLunch).length} classes
//                   </Badge>
//                 </>
//               )}
//             </div>
//           </div>
//         </CardHeader>
//         <CardContent>
//           {loadingTimetable ? (
//             <div className="text-center py-12">
//               <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
//               <p className="text-gray-500">Loading timetable...</p>
//             </div>
//           ) : !selectedTimetable ? (
//             <div className="text-center py-12 text-gray-500">
//               <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
//               <p className="font-medium">No published timetables available</p>
//               <p className="text-sm mt-1">Timetables will appear here once published by faculty</p>
//             </div>
//           ) : (
//             <div className="overflow-x-auto">
//               <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
//                 <thead>
//                   <tr className="bg-gray-50 dark:bg-gray-800">
//                     <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left font-medium min-w-[120px] text-gray-900 dark:text-gray-100">
//                       Time / Day
//                     </th>
//                     {days.map((day: string) => (
//                       <th key={day} className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center font-medium min-w-[160px] text-gray-900 dark:text-gray-100">
//                         {day}
//                       </th>
//                     ))}
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {timeSlots.map((timeSlot: string, slotIndex: number) => (
//                     <tr key={timeSlot} className="hover:bg-gray-50 dark:hover:bg-gray-800">
//                       <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 font-medium bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100">
//                         {timeSlot}
//                       </td>
//                       {days.map((day: string) => {
//                         const slot = getClassForSlot(day, timeSlot);
//                         return (
//                           <td key={`${day}-${timeSlot}`} className="border border-gray-300 dark:border-gray-600 p-2">
//                             {slot ? (
//                               slot.isBreak || slot.isLunch ? (
//                                 <div className="text-center py-2 text-gray-500 dark:text-gray-400 italic bg-gray-100 dark:bg-gray-800 rounded">
//                                   {slot.isLunch ? '🍽️ Lunch Break' : '☕ Break'}
//                                 </div>
//                               ) : (
//                                 <div className={`p-3 rounded-md text-center ${getClassColor(slot.subjectType, slotIndex)}`}>
//                                   <div className="font-semibold text-sm flex items-center justify-center gap-1">
//                                     {slot.subjectCode}
//                                     {slot.isLab && <Badge variant="secondary" className="text-xs">LAB</Badge>}
//                                   </div>
//                                   <div className="text-xs mt-1 line-clamp-1">{slot.subjectName}</div>
//                                   <div className="text-xs mt-1 opacity-75">{slot.facultyName}</div>
//                                   <div className="text-xs mt-1 flex items-center justify-center gap-1">
//                                     <Building className="h-3 w-3" />
//                                     {slot.classroomName}
//                                   </div>
//                                 </div>
//                               )
//                             ) : (
//                               <div className="text-center py-6 text-gray-400 dark:text-gray-500">-</div>
//                             )}
//                           </td>
//                         );
//                       })}
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           )}
//         </CardContent>
//       </Card>

//       {/* NEP Curriculum Selection Section - Only for Students */}
//       {user?.role === 'student' && (
//         <Card>
//           <CardHeader>
//             <div className="flex items-center justify-between">
//               <div>
//                 <CardTitle className="flex items-center gap-2">
//                   <BookOpen className="h-5 w-5" />
//                   NEP 2020 Curriculum Selection
//                 </CardTitle>
//                 <p className="text-sm text-muted-foreground mt-1">
//                   Choose your elective subjects from available buckets
//                 </p>
//               </div>
//               <div className="flex items-center gap-2">
//                 <Badge variant="outline">
//                   {electiveBuckets.length} Buckets Available
//                 </Badge>
//                 <Button
//                   variant="outline"
//                   size="sm"
//                   onClick={() => setShowNepCurriculum(!showNepCurriculum)}
//                   className="flex items-center gap-2"
//                 >
//                   {showNepCurriculum ? 'Hide' : 'Show'} Selections
//                   <ChevronDown className={`h-4 w-4 transition-transform ${showNepCurriculum ? 'rotate-180' : ''}`} />
//                 </Button>
//               </div>
//             </div>
//           </CardHeader>
//           <CardContent>
//             {loadingBuckets ? (
//               <div className="text-center py-8">
//                 <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
//                 <p className="text-gray-500">Loading curriculum options...</p>
//               </div>
//             ) : electiveBuckets.length === 0 ? (
//               <div className="text-center py-8 text-gray-500">
//                 <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
//                 <p className="font-medium">No elective buckets available</p>
//                 <p className="text-sm mt-1">Elective options will appear here when available for your semester</p>
//               </div>
//             ) : (
//               <div className="space-y-6">
//                 {!showNepCurriculum && (
//                   <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
//                     <div className="flex items-center gap-3">
//                       <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
//                         <BookOpen className="h-6 w-6 text-blue-600" />
//                       </div>
//                       <div className="flex-1">
//                         <h4 className="font-semibold text-blue-900">Subject Selection Summary</h4>
//                         <p className="text-sm text-blue-700 mt-1">
//                           You have {Object.values(selectedSubjects).reduce((acc, arr) => acc + arr.length, 0)} subjects selected from {electiveBuckets.length} available buckets
//                         </p>
//                         <div className="flex flex-wrap gap-2 mt-2">
//                           {electiveBuckets.map(bucket => {
//                             const selections = selectedSubjects[bucket.id] || [];
//                             return (
//                               <Badge key={bucket.id} variant="secondary" className="text-xs">
//                                 {bucket.bucket_name}: {selections.length}/{bucket.max_selection}
//                               </Badge>
//                             );
//                           })}
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                 )}

//                 {showNepCurriculum && (
//                   <div className="space-y-6">
//                     {electiveBuckets.map((bucket) => {
//                       const subjects = bucketSubjects[bucket.id] || [];
//                       const currentSelections = selectedSubjects[bucket.id] || [];
                      
//                       return (
//                         <Card key={bucket.id} className="border-l-4 border-l-blue-500">
//                           <CardHeader className="pb-3">
//                             <div className="flex items-center justify-between">
//                               <div>
//                                 <h4 className="font-semibold text-gray-900">{bucket.bucket_name}</h4>
//                                 {bucket.description && (
//                                   <p className="text-sm text-gray-600 mt-1">{bucket.description}</p>
//                                 )}
//                               </div>
//                               <div className="text-right">
//                                 <Badge className={`${
//                                   currentSelections.length >= bucket.min_selection 
//                                     ? 'bg-green-100 text-green-800 border-green-200' 
//                                     : 'bg-yellow-100 text-yellow-800 border-yellow-200'
//                                 }`}>
//                                   {currentSelections.length}/{bucket.max_selection} Selected
//                                 </Badge>
//                                 <p className="text-xs text-gray-500 mt-1">
//                                   Min: {bucket.min_selection} • Max: {bucket.max_selection}
//                                 </p>
//                               </div>
//                             </div>
//                           </CardHeader>
//                           <CardContent>
//                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
//                               {subjects.map((subject) => {
//                                 const isSelected = currentSelections.includes(subject.id);
//                                 const canSelect = currentSelections.length < bucket.max_selection;
                                
//                                 // Debug logging
//                                 console.log('Subject selection debug:', {
//                                   subjectId: subject.id,
//                                   subjectName: subject.name,
//                                   bucketId: bucket.id,
//                                   bucketName: bucket.bucket_name,
//                                   currentSelections: currentSelections,
//                                   isSelected: isSelected,
//                                   canSelect: canSelect,
//                                   maxSelections: bucket.max_selection,
//                                   minSelections: bucket.min_selection
//                                 });
                                
//                                 return (
//                                   <div
//                                     key={subject.id}
//                                     className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
//                                       isSelected
//                                         ? 'border-blue-500 bg-blue-50'
//                                         : canSelect
//                                         ? 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
//                                         : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
//                                     }`}
//                                     onClick={() => {
//                                       if (isSelected || canSelect) {
//                                         handleSubjectSelection(bucket.id, subject.id, !isSelected);
//                                       }
//                                     }}
//                                   >
//                                     <div className="flex items-center justify-between mb-2">
//                                       <Badge variant="outline" className="text-xs">
//                                         {subject.code}
//                                       </Badge>
//                                       <div className="flex items-center gap-2">
//                                         <Badge className="text-xs bg-purple-100 text-purple-800">
//                                           {subject.credit_value} Credits
//                                         </Badge>
//                                         {isSelected && (
//                                           <div className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center">
//                                             <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
//                                               <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
//                                             </svg>
//                                           </div>
//                                         )}
//                                       </div>
//                                     </div>
//                                     <h5 className="font-medium text-sm text-gray-900 line-clamp-2">
//                                       {subject.name}
//                                     </h5>
//                                     {subject.description && (
//                                       <p className="text-xs text-gray-600 mt-1 line-clamp-2">
//                                         {subject.description}
//                                       </p>
//                                     )}
//                                     <div className="flex items-center gap-2 mt-2">
//                                       <Badge variant="outline" className="text-xs">
//                                         {subject.nep_category}
//                                       </Badge>
//                                       <Badge variant="outline" className="text-xs">
//                                         {subject.subject_type}
//                                       </Badge>
//                                     </div>
//                                   </div>
//                                 );
//                               })}
//                             </div>
                            
//                             {subjects.length === 0 && (
//                               <div className="text-center py-8 text-gray-500">
//                                 <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
//                                 <p className="text-sm">No subjects available in this bucket</p>
//                               </div>
//                             )}
//                           </CardContent>
//                         </Card>
//                       );
//                     })}
//                   </div>
//                 )}
//               </div>
//             )}
//           </CardContent>
//         </Card>
//       )}

//       {/* Assignment Information Section */}
//       <Card>
//         <CardHeader>
//           <CardTitle className="flex items-center gap-2">
//             <BookOpen className="h-5 w-5" />
//             Assignment Deadlines
//           </CardTitle>
//           <p className="text-sm text-muted-foreground">
//             Upcoming assignments and submission deadlines
//           </p>
//         </CardHeader>
//         <CardContent>
//           <div className="space-y-4">
//             <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
//               <div className="flex items-start justify-between mb-3">
//                 <div>
//                   <h4 className="font-semibold text-blue-900">Database Design and Implementation</h4>
//                   <p className="text-sm text-blue-700">Database Management Systems</p>
//                 </div>
//                 <Badge className="bg-red-100 text-red-800 border-red-300">Due Soon</Badge>
//               </div>
//               <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
//                 <div>
//                   <span className="font-medium text-blue-800">Due Date:</span>
//                   <p className="text-blue-700">October 15, 2025</p>
//                 </div>
//                 <div>
//                   <span className="font-medium text-blue-800">Due Time:</span>
//                   <p className="text-blue-700">11:59 PM</p>
//                 </div>
//                 <div>
//                   <span className="font-medium text-blue-800">Maximum Marks:</span>
//                   <p className="text-blue-700">100 points</p>
//                 </div>
//               </div>
//               <div className="mt-3">
//                 <p className="text-sm text-blue-700">
//                   <span className="font-medium">Description:</span> Describe the assignment requirements, objectives, and guidelines. Include what students need to accomplish, learning outcomes, and any specific requirements.
//                 </p>
//               </div>
//               <div className="mt-3">
//                 <p className="text-sm text-blue-700">
//                   <span className="font-medium">Submission Format:</span> PDF document with code snippets, ZIP file containing source code and report
//                 </p>
//               </div>
//             </div>

//             <div className="bg-green-50 border border-green-200 rounded-lg p-4">
//               <div className="flex items-start justify-between mb-3">
//                 <div>
//                   <h4 className="font-semibold text-green-900">Data Structures Implementation</h4>
//                   <p className="text-sm text-green-700">Data Structures and Algorithms</p>
//                 </div>
//                 <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Upcoming</Badge>
//               </div>
//               <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
//                 <div>
//                   <span className="font-medium text-green-800">Due Date:</span>
//                   <p className="text-green-700">October 22, 2025</p>
//                 </div>
//                 <div>
//                   <span className="font-medium text-green-800">Due Time:</span>
//                   <p className="text-green-700">5:00 PM</p>
//                 </div>
//                 <div>
//                   <span className="font-medium text-green-800">Maximum Marks:</span>
//                   <p className="text-green-700">80 points</p>
//                 </div>
//               </div>
//               <div className="mt-3">
//                 <p className="text-sm text-green-700">
//                   <span className="font-medium">Description:</span> Implement various data structures including linked lists, stacks, queues, trees, and graphs with proper documentation.
//                 </p>
//               </div>
//               <div className="mt-3">
//                 <p className="text-sm text-green-700">
//                   <span className="font-medium">Submission Format:</span> Source code with documentation, test cases, and performance analysis report
//                 </p>
//               </div>
//             </div>
//           </div>
//         </CardContent>
//       </Card>

//       {/* Examination Information Section */}
//       <Card>
//         <CardHeader>
//           <CardTitle className="flex items-center gap-2">
//             <GraduationCap className="h-5 w-5" />
//             Examination Schedule
//           </CardTitle>
//           <p className="text-sm text-muted-foreground">
//             Upcoming examinations and important details
//           </p>
//         </CardHeader>
//         <CardContent>
//           <div className="space-y-4">
//             <div className="bg-red-50 border border-red-200 rounded-lg p-4">
//               <div className="flex items-start justify-between mb-3">
//                 <div>
//                   <h4 className="font-semibold text-red-900">Mid-term Examination</h4>
//                   <p className="text-sm text-red-700">Data Structures and Algorithms</p>
//                 </div>
//                 <Badge className="bg-red-100 text-red-800 border-red-300">Upcoming</Badge>
//               </div>
//               <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
//                 <div>
//                   <span className="font-medium text-red-800">Exam Date:</span>
//                   <p className="text-red-700">October 18, 2025</p>
//                 </div>
//                 <div>
//                   <span className="font-medium text-red-800">Start Time:</span>
//                   <p className="text-red-700">10:00 AM</p>
//                 </div>
//                 <div>
//                   <span className="font-medium text-red-800">Duration:</span>
//                   <p className="text-red-700">90 minutes</p>
//                 </div>
//               </div>
//               <div className="mt-3">
//                 <p className="text-sm text-red-700">
//                   <span className="font-medium">Topics/Syllabus Coverage:</span> List the topics that will be covered in the exam (e.g., Arrays, Linked Lists, Stacks, Queues, Trees, Graphs)
//                 </p>
//               </div>
//               <div className="mt-3">
//                 <p className="text-sm text-red-700">
//                   <span className="font-medium">Instructions & Guidelines:</span> Special instructions for students (e.g., Bring calculator, No mobile phones allowed, Open book exam, etc.)
//                 </p>
//               </div>
//             </div>

//             <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
//               <div className="flex items-start justify-between mb-3">
//                 <div>
//                   <h4 className="font-semibold text-purple-900">Final Examination</h4>
//                   <p className="text-sm text-purple-700">Database Management Systems</p>
//                 </div>
//                 <Badge className="bg-purple-100 text-purple-800 border-purple-300">Scheduled</Badge>
//               </div>
//               <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
//                 <div>
//                   <span className="font-medium text-purple-800">Exam Date:</span>
//                   <p className="text-purple-700">November 25, 2025</p>
//                 </div>
//                 <div>
//                   <span className="font-medium text-purple-800">Start Time:</span>
//                   <p className="text-purple-700">2:00 PM</p>
//                 </div>
//                 <div>
//                   <span className="font-medium text-purple-800">Duration:</span>
//                   <p className="text-purple-700">3 hours</p>
//                 </div>
//               </div>
//               <div className="mt-3">
//                 <p className="text-sm text-purple-700">
//                   <span className="font-medium">Topics/Syllabus Coverage:</span> Comprehensive coverage including SQL queries, database design, normalization, transactions, and advanced topics
//                 </p>
//               </div>
//               <div className="mt-3">
//                 <p className="text-sm text-purple-700">
//                   <span className="font-medium">Instructions & Guidelines:</span> Closed book examination, scientific calculator permitted, no electronic devices allowed
//                 </p>
//               </div>
//             </div>
//           </div>
//         </CardContent>
//       </Card>
//       </div>
//     </>
//   );
// }


'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { 
  Calendar, 
  Clock, 
  MapPin,
  BookOpen,
  GraduationCap,
  Building,
  FileText,
  FileSpreadsheet,
  ChevronDown,
  Loader2
} from "lucide-react";

// Types
interface FacultyMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  college_uid: string;
  faculty_type?: string;
  department_id: string;
  departments?: {
    name: string;
    code: string;
  };
}

interface DashboardData {
  user: any;
  additionalData: {
    batch?: any;
    batchId?: string;
    facultyCount?: number;
    facultyMembers?: FacultyMember[];
  };
  events: any[];
}

interface PublishedTimetable {
  id: string;
  title: string;
  academic_year: string;
  semester: number;
  fitness_score: number;
  batches: {
    id: string;
    name: string;
    section: string;
    semester: number;
  };
}

interface TimetableClass {
  id: string;
  subjectCode: string;
  subjectName: string;
  subjectType: string;
  facultyName: string;
  classroomName: string;
  building: string;
  day: string;
  startTime: string;
  endTime: string;
  isBreak: boolean;
  isLunch: boolean;
  isLab: boolean;
  isContinuation: boolean;
}

interface ElectiveBucket {
  id: string;
  bucket_name: string;
  bucket_type?: 'MAJOR' | 'MINOR' | 'OPEN_ELECTIVE' | 'MULTIDISCIPLINARY' | 'AEC' | 'VAC' | 'GENERAL';
  description?: string;
  max_selection: number;
  min_selection: number;
  batch_id: string;
  batches?: {
    name: string;
    semester: number;
  };
  created_at: string;
}

interface Subject {
  id: string;
  code: string;
  name: string;
  credits?: number;
  credit_value?: number;
  nep_category: string;
  subject_type: string;
  course_group_id: string;
  semester: number;
  description?: string;
}

interface StudentSelection {
  id: string;
  student_id: string;
  subject_id: string;
  semester: number;
  academic_year: string;
  selection_date: string;
  subjects?: Subject;
}

export default function StudentDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [publishedTimetables, setPublishedTimetables] = useState<PublishedTimetable[]>([]);
  const [availableBatches, setAvailableBatches] = useState<any[]>([]);
  const [selectedTimetable, setSelectedTimetable] = useState<PublishedTimetable | null>(null);
  const [timetableClasses, setTimetableClasses] = useState<TimetableClass[]>([]);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [days] = useState(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
  const [loadingTimetable, setLoadingTimetable] = useState(false);
  const [showFacultyList, setShowFacultyList] = useState(false);

  // NEP Curriculum Selection States
  const [electiveBuckets, setElectiveBuckets] = useState<ElectiveBucket[]>([]);
  const [bucketSubjects, setBucketSubjects] = useState<{ [bucketId: string]: Subject[] }>({});
  const [studentSelections, setStudentSelections] = useState<StudentSelection[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<{ [bucketId: string]: string[] }>({});
  const [loadingBuckets, setLoadingBuckets] = useState(false);
  const [loadingSelections, setLoadingSelections] = useState(false);
  const [showNepCurriculum, setShowNepCurriculum] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    
    // Allow students and general/guest faculty to access this dashboard
    const isStudent = parsedUser.role === 'student';
    const isGeneralFaculty = parsedUser.role === 'faculty' && 
                            (parsedUser.faculty_type === 'general' || 
                             parsedUser.faculty_type === 'guest' || 
                             !parsedUser.faculty_type);
    
    if (!isStudent && !isGeneralFaculty) {
      router.push('/login');
      return;
    }

    setUser(parsedUser);
    fetchDashboardData(parsedUser);
  }, [router]);

  // Fetch NEP curriculum data when dashboard data is loaded
  useEffect(() => {
    if (user?.role === 'student' && dashboardData?.additionalData?.batch && !loadingBuckets && electiveBuckets.length === 0) {
      fetchNepCurriculumData(user);
    }
  }, [user, dashboardData, loadingBuckets, electiveBuckets.length]);

  const fetchDashboardData = async (user: any) => {
    try {
      setLoading(true);
      
      // Fetch user profile and events
      const response = await fetch(
        `/api/student/dashboard?userId=${user.id}&role=${user.role}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      
      const data = await response.json();
      console.log('📥 Dashboard data received:', data);
      setDashboardData(data);

      // Update localStorage with complete user data including course info
      if (data.user) {
        const updatedUser = {
          ...user,
          college_uid: data.user.college_uid,
          current_semester: data.user.current_semester || data.additionalData?.batch?.semester,
          course: data.user.course,
          course_id: data.user.course_id
        };
        console.log('🔄 Updating user with course_id:', updatedUser.course_id);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
      } else {
        console.warn('⚠️ No user data in API response, keeping original user');
      }

      // Fetch published timetables for the course
      const timetablesResponse = await fetch(
        `/api/student/published-timetables?courseId=${user.course_id}${user.role === 'student' && data.additionalData.batch ? `&semester=${data.additionalData.batch.semester}` : ''}`
      );
      
      if (timetablesResponse.ok) {
        const timetablesData = await timetablesResponse.json();
        setPublishedTimetables(timetablesData.timetables || []);
        setAvailableBatches(timetablesData.batches || []);
        
        // Auto-select student's own timetable or first available
        if (user.role === 'student' && data.additionalData.batchId) {
          const studentTimetable = timetablesData.timetables.find(
            (tt: PublishedTimetable) => tt.batches?.id === data.additionalData.batchId
          );
          if (studentTimetable) {
            setSelectedTimetable(studentTimetable);
            fetchTimetableClasses(studentTimetable.id);
          }
        } else if (timetablesData.timetables.length > 0) {
          setSelectedTimetable(timetablesData.timetables[0]);
          fetchTimetableClasses(timetablesData.timetables[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimetableClasses = async (timetableId: string) => {
    try {
      setLoadingTimetable(true);
      const response = await fetch(
        `/api/student/timetable-classes?timetableId=${timetableId}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch timetable classes');
      }
      
      const data = await response.json();
      setTimetableClasses(data.classes || []);
      setTimeSlots(data.timeSlots || []);
    } catch (error) {
      console.error('Error fetching timetable classes:', error);
    } finally {
      setLoadingTimetable(false);
    }
  };

  const handleTimetableChange = (timetable: PublishedTimetable) => {
    setSelectedTimetable(timetable);
    fetchTimetableClasses(timetable.id);
  };

  // NEP Curriculum Functions
  const fetchNepCurriculumData = async (user: any) => {
    console.log('🎯 fetchNepCurriculumData called with user:', {
      userId: user.id,
      course_id: user.course_id,
      email: user.email,
      role: user.role
    });
    
    if (!dashboardData?.additionalData?.batch) {
      console.error('❌ No batch data found in dashboardData:', dashboardData);
      return;
    }
    
    try {
      setLoadingBuckets(true);
      
      // Get user's current semester from batch
      const semester = dashboardData.additionalData.batch.semester;
      const batchInfo = dashboardData.additionalData.batch;
      
      console.log('📚 Fetching buckets with params:', {
        courseId: user.course_id,
        semester: semester,
        studentId: user.id,
        batchInfo: batchInfo
      });
      
      // Fetch elective buckets for student's semester using batchId
      const bucketsResponse = await fetch(
        `/api/nep/buckets?batchId=${dashboardData.additionalData.batchId}&studentId=${user.id}`
      );
      
      console.log('📡 Buckets API response status:', bucketsResponse.status);
      
      if (bucketsResponse.ok) {
        const bucketsData = await bucketsResponse.json();
        console.log('✅ Buckets data received:', {
          count: Array.isArray(bucketsData) ? bucketsData.length : 0,
          data: bucketsData
        });
        
        setElectiveBuckets(bucketsData || []);
        
        // Extract subjects from buckets response (subjects are already included)
        const subjectsMap = (bucketsData || []).reduce((acc: any, bucket: any) => {
          acc[bucket.id] = bucket.subjects || [];
          console.log(`  Bucket "${bucket.bucket_name}" has ${bucket.subjects?.length || 0} subjects`);
          return acc;
        }, {} as { [bucketId: string]: Subject[] });
        
        setBucketSubjects(subjectsMap);
        console.log('✅ Final state:', {
          bucketsCount: bucketsData.length,
          totalSubjects: Object.values(subjectsMap).reduce((sum: number, subjects: any) => sum + subjects.length, 0)
        });
      } else {
        const errorData = await bucketsResponse.json();
        console.error('❌ Buckets API error:', errorData);
      }
      
      // Fetch student's existing selections
      const selectionsResponse = await fetch(
        `/api/student/selections?studentId=${user.id}&semester=${semester}`
      );
      
      if (selectionsResponse.ok) {
        const selectionsData = await selectionsResponse.json();
        setStudentSelections(selectionsData.selections || []);
        
        // Initialize selected subjects state
        const initialSelections = (selectionsData.selections || []).reduce((acc: any, selection: StudentSelection) => {
          if (selection.subjects?.course_group_id) {
            if (!acc[selection.subjects.course_group_id]) {
              acc[selection.subjects.course_group_id] = [];
            }
            acc[selection.subjects.course_group_id].push(selection.subject_id);
          }
          return acc;
        }, {});
        
        setSelectedSubjects(initialSelections);
      }
    } catch (error) {
      console.error('Error fetching NEP curriculum data:', error);
    } finally {
      setLoadingBuckets(false);
    }
  };

  // Check if major and minor selections are complete
  const areSelectionsComplete = () => {
    const majorBuckets = electiveBuckets.filter(b => b.bucket_type === 'MAJOR');
    const minorBuckets = electiveBuckets.filter(b => b.bucket_type === 'MINOR');
    
    const majorComplete = majorBuckets.length === 0 || majorBuckets.every(bucket => {
      const selections = selectedSubjects[bucket.id] || [];
      return selections.length >= bucket.min_selection;
    });
    
    const minorComplete = minorBuckets.length === 0 || minorBuckets.every(bucket => {
      const selections = selectedSubjects[bucket.id] || [];
      return selections.length >= bucket.min_selection;
    });
    
    return majorComplete && minorComplete;
  };

  const handleSubjectSelection = async (bucketId: string, subjectId: string, isSelected: boolean) => {
    try {
      setLoadingSelections(true);
      
      const bucket = electiveBuckets.find(b => b.id === bucketId);
      if (!bucket) return;
      
      const currentSelections = selectedSubjects[bucketId] || [];
      
      if (isSelected) {
        // Check if we can add more selections
        if (currentSelections.length >= bucket.max_selection) {
          alert(`You can only select ${bucket.max_selection} subjects from this bucket.`);
          return;
        }
        
        // Add selection
        const response = await fetch('/api/student/selections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_id: user.id,
            subject_id: subjectId,
            semester: dashboardData?.additionalData?.batch?.semester,
            academic_year: dashboardData?.additionalData?.batch?.academic_year || '2025-26'
          })
        });
        
        if (response.ok) {
          setSelectedSubjects(prev => ({
            ...prev,
            [bucketId]: [...currentSelections, subjectId]
          }));
        }
      } else {
        // Remove selection
        const response = await fetch('/api/student/selections', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_id: user.id,
            subject_id: subjectId
          })
        });
        
        if (response.ok) {
          setSelectedSubjects(prev => ({
            ...prev,
            [bucketId]: currentSelections.filter(id => id !== subjectId)
          }));
        }
      }
    } catch (error) {
      console.error('Error handling subject selection:', error);
    } finally {
      setLoadingSelections(false);
    }
  };

  const getClassForSlot = (day: string, timeSlot: string): TimetableClass | undefined => {
    const [startTime] = timeSlot.split('-');
    const normalizeTime = (time: string) => time.substring(0, 5);
    
    return timetableClasses.find(
      cls => cls.day === day && normalizeTime(cls.startTime) === normalizeTime(startTime)
    );
  };

  const getClassColor = (subjectType: string, index: number) => {
    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-green-100 text-green-800',
      'bg-purple-100 text-purple-800',
      'bg-orange-100 text-orange-800',
      'bg-red-100 text-red-800',
      'bg-indigo-100 text-indigo-800',
      'bg-teal-100 text-teal-800',
      'bg-pink-100 text-pink-800',
    ];
    
    if (subjectType === 'LAB') {
      return 'bg-indigo-100 text-indigo-800';
    }
    
    return colors[index % colors.length];
  };

  // Export to PDF function
  const exportToPDF = () => {
    if (!selectedTimetable) return;
    
    let htmlContent = `
      <html>
        <head>
          <title>Class Timetable - ${selectedTimetable.batches?.name} ${selectedTimetable.batches?.section}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; text-align: center; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: center; }
            th { background-color: #f5f5f5; font-weight: bold; }
            .subject-cell { background-color: #f8f9fa; padding: 8px; }
            .break-cell { background-color: #e9ecef; font-style: italic; }
            .course-code { font-weight: bold; font-size: 0.9em; }
            .course-title { font-size: 0.8em; margin: 2px 0; }
            .faculty { font-size: 0.7em; color: #666; }
            .room { font-size: 0.7em; color: #888; }
          </style>
        </head>
        <body>
          <h1>Weekly Class Schedule</h1>
          <p style="text-align: center; margin-bottom: 20px;">
            ${dashboardData?.user.department?.name} • Batch ${selectedTimetable.batches?.name} ${selectedTimetable.batches?.section} • ${selectedTimetable.academic_year}
          </p>
          <table>
            <thead>
              <tr>
                <th>Time / Day</th>`;
    
    days.forEach(day => {
      htmlContent += `<th>${day}</th>`;
    });
    
    htmlContent += `</tr></thead><tbody>`;
    
    timeSlots.forEach(timeSlot => {
      htmlContent += `<tr><td style="font-weight: bold; background-color: #f5f5f5;">${timeSlot}</td>`;
      
      days.forEach(day => {
        const slot = getClassForSlot(day, timeSlot);
        if (!slot) {
          htmlContent += '<td>-</td>';
        } else if (slot.isBreak || slot.isLunch) {
          htmlContent += `<td class="break-cell">${slot.isLunch ? 'Lunch Break' : 'Break'}</td>`;
        } else {
          htmlContent += `
            <td class="subject-cell">
              <div class="course-code">${slot.subjectCode}</div>
              <div class="course-title">${slot.subjectName}</div>
              <div class="faculty">${slot.facultyName}</div>
              <div class="room">${slot.classroomName}</div>
            </td>
          `;
        }
      });
      
      htmlContent += '</tr>';
    });
    
    htmlContent += `</tbody></table></body></html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `timetable-${selectedTimetable.batches?.name}-${selectedTimetable.batches?.section}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export to Excel (CSV format)
  const exportToExcel = () => {
    if (!selectedTimetable) return;
    
    let csvContent = `Weekly Class Schedule - ${selectedTimetable.batches?.name} ${selectedTimetable.batches?.section}\n`;
    csvContent += `${dashboardData?.user.department?.name} • ${selectedTimetable.academic_year}\n\n`;
    
    csvContent += 'Time / Day,' + days.join(',') + '\n';
    
    timeSlots.forEach(timeSlot => {
      let row = timeSlot;
      days.forEach(day => {
        const slot = getClassForSlot(day, timeSlot);
        if (!slot) {
          row += ',-';
        } else if (slot.isBreak || slot.isLunch) {
          row += `,"${slot.isLunch ? 'Lunch Break' : 'Break'}"`;
        } else {
          row += `,"${slot.subjectCode} - ${slot.subjectName} (${slot.facultyName}, ${slot.classroomName})"`;
        }
      });
      csvContent += row + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `timetable-${selectedTimetable.batches?.name}-${selectedTimetable.batches?.section}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getEventTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'workshop': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'event': return 'bg-green-100 text-green-800 border-green-200';
      case 'seminar': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'academic': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!user || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <div className="space-y-6 p-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-950/20 dark:via-indigo-950/20 dark:to-purple-950/20 rounded-2xl p-6 border border-blue-100 dark:border-blue-800">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              Welcome back, {user?.first_name || user?.name || (user?.role === 'faculty' ? 'Faculty' : 'Student')}! 👋
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              {user?.role === 'faculty' 
                ? 'View your teaching schedule and department information'
                : 'Ready to explore your Computer Science Engineering dashboard'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500 dark:text-gray-400">Your Course</div>
            <Badge className="bg-blue-500 text-white mt-1">
              {dashboardData?.user.course?.code || 'N/A'}
            </Badge>
            {user?.role === 'student' && dashboardData?.additionalData.batch?.semester && (
              <div className="mt-2">
                <div className="text-sm text-gray-500 dark:text-gray-400">Current Semester</div>
                <Badge className="bg-green-500 text-white mt-1">
                  Semester {dashboardData.additionalData.batch.semester}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Course Info Card */}
      <Card className="border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            {dashboardData?.user.course?.title || 'Course'}
          </CardTitle>
          <div className="text-sm text-gray-600 dark:text-gray-300">
            {dashboardData?.user.college?.name || 'College'} • {dashboardData?.user.course?.nature_of_course || 'Program'}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {user?.role === 'student' && (
              <>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {dashboardData?.additionalData.batch?.semester || user.current_semester || '-'}
                  </div>
                  <div className="text-sm text-gray-500">Current Semester</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {dashboardData?.additionalData.batch?.course?.code
                      ? `${dashboardData.additionalData.batch.course.code}-${dashboardData.additionalData.batch.section || 'A'}`
                      : dashboardData?.additionalData.batch?.name && dashboardData?.additionalData.batch?.section 
                      ? `${dashboardData.additionalData.batch.name} ${dashboardData.additionalData.batch.section}`
                      : '-'}
                  </div>
                  <div className="text-sm text-gray-500">Batch</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {dashboardData?.user.college_uid?.toUpperCase() || user.college_uid?.toUpperCase() || user.email?.split('@')[0]?.toUpperCase() || '-'}
                  </div>
                  <div className="text-sm text-gray-500">UID</div>
                </div>
              </>
            )}
            {user?.role === 'faculty' && (
              <>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {user.college_uid?.toUpperCase() || user.uid?.toUpperCase() || '-'}
                  </div>
                  <div className="text-sm text-gray-500">College UID</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {user.faculty_type?.toUpperCase() || 'GENERAL'}
                  </div>
                  <div className="text-sm text-gray-500">Faculty Type</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {dashboardData?.user.department?.name || user.department_name || '-'}
                  </div>
                  <div className="text-sm text-gray-500">Department</div>
                </div>
              </>
            )}
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 cursor-pointer hover:text-orange-700 transition-colors" onClick={() => setShowFacultyList(!showFacultyList)}>
                {dashboardData?.additionalData.facultyCount || 0}
              </div>
              <div className="text-sm text-gray-500">
                Faculty Members
                <button 
                  onClick={() => setShowFacultyList(!showFacultyList)}
                  className="ml-1 text-xs text-blue-600 hover:text-blue-700"
                >
                  {showFacultyList ? '▼' : '▶'}
                </button>
              </div>
            </div>
          </div>
          
          {/* Faculty Members List */}
          {showFacultyList && dashboardData?.additionalData.facultyMembers && dashboardData.additionalData.facultyMembers.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-orange-600" />
                Faculty Members ({dashboardData.additionalData.facultyCount})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {dashboardData.additionalData.facultyMembers.map((faculty: FacultyMember) => (
                  <div key={faculty.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:shadow-md transition-shadow">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-semibold">
                      {faculty.first_name.charAt(0)}{faculty.last_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                        {faculty.first_name} {faculty.last_name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {faculty.email}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {faculty.faculty_type && (
                          <Badge variant="outline" className="text-xs py-0 px-1">
                            {faculty.faculty_type}
                          </Badge>
                        )}
                        {faculty.departments && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {faculty.departments.code}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* NEP 2020 Curriculum Selection Card */}
      {user?.role === 'student' && dashboardData?.additionalData.batch?.semester >= 3 && (
        <Card className="border-indigo-200 dark:border-indigo-800 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-indigo-900 dark:text-indigo-100 flex items-center gap-2 mb-2">
                  <BookOpen className="h-6 w-6" />
                  NEP 2020 Curriculum Selection
                </h3>
                <p className="text-sm text-indigo-700 dark:text-indigo-300 mb-4">
                  Choose your MAJOR and MINOR subjects for Semester {dashboardData.additionalData.batch.semester}
                </p>
                <div className="flex items-center gap-4 text-sm text-indigo-600 dark:text-indigo-400 mb-4">
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-purple-500"></div>
                    <span>MAJOR subjects (locked after selection)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    <span>MINOR subjects (changeable)</span>
                  </div>
                </div>
                <Button
                  onClick={() => router.push('/student/nep-selection')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Select Subjects
                  <ChevronDown className="ml-2 h-4 w-4 rotate-[-90deg]" />
                </Button>
              </div>
              <div className="hidden md:block">
                <div className="text-6xl">📚</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Events Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Events & Workshops
            <Badge variant="secondary" className="ml-auto">
              {dashboardData?.events.length || 0} Events
            </Badge>
          </CardTitle>
          <div className="text-sm text-gray-600 dark:text-gray-300">
            Important upcoming activities and events in {dashboardData?.user.department?.name}
          </div>
        </CardHeader>
        <CardContent>
          {dashboardData?.events && dashboardData.events.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {dashboardData.events.map((event: any) => (
                <Card key={event.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge className={getEventTypeColor(event.event_type || 'other')}>
                          {event.event_type || 'Event'}
                        </Badge>
                        <Badge variant="outline" className="text-green-600 border-green-200">
                          {event.status || 'Published'}
                        </Badge>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-sm leading-tight">{event.title}</h4>
                        {event.description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{event.description}</p>
                        )}
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(event.start_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Clock className="h-3 w-3" />
                          <span>{event.start_time?.substring(0, 5)} - {event.end_time?.substring(0, 5)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <MapPin className="h-3 w-3" />
                          <span>{event.venue || 'TBA'}</span>
                        </div>
                      </div>
                      
                      {event.creator && (
                        <div className="text-xs text-gray-500 pt-2 border-t">
                          By: {event.creator.first_name} {event.creator.last_name}
                          {event.creator.faculty_type && (
                            <Badge variant="outline" className="ml-1 text-xs">
                              {event.creator.faculty_type}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No upcoming events available</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekly Timetable Section */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Published Timetables
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedTimetable 
                  ? `${selectedTimetable.batches?.name} ${selectedTimetable.batches?.section} • ${selectedTimetable.academic_year}`
                  : 'Select a batch to view timetable'}
              </p>
            </div>
            
            {/* Batch Selector */}
            <div className="flex items-center gap-2 flex-wrap">
              {publishedTimetables.length > 1 && (
                <div className="relative">
                  <select
                    value={selectedTimetable?.id || ''}
                    onChange={(e) => {
                      const selected = publishedTimetables.find(tt => tt.id === e.target.value);
                      if (selected) handleTimetableChange(selected);
                    }}
                    className="px-3 py-2 pr-8 border border-gray-300 rounded-md text-sm appearance-none bg-white dark:bg-gray-800 dark:border-gray-600 cursor-pointer"
                  >
                    {publishedTimetables.map((tt) => (
                      <option key={tt.id} value={tt.id}>
                        Batch {tt.batches?.name} {tt.batches?.section} (Sem {tt.semester})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 pointer-events-none" />
                </div>
              )}
              
              {selectedTimetable && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={exportToPDF}
                    disabled={loadingTimetable}
                    className="flex items-center gap-1"
                  >
                    <FileText className="h-4 w-4" />
                    PDF
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={exportToExcel}
                    disabled={loadingTimetable}
                    className="flex items-center gap-1"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Excel
                  </Button>
                  <Badge variant="secondary">
                    {timetableClasses.filter(c => !c.isBreak && !c.isLunch).length} classes
                  </Badge>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingTimetable ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-gray-500">Loading timetable...</p>
            </div>
          ) : !selectedTimetable ? (
            <div className="text-center py-12 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="font-medium">No published timetables available</p>
              <p className="text-sm mt-1">Timetables will appear here once published by faculty</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800">
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left font-medium min-w-[120px] text-gray-900 dark:text-gray-100">
                      Time / Day
                    </th>
                    {days.map((day: string) => (
                      <th key={day} className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center font-medium min-w-[160px] text-gray-900 dark:text-gray-100">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map((timeSlot: string, slotIndex: number) => (
                    <tr key={timeSlot} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-3 font-medium bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                        {timeSlot}
                      </td>
                      {days.map((day: string) => {
                        const slot = getClassForSlot(day, timeSlot);
                        return (
                          <td key={`${day}-${timeSlot}`} className="border border-gray-300 dark:border-gray-600 p-2">
                            {slot ? (
                              slot.isBreak || slot.isLunch ? (
                                <div className="text-center py-2 text-gray-500 dark:text-gray-400 italic bg-gray-100 dark:bg-gray-800 rounded">
                                  {slot.isLunch ? '🍽️ Lunch Break' : '☕ Break'}
                                </div>
                              ) : (
                                <div className={`p-3 rounded-md text-center ${getClassColor(slot.subjectType, slotIndex)}`}>
                                  <div className="font-semibold text-sm flex items-center justify-center gap-1">
                                    {slot.subjectCode}
                                    {slot.isLab && <Badge variant="secondary" className="text-xs">LAB</Badge>}
                                  </div>
                                  <div className="text-xs mt-1 line-clamp-1">{slot.subjectName}</div>
                                  <div className="text-xs mt-1 opacity-75">{slot.facultyName}</div>
                                  <div className="text-xs mt-1 flex items-center justify-center gap-1">
                                    <Building className="h-3 w-3" />
                                    {slot.classroomName}
                                  </div>
                                </div>
                              )
                            ) : (
                              <div className="text-center py-6 text-gray-400 dark:text-gray-500">-</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assignment Information Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Assignment Deadlines
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Upcoming assignments and submission deadlines
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-blue-900">Database Design and Implementation</h4>
                  <p className="text-sm text-blue-700">Database Management Systems</p>
                </div>
                <Badge className="bg-red-100 text-red-800 border-red-300">Due Soon</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="font-medium text-blue-800">Due Date:</span>
                  <p className="text-blue-700">October 15, 2025</p>
                </div>
                <div>
                  <span className="font-medium text-blue-800">Due Time:</span>
                  <p className="text-blue-700">11:59 PM</p>
                </div>
                <div>
                  <span className="font-medium text-blue-800">Maximum Marks:</span>
                  <p className="text-blue-700">100 points</p>
                </div>
              </div>
              <div className="mt-3">
                <p className="text-sm text-blue-700">
                  <span className="font-medium">Description:</span> Describe the assignment requirements, objectives, and guidelines. Include what students need to accomplish, learning outcomes, and any specific requirements.
                </p>
              </div>
              <div className="mt-3">
                <p className="text-sm text-blue-700">
                  <span className="font-medium">Submission Format:</span> PDF document with code snippets, ZIP file containing source code and report
                </p>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-green-900">Data Structures Implementation</h4>
                  <p className="text-sm text-green-700">Data Structures and Algorithms</p>
                </div>
                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Upcoming</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="font-medium text-green-800">Due Date:</span>
                  <p className="text-green-700">October 22, 2025</p>
                </div>
                <div>
                  <span className="font-medium text-green-800">Due Time:</span>
                  <p className="text-green-700">5:00 PM</p>
                </div>
                <div>
                  <span className="font-medium text-green-800">Maximum Marks:</span>
                  <p className="text-green-700">80 points</p>
                </div>
              </div>
              <div className="mt-3">
                <p className="text-sm text-green-700">
                  <span className="font-medium">Description:</span> Implement various data structures including linked lists, stacks, queues, trees, and graphs with proper documentation.
                </p>
              </div>
              <div className="mt-3">
                <p className="text-sm text-green-700">
                  <span className="font-medium">Submission Format:</span> Source code with documentation, test cases, and performance analysis report
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* NEP Curriculum Selection Section - Only for Students */}
      {user?.role === 'student' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  NEP 2020 Curriculum Selection
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose your elective subjects from available buckets
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {electiveBuckets.length} Buckets Available
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNepCurriculum(!showNepCurriculum)}
                  className="flex items-center gap-2"
                >
                  {showNepCurriculum ? 'Hide' : 'Show'} Selections
                  <ChevronDown className={`h-4 w-4 transition-transform ${showNepCurriculum ? 'rotate-180' : ''}`} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingBuckets ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
                <p className="text-gray-500">Loading curriculum options...</p>
              </div>
            ) : electiveBuckets.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="font-medium">No elective buckets available</p>
                <p className="text-sm mt-1">Elective options will appear here when available for your semester</p>
              </div>
            ) : (
              <div className="space-y-6">
                {!showNepCurriculum && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <BookOpen className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-blue-900">Subject Selection Summary</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          You have {Object.values(selectedSubjects).reduce((acc, arr) => acc + arr.length, 0)} subjects selected from {electiveBuckets.length} available buckets
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {electiveBuckets.map(bucket => {
                            const selections = selectedSubjects[bucket.id] || [];
                            return (
                              <Badge key={bucket.id} variant="secondary" className="text-xs">
                                {bucket.bucket_name}: {selections.length}/{bucket.max_selection}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {showNepCurriculum && (
                  <div className="space-y-6">
                    {/* Display Selected Courses Summary */}
                    {Object.values(selectedSubjects).reduce((acc, arr) => acc + arr.length, 0) > 0 && (
                      <Card className="border-2 border-green-500 bg-gradient-to-r from-green-50 to-emerald-50">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                                <BookOpen className="h-5 w-5 text-green-600" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-green-900">Your Selected Courses</h4>
                                <p className="text-sm text-green-700">
                                  {areSelectionsComplete() 
                                    ? '✅ Selection Complete - These are locked for the semester' 
                                    : 'These selections are saved for the entire semester'
                                  }
                                </p>
                              </div>
                            </div>
                            {areSelectionsComplete() && (
                              <Badge className="bg-green-600 text-white px-4 py-2">
                                ✓ Confirmed
                              </Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {electiveBuckets.map(bucket => {
                              const selections = selectedSubjects[bucket.id] || [];
                              const selectedSubjectsData = (bucketSubjects[bucket.id] || []).filter(s => selections.includes(s.id));
                              if (selectedSubjectsData.length === 0) return null;
                              
                              const bucketTypeLabel = bucket.bucket_type === 'MAJOR' ? '🎓 Major' : 
                                                     bucket.bucket_type === 'MINOR' ? '📚 Minor' : 
                                                     bucket.bucket_name;
                              
                              return (
                                <div key={bucket.id} className="bg-white rounded-lg p-4 border border-green-200">
                                  <div className="flex items-center justify-between mb-2">
                                    <h5 className="font-semibold text-gray-900">{bucketTypeLabel}</h5>
                                    <Badge className="bg-green-100 text-green-800">
                                      {selections.length} selected
                                    </Badge>
                                  </div>
                                  <div className="space-y-2">
                                    {selectedSubjectsData.map(subject => (
                                      <div key={subject.id} className="flex items-center gap-2 text-sm">
                                        <div className="h-2 w-2 rounded-full bg-green-500"></div>
                                        <span className="font-medium text-gray-700">{subject.code}:</span>
                                        <span className="text-gray-600">{subject.name}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Major Courses Section - Only show if selections not complete */}
                    {!areSelectionsComplete() && electiveBuckets.some(b => b.bucket_type === 'MAJOR') && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="h-1 flex-1 bg-gradient-to-r from-indigo-200 to-indigo-400 rounded"></div>
                          <h3 className="text-xl font-bold text-indigo-900 flex items-center gap-2">
                            🎓 Major Courses
                          </h3>
                          <div className="h-1 flex-1 bg-gradient-to-l from-indigo-200 to-indigo-400 rounded"></div>
                        </div>
                        {electiveBuckets
                          .filter(bucket => bucket.bucket_type === 'MAJOR')
                          .map((bucket) => {
                            const subjects = bucketSubjects[bucket.id] || [];
                            const currentSelections = selectedSubjects[bucket.id] || [];
                            
                            return (
                              <Card key={bucket.id} className="border-l-4 border-l-indigo-500">
                                <CardHeader className="pb-3 bg-indigo-50">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h4 className="font-semibold text-indigo-900">{bucket.bucket_name}</h4>
                                      {bucket.description && (
                                        <p className="text-sm text-indigo-700 mt-1">{bucket.description}</p>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <Badge className={`${
                                        currentSelections.length >= bucket.min_selection 
                                          ? 'bg-green-100 text-green-800 border-green-200' 
                                          : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                                      }`}>
                                        {currentSelections.length}/{bucket.max_selection} Selected
                                      </Badge>
                                      <p className="text-xs text-indigo-600 mt-1">
                                        Min: {bucket.min_selection} • Max: {bucket.max_selection}
                                      </p>
                                    </div>
                                  </div>
                                </CardHeader>
                                <CardContent>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {subjects.map((subject) => {
                                      const isSelected = currentSelections.includes(subject.id);
                                      const canSelect = currentSelections.length < bucket.max_selection;
                                      
                                      return (
                                        <div
                                          key={subject.id}
                                          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                            isSelected
                                              ? 'border-indigo-500 bg-indigo-50'
                                        : canSelect
                                              ? 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50'
                                              : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                                          }`}
                                          onClick={() => {
                                            if (isSelected || canSelect) {
                                              handleSubjectSelection(bucket.id, subject.id, !isSelected);
                                            }
                                          }}
                                        >
                                          <div className="flex items-center justify-between mb-2">
                                            <Badge variant="outline" className="text-xs">
                                              {subject.code}
                                            </Badge>
                                            <div className="flex items-center gap-2">
                                              <Badge className="text-xs bg-purple-100 text-purple-800">
                                                {subject.credit_value} Credits
                                              </Badge>
                                              {isSelected && (
                                                <div className="h-5 w-5 rounded-full bg-indigo-500 flex items-center justify-center">
                                                  <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                  </svg>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                          <h5 className="font-medium text-sm text-gray-900 line-clamp-2">
                                            {subject.name}
                                          </h5>
                                          {subject.description && (
                                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                              {subject.description}
                                            </p>
                                          )}
                                          <div className="flex items-center gap-2 mt-2">
                                            <Badge variant="outline" className="text-xs">
                                              {subject.nep_category}
                                            </Badge>
                                            <Badge variant="outline" className="text-xs">
                                              {subject.subject_type}
                                            </Badge>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  
                                  {subjects.length === 0 && (
                                    <div className="text-center py-8 text-gray-500">
                                      <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                      <p className="text-sm">No subjects available in this bucket</p>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          })}
                      </div>
                    )}

                    {/* Minor Courses Section - Only show if selections not complete */}
                    {!areSelectionsComplete() && electiveBuckets.some(b => b.bucket_type === 'MINOR') && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="h-1 flex-1 bg-gradient-to-r from-pink-200 to-pink-400 rounded"></div>
                          <h3 className="text-xl font-bold text-pink-900 flex items-center gap-2">
                            📚 Minor Courses
                          </h3>
                          <div className="h-1 flex-1 bg-gradient-to-l from-pink-200 to-pink-400 rounded"></div>
                        </div>
                        {electiveBuckets
                          .filter(bucket => bucket.bucket_type === 'MINOR')
                          .map((bucket) => {
                            const subjects = bucketSubjects[bucket.id] || [];
                            const currentSelections = selectedSubjects[bucket.id] || [];
                            
                            return (
                              <Card key={bucket.id} className="border-l-4 border-l-pink-500">
                                <CardHeader className="pb-3 bg-pink-50">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h4 className="font-semibold text-pink-900">{bucket.bucket_name}</h4>
                                      {bucket.description && (
                                        <p className="text-sm text-pink-700 mt-1">{bucket.description}</p>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <Badge className={`${
                                        currentSelections.length >= bucket.min_selection 
                                          ? 'bg-green-100 text-green-800 border-green-200' 
                                          : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                                      }`}>
                                        {currentSelections.length}/{bucket.max_selection} Selected
                                      </Badge>
                                      <p className="text-xs text-pink-600 mt-1">
                                        Min: {bucket.min_selection} • Max: {bucket.max_selection}
                                      </p>
                                    </div>
                                  </div>
                                </CardHeader>
                                <CardContent>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {subjects.map((subject) => {
                                      const isSelected = currentSelections.includes(subject.id);
                                      const canSelect = currentSelections.length < bucket.max_selection;
                                      
                                      return (
                                        <div
                                          key={subject.id}
                                          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                            isSelected
                                              ? 'border-pink-500 bg-pink-50'
                                              : canSelect
                                              ? 'border-gray-200 bg-white hover:border-pink-300 hover:bg-pink-50'
                                              : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                                          }`}
                                          onClick={() => {
                                            if (isSelected || canSelect) {
                                              handleSubjectSelection(bucket.id, subject.id, !isSelected);
                                            }
                                          }}
                                        >
                                          <div className="flex items-center justify-between mb-2">
                                            <Badge variant="outline" className="text-xs">
                                              {subject.code}
                                            </Badge>
                                            <div className="flex items-center gap-2">
                                              <Badge className="text-xs bg-purple-100 text-purple-800">
                                                {subject.credit_value} Credits
                                              </Badge>
                                              {isSelected && (
                                                <div className="h-5 w-5 rounded-full bg-pink-500 flex items-center justify-center">
                                                  <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                  </svg>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                          <h5 className="font-medium text-sm text-gray-900 line-clamp-2">
                                            {subject.name}
                                          </h5>
                                          {subject.description && (
                                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                              {subject.description}
                                            </p>
                                          )}
                                          <div className="flex items-center gap-2 mt-2">
                                            <Badge variant="outline" className="text-xs">
                                              {subject.nep_category}
                                            </Badge>
                                            <Badge variant="outline" className="text-xs">
                                              {subject.subject_type}
                                            </Badge>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  
                                  {subjects.length === 0 && (
                                    <div className="text-center py-8 text-gray-500">
                                      <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                      <p className="text-sm">No subjects available in this bucket</p>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          })}
                      </div>
                    )}

                    {/* Other Buckets (non-Major/Minor) - Only show if selections not complete */}
                    {!areSelectionsComplete() && electiveBuckets.some(b => b.bucket_type !== 'MAJOR' && b.bucket_type !== 'MINOR') && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="h-1 flex-1 bg-gradient-to-r from-blue-200 to-blue-400 rounded"></div>
                          <h3 className="text-xl font-bold text-blue-900 flex items-center gap-2">
                            📖 Other Electives
                          </h3>
                          <div className="h-1 flex-1 bg-gradient-to-l from-blue-200 to-blue-400 rounded"></div>
                        </div>
                        {electiveBuckets
                          .filter(bucket => bucket.bucket_type !== 'MAJOR' && bucket.bucket_type !== 'MINOR')
                          .map((bucket) => {
                            const subjects = bucketSubjects[bucket.id] || [];
                            const currentSelections = selectedSubjects[bucket.id] || [];
                            
                            return (
                              <Card key={bucket.id} className="border-l-4 border-l-blue-500">
                                <CardHeader className="pb-3">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h4 className="font-semibold text-gray-900">{bucket.bucket_name}</h4>
                                      {bucket.description && (
                                        <p className="text-sm text-gray-600 mt-1">{bucket.description}</p>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <Badge className={`${
                                        currentSelections.length >= bucket.min_selection 
                                          ? 'bg-green-100 text-green-800 border-green-200' 
                                          : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                                      }`}>
                                        {currentSelections.length}/{bucket.max_selection} Selected
                                      </Badge>
                                      <p className="text-xs text-gray-500 mt-1">
                                        Min: {bucket.min_selection} • Max: {bucket.max_selection}
                                      </p>
                                    </div>
                                  </div>
                                </CardHeader>
                                <CardContent>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {subjects.map((subject) => {
                                      const isSelected = currentSelections.includes(subject.id);
                                      const canSelect = currentSelections.length < bucket.max_selection;
                                      
                                      return (
                                        <div
                                          key={subject.id}
                                          className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                                            isSelected
                                              ? 'border-blue-500 bg-blue-50'
                                              : canSelect
                                              ? 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                                              : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                                          }`}
                                          onClick={() => {
                                            if (isSelected || canSelect) {
                                              handleSubjectSelection(bucket.id, subject.id, !isSelected);
                                            }
                                          }}
                                        >
                                          <div className="flex items-center justify-between mb-2">
                                            <Badge variant="outline" className="text-xs">
                                              {subject.code}
                                            </Badge>
                                            <div className="flex items-center gap-2">
                                              <Badge className="text-xs bg-purple-100 text-purple-800">
                                                {subject.credit_value} Credits
                                              </Badge>
                                              {isSelected && (
                                                <div className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center">
                                                  <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                  </svg>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                          <h5 className="font-medium text-sm text-gray-900 line-clamp-2">
                                            {subject.name}
                                          </h5>
                                          {subject.description && (
                                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                              {subject.description}
                                            </p>
                                          )}
                                          <div className="flex items-center gap-2 mt-2">
                                            <Badge variant="outline" className="text-xs">
                                              {subject.nep_category}
                                            </Badge>
                                            <Badge variant="outline" className="text-xs">
                                              {subject.subject_type}
                                            </Badge>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  
                                  {subjects.length === 0 && (
                                    <div className="text-center py-8 text-gray-500">
                                      <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                      <p className="text-sm">No subjects available in this bucket</p>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Examination Information Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Examination Schedule
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Upcoming examinations and important details
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-red-900">Mid-term Examination</h4>
                  <p className="text-sm text-red-700">Data Structures and Algorithms</p>
                </div>
                <Badge className="bg-red-100 text-red-800 border-red-300">Upcoming</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="font-medium text-red-800">Exam Date:</span>
                  <p className="text-red-700">October 18, 2025</p>
                </div>
                <div>
                  <span className="font-medium text-red-800">Start Time:</span>
                  <p className="text-red-700">10:00 AM</p>
                </div>
                <div>
                  <span className="font-medium text-red-800">Duration:</span>
                  <p className="text-red-700">90 minutes</p>
                </div>
              </div>
              <div className="mt-3">
                <p className="text-sm text-red-700">
                  <span className="font-medium">Topics/Syllabus Coverage:</span> List the topics that will be covered in the exam (e.g., Arrays, Linked Lists, Stacks, Queues, Trees, Graphs)
                </p>
              </div>
              <div className="mt-3">
                <p className="text-sm text-red-700">
                  <span className="font-medium">Instructions & Guidelines:</span> Special instructions for students (e.g., Bring calculator, No mobile phones allowed, Open book exam, etc.)
                </p>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-purple-900">Final Examination</h4>
                  <p className="text-sm text-purple-700">Database Management Systems</p>
                </div>
                <Badge className="bg-purple-100 text-purple-800 border-purple-300">Scheduled</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="font-medium text-purple-800">Exam Date:</span>
                  <p className="text-purple-700">November 25, 2025</p>
                </div>
                <div>
                  <span className="font-medium text-purple-800">Start Time:</span>
                  <p className="text-purple-700">2:00 PM</p>
                </div>
                <div>
                  <span className="font-medium text-purple-800">Duration:</span>
                  <p className="text-purple-700">3 hours</p>
                </div>
              </div>
              <div className="mt-3">
                <p className="text-sm text-purple-700">
                  <span className="font-medium">Topics/Syllabus Coverage:</span> Comprehensive coverage including SQL queries, database design, normalization, transactions, and advanced topics
                </p>
              </div>
              <div className="mt-3">
                <p className="text-sm text-purple-700">
                  <span className="font-medium">Instructions & Guidelines:</span> Closed book examination, scientific calculator permitted, no electronic devices allowed
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </>
  );
}
