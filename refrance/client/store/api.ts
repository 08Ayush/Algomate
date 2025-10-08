import { createApi, type BaseQueryFn } from "@reduxjs/toolkit/query/react";
import { 
  Faculty, 
  Subject, 
  Classroom, 
  StudentBatch, 
  Timetable, 
  ScheduledClass,
  TimeSlot,
  CreateFacultyRequest,
  CreateSubjectRequest,
  CreateClassroomRequest,
  CreateStudentBatchRequest,
  CreateTimetableRequest,
  UpdateFacultyRequest,
  UpdateSubjectRequest,
  UpdateClassroomRequest,
  UpdateStudentBatchRequest,
  UpdateTimetableRequest,
  ApiResponse
} from "@shared/api.js";

// Re-export types for use in components
export type {
  Faculty,
  Subject,
  Classroom,
  StudentBatch,
  Timetable,
  ScheduledClass,
  TimeSlot,
  CreateFacultyRequest,
  CreateSubjectRequest,
  CreateClassroomRequest,
  CreateStudentBatchRequest,
  CreateTimetableRequest,
  UpdateFacultyRequest,
  UpdateSubjectRequest,
  UpdateClassroomRequest,
  UpdateStudentBatchRequest,
  UpdateTimetableRequest,
  ApiResponse
};

export interface LoginRequest { username: string; password: string }
export interface LoginResponse { access: string; refresh: string }

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
  type: "draft_ready" | "published" | "updated" | "conflict_detected" | "exam_scheduled" | "assignment_posted";
  title: string;
  message: string;
  timetable_id?: number; // Made optional since exam/assignment notifications don't relate to timetables
  exam_id?: string; // For exam notifications
  assignment_id?: string; // For assignment notifications
  from_user_id: number;
  to_user_id: number;
  created_at: string;
  is_read: boolean;
}

