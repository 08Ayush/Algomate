import React, { useState } from 'react';
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { 
  useGetBatchesQuery, 
  useAddBatchMutation, 
  useUpdateBatchMutation, 
  useDeleteBatchMutation 
} from "../store/api";
import { CreateStudentBatchRequest, UpdateStudentBatchRequest } from "@shared/api.js";
import { Plus, Edit, Trash2, Loader2, Users } from 'lucide-react';

interface BatchFormData {
  name: string;
  batch_code: string;
  department_id: string; // Will be converted to number
  year: number;
  semester: number;
  section?: string;
  strength: number;
  academic_year: string;
  class_coordinator_id?: string; // Will be converted to number
  intake_year: number;
}

export default function BatchesPage() {
  const { data: raw, isLoading, error } = useGetBatchesQuery({});
  const data = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' && 'results' in raw ? (raw as any).results : raw && typeof raw === 'object' && 'data' in raw ? (raw as any).data : []);
  
  const [addBatch, { isLoading: isAdding }] = useAddBatchMutation();
  const [updateBatch, { isLoading: isUpdating }] = useUpdateBatchMutation();
  const [deleteBatch, { isLoading: isDeleting }] = useDeleteBatchMutation();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [formData, setFormData] = useState<BatchFormData>({
    name: '',
    batch_code: '',
    department_id: '',
    year: 1,
    semester: 1,
    strength: 60,
    academic_year: new Date().getFullYear().toString(),
    intake_year: new Date().getFullYear()
  });

  const departments = [
    'Computer Science',
    'Electronics',
    'Mechanical Engineering',
    'Civil Engineering',
    'Information Technology',
    'Electrical Engineering'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (selectedBatch) {
        // Update existing batch
        const updateData: UpdateStudentBatchRequest = {
          ...formData,
          department_id: parseInt(formData.department_id),
          class_coordinator_id: formData.class_coordinator_id ? parseInt(formData.class_coordinator_id) : undefined
        };
        await updateBatch({ id: selectedBatch.id, data: updateData }).unwrap();
        setIsEditDialogOpen(false);
      } else {
        // Add new batch
        const createData: CreateStudentBatchRequest = {
          ...formData,
          department_id: parseInt(formData.department_id),
          class_coordinator_id: formData.class_coordinator_id ? parseInt(formData.class_coordinator_id) : undefined
        };
        await addBatch(createData).unwrap();
        setIsAddDialogOpen(false);
      }
      resetForm();
    } catch (error) {
      console.error('Failed to save batch:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      batch_code: '',
      department_id: '',
      year: 1,
      semester: 1,
      strength: 60,
      academic_year: new Date().getFullYear().toString(),
      intake_year: new Date().getFullYear()
    });
    setSelectedBatch(null);
  };

  const handleEdit = (batch: any) => {
    setSelectedBatch(batch);
    setFormData({
      name: batch.name,
      batch_code: batch.batch_code || '',
      department_id: batch.department_id?.toString() || '',
      year: batch.year,
      semester: batch.semester,
      section: batch.section || '',
      strength: batch.strength,
      academic_year: batch.academic_year || new Date().getFullYear().toString(),
      class_coordinator_id: batch.class_coordinator_id?.toString() || '',
      intake_year: batch.intake_year || new Date().getFullYear()
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (batchId: number) => {
    if (confirm('Are you sure you want to delete this batch?')) {
      try {
        await deleteBatch(batchId).unwrap();
      } catch (error) {
        console.error('Failed to delete batch:', error);
      }
    }
  };

  const BatchForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Batch Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="CS-A1"
            required
          />
        </div>
        <div>
          <Label htmlFor="department">Department</Label>
          <Select value={formData.department_id} onValueChange={(value) => setFormData({ ...formData, department_id: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select Department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map(dept => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="year">Academic Year</Label>
          <Select value={formData.year.toString()} onValueChange={(value) => setFormData({ ...formData, year: parseInt(value) })}>
            <SelectTrigger>
              <SelectValue placeholder="Select Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1st Year</SelectItem>
              <SelectItem value="2">2nd Year</SelectItem>
              <SelectItem value="3">3rd Year</SelectItem>
              <SelectItem value="4">4th Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="semester">Semester</Label>
          <Select value={formData.semester.toString()} onValueChange={(value) => setFormData({ ...formData, semester: parseInt(value) })}>
            <SelectTrigger>
              <SelectValue placeholder="Select Semester" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1st Semester</SelectItem>
              <SelectItem value="2">2nd Semester</SelectItem>
              <SelectItem value="3">3rd Semester</SelectItem>
              <SelectItem value="4">4th Semester</SelectItem>
              <SelectItem value="5">5th Semester</SelectItem>
              <SelectItem value="6">6th Semester</SelectItem>
              <SelectItem value="7">7th Semester</SelectItem>
              <SelectItem value="8">8th Semester</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="strength">Student Strength</Label>
          <Input
            id="strength"
            type="number"
            value={formData.strength}
            onChange={(e) => setFormData({ ...formData, strength: parseInt(e.target.value) || 0 })}
            min="1"
            max="120"
            required
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
              {selectedBatch ? 'Updating...' : 'Adding...'}
            </>
          ) : (
            selectedBatch ? 'Update Batch' : 'Add Batch'
          )}
        </Button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Student Batches</h1>
          <p className="text-gray-600 mt-1">Manage student batches and their academic information</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Batch
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Batch</DialogTitle>
              <DialogDescription>
                Create a new student batch with academic details.
              </DialogDescription>
            </DialogHeader>
            <BatchForm />
          </DialogContent>
        </Dialog>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-600">Failed to load batches. Please try again.</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading batches...</span>
        </div>
      )}

      {/* Batches Table */}
      {!isLoading && !error && (
        <div className="rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted text-left">
                <th className="p-3">Batch Name</th>
                <th className="p-3">Department</th>
                <th className="p-3">Year</th>
                <th className="p-3">Semester</th>
                <th className="p-3">Strength</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td className="p-8 text-center" colSpan={6}>
                    <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">No batches found. Add your first batch to get started.</p>
                  </td>
                </tr>
              ) : (
                data.map((b: any) => (
                  <tr key={b.id} className="border-t">
                    <td className="p-3">
                      <Badge variant="secondary">{b.name}</Badge>
                    </td>
                    <td className="p-3">{b.department}</td>
                    <td className="p-3">
                      <Badge variant="outline">{b.year}{["st", "nd", "rd", "th"][b.year - 1]} Year</Badge>
                    </td>
                    <td className="p-3">Semester {b.semester}</td>
                    <td className="p-3">{b.strength} students</td>
                    <td className="p-3">
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(b)}
                          disabled={isUpdating}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(b.id)}
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
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Batch Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Batch</DialogTitle>
            <DialogDescription>
              Update batch information and academic details.
            </DialogDescription>
          </DialogHeader>
          <BatchForm />
        </DialogContent>
      </Dialog>
    </div>
  );
}
