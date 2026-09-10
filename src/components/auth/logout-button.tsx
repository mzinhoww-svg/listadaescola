import { signOutAction } from "@/lib/auth/actions";
import { SubmitButton } from "@/components/auth/submit-button";
import type { ButtonProps } from "@/components/ui/button";

export function LogoutButton(props: ButtonProps) {
  return (
    <form action={signOutAction}>
      <SubmitButton variant="ghost" size="sm" {...props}>
        Sair
      </SubmitButton>
    </form>
  );
}
