
"use client";

import { Control } from "react-hook-form";
import { CreatePropertyFormValues } from "@/types";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface RoomsAndSpaceSectionProps {
    control: Control<CreatePropertyFormValues>;
    category: CreatePropertyFormValues['category'];
}

export function RoomsAndSpaceSection({ control, category }: RoomsAndSpaceSectionProps) {
    if (category === 'Land') {
        return null; // Don't show this section for Land
    }
    
    return (
        <section className="space-y-6">
            <div className="space-y-1">
                <h2 className="text-2xl font-semibold leading-none tracking-tight">Rooms & Space</h2>
                <p className="text-sm text-muted-foreground">Specify the room and parking details.</p>
            </div>
            <div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <FormField control={control} name="bedrooms" render={({ field }) => (<FormItem><FormLabel>Bedrooms</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={control} name="bathrooms" render={({ field }) => (<FormItem><FormLabel>Bathrooms</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={control} name="kitchens" render={({ field }) => (<FormItem><FormLabel>Kitchens</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={control} name="diningRooms" render={({ field }) => (<FormItem><FormLabel>Dining Rooms</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={control} name="livingRooms" render={({ field }) => (<FormItem><FormLabel>Living Rooms</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={control} name="carParkingSpots" render={({ field }) => (<FormItem><FormLabel>Car Parking</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={control} name="bikeParkingSpots" render={({ field }) => (<FormItem><FormLabel>Bike Parking</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
            </div>
        </section>
    );
}
