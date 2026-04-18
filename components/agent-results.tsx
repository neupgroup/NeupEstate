
"use client";

import type { Agent } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function getInitials(name: string) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

export function AgentResults({ agents }: { agents: Agent[] }) {
    if (!agents || agents.length === 0) {
        return null;
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-headline font-bold">Agents in this Area</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {agents.map((agent) => (
                    <Card key={agent.id}>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <Avatar>
                                        <AvatarImage src={agent.photoUrl} alt={agent.name} />
                                        <AvatarFallback>{getInitials(agent.name)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <CardTitle className="text-lg">{agent.name}</CardTitle>
                                        <p className="text-sm text-muted-foreground">{agent.location}</p>
                                    </div>
                                </div>
                                <Badge variant={agent.registered ? "default" : "secondary"}>
                                    {agent.registered ? "Registered" : "Unregistered"}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                           <div className="space-y-2 text-sm">
                                {agent.contact.email && (
                                    <div className="flex items-center gap-2">
                                        <Mail className="h-4 w-4 text-muted-foreground"/>
                                        <a href={`mailto:${agent.contact.email}`} className="hover:underline">{agent.contact.email}</a>
                                    </div>
                                )}
                                {agent.contact.phone && (
                                    <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-muted-foreground"/>
                                        <span>{agent.contact.phone}</span>
                                    </div>
                                )}
                           </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
