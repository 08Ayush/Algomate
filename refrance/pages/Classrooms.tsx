import React, { useState } from 'react';
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Switch } from "../components/ui/switch";
import { 
  useGetClassroomsQuery, 
  useAddClassroomMutation, 
  useUpdateClassroomMutation, 
  useDeleteClassroomMutation 
} from "../store/api";
import { CreateClassroomRequest, UpdateClassroomRequest } from "@shared/api.js";
import { Plus, Edit, Trash2, Loader2, MapPin } from 'lucide-react';

interface ClassroomFormData {
  room_number: string;
  building: string;
  floor_number?: number;
  capacity: number;
  type: 'lecture' | 'lab' | 'seminar' | 'auditorium';
  equipment?: string;
  has_projector: boolean;
  has_smartboard: boolean;
  has_ac: boolean;
  has_computer_lab: boolean;
}

export default function ClassroomsPage() {
  const { data: raw, isLoading, error } = useGetClassroomsQuery({});
  const data = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' && 'results' in raw ? (raw as any).results : raw && typeof raw === 'object' && 'data' in raw ? (raw as any).data : []);
  
  const [addClassroom, { isLoading: isAdding }] = useAddClassroomMutation();
  const [updateClassroom, { isLoading: isUpdating }] = useUpdateClassroomMutation();
  const [deleteClassroom, { isLoading: isDeleting }] = useDeleteClassroomMutation();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState<any>(null);
  const [formData, setFormData] = useState<ClassroomFormData>({
    room_number: '',
    building: '',
    floor_number: 1,
    capacity: 30,
    type: 'lecture',
    has_projector: false,
    has_smartboard: false,
    has_ac: false,
    has_computer_lab: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (selectedClassroom) {
        // Update existing classroom
        const updateData: UpdateClassroomRequest = formData;
        await updateClassroom({ id: selectedClassroom.id, data: updateData }).unwrap();
        setIsEditDialogOpen(false);
      } else {
        // Add new classroom
        const createData: CreateClassroomRequest = formData;
        await addClassroom(createData).unwrap();
        setIsAddDialogOpen(false);
      }
      resetForm();
    } catch (error) {
      console.error('Failed to save classroom:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      room_number: '',
      building: '',
      floor_number: 1,
      capacity: 30,
      type: 'lecture',
      has_projector: false,
      has_smartboard: false,
      has_ac: false,
      has_computer_lab: false
    });
    setSelectedClassroom(null);
  };

  const handleEdit = (classroom: any) => {
    setSelectedClassroom(classroom);
    setFormData({
      room_number: classroom.room_number,
      building: classroom.building || '',
      floor_number: classroom.floor_number || 1,
      capacity: classroom.capacity,
      type: classroom.type,
      equipment: classroom.equipment || '',
      has_projector: classroom.has_projector || false,
      has_smartboard: classroom.has_smartboard || false,
      has_ac: classroom.has_ac || false,
      has_computer_lab: classroom.has_computer_lab || false
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (classroomId: number) => {
    if (confirm('Are you sure you want to delete this classroom?')) {
      try {
        await deleteClassroom(classroomId).unwrap();
      } catch (error) {
        console.error('Failed to delete classroom:', error);
      }
    }
  };

  const ClassroomForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Classroom Name</Label>
          <Input
            id="name"
            value={formData.room_number}
            onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
            placeholder="Room A101"
            required
          />
        </div>
        <div>
          <Label htmlFor="type">Room Type</Label>
          <Select value={formData.type} onValueChange={(value: 'lecture' | 'lab' | 'seminar' | 'auditorium') => setFormData({ ...formData, type: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Lecture">Lecture Hall</SelectItem>
              <SelectItem value="Lab">Laboratory</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="capacity">Capacity</Label>
        <Input
          id="capacity"
          type="number"
          value={formData.capacity}
          onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
          min="1"
          max="200"
          required
        />
      </div>

      <div className="space-y-3">
        <Label>Equipment</Label>
        <div className="flex items-center space-x-2">
          <Switch
            id="has_projector"
            checked={formData.has_projector}
            onCheckedChange={(checked) => setFormData({ ...formData, has_projector: checked })}
          />
          <Label htmlFor="has_projector">Has Projector</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="has_smartboard"
            checked={formData.has_smartboard}
            onCheckedChange={(checked) => setFormData({ ...formData, has_smartboard: checked })}
          />
          <Label htmlFor="has_smartboard">Has Smart Board</Label>
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
              {selectedClassroom ? 'Updating...' : 'Adding...'}
            </>
          ) : (
            selectedClassroom ? 'Update Classroom' : 'Add Classroom'
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
          <h1 className="text-2xl font-bold">Classrooms</h1>
          <p className="text-gray-600 mt-1">Manage classroom facilities and their configurations</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Classroom
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Classroom</DialogTitle>
              <DialogDescription>
                Create a new classroom with its details and equipment information.
              </DialogDescription>
            </DialogHeader>
            <ClassroomForm />
          </DialogContent>
        </Dialog>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-600">Failed to load classrooms. Please try again.</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading classrooms...</span>
        </div>
      )}

      {/* Classrooms Table */}
      {!isLoading && !error && (
        <div className="rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted text-left">
                <th className="p-3">Name</th>
                <th className="p-3">Type</th>
                <th className="p-3">Capacity</th>
                <th className="p-3">Projector</th>
                <th className="p-3">Smart Board</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr>
                  <td className="p-8 text-center" colSpan={6}>
                    <MapPin className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">No classrooms found. Add your first classroom to get started.</p>
                  </td>
                </tr>
              ) : (
                data.map((c: any) => (
                  <tr key={c.id} className="border-t">
                    <td className="p-3">
                      <Badge variant="secondary">{c.name}</Badge>
                    </td>
                    <td className="p-3">
                      <Badge variant={c.type === 'Lab' ? "default" : "outline"}>
                        {c.type}
                      </Badge>
                    </td>
                    <td className="p-3">{c.capacity}</td>
                    <td className="p-3">
                      <Badge variant={c.has_projector ? "default" : "outline"}>
                        {c.has_projector ? "Yes" : "No"}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Badge variant={c.has_smartboard ? "default" : "outline"}>
                        {c.has_smartboard ? "Yes" : "No"}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(c)}
                          disabled={isUpdating}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(c.id)}
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

      {/* Edit Classroom Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Classroom</DialogTitle>
            <DialogDescription>
              Update classroom information and configurations.
            </DialogDescription>
          </DialogHeader>
          <ClassroomForm />
        </DialogContent>
      </Dialog>
    </div>
  );
}
