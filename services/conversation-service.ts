

'use server';

import { prisma } from '@/lib/prisma';
import type { Conversation, Message, CreateConversationInput } from '@/types';



function mapPrismaConversationToConversation(c: any): Conversation {
    return {
        id: c.id,
        userId: c.accountId,
        customerName: c.customerName,
        customerPhone: c.customerPhone,
        customerEmail: c.customerEmail,
        customerAvatarUrl: c.customerAvatarUrl,
        notes: c.notes,
        assignedTo: c.assignedTo,
        lastMessageAt: c.lastMessageAt.toISOString(),
        isRead: c.isRead,
        subject: c.subject,
        lastMessageSnippet: c.lastMessageSnippet,
        lastMessageSender: c.lastMessageSender,
        leadCategory: c.leadCategory,
        leadScore: c.leadScore,
        aiInterventionActive: c.aiInterventionActive,
    };
}

function mapPrismaMessageToMessage(m: any): Message {
    return {
        id: m.id,
        conversationId: m.conversationId,
        sender: m.sender,
        text: m.text,
        timestamp: m.timestamp.toISOString(),
    };
}
export async function getConversations({ limit = 20, offset = 0 }: { limit?: number; offset?: number } = {}): Promise<Conversation[]> {

    try {
        const conversations = await prisma.conversation.findMany({
            orderBy: { lastMessageAt: 'desc' },
            take: limit,
            skip: offset,
        });
        return conversations.map(mapPrismaConversationToConversation);
    } catch (error) {
        console.error('Error getting conversations:', error);
        return [];
    }
}


export async function getConversationById(id: string): Promise<Conversation | null> {
    try {
        const conversation = await prisma.conversation.findUnique({
            where: { id },
        });
        if (!conversation) return null;
        
        // Mark as read when it's fetched by a human
        if (!conversation.isRead) {
            await prisma.conversation.update({
                where: { id },
                data: { isRead: true },
            });
        }

        return mapPrismaConversationToConversation(conversation);
    } catch (error) {
        console.error(`Error getting conversation by id ${id}:`, error);
        return null;
    }
}

export async function getConversationByPhone(phone: string): Promise<Conversation | null> {

    try {
        const conversation = await prisma.conversation.findFirst({
            where: { customerPhone: phone },
        });
        return conversation ? mapPrismaConversationToConversation(conversation) : null;
    } catch (error) {
        console.error(`Error getting conversation by phone ${phone}:`, error);
        return null;
    }
}

export async function getConversationByAccountId(accountId: string): Promise<Conversation | null> {

    try {
        const conversation = await prisma.conversation.findFirst({
            where: { accountId },
        });
        return conversation ? mapPrismaConversationToConversation(conversation) : null;
    } catch (error) {
        console.error(`Error getting conversation by account ID ${accountId}:`, error);
        return null;
    }
}


export async function getMessagesByConversationId(conversationId: string, { limit = 50, offset = 0 }: { limit?: number; offset?: number } = {}): Promise<Message[]> {

    try {
        const messages = await prisma.message.findMany({
            where: { conversationId },
            orderBy: { timestamp: 'asc' },
            take: limit,
            skip: offset,
        });
        return messages.map(mapPrismaMessageToMessage);
    } catch (error) {
        console.error(`Error getting messages for conversation ${conversationId}:`, error);
        return [];
    }
}

export async function createMessage(conversationId: string, text: string, sender: 'agent' | 'customer'): Promise<Message> {
    const message = await prisma.message.create({
        data: {
            conversationId,
            text,
            sender,
        },
    });
    
    // Only update if the message is from a customer, or if an agent sends a manual message
    // This prevents the AI's own messages from overwriting the last customer message snippet
    if (sender === 'customer' || sender === 'agent') {
        await prisma.conversation.update({
            where: { id: conversationId },
            data: {
            lastMessageAt: new Date(),
                lastMessageSnippet: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
                lastMessageSender: sender,
                isRead: sender === 'customer' ? false : true,
            },
        });
    }
    
    return mapPrismaMessageToMessage(message);
}


export async function createConversation(input: CreateConversationInput): Promise<string> {

    const conversation = await prisma.conversation.create({
        data: {
        customerName: input.customerName,
        customerPhone: input.customerPhone,
            customerEmail: input.customerEmail || '',
            customerAvatarUrl: input.customerAvatarUrl || 'https://placehold.co/40x40.png',
        notes: input.notes,
        subject: input.notes, // Use notes as the initial subject
        assignedTo: 'AI Assistant', // Initial assignment
        isRead: true, // It's read by the AI, but will become unread for humans
        lastMessageAt: new Date(),
        lastMessageSnippet: "Conversation created. Send a template to start.",
        lastMessageSender: 'agent',
        // New AI fields
        leadCategory: 'New Inquiry',
        leadScore: 5, // Default score
        aiInterventionActive: true,
            accountId: input.userId,
        },
    });
    return conversation.id;
}


export async function deleteConversation(conversationId: string): Promise<void> {
    await prisma.message.deleteMany({
        where: { conversationId },
    });

    await prisma.conversation.delete({
        where: { id: conversationId },
    });
}

export async function updateConversationAiStatus(
  conversationId: string,
  status: { leadCategory: string; leadScore: number; aiInterventionActive: boolean }
): Promise<void> {
    await prisma.conversation.update({
        where: { id: conversationId },
        data: {
                ...status,
                assignedTo: status.aiInterventionActive ? 'AI Assistant' : 'Admin',
        },
    });
}

export async function setAiIntervention(conversationId: string, active: boolean): Promise<void> {
    await prisma.conversation.update({
        where: { id: conversationId },
        data: {
            aiInterventionActive: active,
            assignedTo: active ? 'AI Assistant' : 'Admin',
        },
    });
}

    
