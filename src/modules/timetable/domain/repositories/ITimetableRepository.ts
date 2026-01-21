import { Timetable, ScheduledClass } from '../entities/Timetable';

export interface ITimetableRepository {
    findById(id: string): Promise<Timetable | null>;
    findByDepartment(departmentId: string): Promise<Timetable[]>;
    findByBatch(batchId: string): Promise<Timetable[]>;
    create(timetable: Omit<Timetable, 'id' | 'createdAt' | 'updatedAt'>): Promise<Timetable>;
    createTask(task: any): Promise<any>; // Using any for now, should be a defined type
    update(id: string, data: Partial<Timetable>): Promise<Timetable>;
    updateStatus(id: string, status: 'draft' | 'pending_approval' | 'published' | 'rejected'): Promise<Timetable>;
    delete(id: string): Promise<boolean>;
    publish(id: string): Promise<Timetable>;
    logWorkflowAction(timetableId: string, action: string, performedBy: string, comments?: string): Promise<void>;
}

export interface IScheduledClassRepository {
    findById(id: string): Promise<ScheduledClass | null>;
    findByTimetable(timetableId: string): Promise<ScheduledClass[]>;
    findByTimetable(timetableId: string): Promise<ScheduledClass[]>;
    create(scheduledClass: Omit<ScheduledClass, 'id' | 'createdAt'>): Promise<ScheduledClass>;
    createMany(scheduledClasses: Omit<ScheduledClass, 'id' | 'createdAt'>[]): Promise<ScheduledClass[]>;
    delete(id: string): Promise<boolean>;
    deleteByTimetable(timetableId: string): Promise<boolean>;
}
