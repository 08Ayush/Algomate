import { createApi, type BaseQueryFn } from "@reduxjs/toolkit/query/react";

export interface LoginRequest { username: string; password: string }
export interface LoginResponse { access: string; refresh: string }

// Entities
export interface Faculty { id: number; name: string; employee_id: string; department: string; user?: number | null }
export interface Subject { id: number; name: string; code: string; department: string; credits: number; lectures_per_week: number; labs_per_week: number; requires_lab: boolean }
export interface Classroom { id: number; name: string; capacity: number; type: "Lecture" | "Lab"; has_projector: boolean; has_smartboard: boolean }
export interface StudentBatch { id: number; name: string; year: number; semester: number; strength: number; department: string; subjects: number[] }
export interface TimeSlot { id: number; day_of_week: string; start_time: string; end_time: string }
export interface Timetable { 
  id: number; 
  name: string; 
  status: "Draft" | "Pending Approval" | "Approved" | "Archived"; 
  created_by: number; 
  created_at: string; 
  quality_score: number;
  // New workflow fields
  creator_id?: number; // Faculty Mentor 2 (Creator)
  publisher_id?: number; // Faculty Mentor 1 (Publisher)
  department_id?: string;
  finalized_at?: string; // When Creator finalized the draft
  approved_at?: string; // When Publisher approved/published
  workflow_stage: "creation" | "finalized" | "under_review" | "published";
  workflow_status: "draft" | "under_review" | "published" | "archived";
  last_modified_by?: number;
  last_modified_at?: string;
  version: number; // For tracking versions
}
export interface ScheduledClass { id: number; timetable: number; subject: number; faculty: number; student_batch: number; classroom: number; timeslot: number; class_type: "Lecture" | "Lab" }

export interface GenerateRequest { name: string; year: number; semester: number }
export interface GenerateResponse { task_id: string }
export interface GenerateStatusResponse { status: "PENDING" | "SUCCESS" | "FAILURE"; progress?: string; error?: string; new_timetable_id?: number }

// New interfaces for the AI Chatbot and Workflow
export interface ChatMessage {
  id: string;
  type: "user" | "ai";
  content: string;
  timestamp: string;
}

export interface TimetableConstraint {
  type: "faculty_preference" | "classroom_availability" | "subject_requirement" | "break_time" | "lab_slot";
  description: string;
  priority: "high" | "medium" | "low";
  data: any; // Specific constraint data
}

export interface WorkflowNotification {
  id: string;
  type: "draft_ready" | "published" | "updated" | "conflict_detected";
  title: string;
  message: string;
  timetable_id: number;
  from_user_id: number;
  to_user_id: number;
  created_at: string;
  is_read: boolean;
}

export interface TimetableChangeLog {
  id: string;
  timetable_id: number;
  user_id: number;
  user_name: string;
  user_role: string;
  change_type: 'created' | 'updated' | 'finalized' | 'published' | 'class_added' | 'class_updated' | 'class_deleted' | 'modified';
  description: string;
  old_value?: any;
  new_value?: any;
  affected_entity?: string; // 'class', 'schedule', 'metadata'
  affected_entity_id?: number;
  timestamp: string;
  session_id?: string; // Group related changes
  ip_address?: string;
  user_agent?: string;
  changes?: any; // Backward compatibility
}

export interface TimetableVersion {
  id: string;
  timetable_id: number;
  version_number: number;
  created_by: number;
  created_at: string;
  description: string;
  data_snapshot: any; // JSON snapshot of timetable state
  change_summary: string;
  is_major_version: boolean;
}

export interface ChangeTrackingStats {
  total_changes: number;
  changes_last_24h: number;
  most_active_user: string;
  most_common_change_type: string;
  version_count: number;
  last_major_version: string;
}

// New workflow request interfaces
export interface FinalizeDraftRequest {
  timetable_id: number;
  message?: string;
}

export interface PublishTimetableRequest {
  timetable_id: number;
  approve_without_changes?: boolean;
  modifications?: any;
  message?: string;
}

