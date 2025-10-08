import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Plus, Users, Calendar, GraduationCap, Building, Mail, Phone, MapPin, Edit, Trash2, UserPlus, Crown, Loader2, BookOpen } from 'lucide-react';
import { 
  useGetDepartmentsQuery, 
  useAddDepartmentMutation, 
  useUpdateDepartmentMutation, 
  useDeleteDepartmentMutation 
} from '../store/api';
import { CreateDepartmentRequest, UpdateDepartmentRequest } from '@shared/api.js';

// Mock users data - in a real app, this would come from an API
const mockUsers = [
  { id: '1', username: 'jsmith', email: 'john.smith@college.edu', first_name: 'Dr. John', last_name: 'Smith', role: 'admin' },
  { id: '2', username: 'sjohnson', email: 'sarah.johnson@college.edu', first_name: 'Dr. Sarah', last_name: 'Johnson', role: 'admin' },
  { id: '3', username: 'mbrown', email: 'mike.brown@college.edu', first_name: 'Prof. Mike', last_name: 'Brown', role: 'mentor' },
  { id: '4', username: 'awilson', email: 'alice.wilson@college.edu', first_name: 'Dr. Alice', last_name: 'Wilson', role: 'mentor' }
];

// Mock departments data with comprehensive information
const mockDepartments = [
  {
    id: '1',
    name: 'Computer Science & Engineering',
    code: 'CSE',
    description: 'The Computer Science & Engineering department offers cutting-edge programs in software development, artificial intelligence, machine learning, cybersecurity, and data science. We focus on both theoretical foundations and practical applications.',
    head_of_department_id: '1',
    head_of_department: 'Dr. John Smith',
    established_year: 2010,
    contact_email: 'cse@college.edu',
    contact_phone: '+1-555-0101',
    building: 'Engineering Block A',
    floor_number: 3,
    total_students: 450,
    total_faculty: 15,
    total_classrooms: 12,
    total_subjects: 35,
    students: [
      { id: '1', name: 'Aarav Sharma', roll_number: 'CSE001', semester: 3, batch: 'A1', email: 'aarav.sharma@student.edu' },
      { id: '2', name: 'Priya Patel', roll_number: 'CSE002', semester: 3, batch: 'A1', email: 'priya.patel@student.edu' },
      { id: '3', name: 'Rahul Singh', roll_number: 'CSE003', semester: 4, batch: 'B1', email: 'rahul.singh@student.edu' },
      { id: '4', name: 'Sneha Gupta', roll_number: 'CSE004', semester: 4, batch: 'B1', email: 'sneha.gupta@student.edu' },
      { id: '5', name: 'Arjun Kumar', roll_number: 'CSE005', semester: 5, batch: 'C1', email: 'arjun.kumar@student.edu' }
    ],
    faculty: [
      { id: '1', name: 'Dr. Manoj V. Bramhe', specialization: 'Data Structures and Algorithms', employee_id: 'FAC001', email: 'manoj.bramhe@college.edu' },
      { id: '2', name: 'Dr. Sunil M. Wanjari', specialization: 'Database Management Systems', employee_id: 'FAC002', email: 'sunil.wanjari@college.edu' },
      { id: '3', name: 'Dr. Dipak W. Wajgi', specialization: 'Computer Networks', employee_id: 'FAC003', email: 'dipak.wajgi@college.edu' },
      { id: '4', name: 'Dr. Komal K. Gehani', specialization: 'Operating Systems', employee_id: 'FAC004', email: 'komal.gehani@college.edu' },
      { id: '5', name: 'Dr. Pallavi M. Wankhede', specialization: 'Software Engineering', employee_id: 'FAC005', email: 'pallavi.wankhede@college.edu' }
    ],
    subjects: [
      { id: '1', course_code: '25CE301T', course_title: 'Mathematics for Computer Engineering', semester: 3, credits: 3, category: 'PCC' },
      { id: '2', course_code: '25CE302T', course_title: 'Data Structure', semester: 3, credits: 3, category: 'PCC' },
      { id: '3', course_code: '25CE303T', course_title: 'Digital Circuits', semester: 3, credits: 2, category: 'PCC' },
      { id: '4', course_code: '25CE304T', course_title: 'Computer Architecture', semester: 3, credits: 2, category: 'PCC' },
      { id: '5', course_code: '25CE401T', course_title: 'Data Communication', semester: 4, credits: 3, category: 'PCC' },
      { id: '6', course_code: '25CE402T', course_title: 'Database Management System', semester: 4, credits: 3, category: 'PCC' },
      { id: '7', course_code: '25CE403T', course_title: 'Object Oriented Programming', semester: 4, credits: 3, category: 'PCC' }
    ],
    classrooms: [
      { id: '1', room_number: 'A101', capacity: 60, type: 'Lecture Hall', building: 'Engineering Block A', floor: 1, facilities: ['Projector', 'AC', 'Whiteboard'] },
      { id: '2', room_number: 'A102', capacity: 60, type: 'Lecture Hall', building: 'Engineering Block A', floor: 1, facilities: ['Projector', 'AC', 'Whiteboard'] },
      { id: '3', room_number: 'Lab-1', capacity: 30, type: 'Computer Lab', building: 'Engineering Block A', floor: 2, facilities: ['30 PCs', 'Projector', 'AC', 'Server'] },
      { id: '4', room_number: 'Lab-2', capacity: 30, type: 'Computer Lab', building: 'Engineering Block A', floor: 2, facilities: ['30 PCs', 'Projector', 'AC', 'Server'] },
      { id: '5', room_number: 'B201', capacity: 80, type: 'Auditorium', building: 'Engineering Block A', floor: 3, facilities: ['Sound System', 'Projector', 'AC', 'Stage'] }
    ]
  },
  {
    id: '2',
    name: 'Information Technology',
    code: 'IT',
    description: 'The Information Technology department focuses on modern IT solutions, cloud computing, web technologies, mobile app development, and enterprise systems. We prepare students for the rapidly evolving tech industry.',
    head_of_department_id: '2',
    head_of_department: 'Dr. Sarah Johnson',
    established_year: 2012,
    contact_email: 'it@college.edu',
    contact_phone: '+1-555-0102',
    building: 'Engineering Block B',
    floor_number: 2,
    total_students: 380,
    total_faculty: 12,
    total_classrooms: 10,
    total_subjects: 28,
    students: [
      { id: '6', name: 'Ankit Verma', roll_number: 'IT001', semester: 3, batch: 'A1', email: 'ankit.verma@student.edu' },
      { id: '7', name: 'Kavya Nair', roll_number: 'IT002', semester: 3, batch: 'A1', email: 'kavya.nair@student.edu' },
      { id: '8', name: 'Rohit Joshi', roll_number: 'IT003', semester: 4, batch: 'B1', email: 'rohit.joshi@student.edu' },
      { id: '9', name: 'Neha Agarwal', roll_number: 'IT004', semester: 4, batch: 'B1', email: 'neha.agarwal@student.edu' },
      { id: '10', name: 'Vikash Yadav', roll_number: 'IT005', semester: 5, batch: 'C1', email: 'vikash.yadav@student.edu' }
    ],
    faculty: [
      { id: '6', name: 'Dr. Rajesh Kumar', specialization: 'Web Technologies', employee_id: 'FAC006', email: 'rajesh.kumar@college.edu' },
      { id: '7', name: 'Prof. Priya Sharma', specialization: 'Cloud Computing', employee_id: 'FAC007', email: 'priya.sharma@college.edu' },
      { id: '8', name: 'Dr. Amit Patel', specialization: 'Mobile App Development', employee_id: 'FAC008', email: 'amit.patel@college.edu' },
      { id: '9', name: 'Dr. Ravi Gupta', specialization: 'Information Security', employee_id: 'FAC009', email: 'ravi.gupta@college.edu' },
      { id: '10', name: 'Ms. Shilpa Reddy', specialization: 'Enterprise Systems', employee_id: 'FAC010', email: 'shilpa.reddy@college.edu' }
    ],
    subjects: [
      { id: '8', course_code: '25IT301T', course_title: 'Web Programming', semester: 3, credits: 3, category: 'PCC' },
      { id: '9', course_code: '25IT302T', course_title: 'Database Systems', semester: 3, credits: 3, category: 'PCC' },
      { id: '10', course_code: '25IT303T', course_title: 'Computer Networks', semester: 3, credits: 2, category: 'PCC' },
      { id: '11', course_code: '25IT304T', course_title: 'Software Engineering', semester: 3, credits: 2, category: 'PCC' },
      { id: '12', course_code: '25IT401T', course_title: 'Cloud Computing', semester: 4, credits: 3, category: 'PCC' },
      { id: '13', course_code: '25IT402T', course_title: 'Mobile Application Development', semester: 4, credits: 3, category: 'PCC' },
      { id: '14', course_code: '25IT403T', course_title: 'Information Security', semester: 4, credits: 3, category: 'PCC' }
    ],
    classrooms: [
      { id: '6', room_number: 'B101', capacity: 50, type: 'Lecture Hall', building: 'Engineering Block B', floor: 1, facilities: ['Projector', 'AC', 'Whiteboard'] },
      { id: '7', room_number: 'B102', capacity: 50, type: 'Lecture Hall', building: 'Engineering Block B', floor: 1, facilities: ['Projector', 'AC', 'Whiteboard'] },
      { id: '8', room_number: 'Lab-3', capacity: 25, type: 'IT Lab', building: 'Engineering Block B', floor: 2, facilities: ['25 PCs', 'Projector', 'AC', 'Network Setup'] },
      { id: '9', room_number: 'Lab-4', capacity: 25, type: 'IT Lab', building: 'Engineering Block B', floor: 2, facilities: ['25 PCs', 'Projector', 'AC', 'Network Setup'] },
      { id: '10', room_number: 'B201', capacity: 70, type: 'Smart Classroom', building: 'Engineering Block B', floor: 2, facilities: ['Smart Board', 'Projector', 'AC', 'Recording System'] }
    ]
  }
];

