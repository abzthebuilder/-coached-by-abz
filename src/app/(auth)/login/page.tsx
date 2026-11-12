import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { loginAction } from "@/app/actions/auth";
import { ActionForm, SubmitButton } from "@/components/form";
import { Field } from "@/components/ui";

export const metadata = { title: "Client Login" };

export default async function Login() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "COACH" ? "/coach" : "/app");
  return (
    <div>
      <div className="eyebrow mb-2">Client portal</div>
      <h1 className="font-display text-5xl uppercase leading-none">Log in</h1>
      <p className="mt-3 text-mute">Your training, targets, check-ins and progress, all in one place.</p>
      <ActionForm action={loginAction} className="mt-8 space-y-4">
        <Field label="Email">
          <input className="field" type="email" name="email" autoComplete="email" required />
        </Field>
        <Field label="Password">
          <input className="field" type="password" name="password" autoComplete="current-password" required />
        </Field>
        <SubmitButton pendingText="Logging in…" className="w-full">
          Log in
        </SubmitButton>
      </ActionForm>
      <p className="mt-6 text-sm text-faint">
        New client? Use the invite link from your coach to set up your account. Forgotten your password? Ask your coach
        for a reset link.
      </p>
    </div>
  );
}