export interface ChatGenerateRequest {
  department_id: string;
  messages: ChatMessage[];
  constraints: TimetableConstraint[];
}

// Simple mock data for development
async function handleMockRequest(urlPath: string, method: string, body?: any) {
  function mockDelay(ms = 300) {
    return new Promise((res) => setTimeout(res, ms));
  }

  const path = urlPath.replace(/^\/api/, "");
  
  if (method === "GET" && path === "/faculty/") {
    await mockDelay(100);
    return { data: [
      { id: 1, name: "Dr. Alice Johnson", employee_id: "FAC001", department: "Computer Science" },
      { id: 2, name: "Prof. Bob Smith", employee_id: "FAC002", department: "Computer Science" },
      { id: 3, name: "Dr. Carol Brown", employee_id: "FAC003", department: "Electronics" }
    ] };
  }
  
  if (method === "GET" && path === "/subjects/") {
    await mockDelay(100);
    return { data: [
      { id: 1, name: "Data Structures and Algorithms", code: "CS201", department: "Computer Science", credits: 4, lectures_per_week: 3, labs_per_week: 1, requires_lab: true },
      { id: 2, name: "Database Management Systems", code: "CS301", department: "Computer Science", credits: 4, lectures_per_week: 3, labs_per_week: 1, requires_lab: true },
      { id: 3, name: "Computer Networks", code: "CS302", department: "Computer Science", credits: 3, lectures_per_week: 2, labs_per_week: 1, requires_lab: true }
    ] };
  }
  
  if (method === "GET" && path === "/classrooms/") {
    await mockDelay(80);
    return { data: [
      { id: 1, name: "Room 101", capacity: 60, type: "Lecture", has_projector: true, has_smartboard: false },
      { id: 2, name: "CS Lab A", capacity: 30, type: "Lab", has_projector: true, has_smartboard: true },
      { id: 3, name: "Room 102", capacity: 60, type: "Lecture", has_projector: true, has_smartboard: true }
    ] };
  }
  
  if (method === "GET" && path === "/batches/") {
    await mockDelay(80);
    return { data: [
      { id: 1, name: "CSE 2025 Batch A", year: 2025, semester: 1, strength: 58, department: "Computer Science", subjects: [1,2] },
      { id: 2, name: "CSE 2025 Batch B", year: 2025, semester: 1, strength: 52, department: "Computer Science", subjects: [1,3] }
    ] };
  }
  
  if (method === "GET" && path === "/timetables/") {
    await mockDelay(120);
    return { data: [
      { id: 1, name: "Fall 2025 Main Schedule", status: "Approved", created_by: 1, created_at: new Date().toISOString(), quality_score: 0.92 },
      { id: 2, name: "Spring 2025 Draft", status: "Draft", created_by: 1, created_at: new Date().toISOString(), quality_score: 0.0 }
    ] };
  }

  if (method === "GET" && /^\/timetables\/\d+\/$/.test(path)) {
    await mockDelay(120);
    const match = path.match(/^\/timetables\/(\d+)\//);
    const id = match ? Number(match[1]) : 1;
    return { 
      data: { 
        timetable: { 
          id, 
          name: `Timetable ${id}`, 
          status: "Approved", 
          created_by: 1, 
          created_at: new Date().toISOString(), 
          quality_score: 0.9 
        }, 
        classes: [] 
      } 
    };
  }

  if (method === "POST") {
    await mockDelay(100);
    const id = Math.floor(Math.random() * 1000) + 10;
    return { data: { id, ...body } };
  }

  return null;
}

// Base query configuration
const baseUrl = "/api";

const customBaseQuery: BaseQueryFn<{
  url: string;
  method?: string;
  body?: any;
  params?: Record<string, any>;
}, unknown, unknown> = async (args, api, extraOptions) => {
  const url = typeof args === "string" ? `${baseUrl}${args}` : `${baseUrl}${args.url}`;
  const method = (args as any).method ?? "GET";
  const body = (args as any).body;

  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  
  try {
    const token = localStorage.getItem("access_token");
    if (token) headers["authorization"] = `Bearer ${token}`;
  } catch {}

  const init: RequestInit = {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  };

  // Try mock data first for development
  try {
    const mockResp = await handleMockRequest(url.replace(/^https?:\/\/[\w\.-]+/, ""), method, body);
    if (mockResp) return mockResp as any;
  } catch (mErr) {
    console.debug("Mock handler error", mErr);
  }

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { error: { status: "OFFLINE", error: "No network connection" } } as any;
  }

  try {
    const res = await fetch(url, init);
    let data: any = undefined;
    
    try {
      const txt = await res.clone().text();
      const ctype = res.headers.get("content-type") || "";
      if (ctype.includes("application/json")) {
        try { 
          data = txt ? JSON.parse(txt) : undefined; 
        } catch (e) { 
          data = txt; 
        }
      } else {
        data = txt;
      }
    } catch (readError) {
      console.debug("Response body could not be read:", readError);
      data = undefined;
    }

    if (!res.ok) {
      return { error: { status: res.status, data } } as any;
    }

    return { data } as any;
  } catch (fetchError) {
    console.debug("Network request failed:", fetchError);
    return { error: { status: "FETCH_ERROR", error: String(fetchError) } } as any;
  }
};

