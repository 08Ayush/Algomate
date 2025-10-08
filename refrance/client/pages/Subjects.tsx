import React, { useState } from 'react';
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Loader2, 
  BookOpen, 
  GraduationCap,
  Clock,
  Code,
  Search,
  Filter
} from 'lucide-react';

interface SubjectFormData {
  course_code: string;
  course_title: string;
  semester: number;
  credits: number;
  course_category: string;
  department_id: number;
}

// Comprehensive dummy subjects data for Computer Science Engineering (All 8 Semesters)
const dummySubjects = [
  // Semester I
  { id: 1, course_code: '25CE101T', course_title: 'Engineering Chemistry', semester: 1, credits: 2, course_category: 'BSC', department_id: 1 },
  { id: 2, course_code: '25CE101P', course_title: 'Engineering Chemistry Lab', semester: 1, credits: 1, course_category: 'BSC', department_id: 1 },
  { id: 3, course_code: '25CE102T', course_title: 'Linear Algebra and Calculus', semester: 1, credits: 3, course_category: 'BSC', department_id: 1 },
  { id: 4, course_code: '25CE102P', course_title: 'Linear Algebra and Calculus Lab', semester: 1, credits: 1, course_category: 'BSC', department_id: 1 },
  { id: 5, course_code: '25CE103T', course_title: 'Logic building with C', semester: 1, credits: 3, course_category: 'ESC', department_id: 1 },
  { id: 6, course_code: '25CE103P', course_title: 'Logic building with C Lab', semester: 1, credits: 1, course_category: 'ESC', department_id: 1 },
  { id: 7, course_code: '25CE104T', course_title: 'Competitive Programming - I', semester: 1, credits: 2, course_category: 'ESC', department_id: 1 },
  { id: 8, course_code: '25CE105T', course_title: 'Concept in Computer Engineering-I', semester: 1, credits: 2, course_category: 'PCC', department_id: 1 },
  { id: 9, course_code: '25CE106P', course_title: 'Business Communication Skills I Lab', semester: 1, credits: 1, course_category: 'AEC', department_id: 1 },
  { id: 10, course_code: '25CE107T', course_title: 'Indian Knowledge Systems', semester: 1, credits: 2, course_category: 'IKS', department_id: 1 },
  { id: 11, course_code: '25CE108T', course_title: 'Co-curricular Courses - I', semester: 1, credits: 2, course_category: 'CC', department_id: 1 },

  // Semester II
  { id: 12, course_code: '25CE201T', course_title: 'Engineering Physics and Materials Science', semester: 2, credits: 2, course_category: 'BSC', department_id: 1 },
  { id: 13, course_code: '25CE201P', course_title: 'Engineering Physics and Materials Science Lab', semester: 2, credits: 1, course_category: 'BSC', department_id: 1 },
  { id: 14, course_code: '25CE202T', course_title: 'Statistics and Probability', semester: 2, credits: 3, course_category: 'BSC', department_id: 1 },
  { id: 15, course_code: '25CE202P', course_title: 'Statistics and Probability Lab', semester: 2, credits: 1, course_category: 'BSC', department_id: 1 },
  { id: 16, course_code: '25CE203T', course_title: 'Problem Solving with Python', semester: 2, credits: 3, course_category: 'ESC', department_id: 1 },
  { id: 17, course_code: '25CE203P', course_title: 'Problem Solving with Python Lab', semester: 2, credits: 1, course_category: 'ESC', department_id: 1 },
  { id: 18, course_code: '25CE204T', course_title: 'Competitive Programming - II', semester: 2, credits: 2, course_category: 'ESC', department_id: 1 },
  { id: 19, course_code: '25CE205T', course_title: 'Modern Web Technologies', semester: 2, credits: 2, course_category: 'PCC', department_id: 1 },
  { id: 20, course_code: '25CE206P', course_title: 'Business Communication Skills - II Lab', semester: 2, credits: 1, course_category: 'AEC', department_id: 1 },
  { id: 21, course_code: '25CE207T', course_title: 'Design Thinking', semester: 2, credits: 2, course_category: 'SEC', department_id: 1 },
  { id: 22, course_code: '25CE208T', course_title: 'Co-curricular Courses - II', semester: 2, credits: 2, course_category: 'CC', department_id: 1 },

  // Semester III
  { id: 23, course_code: '25CE301T', course_title: 'Mathematics for Computer Engineering', semester: 3, credits: 3, course_category: 'PCC', department_id: 1 },
  { id: 24, course_code: '25CE302T', course_title: 'Data Structure', semester: 3, credits: 3, course_category: 'PCC', department_id: 1 },
  { id: 25, course_code: '25CE302P', course_title: 'Data Structure Lab', semester: 3, credits: 1, course_category: 'PCC', department_id: 1 },
  { id: 26, course_code: '25CE303T', course_title: 'Digital Circuits', semester: 3, credits: 2, course_category: 'PCC', department_id: 1 },
  { id: 27, course_code: '25CE303P', course_title: 'Digital Circuits Lab', semester: 3, credits: 1, course_category: 'PCC', department_id: 1 },
  { id: 28, course_code: '25CE304T', course_title: 'Computer Architecture', semester: 3, credits: 2, course_category: 'PCC', department_id: 1 },
  { id: 29, course_code: '25CE305P', course_title: 'Computer Lab-I', semester: 3, credits: 1, course_category: 'PCC', department_id: 1 },
  { id: 30, course_code: '25ES301T', course_title: 'Constitution of India', semester: 3, credits: 2, course_category: 'VEC', department_id: 1 },
  { id: 31, course_code: '25ES302T', course_title: 'Fundamentals of Entrepreneurship', semester: 3, credits: 2, course_category: 'HSSM', department_id: 1 },
  { id: 32, course_code: '25CE341P', course_title: 'Career Development - I', semester: 3, credits: 1, course_category: 'SEC', department_id: 1 },
  { id: 33, course_code: '25CE331M', course_title: 'MDM-I (Essentials of computing Systems)', semester: 3, credits: 2, course_category: 'MDM', department_id: 1 },

  // Semester IV
  { id: 34, course_code: '25CE401T', course_title: 'Data Communication', semester: 4, credits: 3, course_category: 'PCC', department_id: 1 },
  { id: 35, course_code: '25CE402T', course_title: 'Database Management System', semester: 4, credits: 3, course_category: 'PCC', department_id: 1 },
  { id: 36, course_code: '25CE402P', course_title: 'Database Management System Lab', semester: 4, credits: 1, course_category: 'PCC', department_id: 1 },
  { id: 37, course_code: '25CE403T', course_title: 'Object Oriented Programming', semester: 4, credits: 3, course_category: 'PCC', department_id: 1 },
  { id: 38, course_code: '25CE403P', course_title: 'Object Oriented Programming Lab', semester: 4, credits: 1, course_category: 'PCC', department_id: 1 },
  { id: 39, course_code: '25ES401T', course_title: 'Environmental Science', semester: 4, credits: 2, course_category: 'VEC', department_id: 1 },
  { id: 40, course_code: '25ES402T', course_title: 'Fundamentals of Economics and Management', semester: 4, credits: 2, course_category: 'HSSM', department_id: 1 },
  { id: 41, course_code: '25CE441P', course_title: 'Career Development - II', semester: 4, credits: 1, course_category: 'SEC', department_id: 1 },
  { id: 42, course_code: '25CE405P', course_title: 'Mini Project II', semester: 4, credits: 1, course_category: 'CEP', department_id: 1 },
  { id: 43, course_code: '25CE431M', course_title: 'MDM-II (Indian Cyber Law)', semester: 4, credits: 3, course_category: 'MDM', department_id: 1 },

  // Semester V
  { id: 44, course_code: '25CE501T', course_title: 'Theory of Computation', semester: 5, credits: 3, course_category: 'PCC', department_id: 1 },
  { id: 45, course_code: '25CE502T', course_title: 'Operating System', semester: 5, credits: 3, course_category: 'PCC', department_id: 1 },
  { id: 46, course_code: '25CE502P', course_title: 'Operating System Lab', semester: 5, credits: 1, course_category: 'PCC', department_id: 1 },
  { id: 47, course_code: '25CE503T', course_title: 'Professional Elective - I', semester: 5, credits: 2, course_category: 'PEC', department_id: 1 },
  { id: 48, course_code: '25CE504T', course_title: 'Professional Elective - II', semester: 5, credits: 2, course_category: 'PEC', department_id: 1 },
  { id: 49, course_code: '25CE505P', course_title: 'Technical Skill Development - I', semester: 5, credits: 2, course_category: 'VSC', department_id: 1 },
  { id: 50, course_code: '25CE541P', course_title: 'English for Engineers', semester: 5, credits: 2, course_category: 'AEC', department_id: 1 },
  { id: 51, course_code: '25CE531M', course_title: 'MDM-III (Introduction to Business Management)', semester: 5, credits: 3, course_category: 'MDM', department_id: 1 },
  { id: 52, course_code: '25CE5610', course_title: 'Open Elective - I', semester: 5, credits: 2, course_category: 'OE', department_id: 1 },

  // Semester VI
  { id: 53, course_code: '25CE601T', course_title: 'Design and Analysis of Algorithms', semester: 6, credits: 3, course_category: 'PCC', department_id: 1 },
  { id: 54, course_code: '25CE601P', course_title: 'Design and Analysis of Algorithms Lab', semester: 6, credits: 1, course_category: 'PCC', department_id: 1 },
  { id: 55, course_code: '25CE602T', course_title: 'Professional Elective -III', semester: 6, credits: 3, course_category: 'PEC', department_id: 1 },
  { id: 56, course_code: '25CE603T', course_title: 'Professional Elective -IV', semester: 6, credits: 3, course_category: 'PEC', department_id: 1 },
  { id: 57, course_code: '25CE604P', course_title: 'Technical Skill Development - II', semester: 6, credits: 2, course_category: 'VSC', department_id: 1 },
  { id: 58, course_code: '25CE605P', course_title: 'Project - 1', semester: 6, credits: 2, course_category: 'PROJ', department_id: 1 },
  { id: 59, course_code: '25CE631M', course_title: 'MDM-IV (Financial Accounting and Analysis)', semester: 6, credits: 3, course_category: 'MDM', department_id: 1 },
  { id: 60, course_code: '25CE6610', course_title: 'Open Elective -II', semester: 6, credits: 3, course_category: 'OE', department_id: 1 },

  // Semester VII
  { id: 61, course_code: '25CE701T', course_title: 'Compiler Construction', semester: 7, credits: 3, course_category: 'PCC', department_id: 1 },
  { id: 62, course_code: '25CE702T', course_title: 'Cryptography and Network Security', semester: 7, credits: 2, course_category: 'PCC', department_id: 1 },
  { id: 63, course_code: '25CE702P', course_title: 'Cryptography and Network Security Lab', semester: 7, credits: 1, course_category: 'PCC', department_id: 1 },
  { id: 64, course_code: '25CE703T', course_title: 'Professional Elective-V', semester: 7, credits: 3, course_category: 'PEC', department_id: 1 },
  { id: 65, course_code: '25CE704T', course_title: 'Professional Elective-VI', semester: 7, credits: 3, course_category: 'PEC', department_id: 1 },
  { id: 66, course_code: '25CE705P', course_title: 'Project - II', semester: 7, credits: 2, course_category: 'PROJ', department_id: 1 },
  { id: 67, course_code: '25CE731M', course_title: 'MDM-V (Economics and Innovation)', semester: 7, credits: 3, course_category: 'MDM', department_id: 1 },
  { id: 68, course_code: '25CE7610', course_title: 'Open Elective- III', semester: 7, credits: 3, course_category: 'OE', department_id: 1 },

  // Semester VIII (A)
  { id: 69, course_code: '25ES801T', course_title: 'Research Methodology', semester: 8, credits: 2, course_category: 'RM', department_id: 1 },
  { id: 70, course_code: '25ES801P', course_title: 'Research Methodology Lab', semester: 8, credits: 2, course_category: 'RM', department_id: 1 },
  { id: 71, course_code: '25CE802T', course_title: 'Professional Elective-VII', semester: 8, credits: 3, course_category: 'PEC', department_id: 1 },
  { id: 72, course_code: '25CE802P', course_title: 'Professional Elective-VII Lab', semester: 8, credits: 1, course_category: 'PEC', department_id: 1 },
  { id: 73, course_code: '25CE803P(i)', course_title: 'Industry/Research Internship', semester: 8, credits: 12, course_category: 'OJT', department_id: 1 },
  
  // Semester VIII (B) - Alternative track
  { id: 74, course_code: '25CE804P(i)', course_title: 'Institutional Internships & Project III', semester: 8, credits: 12, course_category: 'ELC', department_id: 1 }
];

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState(dummySubjects);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  const [formData, setFormData] = useState<SubjectFormData>({
    course_code: '',
    course_title: '',
    semester: 1,
    credits: 1,
    course_category: 'PCC',
    department_id: 1
  });

  const courseCategories = [
    'BSC', 'ESC', 'PCC', 'AEC', 'IKS', 'CC', 'VEC', 'HSSM', 'SEC', 'CEP', 
    'MDM', 'PEC', 'VSC', 'OE', 'PROJ', 'RM', 'OJT', 'ELC'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedSubject) {
      // Update existing subject
      setSubjects(prev => 
        prev.map(subject => 
          subject.id === selectedSubject.id 
            ? { ...subject, ...formData }
            : subject
        )
      );
      setIsEditDialogOpen(false);
    } else {
      // Add new subject
      const newSubject = {
        id: Math.max(...subjects.map(s => s.id)) + 1,
        ...formData
      };
      setSubjects(prev => [...prev, newSubject]);
      setIsAddDialogOpen(false);
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      course_code: '',
      course_title: '',
      semester: 1,
      credits: 1,
      course_category: 'PCC',
      department_id: 1
    });
    setSelectedSubject(null);
  };

  const handleEdit = (subject: any) => {
    setSelectedSubject(subject);
    setFormData({
      course_code: subject.course_code,
      course_title: subject.course_title,
      semester: subject.semester,
      credits: subject.credits,
      course_category: subject.course_category,
      department_id: subject.department_id
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (subjectId: number) => {
    if (confirm('Are you sure you want to delete this subject?')) {
      setSubjects(prev => prev.filter(subject => subject.id !== subjectId));
    }
  };

  // Filter subjects based on search and filters
  const filteredSubjects = subjects.filter(subject => {
    const matchesSearch = subject.course_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         subject.course_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSemester = selectedSemester === 'all' || subject.semester.toString() === selectedSemester;
    const matchesCategory = selectedCategory === 'all' || subject.course_category === selectedCategory;
    
    return matchesSearch && matchesSemester && matchesCategory;
  });

  // Group subjects by semester for tabs
  const subjectsBySemester = Array.from({length: 8}, (_, i) => i + 1).map(sem => ({
    semester: sem,
    subjects: filteredSubjects.filter(s => s.semester === sem)
  }));

  const getCategoryColor = (category: string) => {
    const colors: {[key: string]: string} = {
      'BSC': 'bg-blue-100 text-blue-800',
      'ESC': 'bg-green-100 text-green-800',
      'PCC': 'bg-purple-100 text-purple-800',
      'AEC': 'bg-yellow-100 text-yellow-800',
      'PEC': 'bg-red-100 text-red-800',
      'VEC': 'bg-indigo-100 text-indigo-800',
      'HSSM': 'bg-pink-100 text-pink-800',
      'SEC': 'bg-orange-100 text-orange-800',
      'MDM': 'bg-cyan-100 text-cyan-800',
      'PROJ': 'bg-emerald-100 text-emerald-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const SubjectForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="course_code">Course Code</Label>
          <Input
            id="course_code"
            value={formData.course_code}
            onChange={(e) => setFormData({ ...formData, course_code: e.target.value })}
            placeholder="25CE101T"
            required
          />
        </div>
        <div>
          <Label htmlFor="course_title">Course Title</Label>
          <Input
            id="course_title"
            value={formData.course_title}
            onChange={(e) => setFormData({ ...formData, course_title: e.target.value })}
            placeholder="Data Structures"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="semester">Semester</Label>
          <Select value={formData.semester.toString()} onValueChange={(value) => setFormData({ ...formData, semester: parseInt(value) })}>
            <SelectTrigger>
              <SelectValue placeholder="Select Semester" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({length: 8}, (_, i) => (
                <SelectItem key={i+1} value={(i+1).toString()}>{i+1} Semester</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="credits">Credits</Label>
          <Input
            id="credits"
            type="number"
            value={formData.credits}
            onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) || 1 })}
            min="1"
            max="12"
            required
          />
        </div>
        <div>
          <Label htmlFor="course_category">Category</Label>
          <Select value={formData.course_category} onValueChange={(value) => setFormData({ ...formData, course_category: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select Category" />
            </SelectTrigger>
            <SelectContent>
              {courseCategories.map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={() => {
          setIsAddDialogOpen(false);
          setIsEditDialogOpen(false);
          resetForm();
        }}>
          Cancel
        </Button>
        <Button type="submit">
          {selectedSubject ? 'Update Subject' : 'Add Subject'}
        </Button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Subjects Management</h1>
          <p className="text-muted-foreground mt-1">Computer Science Engineering - All Semesters</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Subject
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Subject</DialogTitle>
              <DialogDescription>
                Create a new subject with course details and academic information.
              </DialogDescription>
            </DialogHeader>
            <SubjectForm />
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Subjects</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredSubjects.length}</div>
            <p className="text-xs text-muted-foreground">Across all semesters</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredSubjects.reduce((sum, s) => sum + s.credits, 0)}</div>
            <p className="text-xs text-muted-foreground">Credit hours</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Core Subjects</CardTitle>
            <Code className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredSubjects.filter(s => s.course_category === 'PCC').length}</div>
            <p className="text-xs text-muted-foreground">PCC courses</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lab Subjects</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredSubjects.filter(s => s.course_title.includes('Lab')).length}</div>
            <p className="text-xs text-muted-foreground">Practical courses</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search subjects by name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedSemester} onValueChange={setSelectedSemester}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by Semester" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Semesters</SelectItem>
            {Array.from({length: 8}, (_, i) => (
              <SelectItem key={i+1} value={(i+1).toString()}>Semester {i+1}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {courseCategories.map(category => (
              <SelectItem key={category} value={category}>{category}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Subjects by Semester Tabs */}
      <Tabs defaultValue="1" className="w-full">
        <TabsList className="grid w-full grid-cols-8">
          {Array.from({length: 8}, (_, i) => (
            <TabsTrigger key={i+1} value={(i+1).toString()}>
              Sem {i+1}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {subjectsBySemester.map(({ semester, subjects }) => (
          <TabsContent key={semester} value={semester.toString()} className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Semester {semester} Subjects</h3>
              <Badge variant="outline">{subjects.length} subjects</Badge>
            </div>
            
            <div className="rounded-xl border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted text-left">
                    <th className="p-3">Course Code</th>
                    <th className="p-3">Course Title</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Credits</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.length === 0 ? (
                    <tr>
                      <td className="p-8 text-center" colSpan={5}>
                        <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-500">No subjects found for this semester.</p>
                      </td>
                    </tr>
                  ) : (
                    subjects.map((subject) => (
                      <tr key={subject.id} className="border-t">
                        <td className="p-3">
                          <Badge variant="outline">{subject.course_code}</Badge>
                        </td>
                        <td className="p-3 font-medium">{subject.course_title}</td>
                        <td className="p-3">
                          <Badge className={getCategoryColor(subject.course_category)}>
                            {subject.course_category}
                          </Badge>
                        </td>
                        <td className="p-3">{subject.credits}</td>
                        <td className="p-3">
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(subject)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(subject.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Edit Subject Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Subject</DialogTitle>
            <DialogDescription>
              Update subject information and academic details.
            </DialogDescription>
          </DialogHeader>
          <SubjectForm />
        </DialogContent>
      </Dialog>
    </div>
  );
}