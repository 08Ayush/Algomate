import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database Types based on your current schema
export interface Department {
  id: string
  name: string
  code: string
  created_at: string
}

export interface Faculty {
  id: string
  name: string
  email: string
  department_id: string
  created_at: string
}

export interface Student {
  id: string
  name: string
  email: string
  department_id: string
  batch_year: number
  created_at: string
}

export interface User {
  id: string
  email: string
  password: string
  role: 'admin' | 'faculty' | 'student'
  created_at: string
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
    name: string
    department_id: string
    role: 'student' | 'faculty'
    batch_year?: number
  }) {
    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 12)

      // Create user in users table
      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .insert({
          email: userData.email,
          password: hashedPassword,
          role: userData.role
        })
        .select()
        .single()

      if (userError) throw userError

      // Add to specific role table
      if (userData.role === 'student') {
        const { error: studentError } = await supabase
          .from('students')
          .insert({
            id: userRecord.id,
            name: userData.name,
            email: userData.email,
            department_id: userData.department_id,
            batch_year: userData.batch_year || new Date().getFullYear()
          })

        if (studentError) throw studentError
      } else if (userData.role === 'faculty') {
        const { error: facultyError } = await supabase
          .from('faculty')
          .insert({
            id: userRecord.id,
            name: userData.name,
            email: userData.email,
            department_id: userData.department_id
          })

        if (facultyError) throw facultyError
      }

      return { userRecord }
    } catch (error) {
      console.error('Registration error:', error)
      throw error
    }
  },

  // Login user
  async loginUser(identifier: string, password: string) {
    try {
      // Find user by email
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          *,
          students(*),
          faculty(*)
        `)
        .eq('email', identifier)
        .single()

      if (userError || !userData) {
        throw new Error('Invalid email or password')
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, userData.password)
      if (!isValidPassword) {
        throw new Error('Invalid email or password')
      }

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
          students(*),
          faculty(*)
        `)
        .eq('id', userId)
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
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('name')

    if (error) throw error
    return data || []
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
  async getFaculty(): Promise<Faculty[]> {
    const { data, error } = await supabase
      .from('faculty')
      .select(`
        *,
        departments(name)
      `)
      .order('name')

    if (error) throw error
    return data || []
  },

  // Get all students
  async getStudents(): Promise<Student[]> {
    const { data, error } = await supabase
      .from('students')
      .select(`
        *,
        departments(name)
      `)
      .order('name')

    if (error) throw error
    return data || []
  }
}