export const api = createApi({
  reducerPath: "api",
  baseQuery: customBaseQuery,
  tagTypes: [
    "Faculty",
    "Subject",
    "Classroom",
    "StudentBatch",
    "Timetable",
    "ScheduledClass",
  ],
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (body) => ({ url: "/auth/token/", method: "POST", body }),
    }),

    register: builder.mutation<any, { username: string; email?: string; password: string; role?: string }>({
      query: (body) => ({ url: "/auth/register/", method: "POST", body }),
    }),

    // CRUD endpoints
    getFaculty: builder.query<Faculty[], void>({ 
      query: () => ({ url: "/faculty/", method: "GET" }), 
      providesTags: ["Faculty"] 
    }),
    addFaculty: builder.mutation<Faculty, Partial<Faculty>>({
      query: (body) => ({ url: "/faculty/", method: "POST", body }),
      invalidatesTags: ["Faculty"],
    }),

    getSubjects: builder.query<Subject[], void>({ 
      query: () => ({ url: "/subjects/", method: "GET" }), 
      providesTags: ["Subject"] 
    }),

    getClassrooms: builder.query<Classroom[], void>({ 
      query: () => ({ url: "/classrooms/", method: "GET" }), 
      providesTags: ["Classroom"] 
    }),

    getBatches: builder.query<StudentBatch[], void>({ 
      query: () => ({ url: "/batches/", method: "GET" }), 
      providesTags: ["StudentBatch"] 
    }),

    // Timetables
    listTimetables: builder.query<Timetable[], void>({ 
      query: () => ({ url: "/timetables/", method: "GET" }), 
      providesTags: ["Timetable"] 
    }),
    getTimetableById: builder.query<{ timetable: Timetable; classes: ScheduledClass[] }, number>({
      query: (id) => ({ url: `/timetables/${id}/`, method: "GET" }),
      providesTags: ["Timetable", "ScheduledClass"],
    }),
    approveTimetable: builder.mutation<{ ok: boolean }, number>({
      query: (id) => ({ url: `/timetables/${id}/approve/`, method: "POST" }),
      invalidatesTags: ["Timetable"],
    }),

    // Generation
    generateTimetable: builder.mutation<GenerateResponse, GenerateRequest>({
      query: (body) => ({ url: "/timetables/generate/", method: "POST", body }),
    }),
    getGenerationStatus: builder.query<GenerateStatusResponse, string>({
      query: (taskId) => ({ url: `/timetables/generate/status/${taskId}/`, method: "GET" }),
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGetFacultyQuery,
  useAddFacultyMutation,
  useGetSubjectsQuery,
  useGetClassroomsQuery,
  useGetBatchesQuery,
  useListTimetablesQuery,
  useGetTimetableByIdQuery,
  useApproveTimetableMutation,
  useGenerateTimetableMutation,
  useGetGenerationStatusQuery,
} = api;