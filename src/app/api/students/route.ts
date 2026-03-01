import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

// Define types for the student data
interface Student {
  id: string;
  name: string;
  email: string;
  grade: string;
  subjects: string[];
  goals: string[];
  createdAt: string;
}

// Mock data - in a real app, this would be in a database
const mockStudents: Student[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    grade: '12',
    subjects: ['Mathematics', 'Physics', 'Computer Science'],
    goals: ['University Admission', 'STEM Career'],
    createdAt: '2024-01-15T10:30:00Z'
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    grade: '11',
    subjects: ['Biology', 'Chemistry', 'English'],
    goals: ['Medical School', 'Research Career'],
    createdAt: '2024-01-16T14:20:00Z'
  }
];

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const searchParams = request.nextUrl.searchParams;
    const grade = searchParams.get('grade');
    const subject = searchParams.get('subject');

    let filteredStudents = mockStudents;

    // Filter by grade if provided
    if (grade) {
      filteredStudents = filteredStudents.filter(student => student.grade === grade);
    }

    // Filter by subject if provided
    if (subject) {
      filteredStudents = filteredStudents.filter(student =>
        student.subjects.some(s => s.toLowerCase().includes(subject.toLowerCase()))
      );
    }

    return NextResponse.json({
      success: true,
      data: filteredStudents,
      count: filteredStudents.length
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch students' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    if (user instanceof NextResponse) return user;

    const body = await request.json();

    // Validate required fields
    const { name, email, grade, subjects, goals } = body;

    if (!name || !email || !grade) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, email, grade' },
        { status: 400 }
      );
    }

    // Create new student
    const newStudent: Student = {
      id: Date.now().toString(),
      name,
      email,
      grade,
      subjects: subjects || [],
      goals: goals || [],
      createdAt: new Date().toISOString()
    };

    // In a real app, save to database
    mockStudents.push(newStudent);

    return NextResponse.json({
      success: true,
      data: newStudent,
      message: 'Student created successfully'
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create student' },
      { status: 500 }
    );
  }
}