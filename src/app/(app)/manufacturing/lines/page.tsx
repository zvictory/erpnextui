import { getLines } from "@/actions/lines";
import { LinesTable } from "@/components/manufacturing/lines/lines-table";

export default async function LinesPage() {
  const result = await getLines();
  const lines = result.success ? result.data : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Production Lines</h1>
        <p className="text-muted-foreground">
          Manage production lines and their configurations.
        </p>
      </div>

      <LinesTable data={lines} />
    </div>
  );
}