export interface TimetableChangeLog {
  id: string;
  timetable_id: number;
  user_id: number;
  action: "created" | "edited" | "finalized" | "approved" | "published" | "modified";
  description: string;
  changes: any; // Specific changes data
  timestamp: string;
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
    "Department",
    "Faculty",
    "Subject",
    "Classroom",
    "StudentBatch",
    "Timetable",
    "ScheduledClass",
  ],
  endpoints: (builder) => ({
    // Auth endpoints
    login: builder.mutation<LoginResponse, LoginRequest>({
      query: (body) => ({ url: "/auth/token/", method: "POST", body }),
    }),

    register: builder.mutation<any, { username: string; email?: string; password: string; role?: string }>({
      query: (body) => ({ url: "/auth/register/", method: "POST", body }),
    }),

    // Department endpoints
    getDepartments: builder.query<ApiResponse<any>, void>({
      query: () => ({ url: "/departments", method: "GET" }),
      providesTags: ["Department"],
    }),
    getDepartmentById: builder.query<ApiResponse<any>, string>({
      query: (id) => ({ url: `/departments/${id}`, method: "GET" }),
      providesTags: ["Department"],
    }),
    addDepartment: builder.mutation<ApiResponse<any>, any>({
      query: (body) => ({ url: "/departments", method: "POST", body }),
      invalidatesTags: ["Department"],
    }),
    updateDepartment: builder.mutation<ApiResponse<any>, { id: string; data: any }>({
      query: ({ id, data }) => ({ url: `/departments/${id}`, method: "PUT", body: data }),
      invalidatesTags: ["Department"],
    }),
    deleteDepartment: builder.mutation<ApiResponse<any>, string>({
      query: (id) => ({ url: `/departments/${id}`, method: "DELETE" }),
      invalidatesTags: ["Department"],
    }),

    // Faculty endpoints
    getFaculty: builder.query<ApiResponse<Faculty[]>, void>({ 
      query: () => ({ url: "/faculty/", method: "GET" }), 
      providesTags: ["Faculty"] 
    }),
    getFacultyById: builder.query<ApiResponse<Faculty>, number>({
      query: (id) => ({ url: `/faculty/${id}`, method: "GET" }),
      providesTags: ["Faculty"],
    }),
    addFaculty: builder.mutation<ApiResponse<Faculty>, CreateFacultyRequest>({
      query: (body) => ({ url: "/faculty/", method: "POST", body }),
      invalidatesTags: ["Faculty"],
    }),
    updateFaculty: builder.mutation<ApiResponse<Faculty>, { id: number; data: UpdateFacultyRequest }>({
      query: ({ id, data }) => ({ url: `/faculty/${id}`, method: "PUT", body: data }),
      invalidatesTags: ["Faculty"],
    }),
    deleteFaculty: builder.mutation<ApiResponse<Faculty>, number>({
      query: (id) => ({ url: `/faculty/${id}`, method: "DELETE" }),
      invalidatesTags: ["Faculty"],
    }),

    // Subject endpoints
    getSubjects: builder.query<ApiResponse<Subject[]>, { department?: string } | undefined>({ 
      query: (params) => ({ 
        url: `/subjects${params?.department ? `?department=${params.department}` : ""}`, 
        method: "GET" 
      }), 
      providesTags: ["Subject"] 
    }),
    getSubjectById: builder.query<ApiResponse<Subject>, number>({
      query: (id) => ({ url: `/subjects/${id}`, method: "GET" }),
      providesTags: ["Subject"],
    }),
    addSubject: builder.mutation<ApiResponse<Subject>, CreateSubjectRequest>({
      query: (body) => ({ url: "/subjects", method: "POST", body }),
      invalidatesTags: ["Subject"],
    }),
    updateSubject: builder.mutation<ApiResponse<Subject>, { id: number; data: UpdateSubjectRequest }>({
      query: ({ id, data }) => ({ url: `/subjects/${id}`, method: "PUT", body: data }),
      invalidatesTags: ["Subject"],
    }),
    deleteSubject: builder.mutation<ApiResponse<Subject>, number>({
      query: (id) => ({ url: `/subjects/${id}`, method: "DELETE" }),
      invalidatesTags: ["Subject"],
    }),

    // Classroom endpoints
    getClassrooms: builder.query<ApiResponse<Classroom[]>, { type?: string } | undefined>({ 
      query: (params) => ({ 
        url: `/classrooms${params?.type ? `?type=${params.type}` : ""}`, 
        method: "GET" 
      }), 
      providesTags: ["Classroom"] 
    }),
    getClassroomById: builder.query<ApiResponse<Classroom>, number>({
      query: (id) => ({ url: `/classrooms/${id}`, method: "GET" }),
      providesTags: ["Classroom"],
    }),
    addClassroom: builder.mutation<ApiResponse<Classroom>, CreateClassroomRequest>({
      query: (body) => ({ url: "/classrooms", method: "POST", body }),
      invalidatesTags: ["Classroom"],
    }),
    updateClassroom: builder.mutation<ApiResponse<Classroom>, { id: number; data: UpdateClassroomRequest }>({
      query: ({ id, data }) => ({ url: `/classrooms/${id}`, method: "PUT", body: data }),
      invalidatesTags: ["Classroom"],
    }),
    deleteClassroom: builder.mutation<ApiResponse<Classroom>, number>({
      query: (id) => ({ url: `/classrooms/${id}`, method: "DELETE" }),
      invalidatesTags: ["Classroom"],
    }),

    // Student Batch endpoints
    getBatches: builder.query<ApiResponse<StudentBatch[]>, { department?: string; year?: number; semester?: number } | undefined>({ 
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params?.department) searchParams.append('department', params.department);
        if (params?.year) searchParams.append('year', params.year.toString());
        if (params?.semester) searchParams.append('semester', params.semester.toString());
        return { url: `/batches${searchParams.toString() ? `?${searchParams.toString()}` : ""}`, method: "GET" };
      }, 
      providesTags: ["StudentBatch"] 
    }),
    getBatchById: builder.query<ApiResponse<StudentBatch>, number>({
      query: (id) => ({ url: `/batches/${id}`, method: "GET" }),
      providesTags: ["StudentBatch"],
    }),
    addBatch: builder.mutation<ApiResponse<StudentBatch>, CreateStudentBatchRequest>({
      query: (body) => ({ url: "/batches", method: "POST", body }),
      invalidatesTags: ["StudentBatch"],
    }),
    updateBatch: builder.mutation<ApiResponse<StudentBatch>, { id: number; data: UpdateStudentBatchRequest }>({
      query: ({ id, data }) => ({ url: `/batches/${id}`, method: "PUT", body: data }),
      invalidatesTags: ["StudentBatch"],
    }),
    deleteBatch: builder.mutation<ApiResponse<StudentBatch>, number>({
      query: (id) => ({ url: `/batches/${id}`, method: "DELETE" }),
      invalidatesTags: ["StudentBatch"],
    }),

    // Timetable endpoints
    listTimetables: builder.query<ApiResponse<Timetable[]>, { status?: string } | undefined>({ 
      query: (params) => ({ 
        url: `/timetables${params?.status ? `?status=${params.status}` : ""}`, 
        method: "GET" 
      }), 
      providesTags: ["Timetable"] 
    }),
    getTimetableById: builder.query<ApiResponse<Timetable>, number>({
      query: (id) => ({ url: `/timetables/${id}`, method: "GET" }),
      providesTags: ["Timetable"],
    }),
    getTimetableClasses: builder.query<ApiResponse<ScheduledClass[]>, number>({
      query: (id) => ({ url: `/timetables/${id}/classes`, method: "GET" }),
      providesTags: ["ScheduledClass"],
    }),
    addTimetable: builder.mutation<ApiResponse<Timetable>, CreateTimetableRequest>({
      query: (body) => ({ url: "/timetables", method: "POST", body }),
      invalidatesTags: ["Timetable"],
    }),
    updateTimetable: builder.mutation<ApiResponse<Timetable>, { id: number; data: UpdateTimetableRequest }>({
      query: ({ id, data }) => ({ url: `/timetables/${id}`, method: "PUT", body: data }),
      invalidatesTags: ["Timetable"],
    }),
    deleteTimetable: builder.mutation<ApiResponse<Timetable>, number>({
      query: (id) => ({ url: `/timetables/${id}`, method: "DELETE" }),
      invalidatesTags: ["Timetable"],
    }),
    approveTimetable: builder.mutation<{ ok: boolean }, number>({
      query: (id) => ({ url: `/timetables/${id}/approve/`, method: "POST" }),
      invalidatesTags: ["Timetable"],
    }),

    // Generation endpoints
    generateTimetable: builder.mutation<GenerateResponse, GenerateRequest>({
      query: (body) => ({ url: "/timetables/generate/", method: "POST", body }),
    }),
    getGenerationStatus: builder.query<GenerateStatusResponse, string>({
      query: (taskId) => ({ url: `/timetables/generate/status/${taskId}/`, method: "GET" }),
    }),
  }),
});

