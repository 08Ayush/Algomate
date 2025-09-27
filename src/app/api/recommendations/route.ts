import { NextRequest, NextResponse } from 'next/server';

// Define types for recommendations
interface Course {
  id: string;
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: string;
  subjects: string[];
}

interface CareerPath {
  id: string;
  title: string;
  description: string;
  requiredSkills: string[];
  averageSalary: string;
  growthRate: string;
}

interface RecommendationResponse {
  courses: Course[];
  careers: CareerPath[];
  studyPlan: string[];
}

// Mock data
const mockCourses: Course[] = [
  {
    id: '1',
    title: 'Advanced Calculus',
    description: 'Master differential and integral calculus concepts',
    difficulty: 'Advanced',
    duration: '16 weeks',
    subjects: ['Mathematics']
  },
  {
    id: '2',
    title: 'Introduction to Programming',
    description: 'Learn fundamental programming concepts with Python',
    difficulty: 'Beginner',
    duration: '12 weeks',
    subjects: ['Computer Science']
  },
  {
    id: '3',
    title: 'Organic Chemistry Fundamentals',
    description: 'Explore the world of organic compounds and reactions',
    difficulty: 'Intermediate',
    duration: '14 weeks',
    subjects: ['Chemistry']
  }
];

const mockCareers: CareerPath[] = [
  {
    id: '1',
    title: 'Software Engineer',
    description: 'Design and develop software applications',
    requiredSkills: ['Programming', 'Problem Solving', 'Mathematics'],
    averageSalary: '$95,000',
    growthRate: '22%'
  },
  {
    id: '2',
    title: 'Data Scientist',
    description: 'Analyze complex data to help organizations make decisions',
    requiredSkills: ['Statistics', 'Programming', 'Machine Learning'],
    averageSalary: '$126,000',
    growthRate: '35%'
  },
  {
    id: '3',
    title: 'Research Scientist',
    description: 'Conduct scientific research in specialized fields',
    requiredSkills: ['Research Methods', 'Critical Thinking', 'Technical Writing'],
    averageSalary: '$89,000',
    growthRate: '7%'
  }
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subjects, interests, careerGoals, currentGrade } = body;

    if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Subjects array is required' },
        { status: 400 }
      );
    }

    // Simple recommendation algorithm (in reality, this would be more sophisticated)
    const recommendedCourses = mockCourses.filter(course =>
      course.subjects.some(subject =>
        subjects.some((userSubject: string) =>
          subject.toLowerCase().includes(userSubject.toLowerCase())
        )
      )
    );

    const recommendedCareers = mockCareers.filter(career =>
      career.requiredSkills.some(skill =>
        subjects.some((userSubject: string) =>
          skill.toLowerCase().includes(userSubject.toLowerCase()) ||
          userSubject.toLowerCase().includes(skill.toLowerCase())
        )
      )
    );

    // Generate study plan based on current grade
    const studyPlan = generateStudyPlan(currentGrade, subjects);

    const recommendations: RecommendationResponse = {
      courses: recommendedCourses,
      careers: recommendedCareers,
      studyPlan
    };

    return NextResponse.json({
      success: true,
      data: recommendations,
      message: 'Recommendations generated successfully'
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}

function generateStudyPlan(grade: string, subjects: string[]): string[] {
  const baseRecommendations = [
    'Complete current coursework with focus on strong fundamentals',
    'Engage in extracurricular activities related to your interests',
    'Build a portfolio of projects or research work'
  ];

  if (parseInt(grade) >= 11) {
    baseRecommendations.push(
      'Prepare for standardized tests (SAT/ACT)',
      'Research and visit potential universities',
      'Consider internships or job shadowing opportunities'
    );
  }

  if (subjects.includes('Computer Science') || subjects.includes('Mathematics')) {
    baseRecommendations.push('Participate in coding competitions or math olympiads');
  }

  if (subjects.includes('Science') || subjects.includes('Biology') || subjects.includes('Chemistry')) {
    baseRecommendations.push('Join science fairs and research programs');
  }

  return baseRecommendations;
}