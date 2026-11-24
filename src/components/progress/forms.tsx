"use client";
import { useRouter } from "next/navigation";
import { addMeasurementAction, uploadPhotoAction } from "@/app/actions/client";
import { ActionForm, SubmitButton } from "@/components/form";
import { Field } from "@/components/ui";

export function MeasurementForm({ today }: { today: string }) {
  const router = useRouter();
  const sites = [
    ["chestCm", "Chest"],
    ["waistCm", "Waist"],
    ["hipsCm", "Hips"],
    ["armCm", "Arm"],
    ["thighCm", "Thigh"],
    ["neckCm", "Neck"],
  ];
  return (
    <details className="rounded-xl border border-line/70">
      <summary className="flex min-h-12 cursor-pointer items-center px-4 font-semibold text-gold">+ Add measurements</summary>
      <ActionForm action={addMeasurementAction} resetOnSuccess onSuccess={() => router.refresh()} className="space-y-3 p-4 pt-0">
        <Field label="Date">
          <input className="field" type="date" name="day" defaultValue={today} max={today} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          {sites.map(([n, l]) => (
            <Field key={n} label={`${l} (cm)`}>
              <input className="field tabular" name={n} inputMode="decimal" />
            </Field>
          ))}
        </div>
        <SubmitButton className="w-full">Save measurements</SubmitButton>
      </ActionForm>
    </details>
  );
}

export function PhotoUploadForm({ today }: { today: string }) {
  const router = useRouter();
  return (
    <details className="rounded-xl border border-line/70">
      <summary className="flex min-h-12 cursor-pointer items-center px-4 font-semibold text-gold">+ Upload a progress photo</summary>
      <ActionForm action={uploadPhotoAction} resetOnSuccess onSuccess={() => router.refresh()} className="space-y-3 p-4 pt-0">
        <p className="text-xs text-mute">Private: only you and your coach can see your photos. Same spot, same lighting each time works best.</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <input className="field" type="date" name="day" defaultValue={today} max={today} />
          </Field>
          <Field label="Pose">
            <select name="pose" className="field" defaultValue="FRONT">
              <option value="FRONT">Front</option>
              <option value="SIDE">Side</option>
              <option value="BACK">Back</option>
              <option value="OTHER">Other</option>
            </select>
          </Field>
        </div>
        <Field label="Photo" hint="JPG, PNG or WebP, up to 10 MB.">
          <input className="field file:mr-3 file:rounded-lg file:border-0 file:bg-gold file:px-3 file:py-1.5 file:font-semibold file:text-ink" type="file" name="photo" accept="image/jpeg,image/png,image/webp" required />
        </Field>
        <SubmitButton pendingText="Uploading…" className="w-full">
          Upload photo
        </SubmitButton>
      </ActionForm>
    </details>
  );
}