export const {
  // Auth
  useLoginMutation,
  useRegisterMutation,
  
  // Departments
  useGetDepartmentsQuery,
  useGetDepartmentByIdQuery,
  useAddDepartmentMutation,
  useUpdateDepartmentMutation,
  useDeleteDepartmentMutation,
  
  // Faculty
  useGetFacultyQuery,
  useGetFacultyByIdQuery,
  useAddFacultyMutation,
  useUpdateFacultyMutation,
  useDeleteFacultyMutation,
  
  // Subjects
  useGetSubjectsQuery,
  useGetSubjectByIdQuery,
  useAddSubjectMutation,
  useUpdateSubjectMutation,
  useDeleteSubjectMutation,
  
  // Classrooms
  useGetClassroomsQuery,
  useGetClassroomByIdQuery,
  useAddClassroomMutation,
  useUpdateClassroomMutation,
  useDeleteClassroomMutation,
  
  // Student Batches
  useGetBatchesQuery,
  useGetBatchByIdQuery,
  useAddBatchMutation,
  useUpdateBatchMutation,
  useDeleteBatchMutation,
  
  // Timetables
  useListTimetablesQuery,
  useGetTimetableByIdQuery,
  useGetTimetableClassesQuery,
  useAddTimetableMutation,
  useUpdateTimetableMutation,
  useDeleteTimetableMutation,
  useApproveTimetableMutation,
  
  // Generation
  useGenerateTimetableMutation,
  useGetGenerationStatusQuery,
} = api;