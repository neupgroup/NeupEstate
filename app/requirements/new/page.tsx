import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@neup/components/ui/card';
import { UserRequirementsForm } from '@/components/profile/user-requirements-form';
import { requireAuth } from '@/services/auth/account';
import { upsertRequirementAction } from '@/services/accounts/id/requirements';

/** Render the signed-in account's new property requirement form. */
export default async function NewRequirementPage() {
  await requireAuth();

  return (
    <main className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <Card className="mx-auto max-w-3xl">
        <CardHeader>
          <CardTitle>Create New Requirements</CardTitle>
          <CardDescription>Tell us what you are looking for so we can provide better recommendations.</CardDescription>
        </CardHeader>
        <CardContent>
          <UserRequirementsForm initialRequirements={null} onSave={upsertRequirementAction} />
        </CardContent>
      </Card>
    </main>
  );
}
