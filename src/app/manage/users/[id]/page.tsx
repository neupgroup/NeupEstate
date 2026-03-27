
import { getAccountById } from '@/services/account-service';
import { notFound } from 'next/navigation';
import { EditUserForm } from '@/components/manage/edit-user-form';
import type { Account, UpdateUserFormValues } from '@/types';
import { getUsers } from '@/services/user-service';

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const account: Account | null = await getAccountById(id);

    if (!account) {
        notFound();
    }

    // Attempt to get more detailed user info if it's a registered user
    let userProfile: UpdateUserFormValues = { id: account.id };

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
        // For guest accounts, we check the conversation data.
        const { getConversationByAccountId } = await import('@/services/conversation-service');
        const conversation = await getConversationByAccountId(account.id);
        userProfile = {
            id: account.id,
            name: conversation?.customerName || account.name || 'Guest User',
            location: account.location || 'Not set',
            email: [],
            phone: conversation?.customerPhone ? [{ type: 'primary', value: conversation.customerPhone }] : [],
        };
    }

    return (
        <div className="space-y-6">
           <EditUserForm user={userProfile} account={account} />
        </div>
    );
}
