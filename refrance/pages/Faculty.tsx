import { Button } from "@/components/ui/button";
import { useAddFacultyMutation, useGetFacultyQuery } from "@/store/api";
import { useForm } from "react-hook-form";

interface FormValues { name: string; employee_id: string; department_id: number; }

export default function FacultyPage() {
  const { data: raw, isLoading } = useGetFacultyQuery();
  const data = Array.isArray(raw) ? raw : (raw && typeof raw === 'object' && 'results' in raw ? (raw as any).results : raw && typeof raw === 'object' && 'data' in raw ? (raw as any).data : []);
  const [addFaculty, { isLoading: isSaving }] = useAddFacultyMutation();
  const { register, handleSubmit, reset } = useForm<FormValues>();

  const onSubmit = async (values: FormValues) => {
    await addFaculty(values).unwrap().catch(() => {});
    reset();
  };

  return (
    <>
      <h1 className="text-2xl font-bold">Faculty</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 grid gap-3 rounded-xl border p-4 md:grid-cols-4">
        <input className="rounded-md border p-2" placeholder="Name" {...register("name", { required: true })} />
        <input className="rounded-md border p-2" placeholder="Employee ID" {...register("employee_id", { required: true })} />
        <input className="rounded-md border p-2" placeholder="Department ID" type="number" {...register("department_id", { required: true, valueAsNumber: true })} />
        <Button type="submit" disabled={isSaving}>Add Faculty</Button>
      </form>

      <div className="mt-6 rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted text-left">
              <th className="p-3">Name</th>
              <th className="p-3">Employee ID</th>
              <th className="p-3">Department ID</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td className="p-3" colSpan={3}>Loading...</td></tr>
            ) : data.length === 0 ? (
              <tr><td className="p-3" colSpan={3}>No faculty found</td></tr>
            ) : (
              data.map((f) => (
                <tr key={f.id} className="border-t">
                  <td className="p-3">{f.name}</td>
                  <td className="p-3">{f.employee_id}</td>
                  <td className="p-3">{f.department_id}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
