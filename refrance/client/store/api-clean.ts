import { createApi, type BaseQueryFn } from "@reduxjs/toolkit/query/react";
import { getSupabaseClient } from "../../shared/supabase";

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
  last_modified_by?: number;
  last_modified_at?: string;
  version: number; // For tracking versions
}
export interface ScheduledClass { id: number; timetable: number; subject: number; faculty: number; student_batch: number; classroom: number; timeslot: number; class_type: "Lecture" | "Lab" }

export interface GenerateRequest { name: string; year: number; semester: number }
export interface GenerateResponse { task_id: string }
export interface GenerateStatusResponse { status: "PENDING" | "SUCCESS" | "FAILURE"; progress?: string; error?: string; new_timetable_id?: number }

// Supabase integration
async function handleSupabaseRequest(urlPath: string, method: string, body?: any) {
  try {
    const supabase = getSupabaseClient();
    
    // Remove /api prefix for processing
    const path = urlPath.replace(/^\/api/, "");
    
    // Faculty endpoints
    if (method === "GET" && path === "/faculty/") {
      const { data, error } = await supabase
        .from("faculty")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return { data: data || [] };
    }
    
    if (method === "POST" && path === "/faculty/") {
      const { data, error } = await supabase
        .from("faculty")
        .insert(body)
        .select()
        .single();
      
      if (error) throw error;
      return { data };
    }
    
    // Subjects endpoints
    if (method === "GET" && path === "/subjects/") {
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return { data: data || [] };
    }
    
    // Classrooms endpoints
    if (method === "GET" && path === "/classrooms/") {
      const { data, error } = await supabase
        .from("classrooms")
        .select("*")
        .order("room_number");
      
      if (error) throw error;
      return { data: data || [] };
    }
    
    // Student batches endpoints
    if (method === "GET" && path === "/batches/") {
      const { data, error } = await supabase
        .from("student_batches")
        .select(`
          *,
          batch_subject_assignments (
            subject_id,
            subjects (*)
          )
        `)
        .order("name");
      
      if (error) throw error;
      
      // Transform the data to match expected format
      const transformedData = data?.map((batch: any) => ({
        ...batch,
        subjects: batch.batch_subject_assignments?.map((bs: any) => bs.subject_id) || []
      })) || [];
      
      return { data: transformedData };
    }
    
    // Timetables endpoints
    if (method === "GET" && path === "/timetables/") {
      const { data, error } = await supabase
        .from("timetables")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return { data: data || [] };
    }
    
    return null;
  } catch (error) {
    console.error("Supabase request error:", error);
    throw error;
  }
}

// Mock data fallback
async function handleMockRequest(urlPath: string, method: string, body?: any) {
  function mockDelay(ms = 300) {
    return new Promise((res) => setTimeout(res, ms));
  }

  const path = urlPath.replace(/^\/api/, "");
  
  if (method === "GET" && path === "/faculty/") {
    await mockDelay(100);
    return { data: [{ id: 1, name: "Dr. Alice", employee_id: "E001", department: "CSE" }] };
  }
  
  if (method === "GET" && path === "/subjects/") {
    await mockDelay(100);
    return { data: [
      { id: 1, name: "Algorithms", code: "CS201", department: "CSE", credits: 4, lectures_per_week: 3, labs_per_week: 1, requires_lab: true },
      { id: 2, name: "Databases", code: "CS301", department: "CSE", credits: 3, lectures_per_week: 2, labs_per_week: 1, requires_lab: true },
    ] };
  }
  
  if (method === "GET" && path === "/classrooms/") {
    await mockDelay(80);
    return { data: [
      { id: 1, name: "Room 101", capacity: 60, type: "Lecture", has_projector: true, has_smartboard: false },
      { id: 2, name: "Lab A", capacity: 24, type: "Lab", has_projector: false, has_smartboard: true },
    ] };
  }
  
  if (method === "GET" && path === "/batches/") {
    await mockDelay(80);
    return { data: [
      { id: 1, name: "CSE 2025 Batch A", year: 2025, semester: 1, strength: 58, department: "CSE", subjects: [1,2] }
    ] };
  }
  
  if (method === "GET" && path === "/timetables/") {
    await mockDelay(120);
    return { data: [ { id: 1, name: "Sample Timetable", status: "Approved", created_by: 1, created_at: new Date().toISOString(), quality_score: 0.92 } ] };
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

  // Try Supabase first, then fallback to mock
  try {
    const supabaseResp = await handleSupabaseRequest(url.replace(/^https?:\/\/[\w\.-]+/, ""), method, body);
    if (supabaseResp) return supabaseResp as any;
  } catch (supabaseErr) {
    console.debug("Supabase request failed, falling back to mock:", supabaseErr);
    
    try {
      const mockResp = await handleMockRequest(url.replace(/^https?:\/\/[\w\.-]+/, ""), method, body);
      if (mockResp) return mockResp as any;
    } catch (mErr) {
      console.debug("Mock handler error", mErr);
    }
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
    try {
      const mockResp = await handleMockRequest(url.replace(/^https?:\/\/[\w\.-]+/, ""), method, body);
      if (mockResp) return mockResp as any;
    } catch (mErr) {
      console.debug("Mock fallback error", mErr);
    }

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