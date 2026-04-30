
"use client";

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Property, ExtractedPropertyData } from '@/types';
import { fetchAndStoreHistoryAction, applyFetchedDataToPropertyAction, deleteFetchHistoryItemAction, fetchPropertyImagesAction, applyFetchedImagesToPropertyAction, deleteImageFetchHistoryItemAction } from '@/app/actions';
import { SafeImage } from '@/components/safe-image';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, DownloadCloud, AlertCircle, ImageDown } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
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
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';


interface SourceOriginationManagerProps {
    property: Property;
}

export function SourceOriginationManager({ property }: SourceOriginationManagerProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isFetching, startFetchTransition] = useTransition();
    const [isUpdating, startUpdateTransition] = useTransition();
    const [isDeleting, startDeleteTransition] = useTransition();
    const [activeItemId, setActiveItemId] = useState<string | null>(null);
    const [isClient, setIsClient] = useState(false);

    const [isFetchingImages, startImageFetchTransition] = useTransition();
    const [isUpdatingImages, startImageUpdateTransition] = useTransition();
    const [isDeletingImageHistory, startImageDeleteTransition] = useTransition();
    const [activeImageItemId, setActiveImageItemId] = useState<string | null>(null);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const handleFetchAgain = () => {
        startFetchTransition(async () => {
            const result = await fetchAndStoreHistoryAction(property.id);
            if (result.success) {
                toast({
                    title: "Fetch Successful",
                    description: "New data has been fetched and added to the history.",
                });
                router.refresh(); // Refresh the page to show the new history item
            } else {
                toast({
                    variant: 'destructive',
                    title: "Fetch Failed",
                    description: result.error,
                });
            }
        });
    };

    const handleUpdate = (data: ExtractedPropertyData, fetchedAt: string) => {
        setActiveItemId(fetchedAt);
        startUpdateTransition(async () => {
            const result = await applyFetchedDataToPropertyAction(property.id, data);
            if (result.success) {
                toast({
                    title: 'Property Updated',
                    description: 'The property has been updated with the selected historical data.',
                });
                router.refresh();
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Update Failed',
                    description: result.error,
                });
            }
            setActiveItemId(null);
        });
    };

    const handleDelete = (fetchedAt: string) => {
        setActiveItemId(fetchedAt);
        startDeleteTransition(async () => {
            const result = await deleteFetchHistoryItemAction(property.id, fetchedAt);
            if (result.success) {
                toast({
                    title: 'History Item Removed',
                    description: 'The selected fetch history item has been removed.',
                });
                router.refresh();
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Deletion Failed',
                    description: result.error,
                });
            }
            setActiveItemId(null);
        });
    };

    const handleFetchImages = () => {
        startImageFetchTransition(async () => {
            const result = await fetchPropertyImagesAction(property.id);
            if (result.success) {
                toast({
                    title: "Image Fetch Successful",
                    description: "New images have been fetched and added to the history.",
                });
                router.refresh();
            } else {
                toast({
                    variant: 'destructive',
                    title: "Image Fetch Failed",
                    description: result.error,
                });
            }
        });
    };
    
    const handleUpdateImages = (images: string[], fetchedAt: string) => {
        setActiveImageItemId(fetchedAt);
        startImageUpdateTransition(async () => {
            const result = await applyFetchedImagesToPropertyAction(property.id, images);
            if (result.success) {
                toast({ title: 'Property Images Updated' });
                router.refresh();
            } else {
                toast({ variant: 'destructive', title: 'Update Failed', description: result.error });
            }
            setActiveImageItemId(null);
        });
    };

    const handleDeleteImageHistory = (fetchedAt: string) => {
        setActiveImageItemId(fetchedAt);
        startImageDeleteTransition(async () => {
            const result = await deleteImageFetchHistoryItemAction(property.id, fetchedAt);
            if (result.success) {
                toast({ title: 'Image History Item Removed' });
                router.refresh();
            } else {
                toast({ variant: 'destructive', title: 'Deletion Failed', description: result.error });
            }
            setActiveImageItemId(null);
        });
    };


    const isProcessing = isFetching || isUpdating || isDeleting;
    const isImageProcessing = isFetchingImages || isUpdatingImages || isDeletingImageHistory;

    return (
        <Card>
            <CardHeader>
                <CardTitle>
                    Source of Origination
                </CardTitle>
                <CardDescription>
                    This property was imported from an external URL. You can refetch data or update the property from past fetches.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
                    <p className="text-sm font-medium text-muted-foreground">Source URL</p>
                    <a href={property.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all">
                        {property.sourceUrl}
                    </a>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                    <Card
                        onClick={!isProcessing && !isImageProcessing ? handleFetchAgain : undefined}
                        className={cn(
                            "flex-1",
                            (isProcessing || isImageProcessing) ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-muted/50"
                        )}
                    >
                        <CardContent className="p-4">
                            <div className="flex items-center text-sm font-medium">
                                {isFetching ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Fetching Data...</>
                                ) : (
                                    <><DownloadCloud className="mr-2 h-4 w-4" /> Fetch latest data</>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                     <Card
                        onClick={!isProcessing && !isImageProcessing ? handleFetchImages : undefined}
                        className={cn(
                            "flex-1",
                            (isProcessing || isImageProcessing) ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-muted/50"
                        )}
                    >
                        <CardContent className="p-4">
                            <div className="flex items-center text-sm font-medium">
                                {isFetchingImages ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Fetching Images...</>
                                ) : (
                                    <><ImageDown className="mr-2 h-4 w-4" /> Fetch latest images</>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-lg font-semibold">Fetched Data History</h3>
                    <div className="space-y-4">
                        {property.fetchHistory && property.fetchHistory.length > 0 ? (
                            property.fetchHistory.map((item) => (
                                <Card key={item.fetchedAt} className="bg-background/50">
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-y-2">
                                            <p className="text-sm font-medium">
                                                Fetched on: {isClient ? new Date(item.fetchedAt).toLocaleString() : 'Loading date...'}
                                            </p>
                                            <div className="flex items-center gap-x-4 gap-y-2">
                                                 <Button 
                                                    variant="link"
                                                    className="h-auto p-0 text-sm font-medium"
                                                    onClick={() => handleUpdate(item.data, item.fetchedAt)} 
                                                    disabled={isProcessing}
                                                >
                                                    {(isUpdating && activeItemId === item.fetchedAt) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                    Update with this data
                                                </Button>

                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button 
                                                            variant="link"
                                                            className="h-auto p-0 text-sm font-medium text-destructive hover:text-destructive/80"
                                                            disabled={isProcessing}
                                                        >
                                                            {(isDeleting && activeItemId === item.fetchedAt) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                            Remove this data
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This action cannot be undone. This will permanently remove this historical record.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDelete(item.fetchedAt)} className="bg-destructive hover:bg-destructive/90">
                                                                Yes, remove it
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </div>
                                        <details>
                                            <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">View Fetched JSON</summary>
                                            <pre className="mt-2 p-2 rounded-md text-xs whitespace-pre-wrap font-mono">
                                                {JSON.stringify(item.data, null, 2)}
                                            </pre>
                                        </details>
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>No Fetch History</AlertTitle>
                                <AlertDescription>
                                    No historical data has been fetched for this property yet. Click above to fetch the latest data from the source.
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-lg font-semibold">Fetched Image History</h3>
                     <div className="space-y-4">
                        {property.imageFetchHistory && property.imageFetchHistory.length > 0 ? (
                            property.imageFetchHistory.map((item) => (
                                <Card key={item.fetchedAt} className="bg-background/50">
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-y-2">
                                            <p className="text-sm font-medium">
                                                Fetched on: {isClient ? new Date(item.fetchedAt).toLocaleString() : 'Loading date...'}
                                            </p>
                                            <div className="flex items-center gap-x-4 gap-y-2">
                                                <Button 
                                                    variant="link"
                                                    className="h-auto p-0 text-sm font-medium"
                                                    onClick={() => handleUpdateImages(item.images, item.fetchedAt)} 
                                                    disabled={isImageProcessing}
                                                >
                                                    {(isUpdatingImages && activeImageItemId === item.fetchedAt) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                    Apply these images
                                                </Button>

                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button 
                                                            variant="link"
                                                            className="h-auto p-0 text-sm font-medium text-destructive hover:text-destructive/80"
                                                            disabled={isImageProcessing}
                                                        >
                                                            {(isDeletingImageHistory && activeImageItemId === item.fetchedAt) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                            Remove
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This will permanently remove this image history record.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteImageHistory(item.fetchedAt)} className="bg-destructive hover:bg-destructive/90">
                                                                Yes, remove it
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {item.images.map((img, index) => (
                                                <SafeImage key={index} src={img} alt={`Fetched image ${index + 1}`} width={80} height={80} className="rounded-md object-cover border" data-ai-hint="house interior" fallbackSrc="https://placehold.co/80x80.png" />
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                             <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>No Image Fetch History</AlertTitle>
                                <AlertDescription>
                                    No historical images have been fetched. Click the button above to fetch them.
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                </div>

            </CardContent>
        </Card>
    );
}
