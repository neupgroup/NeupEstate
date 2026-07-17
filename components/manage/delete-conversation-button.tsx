
"use client";

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from '@/components/ui/button';
import { Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/core/hooks/use-toast';
import { deleteConversationAction } from '@/services/communications';

interface DeleteConversationButtonProps {
    conversationId: string;
    customerName: string;
}

export function DeleteConversationButton({ conversationId, customerName }: DeleteConversationButtonProps) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    const { toast } = useToast();

    const handleDelete = () => {
        startTransition(async () => {
            const result = await deleteConversationAction(conversationId);
            if (result.success) {
                toast({
                    title: "Conversation Deleted",
                    description: `The conversation with ${customerName} has been deleted.`,
                });
                router.push('/manage/messages');
            } else {
                toast({
                    variant: 'destructive',
                    title: "Deletion Failed",
                    description: result.error,
                });
            }
        });
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete the entire conversation with {customerName}. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90" disabled={isPending}>
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Yes, delete it'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
