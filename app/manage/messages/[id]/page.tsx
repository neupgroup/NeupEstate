
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Phone, Star } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/logica/core/utils';
import { getWhatsAppTemplates } from '@/services/whatsapp-service';
import { getConversationById, getMessagesByConversationId } from '@/services/conversation-service';
import { SendMessageForm } from '@/components/manage/send-message-form';
import { DeleteConversationButton } from '@/components/manage/delete-conversation-button';
import { AiInterventionToggle } from '@/components/manage/ai-intervention-toggle';
import { Badge } from '@/components/ui/badge';
import { AiFollowUpButton } from '@/components/manage/ai-follow-up-button';

export default async function MessageDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const conversation = await getConversationById(id);
    const messages = await getMessagesByConversationId(id);
    const templates = await getWhatsAppTemplates();

    if (!conversation) {
        notFound();
    }
    const isNewConversation = messages.length === 0;

    return (
        <div className="flex flex-col h-[calc(100vh-10rem)] bg-card rounded-lg border max-w-6xl mx-auto">
            {/* Header */}
            <CardHeader className="flex-shrink-0 border-b">
                <div className="flex justify-between items-start gap-4">
                    <div>
                        <CardTitle>{conversation.customerName}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                            <Phone className="h-3 w-3" />
                            {conversation.customerPhone}
                        </CardDescription>
                    </div>
                     <div className="text-right flex flex-col items-end gap-2">
                         <div className="flex items-center gap-2">
                             <AiInterventionToggle conversationId={conversation.id} isActive={conversation.aiInterventionActive ?? true} />
                             <AiFollowUpButton conversationId={conversation.id} lastMessageSender={conversation.lastMessageSender} isNewConversation={isNewConversation} />
                        </div>
                         {conversation.leadCategory && (
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary">{conversation.leadCategory}</Badge>
                                <Badge>
                                    <Star className="h-3 w-3 mr-1" />
                                    Hotness: {conversation.leadScore}/10
                                </Badge>
                            </div>
                        )}
                        <div className="text-right">
                            <p className="text-sm font-medium flex items-center justify-end gap-2">
                               <User className="h-4 w-4 text-muted-foreground" />
                               Assigned to: {conversation.assignedTo}
                            </p>
                            <p className="text-xs text-muted-foreground mb-2">{conversation.subject}</p>
                            <DeleteConversationButton conversationId={conversation.id} customerName={conversation.customerName} />
                        </div>
                    </div>
                </div>
                <div className="mt-2 text-sm p-3 bg-secondary/50 rounded-md">
                    <p className="font-semibold">Summary of Requirements:</p>
                    <p className="text-muted-foreground">{conversation.notes}</p>
                </div>
            </CardHeader>
            
            {/* Chat Body */}
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={cn(
                            "flex items-end gap-2 max-w-[85%]",
                            message.sender === 'agent' ? "ml-auto flex-row-reverse" : "mr-auto"
                        )}
                    >
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={message.sender === 'customer' ? conversation.customerAvatarUrl : "https://placehold.co/40x40.png"} data-ai-hint={message.sender === 'customer' ? "person portrait" : "agent portrait"}/>
                            <AvatarFallback>{message.sender === 'customer' ? conversation.customerName.charAt(0) : 'AI'}</AvatarFallback>
                        </Avatar>
                        <div
                            className={cn(
                                "rounded-lg p-3 text-sm whitespace-pre-wrap",
                                message.sender === 'agent'
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-secondary"
                            )}
                        >
                            <p>{message.text}</p>
                            <p className={cn("text-xs mt-1 text-right", message.sender === 'agent' ? 'text-primary-foreground/70' : 'text-muted-foreground')}>{new Date(message.timestamp).toLocaleTimeString()}</p>
                        </div>
                    </div>
                ))}
                {isNewConversation && (
                    <div className="text-center text-muted-foreground p-8">
                        <p>This is a new conversation.</p>
                        <p className="text-sm">Start by sending an approved template message.</p>
                    </div>
                )}
            </CardContent>

            <Separator />
            
            {/* Input Form */}
            <SendMessageForm
                conversationId={conversation.id}
                templates={templates}
                isNewConversation={isNewConversation}
            />
        </div>
    );
}
