

"use client";

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Search, Bookmark, AlertCircle, ExternalLink, User } from 'lucide-react';
import { Property, User as UserType } from '@/types';
import { getSavedPropertiesForUser, getUsersBySavedProperty } from '@/services/engagement';
import { ClientLink } from '@/components/client-link';
import { RelativeTime } from './relative-time';
import { type SavedPropertyEntry } from '@/services/property-service';
import { Label } from '@/components/ui/label';

const SearchResultDisplay = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <Card className="mt-6">
        <CardHeader>
            <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
            {children}
        </CardContent>
    </Card>
);

export function SavedPropertiesDashboard({ initialSavedProperties }: { initialSavedProperties: SavedPropertyEntry[] }) {
    const [isSearchingUser, startUserSearchTransition] = useTransition();
    const [isSearchingProperty, startPropertySearchTransition] = useTransition();

    const [userPropertiesResult, setUserPropertiesResult] = useState<Property[] | null>(null);
    const [propertyUsersResult, setPropertyUsersResult] = useState<UserType[] | null>(null);

    const userForm = useForm<{ userId: string }>({ defaultValues: { userId: '' } });
    const propertyForm = useForm<{ propertyId: string }>({ defaultValues: { propertyId: '' } });

    const handleUserSearch = (data: { userId: string }) => {
        setUserPropertiesResult(null);
        startUserSearchTransition(async () => {
            const properties = await getSavedPropertiesForUser(data.userId);
            setUserPropertiesResult(properties);
        });
    };

    const handlePropertySearch = (data: { propertyId: string }) => {
        setPropertyUsersResult(null);
        startPropertySearchTransition(async () => {
            const users = await getUsersBySavedProperty(data.propertyId);
            setPropertyUsersResult(users);
        });
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Bookmark /> Saved Properties Management</CardTitle>
                    <CardDescription>
                        View recent activity and query saved property data across users.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <form onSubmit={userForm.handleSubmit(handleUserSearch)} className="space-y-2">
                        <Label htmlFor="userId">Find properties saved by user</Label>
                        <div className="flex gap-2">
                            <Input id="userId" placeholder="Enter User ID" {...userForm.register("userId")} />
                            <Button type="submit" disabled={isSearchingUser}>
                                {isSearchingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                            </Button>
                        </div>
                    </form>
                     <form onSubmit={propertyForm.handleSubmit(handlePropertySearch)} className="space-y-2">
                        <Label htmlFor="propertyId">Find users who saved property</Label>
                        <div className="flex gap-2">
                            <Input id="propertyId" placeholder="Enter Property ID" {...propertyForm.register("propertyId")} />
                            <Button type="submit" disabled={isSearchingProperty}>
                                 {isSearchingProperty ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {userPropertiesResult && (
                <SearchResultDisplay title={`Properties Saved by User ${userForm.getValues("userId")}`}>
                    {userPropertiesResult.length > 0 ? (
                        <Table>
                            <TableHeader><TableRow><TableHead>Property</TableHead><TableHead>Location</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {userPropertiesResult.map(prop => (
                                    <TableRow key={prop.id}>
                                        <TableCell><ClientLink href={`/manage/properties/${prop.id}/edit`} className="hover:underline">{prop.title}</ClientLink></TableCell>
                                        <TableCell>{prop.location}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <Alert><AlertCircle className="h-4 w-4" /><AlertTitle>No Results</AlertTitle><AlertDescription>This user has not saved any properties.</AlertDescription></Alert>
                    )}
                </SearchResultDisplay>
            )}

            {propertyUsersResult && (
                 <SearchResultDisplay title={`Users Who Saved Property ${propertyForm.getValues("propertyId")}`}>
                    {propertyUsersResult.length > 0 ? (
                         <Table>
                            <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Email</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {propertyUsersResult.map(user => (
                                    <TableRow key={user.id}>
                                        <TableCell>{user.name} ({user.id})</TableCell>
                                        <TableCell>{Array.isArray(user.email) ? user.email[0]?.value : user.email}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <Alert><AlertCircle className="h-4 w-4" /><AlertTitle>No Results</AlertTitle><AlertDescription>No users have saved this property.</AlertDescription></Alert>
                    )}
                </SearchResultDisplay>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Latest Saved Properties</CardTitle>
                    <CardDescription>
                        Showing the 20 most recently saved properties across all users.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {initialSavedProperties.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Property</TableHead>
                                    <TableHead>Saved By User</TableHead>
                                    <TableHead>Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {initialSavedProperties.map((item) => (
                                    <TableRow key={`${item.userId}-${item.propertyId}`}>
                                        <TableCell>
                                            <ClientLink href={`/manage/properties/${item.propertyId}/edit`} className="font-medium hover:underline flex items-center gap-1">
                                                {item.propertyTitle} <ExternalLink className="h-3 w-3" />
                                            </ClientLink>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-muted-foreground" />
                                                <span>{item.userName} ({item.userId})</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <RelativeTime timestamp={item.savedAt} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>No Activity</AlertTitle>
                            <AlertDescription>
                                No properties have been saved by any users yet.
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}


