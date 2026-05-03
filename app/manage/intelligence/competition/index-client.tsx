'use client';

import { useState, useTransition } from 'react';
import { Plus, Trash2, Globe, Map, Link2, FileText, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ClientLink } from '@/components/client-link';
import { createCompetitorAction, deleteCompetitorAction } from './actions';
import type { Competitor } from './types';

type SourceType = 'sitemap' | 'link' | 'manual';

const SOURCE_ICONS: Record<SourceType, React.ReactNode> = {
  sitemap: <Map className="h-4 w-4 text-muted-foreground shrink-0" />,
  link: <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />,
  manual: <FileText className="h-4 w-4 text-muted-foreground shrink-0" />,
};

export function CompetitionIndexClient({ initialCompetitors }: { initialCompetitors: Competitor[] }) {
  const [competitors, setCompetitors] = useState<Competitor[]>(initialCompetitors);
  const [isPending, startTransition] = useTransition();
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  function handleAddCompetitor() {
    const name = newName.trim();
    if (!name) return;

    startTransition(async () => {
      const res = await createCompetitorAction(name, newDesc);
      if (res.success) {
        setNewName('');
        setNewDesc('');
        window.location.reload();
      }
    });
  }

  function handleDeleteCompetitor(id: string) {
    startTransition(async () => {
      const res = await deleteCompetitorAction(id);
      if (res.success) {
        setCompetitors((prev) => prev.filter((competitor) => competitor.id !== id));
      }
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Globe className="h-6 w-6" />
          Competition
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage competitors and their source feeds for intelligence tracking.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Competitor</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Competitor name (e.g. HamroBazar)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !newDesc && handleAddCompetitor()}
          />
          <Textarea
            placeholder="Description (optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            rows={2}
          />
          <Button onClick={handleAddCompetitor} disabled={isPending || !newName.trim()}>
            <Plus className="h-4 w-4 mr-1" /> Add Competitor
          </Button>
        </CardContent>
      </Card>

      {competitors.length === 0 ? (
        <p className="text-sm text-muted-foreground">No competitors added yet.</p>
      ) : (
        <div className="rounded-lg border divide-y overflow-hidden">
          {competitors.map((competitor) => (
            <div key={competitor.id} className="group flex items-stretch justify-between gap-4 px-4 py-4 hover:bg-muted/5">
              <ClientLink href={`/manage/intelligence/competition/${competitor.id}`} className="flex flex-1 items-center justify-between gap-4 min-w-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <Globe className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-medium truncate">{competitor.name}</span>
                    <Badge variant="secondary" className="shrink-0">{competitor.sources.length} sources</Badge>
                  </div>
                  {competitor.description && (
                    <p className="text-sm text-muted-foreground mt-1 truncate">{competitor.description}</p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </ClientLink>

              <Button
                size="sm"
                variant="ghost"
                disabled={isPending}
                onClick={() => handleDeleteCompetitor(competitor.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
