'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, Trash2, AlertCircle } from 'lucide-react';
import type { TeamMember } from '@/core/database/prisma';
import {
  createTeamMemberAction,
  updateTeamMemberAction,
  deleteTeamMemberAction,
} from './actions';

type TeamMemberFormProps = {
  teamMember?: TeamMember;
  defaultOrgId?: string;
};

export function TeamMemberForm({ teamMember, defaultOrgId }: TeamMemberFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isEditing = !!teamMember;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      if (isEditing) {
        await updateTeamMemberAction(teamMember.id, formData);
      } else {
        await createTeamMemberAction(formData);
      }

      router.push('/manage/teams');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!teamMember) return;

    if (!confirm(`Are you sure you want to delete ${teamMember.name}?`)) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      await deleteTeamMemberAction(teamMember.id);
      router.push('/manage/teams');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete team member');
      setDeleting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Enter the team member's basic details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              name="name"
              defaultValue={teamMember?.name}
              required
              placeholder="John Doe"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              name="slug"
              defaultValue={teamMember?.slug || ''}
              placeholder="john-doe"
            />
            <p className="text-xs text-muted-foreground">
              URL-friendly identifier (e.g., john-doe)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="position">Position *</Label>
            <Input
              id="position"
              name="position"
              defaultValue={teamMember?.position}
              required
              placeholder="Senior Developer"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="photoUrl">Photo URL</Label>
            <Input
              id="photoUrl"
              name="photoUrl"
              type="url"
              defaultValue={teamMember?.photoUrl || ''}
              placeholder="https://example.com/photo.jpg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="about">About *</Label>
            <Textarea
              id="about"
              name="about"
              defaultValue={teamMember?.about}
              required
              placeholder="Brief description about the team member..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="moreDetails">More Details</Label>
            <Textarea
              id="moreDetails"
              name="moreDetails"
              defaultValue={teamMember?.moreDetails || ''}
              placeholder="Additional information..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Organization & User</CardTitle>
          <CardDescription>
            Link this team member to an organization or user account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="orgId">Organization ID</Label>
            <Input
              id="orgId"
              name="orgId"
              defaultValue={teamMember?.orgId || defaultOrgId || ''}
              placeholder="org-123"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="userId">User ID</Label>
            <Input
              id="userId"
              name="userId"
              defaultValue={teamMember?.userId || ''}
              placeholder="user-123"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="registered"
              name="registered"
              defaultChecked={teamMember?.registered}
            />
            <Label htmlFor="registered" className="cursor-pointer">
              Registered User
            </Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Enable if this team member has a registered account.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Social Media</CardTitle>
          <CardDescription>
            Add social media links for this team member.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="linkedin">LinkedIn</Label>
            <Input
              id="linkedin"
              name="linkedin"
              type="url"
              defaultValue={
                teamMember?.socialMedia
                  ? (teamMember.socialMedia as Record<string, string>).linkedin
                  : ''
              }
              placeholder="https://linkedin.com/in/username"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="twitter">Twitter</Label>
            <Input
              id="twitter"
              name="twitter"
              type="url"
              defaultValue={
                teamMember?.socialMedia
                  ? (teamMember.socialMedia as Record<string, string>).twitter
                  : ''
              }
              placeholder="https://twitter.com/username"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="github">GitHub</Label>
            <Input
              id="github"
              name="github"
              type="url"
              defaultValue={
                teamMember?.socialMedia
                  ? (teamMember.socialMedia as Record<string, string>).github
                  : ''
              }
              placeholder="https://github.com/username"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              name="website"
              type="url"
              defaultValue={
                teamMember?.socialMedia
                  ? (teamMember.socialMedia as Record<string, string>).website
                  : ''
              }
              placeholder="https://example.com"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div>
          {isEditing && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting || loading}
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </>
              )}
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading || deleting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading || deleting}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {isEditing ? 'Update' : 'Create'}
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
