'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { askAssistAction } from './actions';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/logica/core/hooks/use-toast';
import {
  Bot,
  CheckCircle2,
  ClipboardList,
  Loader2,
  MessageSquareText,
  Send,
  Sparkles,
  User2,
} from 'lucide-react';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

const SUGGESTIONS = [
  'Draft a direct but polite reply to a buyer asking for the final negotiable price.',
  'Summarize the follow-up actions I should take for warm leads today.',
  'Write a property pitch for a 3-bedroom family home near schools and ring road access.',
  'Turn these rough notes into a WhatsApp message that sounds confident but not pushy.',
];

const WORKFLOWS = [
  {
    title: 'Lead follow-up',
    description: 'Convert scattered notes into next actions, reminders, and buyer-specific replies.',
  },
  {
    title: 'Listing pitch',
    description: 'Shape raw property facts into clearer positioning for buyers, owners, and ads.',
  },
  {
    title: 'Objection handling',
    description: 'Get tighter responses for pricing, urgency, trust, and availability concerns.',
  },
];

const RESPONSE_RULES = [
  'Give the assistant the buyer type, property type, and your actual goal.',
  'Paste rough notes when you want rewriting instead of generic advice.',
  'Ask for short, medium, or persuasive tone explicitly when drafting replies.',
];

function createMessage(role: ChatMessage['role'], content: string): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
  };
}