interface DepartmentFormData {
  name: string;
  code: string;
  description: string;
  head_of_department_id: string;
  established_year: number;
  contact_email: string;
  contact_phone: string;
  building: string;
  floor_number: number;
}

export default function Departments() {
  // API hooks
  const { data: departmentsResponse, isLoading, error } = useGetDepartmentsQuery();
  const [addDepartment, { isLoading: isAdding }] = useAddDepartmentMutation();
  const [updateDepartment, { isLoading: isUpdating }] = useUpdateDepartmentMutation();
  const [deleteDepartment, { isLoading: isDeleting }] = useDeleteDepartmentMutation();
  
  // Extract departments data from API response, fallback to mock data
  const departments = departmentsResponse?.data?.length > 0 ? departmentsResponse.data : mockDepartments;
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<any>(null);
  const [isAssignMentorOpen, setIsAssignMentorOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [departmentDetails, setDepartmentDetails] = useState<any>(null);
  const [formData, setFormData] = useState<DepartmentFormData>({
    name: '',
    code: '',
    description: '',
    head_of_department_id: '',
    established_year: new Date().getFullYear(),
    contact_email: '',
    contact_phone: '',
    building: '',
    floor_number: 1
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (selectedDepartment) {
        // Update existing department
        const updateData: UpdateDepartmentRequest = {
          ...formData,
          head_of_department_id: formData.head_of_department_id ? parseInt(formData.head_of_department_id) : null
        };
        await updateDepartment({ id: selectedDepartment.id, data: updateData }).unwrap();
        setIsEditDialogOpen(false);
      } else {
        // Add new department
        const createData: CreateDepartmentRequest = {
          ...formData,
          head_of_department_id: formData.head_of_department_id ? parseInt(formData.head_of_department_id) : null
        };
        await addDepartment(createData).unwrap();
        setIsAddDialogOpen(false);
      }
      resetForm();
    } catch (error) {
      console.error('Failed to save department:', error);
      // You could add a toast notification here
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      head_of_department_id: '',
      established_year: new Date().getFullYear(),
      contact_email: '',
      contact_phone: '',
      building: '',
      floor_number: 1
    });
    setSelectedDepartment(null);
  };

  const handleEdit = (department: any) => {
    setSelectedDepartment(department);
    setFormData({
      name: department.name,
      code: department.code,
      description: department.description || '',
      head_of_department_id: department.head_of_department_id || '',
      established_year: department.established_year || new Date().getFullYear(),
      contact_email: department.contact_email || '',
      contact_phone: department.contact_phone || '',
      building: department.building || '',
      floor_number: department.floor_number || 1
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (departmentId: string) => {
    if (confirm('Are you sure you want to delete this department?')) {
      try {
        await deleteDepartment(departmentId).unwrap();
      } catch (error) {
        console.error('Failed to delete department:', error);
        // You could add a toast notification here
      }
    }
  };

  const DepartmentForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Department Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Computer Science & Engineering"
            required
          />
        </div>
        <div>
          <Label htmlFor="code">Department Code</Label>
          <Input
            id="code"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            placeholder="CSE"
            maxLength={10}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Brief description of the department..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="head">Head of Department</Label>
          <Select value={formData.head_of_department_id} onValueChange={(value) => setFormData({ ...formData, head_of_department_id: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select Head of Department" />
            </SelectTrigger>
            <SelectContent>
              {mockUsers.filter(u => u.role === 'admin' || u.role === 'mentor').map(user => (
                <SelectItem key={user.id} value={user.id}>
                  {user.first_name} {user.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="year">Established Year</Label>
          <Input
            id="year"
            type="number"
            value={formData.established_year}
            onChange={(e) => setFormData({ ...formData, established_year: parseInt(e.target.value) })}
            min="1900"
            max={new Date().getFullYear()}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="email">Contact Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.contact_email}
            onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
            placeholder="dept@college.edu"
          />
        </div>
        <div>
          <Label htmlFor="phone">Contact Phone</Label>
          <Input
            id="phone"
            value={formData.contact_phone}
            onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
            placeholder="+1-234-567-8900"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="building">Building</Label>
          <Input
            id="building"
            value={formData.building}
            onChange={(e) => setFormData({ ...formData, building: e.target.value })}
            placeholder="Technology Block"
          />
        </div>
        <div>
          <Label htmlFor="floor">Floor Number</Label>
          <Input
            id="floor"
            type="number"
            value={formData.floor_number}
            onChange={(e) => setFormData({ ...formData, floor_number: parseInt(e.target.value) })}
            min="0"
            max="20"
          />
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
        <Button type="submit" disabled={isAdding || isUpdating}>
          {isAdding || isUpdating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {selectedDepartment ? 'Updating...' : 'Adding...'}
            </>
          ) : (
            selectedDepartment ? 'Update Department' : 'Add Department'
          )}
        </Button>
      </div>
    </form>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Department Management</h1>
          <p className="text-gray-600 mt-1">Manage college departments and their configurations</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Department
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Department</DialogTitle>
              <DialogDescription>
                Create a new department with complete details and configurations.
              </DialogDescription>
            </DialogHeader>
            <DepartmentForm />
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Departments</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    departments.length
                  )}
                </p>
              </div>
              <Building className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Faculties</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    departments.reduce((sum, d) => sum + (d.faculty_count || d.total_faculty || d.faculty?.length || 0), 0)
                  )}
                </p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Classrooms</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    departments.reduce((sum, d) => sum + (d.classroom_count || d.total_classrooms || d.classrooms?.length || 0), 0)
                  )}
                </p>
              </div>
              <MapPin className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Students</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    departments.reduce((sum, d) => sum + (d.student_count || d.total_students || d.students?.length || 0), 0)
                  )}
                </p>
              </div>
              <GraduationCap className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error State - Only show if we don't have mock data */}
      {error && departments.length === 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load departments. Please try again.
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading departments...</span>
        </div>
      )}

      {/* Departments Grid */}
      {!isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {departments.length === 0 ? (
            <div className="col-span-full text-center py-8">
              <Building className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No departments found. Add your first department to get started.</p>
            </div>
          ) : (
            departments.map((department) => (
              <Card key={department.id} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{department.name}</CardTitle>
                      <CardDescription>
                        <Badge variant="secondary" className="mr-2">{department.code}</Badge>
                        {department.established_year && `Est. ${department.established_year}`}
                      </CardDescription>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(department)}
                        disabled={isUpdating}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(department.id)}
                        disabled={isDeleting}
                        className="text-red-600 hover:text-red-700"
                      >
                        {isDeleting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Head of Department */}
                  {(department.head_of_department_id || department.head_of_department) && (
                    <div className="flex items-center text-sm bg-yellow-50 p-2 rounded">
                      <Crown className="h-4 w-4 mr-2 text-yellow-600" />
                      <span className="font-medium text-yellow-800">
                        HOD: {department.head_of_department || 
                              mockUsers.find(u => u.id === department.head_of_department_id)?.first_name + ' ' + 
                              mockUsers.find(u => u.id === department.head_of_department_id)?.last_name || 
                              'Not Assigned'}
                      </span>
                    </div>
                  )}

                  {/* Description */}
                  {department.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {department.description}
                    </p>
                  )}

                  {/* Contact Information */}
                  <div className="space-y-1">
                    {department.contact_email && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="h-3 w-3 mr-2" />
                        {department.contact_email}
                      </div>
                    )}
                    {department.contact_phone && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="h-3 w-3 mr-2" />
                        {department.contact_phone}
                      </div>
                    )}
                    {department.building && (
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="h-3 w-3 mr-2" />
                        {department.building}{department.floor_number && `, Floor ${department.floor_number}`}
                      </div>
                    )}
                  </div>

                  {/* Department Statistics */}
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                    <div className="text-center">
                      <p className="text-lg font-semibold text-blue-600">{department.total_students || department.students?.length || 0}</p>
                      <p className="text-xs text-gray-600">Students</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-green-600">{department.total_faculty || department.faculty?.length || 0}</p>
                      <p className="text-xs text-gray-600">Faculty</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-purple-600">{department.total_subjects || department.subjects?.length || 0}</p>
                      <p className="text-xs text-gray-600">Subjects</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-orange-600">{department.total_classrooms || department.classrooms?.length || 0}</p>
                      <p className="text-xs text-gray-600">Classrooms</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDepartmentDetails(department);
                        setIsDetailsModalOpen(true);
                      }}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Navigate to timetables for this department
                        alert(`Manage timetables for ${department.name}`);
                      }}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Timetables
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Edit Department Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
            <DialogDescription>
              Update department information and configurations.
            </DialogDescription>
          </DialogHeader>
          <DepartmentForm />
        </DialogContent>
      </Dialog>

      {/* Assign Mentor Dialog */}
      <Dialog open={isAssignMentorOpen} onOpenChange={setIsAssignMentorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Mentor</DialogTitle>
            <DialogDescription>
              Assign a mentor to {selectedDepartment?.name}. Maximum 3 mentors per department.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select User</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user to assign as mentor" />
                </SelectTrigger>
                <SelectContent>
                  {mockUsers.filter(u => u.role === 'mentor').map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAssignMentorOpen(false)}>
                Cancel
              </Button>
              <Button>
                Assign Mentor
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Department Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Building className="h-6 w-6" />
              {departmentDetails?.name} - Complete Details
            </DialogTitle>
            <DialogDescription>
              Comprehensive information about {departmentDetails?.name} department including students, faculty, subjects, and classrooms.
            </DialogDescription>
          </DialogHeader>
          
          {departmentDetails && (
            <div className="space-y-6">
              {/* Department Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5" />
                    Department Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Department Code</p>
                      <p className="font-semibold">{departmentDetails.code}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Established Year</p>
                      <p className="font-semibold">{departmentDetails.established_year}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Head of Department</p>
                      <p className="font-semibold">{departmentDetails.head_of_department}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Building & Floor</p>
                      <p className="font-semibold">{departmentDetails.building}, Floor {departmentDetails.floor_number}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Contact Email</p>
                      <p className="font-semibold">{departmentDetails.contact_email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Contact Phone</p>
                      <p className="font-semibold">{departmentDetails.contact_phone}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="text-sm mt-1">{departmentDetails.description}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Statistics Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">{departmentDetails.total_students || departmentDetails.students?.length || 0}</div>
                    <div className="text-sm text-muted-foreground">Students</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{departmentDetails.total_faculty || departmentDetails.faculty?.length || 0}</div>
                    <div className="text-sm text-muted-foreground">Faculty</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">{departmentDetails.total_subjects || departmentDetails.subjects?.length || 0}</div>
                    <div className="text-sm text-muted-foreground">Subjects</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-orange-600">{departmentDetails.total_classrooms || departmentDetails.classrooms?.length || 0}</div>
                    <div className="text-sm text-muted-foreground">Classrooms</div>
                  </CardContent>
                </Card>
              </div>

              {/* Students List */}
              {departmentDetails.students && departmentDetails.students.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5" />
                      Students ({departmentDetails.students.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Name</th>
                            <th className="text-left p-2">Roll Number</th>
                            <th className="text-left p-2">Semester</th>
                            <th className="text-left p-2">Batch</th>
                            <th className="text-left p-2">Email</th>
                          </tr>
                        </thead>
                        <tbody>
                          {departmentDetails.students.map((student: any) => (
                            <tr key={student.id} className="border-b">
                              <td className="p-2 font-medium">{student.name}</td>
                              <td className="p-2">{student.roll_number}</td>
                              <td className="p-2">
                                <Badge variant="secondary">{student.semester}</Badge>
                              </td>
                              <td className="p-2">
                                <Badge variant="outline">{student.batch}</Badge>
                              </td>
                              <td className="p-2 text-xs">{student.email}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Faculty List */}
              {departmentDetails.faculty && departmentDetails.faculty.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Faculty Members ({departmentDetails.faculty.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {departmentDetails.faculty.map((faculty: any) => (
                        <Card key={faculty.id} className="border">
                          <CardContent className="p-4">
                            <div className="space-y-2">
                              <div className="font-semibold">{faculty.name}</div>
                              <div className="text-sm text-muted-foreground">{faculty.specialization}</div>
                              <div className="text-xs">
                                <span className="font-medium">ID:</span> {faculty.employee_id}
                              </div>
                              <div className="text-xs">
                                <span className="font-medium">Email:</span> {faculty.email}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Subjects List */}
              {departmentDetails.subjects && departmentDetails.subjects.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      Subjects ({departmentDetails.subjects.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-2">Course Code</th>
                            <th className="text-left p-2">Course Title</th>
                            <th className="text-left p-2">Semester</th>
                            <th className="text-left p-2">Credits</th>
                            <th className="text-left p-2">Category</th>
                          </tr>
                        </thead>
                        <tbody>
                          {departmentDetails.subjects.map((subject: any) => (
                            <tr key={subject.id} className="border-b">
                              <td className="p-2 font-medium">{subject.course_code}</td>
                              <td className="p-2">{subject.course_title}</td>
                              <td className="p-2">
                                <Badge variant="secondary">{subject.semester}</Badge>
                              </td>
                              <td className="p-2">{subject.credits}</td>
                              <td className="p-2">
                                <Badge variant="outline">{subject.category}</Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Classrooms List */}
              {departmentDetails.classrooms && departmentDetails.classrooms.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Classrooms ({departmentDetails.classrooms.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {departmentDetails.classrooms.map((classroom: any) => (
                        <Card key={classroom.id} className="border">
                          <CardContent className="p-4">
                            <div className="space-y-2">
                              <div className="font-semibold">{classroom.room_number}</div>
                              <div className="text-sm text-muted-foreground">{classroom.type}</div>
                              <div className="text-xs">
                                <span className="font-medium">Capacity:</span> {classroom.capacity} students
                              </div>
                              <div className="text-xs">
                                <span className="font-medium">Building:</span> {classroom.building}, Floor {classroom.floor}
                              </div>
                              {classroom.facilities && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {classroom.facilities.map((facility: string, index: number) => (
                                    <Badge key={index} variant="secondary" className="text-xs">
                                      {facility}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}