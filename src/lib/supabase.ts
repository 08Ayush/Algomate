import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database Types based on your new schema
export interface Department {
  id: string
  name: string
  code: string
  description?: string
  head_of_department?: string
  max_hours_per_day: number
  working_days: string[]
  default_class_duration: number
  algorithm_priority: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  first_name: string
  last_name: string
  college_uid: string
  email: string
  password_hash: string
  phone?: string
  profile_image_url?: string
  department_id?: string
  role: 'admin' | 'faculty' | 'student' | 'hod'
  faculty_type?: 'creator' | 'publisher' | 'general' | 'guest'
  max_hours_per_day?: number
  max_hours_per_week?: number
  min_hours_per_week?: number
  faculty_priority?: number
  algorithm_weight?: number
  preferred_days?: string[]
  avoid_days?: string[]
  preferred_time_start?: string
  preferred_time_end?: string
  unavailable_slots?: any
  is_shared_faculty?: boolean
  is_guest_faculty?: boolean
  is_active: boolean
  email_verified: boolean
  last_login?: string
  created_at: string
  updated_at: string
  departments?: Department
}

export interface Subject {
  id: string
  name: string
  code: string
  department_id: string
  credits: number
}

export interface Classroom {
  id: string
  name: string
  capacity: number
  location: string
  created_at: string
}

// Auth helper functions
export const authHelpers = {
  // Register a new user
  async registerUser(userData: {
    email: string
    password: string
    firstName: string
    lastName: string
    department_id: string
    role: 'admin' | 'faculty' | 'student' | 'hod'
    faculty_type?: 'creator' | 'publisher' | 'general' | 'guest'
  }) {
    try {
      // Generate unique college UID
      const college_uid = `${userData.role.toUpperCase().substring(0, 3)}${Date.now().toString().slice(-6)}`
      
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 12)

      // Create user in users table with new schema
      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .insert({
          first_name: userData.firstName,
          last_name: userData.lastName,
          college_uid,
          email: userData.email,
          password_hash: hashedPassword,
          department_id: userData.department_id,
          role: userData.role,
          faculty_type: userData.role === 'faculty' ? userData.faculty_type : null,
          is_active: true,
          email_verified: false
        })
        .select(`
          id,
          first_name,
          last_name,
          college_uid,
          email,
          role,
          faculty_type,
          department_id,
          created_at,
          departments(id, name, code)
        `)
        .single()

      if (userError) throw userError

      return { userRecord }
    } catch (error) {
      console.error('Registration error:', error)
      throw error
    }
  },

  // Login user
  async loginUser(identifier: string, password: string) {
    try {
      // Find user by email with department info
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          *,
          departments(id, name, code)
        `)
        .eq('email', identifier)
        .eq('is_active', true)
        .single()

      if (userError || !userData) {
        throw new Error('Invalid email or password')
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, userData.password_hash)
      if (!isValidPassword) {
        throw new Error('Invalid email or password')
      }

      // Update last login
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userData.id)

      return { userData }
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  },

  // Get user profile
  async getUserProfile(userId: string) {
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select(`
          *,
          departments(id, name, code)
        `)
        .eq('id', userId)
        .eq('is_active', true)
        .single()

      if (error) throw error
      return userData
    } catch (error) {
      console.error('Get user profile error:', error)
      throw error
    }
  }
}

// Database helper functions
export const dbHelpers = {
  // Get all departments
  async getDepartments(): Promise<Department[]> {
    try {
      // Use our API endpoint instead of direct Supabase call
      const response = await fetch('/api/departments')
      if (!response.ok) {
        throw new Error(`Failed to fetch departments: ${response.status}`)
      }
      const result = await response.json()
      return result.departments || []
    } catch (error) {
      console.error('Error fetching departments:', error)
      throw error
    }
  },

  // Get department by ID
  async getDepartmentById(id: string): Promise<Department | null> {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  // Create department
  async createDepartment(name: string, code: string): Promise<Department> {
    const { data, error } = await supabase
      .from('departments')
      .insert({ name, code })
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Get all subjects
  async getSubjects(): Promise<Subject[]> {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .order('name')

    if (error) throw error
    return data || []
  },

  // Get subjects by department
  async getSubjectsByDepartment(departmentId: string): Promise<Subject[]> {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('department_id', departmentId)
      .order('name')

    if (error) throw error
    return data || []
  },

  // Get all classrooms
  async getClassrooms(): Promise<Classroom[]> {
    const { data, error } = await supabase
      .from('classrooms')
      .select('*')
      .order('name')

    if (error) throw error
    return data || []
  },

  // Get all faculty
  async getFaculty(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        departments(id, name, code)
      `)
      .eq('role', 'faculty')
      .eq('is_active', true)
      .order('first_name')

    if (error) throw error
    return data || []
  },

  // Get all students
  async getStudents(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        departments(id, name, code)
      `)
      .eq('role', 'student')
      .eq('is_active', true)
      .order('first_name')

    if (error) throw error
    return data || []
  },

  // Get all users by role
  async getUsersByRole(role: 'admin' | 'faculty' | 'student' | 'hod'): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        departments(id, name, code)
      `)
      .eq('role', role)
      .eq('is_active', true)
      .order('first_name')

    if (error) throw error
    return data || []
  }
}