export function AssistChatbot({ userId }: { userId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    createMessage(
      'assistant',
      'I can help with lead replies, listing pitches, follow-up plans, and day-to-day agency writing. Start with the situation, the audience, and the outcome you want.',
    ),
  ]);
  const [draft, setDraft] = useState('');
  const [isPending, startTransition] = useTransition();
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return;
    viewport.scrollTop = viewport.scrollHeight;
  }, [messages]);

  function handleSend(nextMessage?: string) {
    const message = (nextMessage ?? draft).trim();
    if (!message || isPending) return;

    const nextUserMessage = createMessage('user', message);
    const historyForRequest = messages.map(({ role, content }) => ({ role, content }));

    setMessages((current) => [...current, nextUserMessage]);
    setDraft('');

    startTransition(async () => {
      const result = await askAssistAction({
        message,
        history: historyForRequest,
        userId,
      });

      if (!result.success || !result.response) {
        toast({
          variant: 'destructive',
          title: 'Assistant unavailable',
          description: result.error ?? 'The chatbot could not generate a response.',
        });
        return;
      }

      const response = result.response;
      setMessages((current) => [...current, createMessage('assistant', response)]);
    });
  }

  const hasConversation = messages.length > 1;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary/15 via-background to-amber-500/10 shadow-sm">
        <CardContent className="flex flex-col gap-6 p-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-primary/20 bg-background/80 text-foreground hover:bg-background">
                Private assistant
              </Badge>
              <Badge variant="secondary">Internal use</Badge>
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-semibold tracking-tight">Assist</h2>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                A faster drafting surface for buyer replies, follow-up planning, listing language,
                and internal sales support.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.slice(0, 3).map((suggestion) => (
                <Button
                  key={suggestion}
                  type="button"
                  variant="outline"
                  className="h-auto max-w-full justify-start whitespace-normal border-background/70 bg-background/80 text-left"
                  onClick={() => handleSend(suggestion)}
                  disabled={isPending}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:w-[24rem] lg:grid-cols-1">
            <div className="rounded-2xl border bg-background/85 p-4 backdrop-blur">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">Prompt quality</span>
                <span className="text-sm text-muted-foreground">Strong</span>
              </div>
              <Progress value={82} className="h-2" />
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Specific audience, property facts, and target outcome produce sharper replies.
              </p>
            </div>
            <div className="rounded-2xl border bg-background/85 p-4 backdrop-blur">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ClipboardList className="h-4 w-4 text-primary" />
                Best for
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                WhatsApp replies, call follow-ups, owner updates, and short listing pitches.
              </p>
            </div>
            <div className="rounded-2xl border bg-background/85 p-4 backdrop-blur">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Recommended input
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Include tone, price context, urgency, and what you want the recipient to do next.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
        <Card className="overflow-hidden border-border/70">
          <CardHeader className="border-b bg-muted/20">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MessageSquareText className="h-5 w-5 text-primary" />
                  Neup Assist Workspace
                </CardTitle>
                <CardDescription>
                  Use the quick prompts or write your own instruction below.
                </CardDescription>
              </div>
              <Badge variant="outline" className="w-fit">
                Live drafting
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="flex h-[72vh] flex-col p-0">
            <div ref={scrollViewportRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
                {!hasConversation ? (
                  <div className="grid gap-4 rounded-2xl border border-dashed bg-muted/20 p-4 md:grid-cols-3">
                    {WORKFLOWS.map((workflow, index) => (
                      <button
                        key={workflow.title}
                        type="button"
                        className="rounded-2xl border bg-background p-4 text-left transition-colors hover:border-primary"
                        onClick={() => setDraft(SUGGESTIONS[index] ?? workflow.title)}
                        disabled={isPending}
                      >
                        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                          {index === 0 ? (
                            <MessageSquareText className="h-5 w-5" />
                          ) : index === 1 ? (
                            <Sparkles className="h-5 w-5" />
                          ) : (
                            <ClipboardList className="h-5 w-5" />
                          )}
                        </div>
                        <h3 className="text-sm font-semibold">{workflow.title}</h3>
                        <p className="mt-2 text-xs leading-5 text-muted-foreground">
                          {workflow.description}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : null}

                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={[
                        'flex max-w-[90%] gap-3 rounded-3xl px-4 py-4 shadow-sm sm:max-w-[80%]',
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'border bg-background',
                      ].join(' ')}
                    >
                      <Avatar
                        className={[
                          'mt-0.5 h-8 w-8 border',
                          message.role === 'user'
                            ? 'border-primary-foreground/30 bg-primary-foreground/10'
                            : 'bg-primary/10',
                        ].join(' ')}
                      >
                        <AvatarFallback
                          className={
                            message.role === 'user'
                              ? 'bg-transparent text-primary-foreground'
                              : 'bg-transparent text-primary'
                          }
                        >
                          {message.role === 'user' ? (
                            <User2 className="h-4 w-4" />
                          ) : (
                            <Bot className="h-4 w-4" />
                          )}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <div className="mb-2 text-xs font-medium opacity-80">
                          {message.role === 'user' ? 'You' : 'Assist'}
                        </div>
                        <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                      </div>
                    </div>
                  </div>
                ))}

                {isPending ? (
                  <div className="flex justify-start">
                    <div className="flex max-w-[80%] items-center gap-3 rounded-3xl border bg-background px-4 py-4 shadow-sm">
                      <Avatar className="h-8 w-8 border bg-primary/10">
                        <AvatarFallback className="bg-transparent text-primary">
                          <Bot className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Drafting response...
                      </div>
                    </div>
                  </div>
                ) : null}
            </div>

            <div className="border-t bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/85">
              <div className="mb-3 flex flex-wrap gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <Button
                    key={suggestion}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-auto whitespace-normal text-left"
                    onClick={() => setDraft(suggestion)}
                    disabled={isPending}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>

              <div className="flex gap-3">
                <Textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Describe the situation, audience, and the exact reply or output you want..."
                  className="min-h-[120px] resize-none"
                  disabled={isPending}
                />
                <Button
                  type="button"
                  className="h-auto min-w-12 self-end"
                  onClick={() => handleSend()}
                  disabled={isPending || draft.trim().length === 0}
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  <span className="sr-only">Send</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Suggested workflows</CardTitle>
              <CardDescription>Reliable use cases for this assistant.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {WORKFLOWS.map((workflow, index) => (
                <button
                  key={workflow.title}
                  type="button"
                  className="block w-full rounded-2xl border p-4 text-left transition-colors hover:border-primary"
                  onClick={() => setDraft(SUGGESTIONS[index] ?? workflow.title)}
                  disabled={isPending}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{workflow.title}</div>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {workflow.description}
                      </p>
                    </div>
                    <Sparkles className="mt-0.5 h-4 w-4 text-primary" />
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Prompting notes</CardTitle>
              <CardDescription>Small changes that improve the output.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {RESPONSE_RULES.map((rule, index) => (
                <div key={rule}>
                  {index > 0 ? <Separator className="mb-4" /> : null}
                  <div className="flex gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {index + 1}
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">{rule}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recommended structure</CardTitle>
              <CardDescription>Paste inputs in this order for stronger replies.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-2xl bg-background p-4 font-mono text-xs leading-6 text-muted-foreground">
                Goal: write / summarize / plan
                <br />
                Audience: buyer / owner / internal team
                <br />
                Context: property facts, objection, timing
                <br />
                Tone: concise / persuasive / formal
                <br />
                Output: WhatsApp / call note / pitch / checklist
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
