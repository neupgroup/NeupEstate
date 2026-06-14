import { notFound } from 'next/navigation';
import { getConversationById } from '@/services/conversation-service';
import { getAccountById } from '@/services/account-service';
import { EditUserForm } from '@/components/manage/edit-user-form';
import type { Account, UpdateUserFormValues } from '@/types';
import { getUsers } from '@/services/user-service';
import { LeadDetailsCard } from '@/components/manage/lead-details-card';

export default async function SharedLeadPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const conversation = await getConversationById(id);

    if (!conversation) {
        notFound();
    }

    let account: Account | null = null;
    if (conversation.userId) {
        account = await getAccountById(conversation.userId);
    }

    if (!account) {
        account = {
            id: conversation.userId || conversation.id,
            account_type: 'guest',
            created_on: conversation.lastMessageAt,
            accessed_on: conversation.lastMessageAt,
            registered: false,
        };
    }

    let userProfile: UpdateUserFormValues = { id: account.id, name: '' };

    if (account.registered) {
        const allUsers = await getUsers();
        const registeredUser = allUsers.find(u => u.id === account.id);
        if (registeredUser) {
            userProfile = {
                id: account.id,
                name: registeredUser.name,
                location: registeredUser.location,
                email: Array.isArray(registeredUser.email) ? registeredUser.email : [],
                phone: Array.isArray(registeredUser.phone) ? registeredUser.phone : [],
            };
        }
    } else {
        userProfile = {
            id: account.id,
            name: conversation.customerName || 'Guest User',
            location: account.location || 'Not set',
            email: conversation.customerEmail ? [{ type: 'primary', value: conversation.customerEmail }] : [],
            phone: conversation.customerPhone ? [{ type: 'primary', value: conversation.customerPhone }] : [],
        };
    }

    return (
        <div className="space-y-6">
           <EditUserForm user={userProfile} account={account} />
           <LeadDetailsCard lead={conversation} />
        </div>
    );
}
