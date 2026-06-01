import type { Metadata } from 'next';
import { Bot, Inbox, MessageSquareQuote, Send, Sparkles, SlidersHorizontal, Shield, Users } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

export const metadata: Metadata = {
  title: 'Inbox | Neup.Estate',
  description: 'A shared inbox for conversations with agents and AI bots.',
};

const conversations = [
  {
    name: 'Asha KC',
    role: 'Human agent',
    avatar: 'AK',
    preview: 'I have a shortlist of apartments that match your budget and commute.',
    time: '2m ago',
    unread: true,
    status: 'Online',
  },
  {
    name: 'NeupBot',
    role: 'AI assistant',
    avatar: 'NB',
    preview: 'I can summarize leads, surface listings, and draft responses on demand.',
    time: '11m ago',
    unread: false,
    status: 'Ready',
  },
  {
    name: 'Mina Shrestha',
    role: 'Buyer',
    avatar: 'MS',
    preview: 'Can the viewing be moved to Saturday morning instead?',
    time: '43m ago',
    unread: true,
    status: 'Needs reply',
  },
  {
    name: 'Property Scout',
    role: 'Automation bot',
    avatar: 'PS',
    preview: 'I found two new listings that fit the saved criteria.',
    time: '1h ago',
    unread: false,
    status: 'Monitoring',
  },
];

const thread = [
  {
    author: 'Asha KC',
    label: 'Human agent',
    body: 'I checked the latest inventory and found three apartments with parking, elevator access, and strong sunlight.',
    time: '10:18 AM',
    side: 'left',
  },
  {
    author: 'NeupBot',
    label: 'AI assistant',
    body: 'I can rank those by commute time, monthly payment, or neighborhood score if you want a faster shortlist.',
    time: '10:20 AM',
    side: 'left',
  },
  {
    author: 'You',
    label: 'Property owner',
    body: 'Prioritize the ones near Ring Road and keep the budget under NPR 15,000,000.',
    time: '10:23 AM',
    side: 'right',
  },
  {
    author: 'Mina Shrestha',
    label: 'Buyer',
    body: 'Perfect. Please send the updated viewing slots and the floor plans together.',
    time: '10:24 AM',
    side: 'left',
  },
];

const quickActions = [
  'Draft reply with listing links',
  'Summarize last 24 hours',
  'Ask AI to rank hot leads',
  'Schedule follow-up message',
];

const bots = [
  {
    name: 'NeupBot',
    description: 'General inbox copilot for triage, drafting, and summaries.',
    badge: 'Primary',
  },
  {
    name: 'Listing Scout',
    description: 'Watches new inventory and flags relevant matches for the team.',
    badge: 'Active',
  },
  {
    name: 'Follow-up Agent',
    description: 'Prepares reminders and nudges when a thread goes quiet.',
    badge: 'Scheduled',
  },
];

