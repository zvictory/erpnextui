import { getSettings } from "@/actions/settings";
import { SettingsForm } from "@/components/manufacturing/settings/settings-form";

export default async function SettingsPage() {
  const result = await getSettings();
  const currentSettings = result.success ? result.data : {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure energy consumption rates and pricing parameters.
        </p>
      </div>

      <SettingsForm currentSettings={currentSettings} />
    </div>
  );
}
