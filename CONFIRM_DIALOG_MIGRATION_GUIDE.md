# Global Confirm Dialog Migration Guide

## ✅ Files Already Updated
- ✓ `/src/app/super-admin/colleges/page.tsx`
- ✓ `/src/app/super-admin/registration-tokens/page.tsx`
- ✓ `/src/app/super-admin/manage/page.tsx`
- ✓ `/src/app/super-admin/college-admins/page.tsx`
- ✓ `/src/app/super-admin/calendars/page.tsx`

## 📋 Files Remaining to Update

### Admin Pages
- [ ] `/src/app/admin/batches/page.tsx`
- [ ] `/src/app/admin/bucket_creator/all/page.tsx`
- [ ] `/src/app/admin/constraints/page.tsx`
- [ ] `/src/app/admin/students/page.tsx`
- [ ] `/src/app/admin/subjects/page.tsx`
- [ ] `/src/app/admin/subject-allotment/page.tsx` (2 instances)
- [ ] `/src/app/admin/faculty/page.tsx`
- [ ] `/src/app/admin/buckets/page.tsx` (2 instances)
- [ ] `/src/app/admin/departments/page.tsx`
- [ ] `/src/app/admin/courses/page.tsx`
- [ ] `/src/app/admin/classrooms/page.tsx`

### Faculty Pages
- [ ] `/src/app/faculty/qualifications/page.tsx`
- [ ] `/src/app/faculty/events/page.tsx`
- [ ] `/src/app/faculty/timetables/page.tsx` (3 instances)
- [ ] `/src/app/faculty/review-queue/page.tsx` (2 instances)
- [ ] `/src/app/faculty/assignments/page.tsx`

### Student Pages
- [ ] `/src/app/student/assignments/[id]/page.tsx`

### Components
- [ ] `/src/components/nep/CurriculumBuilder.tsx` (2 instances)
- [ ] `/src/components/nep/MockStudentGenerator.tsx`
- [ ] `/src/components/events/EventDetailModal.tsx` (2 instances)

---

## 🔄 Migration Steps

### Step 1: Add Import
At the top of the file, add:
```typescript
import { useConfirm } from '@/components/ui/ConfirmDialog';
```

### Step 2: Add Hook
At the beginning of your component function, add:
```typescript
const { showConfirm } = useConfirm();
```

### Step 3: Replace confirm() Calls

**Before:**
```typescript
const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete?')) return;
    
    try {
        const res = await fetch(`/api/endpoint/${id}`, { method: 'DELETE' });
        if (res.ok) {
            toast.success('Deleted successfully');
            fetchData();
        } else {
            toast.error('Failed to delete');
        }
    } catch (e) {
        toast.error('Error deleting');
    }
};
```

**After:**
```typescript
const handleDelete = (item: any) => {
    showConfirm({
        title: 'Delete Item',
        message: `Are you sure you want to delete "${item.name}"? This action cannot be undone.`,
        confirmText: 'Delete',
        onConfirm: async () => {
            try {
                const res = await fetch(`/api/endpoint/${item.id}`, { method: 'DELETE' });
                if (res.ok) {
                    toast.success('Deleted successfully');
                    fetchData();
                } else {
                    toast.error('Failed to delete');
                }
            } catch (e) {
                toast.error('Error deleting');
            }
        }
    });
};
```

### Step 4: Update Function Calls
Change from passing `id` to passing the full `object`:
```typescript
// Before
onClick={() => handleDelete(item.id)}

// After
onClick={() => handleDelete(item)}
```

---

## 📝 Example Customizations

### Custom Titles and Messages
```typescript
showConfirm({
    title: 'Delete Batch',
    message: `Are you sure you want to delete batch "${batch.name}"? This will affect ${batch.student_count} students.`,
    confirmText: 'Delete',
    cancelText: 'Keep It',
    onConfirm: async () => {
        // delete logic
    }
});
```

### Approval Actions
```typescript
showConfirm({
    title: 'Approve Timetable',
    message: `Approve and publish "${title}"? This will make it visible to all students.`,
    confirmText: 'Approve & Publish',
    onConfirm: async () => {
        // approval logic
    }
});
```

### Irreversible Actions with Warnings
```typescript
showConfirm({
    title: 'Delete All Mock Students',
    message: 'Are you sure you want to delete all mock students? This action cannot be undone and will permanently remove all test data.',
    confirmText: 'Delete All',
    onConfirm: async () => {
        // bulk delete logic
    }
});
```

---

## 🎨 Dialog Options Reference

```typescript
interface ConfirmDialogOptions {
    title?: string;           // Default: 'Confirm Action'
    message: string;          // Required: Main message
    confirmText?: string;     // Default: 'Confirm'
    cancelText?: string;      // Default: 'Cancel'
    onConfirm: () => void | Promise<void>;  // Required: Action on confirm
    onCancel?: () => void;    // Optional: Action on cancel
}
```

---

## 🚀 Quick Find & Replace Tips

### Find Pattern
```
if (!confirm(
```

### Replace Pattern Template
```
showConfirm({
    title: 'ACTION_NAME',
    message: ORIGINAL_MESSAGE,
    confirmText: 'BUTTON_TEXT',
    onConfirm: async () => {
```

---

## ✨ Benefits of Migration

1. **Consistent UX**: All confirmation dialogs look and feel the same
2. **Customizable**: Easy to adjust titles, messages, and button text
3. **Modern Design**: Beautiful card-based modal instead of browser default
4. **Accessible**: Better accessibility features built-in
5. **Responsive**: Works perfectly on mobile and desktop
6. **Branded**: Matches your application's design system

---

## 🐛 Troubleshooting

### Error: "useConfirm must be used within ConfirmDialogProvider"
- Make sure you've added the provider to `layout.tsx`
- Check that the component is inside the provider tree

### Dialog doesn't appear
- Verify the `showConfirm` call is inside an event handler
- Check console for any JavaScript errors
- Ensure z-index isn't being overridden (default is 9999)

### TypeScript errors
- Make sure to pass the full object instead of just the ID
- Update function signatures to accept the object type

---

**Need Help?** The global confirm dialog is already set up and working. Just follow the steps above for each file!
