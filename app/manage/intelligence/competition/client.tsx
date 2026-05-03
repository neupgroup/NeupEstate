'use client';

import { useState, useTransition } from 'react';
import { Swords, Plus, Trash2, Globe, ChevronDown, ChevronRight, Map, Link2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  createCompetitorAction,
  deleteCompetitorAction,
  addCompetitorSourceAction,
  deleteCompetitorSourceAction,
  type Competitor,
} from './actions';

type SourceType = 'sitemap' | 'link' | 'manual';

const SOURCE_ICONS: Record<SourceType, React.ReactNode> = {
  sitemap: <Map className="h-4 w-4 text-muted-foreground shrink-0" />,
  link: <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />,
  manual: <FileText className="h-4 w-4 text-muted-foreground shrink-0" />,
};

export function CompetitionClient({ initialCompetitors }: { initialCompetitors: Competitor[] }) {
  const [competitors, setCompetitors] = useState<Competitor[]>(initialCompetitors);
  const [isPending, startTransition] = useTransition();

  // New competitor form
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  // Per-competitor new source form state
  const [newSource, setNewSource] = useState<Record<string, { type: SourceType; value: string }>>({});

  // Expanded state
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // ── Competitors ────────────────────────────────────────────────────────────

  function handleAddCompetitor() {
    const name = newName.trim();
    if (!name) return;
    startTransition(async () => {
      const res = await createCompetitorAction(name, newDesc);
      if (res.success) {
        // Re-fetch by reloading — server component will re-render with fresh data
        // For instant UI, optimistically add a placeholder then refresh
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
        setCompetitors((prev) => prev.filter((c) => c.id !== id));
      }
    });
  }

  // ── Sources ────────────────────────────────────────────────────────────────

  function handleAddSource(competitorId: string) {
    const s = newSource[competitorId] ?? { type: 'sitemap', value: '' };
    if (!s.value.trim()) return;
    startTransition(async () => {
      const res = await addCompetitorSourceAction(competitorId, s.type, s.value);
      if (res.success) {
        setNewSource((prev) => ({ ...prev, [competitorId]: { type: 'sitemap', value: '' } }));
        window.location.reload();
      }
    });
  }

  function handleDeleteSource(competitorId: string, sourceId: string) {
    startTransition(async () => {
      const res = await deleteCompetitorSourceAction(sourceId);
      if (res.success) {
        setCompetitors((prev) =>
          prev.map((c) =>
            c.id === competitorId
              ? { ...c, sources: c.sources.filter((s) => s.id !== sourceId) }
              : c,
          ),
        );
      }
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Swords className="h-6 w-6" />
          Competition
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage competitors and their sources for intelligence tracking.
        </p>
      </div>

      {/* Add competitor */}
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

      {/* Competitor list */}
      {competitors.length === 0 && (
        <p className="text-sm text-muted-foreground">No competitors added yet.</p>
      )}

      {competitors.map((competitor) => {
        const isOpen = expanded[competitor.id] ?? true;
        const ns = newSource[competitor.id] ?? { type: 'sitemap' as SourceType, value: '' };

        return (
          <Card key={competitor.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <button
                  className="flex items-center gap-2 font-semibold text-left"
                  onClick={() => setExpanded((p) => ({ ...p, [competitor.id]: !isOpen }))}
                >
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <Globe className="h-4 w-4 text-primary" />
                  {competitor.name}
                  <Badge variant="secondary">{competitor.sources.length} sources</Badge>
                </button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={isPending}
                  onClick={() => handleDeleteCompetitor(competitor.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {competitor.description && (
                <p className="text-sm text-muted-foreground pl-6">{competitor.description}</p>
              )}
            </CardHeader>

            {isOpen && (
              <CardContent className="space-y-4">
                {/* Add source row */}
                <div className="flex gap-2 items-center">
                  <Select
                    value={ns.type}
                    onValueChange={(v) =>
                      setNewSource((p) => ({ ...p, [competitor.id]: { ...ns, type: v as SourceType } }))
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sitemap">Sitemap</SelectItem>
                      <SelectItem value="link">Link</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="https://example.com/sitemap.xml"
                    value={ns.value}
                    onChange={(e) =>
                      setNewSource((p) => ({ ...p, [competitor.id]: { ...ns, value: e.target.value } }))
                    }
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSource(competitor.id)}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    disabled={isPending || !ns.value.trim()}
                    onClick={() => handleAddSource(competitor.id)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Source list */}
                {competitor.sources.length === 0 && (
                  <p className="text-xs text-muted-foreground">No sources added yet.</p>
                )}
                {competitor.sources.map((source) => (
                  <div
                    key={source.id}
                    className="flex items-center justify-between gap-2 border rounded-md px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {SOURCE_ICONS[source.type as SourceType]}
                      <Badge variant="outline" className="shrink-0">{source.type}</Badge>
                      <span className="text-sm text-muted-foreground truncate">{source.value}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isPending}
                      onClick={() => handleDeleteSource(competitor.id, source.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
