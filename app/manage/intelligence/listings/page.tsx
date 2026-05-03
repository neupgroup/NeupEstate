'use client';

import { useState } from 'react';
import { ListChecks, Plus, Globe, Map, Link2, Trash2, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// ── Types ────────────────────────────────────────────────────────────────────

type SourceType = 'sitemap' | 'link';

type Source = {
  id: string;
  type: SourceType;
  value: string;
};

type Competitor = {
  id: string;
  name: string;
  sources: Source[];
};

type CrawlResult = {
  sourceId: string;
  urls: string[];
  error?: string;
  loading: boolean;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2);
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ListingsIntelligencePage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [newName, setNewName] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [newSource, setNewSource] = useState<Record<string, { type: SourceType; value: string }>>({});
  const [crawlResults, setCrawlResults] = useState<Record<string, CrawlResult>>({});

  // ── Competitor CRUD ────────────────────────────────────────────────────────

  function addCompetitor() {
    const name = newName.trim();
    if (!name) return;
    setCompetitors((prev) => [...prev, { id: uid(), name, sources: [] }]);
    setNewName('');
  }

  function removeCompetitor(id: string) {
    setCompetitors((prev) => prev.filter((c) => c.id !== id));
  }

  // ── Source CRUD ────────────────────────────────────────────────────────────

  function addSource(competitorId: string) {
    const s = newSource[competitorId];
    if (!s?.value.trim()) return;
    setCompetitors((prev) =>
      prev.map((c) =>
        c.id === competitorId
          ? { ...c, sources: [...c.sources, { id: uid(), type: s.type, value: s.value.trim() }] }
          : c,
      ),
    );
    setNewSource((prev) => ({ ...prev, [competitorId]: { type: 'sitemap', value: '' } }));
  }

  function removeSource(competitorId: string, sourceId: string) {
    setCompetitors((prev) =>
      prev.map((c) =>
        c.id === competitorId ? { ...c, sources: c.sources.filter((s) => s.id !== sourceId) } : c,
      ),
    );
  }

  // ── Crawl ──────────────────────────────────────────────────────────────────

  async function crawlSource(source: Source) {
    setCrawlResults((prev) => ({
      ...prev,
      [source.id]: { sourceId: source.id, urls: [], loading: true },
    }));

    try {
      const endpoint = source.type === 'sitemap' ? '/api/crawl/sitemap' : '/api/crawl/links';
      const res = await fetch(`${endpoint}?url=${encodeURIComponent(source.value)}`);
      const data = await res.json();
      setCrawlResults((prev) => ({
        ...prev,
        [source.id]: { sourceId: source.id, urls: data.urls ?? [], error: data.error, loading: false },
      }));
    } catch (e: any) {
      setCrawlResults((prev) => ({
        ...prev,
        [source.id]: { sourceId: source.id, urls: [], error: e.message, loading: false },
      }));
    }
  }

  async function crawlAll(competitor: Competitor) {
    for (const source of competitor.sources) {
      await crawlSource(source);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <ListChecks className="h-6 w-6" />
          Listings Intelligence
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Track competitor sites via their sitemaps and page links. See what's listed and what we've already discovered.
        </p>
      </div>

      {/* Add competitor */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Competitor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Competitor name (e.g. HamroBazar)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCompetitor()}
              className="max-w-sm"
            />
            <Button onClick={addCompetitor}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
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
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={competitor.sources.length === 0}
                    onClick={() => crawlAll(competitor)}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" /> Crawl All
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => removeCompetitor(competitor.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            {isOpen && (
              <CardContent className="space-y-4">
                {/* Add source */}
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
                      <SelectItem value="link">Links</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="https://example.com/sitemap.xml"
                    value={ns.value}
                    onChange={(e) =>
                      setNewSource((p) => ({ ...p, [competitor.id]: { ...ns, value: e.target.value } }))
                    }
                    onKeyDown={(e) => e.key === 'Enter' && addSource(competitor.id)}
                    className="flex-1"
                  />
                  <Button variant="outline" onClick={() => addSource(competitor.id)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Sources */}
                {competitor.sources.length === 0 && (
                  <p className="text-xs text-muted-foreground">No sources added.</p>
                )}

                {competitor.sources.map((source) => {
                  const result = crawlResults[source.id];
                  return (
                    <div key={source.id} className="border rounded-md p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {source.type === 'sitemap' ? (
                            <Map className="h-4 w-4 text-muted-foreground shrink-0" />
                          ) : (
                            <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                          <Badge variant="outline" className="shrink-0">{source.type}</Badge>
                          <span className="text-sm truncate text-muted-foreground">{source.value}</span>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => crawlSource(source)}
                            disabled={result?.loading}
                          >
                            {result?.loading ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3 w-3" />
                            )}
                            <span className="ml-1">Crawl</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeSource(competitor.id, source.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Crawl results */}
                      {result && !result.loading && (
                        <div className="mt-2 space-y-1">
                          {result.error ? (
                            <p className="text-xs text-destructive">{result.error}</p>
                          ) : (
                            <>
                              <p className="text-xs text-muted-foreground">
                                {result.urls.length} URL{result.urls.length !== 1 ? 's' : ''} found
                              </p>
                              <div className="max-h-48 overflow-y-auto rounded border bg-muted/30 p-2 space-y-1">
                                {result.urls.map((url) => (
                                  <a
                                    key={url}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block text-xs text-primary hover:underline truncate"
                                  >
                                    {url}
                                  </a>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
