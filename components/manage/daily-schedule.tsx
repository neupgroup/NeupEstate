
"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Pencil, User, Phone } from 'lucide-react';
import { useToast } from '@/core/hooks/use-toast';

const initialSchedule = [
    { id: 'task1', title: 'Meeting', details: 'Discuss property options', time: '12:00 PM', completed: false, clientName: 'John Doe', clientPhone: '(123) 456-7890' },
    { id: 'task2', title: 'Visit property #p2', details: 'Showing at The Grand Lofts', time: '3:00 PM', completed: true, clientName: 'Jane Smith', clientPhone: '(987) 654-3210' },
    { id: 'task3', title: 'Follow up call', details: 'Regarding the offer on Elm Street', time: '4:30 PM', completed: false, clientName: 'Sam Wilson', clientPhone: '(555) 555-5555' },
];

export function DailySchedule() {
    const [schedule, setSchedule] = useState(initialSchedule);
    const { toast } = useToast();

    const handleToggle = (taskId: string) => {
        setSchedule(prev => 
            prev.map(task => 
                task.id === taskId ? { ...task, completed: !task.completed } : task
            )
        );
    };

    const handleEdit = () => {
        toast({
            title: "Coming Soon!",
            description: "Editing schedule items will be available in a future update.",
        });
    };

    return (
        <div className="divide-y divide-border border rounded-lg">
            {schedule.map(task => (
                <Dialog key={task.id}>
                    <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-4">
                            <Checkbox 
                                id={task.id} 
                                checked={task.completed}
                                onCheckedChange={() => handleToggle(task.id)}
                                onClick={(e) => e.stopPropagation()} // Prevent dialog from opening on checkbox click
                            />
                            <DialogTrigger asChild>
                                <div className="flex-grow cursor-pointer">
                                    <p className="font-medium">{task.title}</p>
                                    <p className="text-sm text-muted-foreground">{task.details}</p>
                                    <p className="text-sm text-muted-foreground">{task.time}</p>
                                </div>
                            </DialogTrigger>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={handleEdit}>
                                <Pencil className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Client Details for "{task.title}"</DialogTitle>
                            <DialogDescription>
                                Contact information for your {task.time} appointment.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            <div className="flex items-center gap-3">
                                <User className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Name</p>
                                    <p className="font-semibold">{task.clientName}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Phone className="h-5 w-5 text-muted-foreground" />
                                <div>
                                    <p className="text-sm text-muted-foreground">Phone</p>
                                    <p className="font-semibold">{task.clientPhone}</p>
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            ))}
        </div>
    );
}
