import { redirect } from "next/navigation";
import { hasPermission } from "@/logica/auth/authorization";
import { requireAuth } from "@/services/auth/account";

export async function requirePagePermission(permission: string): Promise<void> {
  await requireAuth();
  const allowed = await hasPermission(permission);
  if (!allowed) {
    redirect("/");
  }
}
