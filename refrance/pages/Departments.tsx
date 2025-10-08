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
import { Plus, Users, Calendar, GraduationCap, Building, Mail, Phone, MapPin, Edit, Trash2, UserPlus, Crown, Loader2 } from 'lucide-react';
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
  
  // Extract departments data from API response
  const departments = departmentsResponse?.data || [];
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<any>(null);
  const [isAssignMentorOpen, setIsAssignMentorOpen] = useState(false);
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
                <p className="text-sm font-medium text-gray-600">Total Mentors</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    departments.reduce((sum, d) => sum + (d.mentor_count || 0), 0)
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
                <p className="text-sm font-medium text-gray-600">Active Events</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    departments.reduce((sum, d) => sum + (d.event_count || 0), 0)
                  )}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-purple-600" />
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
                    departments.reduce((sum, d) => sum + (d.student_count || 0), 0)
                  )}
                </p>
              </div>
              <GraduationCap className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Role-based Access Alert */}
      <Alert>
        <Users className="h-4 w-4" />
        <AlertDescription>
          <strong>Access Control:</strong> Each department can have a maximum of 3 mentors who can create events. 
          Students have view-only access to events. Admins have full access to all departments.
        </AlertDescription>
      </Alert>

      {/* Error State */}
      {error && (
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
      {!isLoading && !error && (
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
                  {department.head_of_department_id && (
                    <div className="flex items-center text-sm">
                      <Crown className="h-4 w-4 mr-2 text-yellow-600" />
                      <span className="font-medium">
                        Head of Department
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

                  {/* Statistics */}
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                    <div className="text-center">
                      <p className="text-lg font-semibold text-gray-900">{department.mentor_count || 0}/3</p>
                      <p className="text-xs text-gray-600">Mentors</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-gray-900">{department.event_count || 0}</p>
                      <p className="text-xs text-gray-600">Events</p>
                    </div>
                  </div>

                  {/* Assign Mentor Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={(department.mentor_count || 0) >= 3}
                    onClick={() => {
                      setSelectedDepartment(department);
                      setIsAssignMentorOpen(true);
                    }}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    {(department.mentor_count || 0) >= 3 ? 'Mentor Limit Reached' : 'Assign Mentor'}
                  </Button>
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
    </div>
  );
}