export default function InboxPage() {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_40%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.14),_transparent_35%),linear-gradient(to_bottom,_rgba(2,6,23,0.04),_transparent)]" />

      <div className="space-y-6 pb-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Inbox className="h-4 w-4" />
              Shared Inbox
            </div>
            <div className="space-y-1">
              <h1 className="text-4xl font-headline font-bold tracking-tight">Inbox for agents and AI bots</h1>
              <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
                A command center for human handoffs, automated follow-ups, and AI-assisted responses.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
              <Users className="h-3.5 w-3.5" />
              12 active threads
            </Badge>
            <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
              <Bot className="h-3.5 w-3.5" />
              4 bots online
            </Badge>
            <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
              <Shield className="h-3.5 w-3.5" />
              AI intervention enabled
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_320px]">
          <Card className="border-border/60 bg-background/80 shadow-sm backdrop-blur">
            <CardHeader className="space-y-3 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-headline">Conversations</CardTitle>
                  <CardDescription>Agents, bots, and live leads in one queue.</CardDescription>
                </div>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </div>
              <Input placeholder="Search inbox" className="bg-background" />
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollArea className="h-[640px] pr-4">
                <div className="space-y-3">
                  {conversations.map((conversation) => (
                    <div
                      key={conversation.name}
                      className={`rounded-2xl border p-3 transition-colors ${
                        conversation.unread ? 'border-primary/30 bg-primary/5' : 'border-border/70 bg-background'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-11 w-11 shrink-0">
                          <AvatarImage src={`https://placehold.co/88x88.png?text=${conversation.avatar}`} alt={conversation.name} />
                          <AvatarFallback>{conversation.avatar}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate font-medium leading-none text-foreground">{conversation.name}</p>
                              <p className="text-xs text-muted-foreground">{conversation.role}</p>
                            </div>
                            <span className="shrink-0 text-xs text-muted-foreground">{conversation.time}</span>
                          </div>
                          <p className="line-clamp-2 text-sm text-muted-foreground">{conversation.preview}</p>
                          <div className="flex items-center justify-between pt-1">
                            <Badge variant={conversation.unread ? 'default' : 'secondary'} className="text-[11px]">
                              {conversation.status}
                            </Badge>
                            {conversation.unread ? <span className="h-2.5 w-2.5 rounded-full bg-primary" /> : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-background/80 shadow-sm backdrop-blur">
            <CardHeader className="border-b border-border/60 pb-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="gap-1.5">
                      <MessageSquareQuote className="h-3.5 w-3.5" />
                      Live thread
                    </Badge>
                    <Badge variant="secondary">Priority</Badge>
                  </div>
                  <CardTitle className="text-2xl font-headline">Mina Shrestha</CardTitle>
                  <CardDescription>
                    Buyer conversation with human agent support and AI-assisted response drafting.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline">Assign agent</Button>
                  <Button variant="outline">Ask AI</Button>
                  <Button>Mark resolved</Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-5 pt-6">
              <ScrollArea className="h-[420px] pr-4">
                <div className="space-y-4">
                  {thread.map((message) => (
                    <div
                      key={`${message.author}-${message.time}`}
                      className={`flex ${message.side === 'right' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[82%] rounded-2xl border px-4 py-3 ${
                        message.side === 'right'
                          ? 'border-primary/20 bg-primary/8 text-foreground'
                          : 'border-border/70 bg-muted/40'
                      }`}>
                        <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{message.author}</span>
                          <span>{message.time}</span>
                        </div>
                        <p className="text-sm leading-6 text-foreground/90">{message.body}</p>
                        <div className="mt-2 text-xs text-muted-foreground">{message.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <Separator />

              <div className="space-y-3 rounded-3xl border border-border/70 bg-muted/20 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  {quickActions.map((action) => (
                    <Badge key={action} variant="secondary" className="cursor-default px-3 py-1.5">
                      <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                      {action}
                    </Badge>
                  ))}
                </div>
                <Textarea
                  placeholder="Type a reply, ask an AI bot to draft a response, or leave an internal note..."
                  rows={4}
                  className="resize-none border-border/70 bg-background"
                />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Bot className="h-4 w-4" />
                    Routing to NeupBot for draft suggestions before sending
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline">Save as note</Button>
                    <Button>
                      <Send className="mr-2 h-4 w-4" />
                      Send reply
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-border/60 bg-background/80 shadow-sm backdrop-blur">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-headline">AI Bots</CardTitle>
                <CardDescription>Available automation and drafting assistants.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {bots.map((bot) => (
                  <div key={bot.name} className="rounded-2xl border border-border/70 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">{bot.name}</p>
                        <p className="text-sm text-muted-foreground">{bot.description}</p>
                      </div>
                      <Badge variant="secondary">{bot.badge}</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-background/80 shadow-sm backdrop-blur">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-headline">Thread summary</CardTitle>
                <CardDescription>Context snapshot for whoever picks up the conversation next.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <p className="text-sm font-medium text-foreground">Current focus</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Buyer wants Saturday morning viewing options and updated floor plans for Ring Road properties.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  <div className="rounded-2xl border border-border/70 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Next best action</p>
                    <p className="mt-1 text-sm font-medium">Draft a concise reply with two viewing slots.</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Routing</p>
                    <p className="mt-1 text-sm font-medium">AI can suggest, human agent approves.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}