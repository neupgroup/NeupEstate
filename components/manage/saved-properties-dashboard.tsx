

"use client";

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@neup/components/ui/card';
import { Input } from '@neup/components/ui/input';
import { Button } from '@neup/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@neup/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from '@neup/components/ui/alert';
import { Loader2, Search, Bookmark, AlertCircle, ExternalLink, User, Clock3, History, ArrowUpRight } from 'lucide-react';
import { Property, User as UserType } from '@/types';
import { getSavedPropertiesForUser, getUsersBySavedProperty } from '@/services/properties/single/engage/view';
import { Link } from '@neup/components/ui/link';
import { RelativeTime } from './relative-time';
import { type SavedPropertyEntry } from '@/services/properties';
import { Label } from '@neup/components/ui/label';

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

    const searchForm = useForm<{ query: string }>({ defaultValues: { query: '' } });
    const [searchMode, setSearchMode] = useState<'by' | 'for' | null>(null);
    const [searchValue, setSearchValue] = useState('');
    const [searchError, setSearchError] = useState('');

    const handleSavedActivitySearch = ({ query }: { query: string }) => {
        const match = query.trim().match(/^(by|for):\s*(\S+)$/i);
        setUserPropertiesResult(null);
        setPropertyUsersResult(null);
        setSearchError('');

        if (!match) {
            setSearchMode(null);
            setSearchValue('');
            setSearchError('Use by:<userId> to find their saved properties, or for:<propertyId> to find everyone who saved a property.');
            return;
        }

        const [, mode, value] = match;
        setSearchMode(mode.toLowerCase() as 'by' | 'for');
        setSearchValue(value);
        if (mode.toLowerCase() === 'by') {
            startUserSearchTransition(async () => setUserPropertiesResult(await getSavedPropertiesForUser(value)));
        } else {
            startPropertySearchTransition(async () => setPropertyUsersResult(await getUsersBySavedProperty(value)));
        }
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <header className="flex flex-col items-start gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                    <Bookmark aria-hidden="true" className="h-6 w-6" />
                </span>
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Saved Properties Management</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        View recent activity and query saved property data across users.
                    </p>
                </div>
            </header>
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Search aria-hidden="true" className="h-5 w-5" /></span>
                        <div><CardTitle>Search saved activity</CardTitle><CardDescription className="mt-1">Search in this format: by:<span className="font-medium">userId</span> or for:<span className="font-medium">propertyId</span>.</CardDescription></div>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={searchForm.handleSubmit(handleSavedActivitySearch)} className="flex gap-2">
                        <Input id="savedActivityQuery" aria-label="Search saved activity" placeholder="by:userId or for:propertyId" {...searchForm.register('query')} />
                        <Button htmlType="submit" disabled={isSearchingUser || isSearchingProperty} aria-label="Search">
                            {isSearchingUser || isSearchingProperty ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        </Button>
                    </form>
                    {searchError && <p role="alert" className="mt-2 text-sm text-destructive">{searchError}</p>}
                </CardContent>
            </Card>

            {userPropertiesResult && (
                <SearchResultDisplay title={`Properties saved by ${searchMode === 'by' ? searchValue : 'user'}`}>
                    {userPropertiesResult.length > 0 ? (
                        <Table>
                            <TableHeader><TableRow><TableHead>Property</TableHead><TableHead>Location</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {userPropertiesResult.map(prop => (
                                    <TableRow key={prop.id}>
                                        <TableCell><Link href={`/manage/properties/${prop.id}/edit`} className="hover:underline">{prop.title}</Link></TableCell>
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
                 <SearchResultDisplay title={`Saves for property ${searchValue}`}>
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
                    <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><History aria-hidden="true" className="h-5 w-5" /></span>
                        <div>
                            <CardTitle>Latest saved properties</CardTitle>
                            <CardDescription className="mt-1">Showing the 20 most recently saved properties across all users.</CardDescription>
                        </div>
                        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />{initialSavedProperties.length}</span>
                    </div>
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
                                            <Link href={`/manage/properties/${item.propertyId}/edit`} className="group/link flex items-center gap-1 font-medium hover:text-primary hover:underline">
                                                {item.propertyTitle} <ArrowUpRight className="h-3 w-3 opacity-60 group-hover/link:opacity-100" />
                                            </Link>
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
