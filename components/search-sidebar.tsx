

"use client";

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Label } from '@neup/components/ui/label';
import { Input } from '@neup/components/ui/input';
import { Button } from '@neup/components/ui/button';
import { useEffect, useState } from 'react';
import type { PropertyFilters } from '@/types';
import { Badge } from '@neup/components/ui/badge';
import { PriceInput } from '@/components/ui/price-input';
import { StepperControls } from '@neup/components/ui/stepperControls';

type StepperMode = 'any' | 'exact' | 'more' | 'less';
type StepperState = {
    count: number;
    mode: StepperMode;
};

// Sub-components for better organization
const FilterSection = ({ title, children, className }: { title: string, children: React.ReactNode, className?: string }) => (
    <div className={`space-y-3 border-t pt-4 first:border-t-0 first:pt-0 ${className}`}>
        <Label className="font-semibold text-base">{title}</Label>
        {children}
    </div>
);

const ToggleButtonGroup = ({ options, value, onChange, multiSelect = true }: { options: string[], value: string[], onChange: (value: string[]) => void, multiSelect?: boolean }) => {
    const handleToggle = (option: string) => {
        if (multiSelect) {
            const newValue = value.includes(option)
                ? value.filter(item => item !== option)
                : [...value, option];
            onChange(newValue);
        } else {
            onChange([option]);
        }
    };

    return (
        <div className="grid grid-cols-3 gap-2">
            {options.map(option => (
                <Button
                    key={option}
                    htmlType="button"
                    variant={value.includes(option) ? 'solid' : 'plain'}
                    onClick={() => handleToggle(option)}
                    className={`h-9 w-full border px-2 text-[13px] capitalize ${value.includes(option) ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90' : 'border-border bg-background text-foreground hover:bg-muted'}`}
                >
                    {option}
                </Button>
            ))}
        </div>
    );
};

const Stepper = ({ label, state, onChange }: { label: string, state: StepperState, onChange: (value: StepperState) => void }) => {
    
    const handleDecrement = () => {
        if (state.count > 1) {
            onChange({ ...state, count: state.count - 1 });
        } else {
            onChange({ count: 0, mode: 'any' });
        }
    };
    
    const handleIncrement = () => {
        if (state.mode === 'any') {
             onChange({ count: 1, mode: 'exact' });
        } else if (state.count < 10) {
            onChange({ ...state, count: state.count + 1 });
        }
    };
    
    const handleLabelClick = () => {
        if (state.mode === 'any') return;
        const modes: StepperMode[] = ['exact', 'more', 'less'];
        const currentIndex = modes.indexOf(state.mode);
        const nextIndex = (currentIndex + 1) % modes.length;
        onChange({ ...state, mode: modes[nextIndex] });
    }

    const getLabelText = () => {
        if (state.mode === 'any') return `Any ${label}`;
        const pluralLabel = state.count === 1 ? label.slice(0, -1) : label;
        switch (state.mode) {
            case 'exact': return `${state.count} ${pluralLabel}`;
            case 'more': return `${state.count}+ ${pluralLabel}`;
            case 'less': return `${state.count}- ${pluralLabel}`;
            default: return `Any ${label}`;
        }
    }

    return (
        <StepperControls
            label={label}
            value={getLabelText()}
            onDecrease={handleDecrement}
            onIncrease={handleIncrement}
            onValueClick={state.mode === 'any' ? undefined : handleLabelClick}
        />
    );
};

export function SearchSidebar({ initialFilters }: { initialFilters?: PropertyFilters }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [listingBy, setListingBy] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [purpose, setPurpose] = useState<string[]>([]);
  const [category, setCategory] = useState<string[]>([]);
  const [usageType, setUsageType] = useState<string[]>([]);
  const [location, setLocation] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const [bedrooms, setBedrooms] = useState<StepperState>({ count: 0, mode: 'any' });
  const [bathrooms, setBathrooms] = useState<StepperState>({ count: 0, mode: 'any' });
  const [kitchens, setKitchens] = useState<StepperState>({ count: 0, mode: 'any' });
  const [diningRooms, setDiningRooms] = useState<StepperState>({ count: 0, mode: 'any' });
  const [livingRooms, setLivingRooms] = useState<StepperState>({ count: 0, mode: 'any' });
  const [bikeParking, setBikeParking] = useState<StepperState>({ count: 0, mode: 'any' });
  const [carParking, setCarParking] = useState<StepperState>({ count: 0, mode: 'any' });

  useEffect(() => {
    const readArrayParam = (name: string) => searchParams.getAll(name).flatMap((value) => value.split(',')).filter(Boolean);
    const readNumberParam = (name: string) => {
      const value = searchParams.get(name);
      return value && Number.isFinite(Number(value)) ? Number(value) : 0;
    };
    const filters = initialFilters ?? {};
    setListingBy(filters.listingBy || readArrayParam('listingBy'));
    setMinPrice(filters.minPrice?.toString() || searchParams.get('minPrice') || '');
    setMaxPrice(filters.maxPrice?.toString() || searchParams.get('maxPrice') || '');
    setPurpose(filters.purpose || readArrayParam('purpose'));
    setCategory(filters.category || readArrayParam('category'));
    setUsageType(filters.type || readArrayParam('type'));
    setLocation(filters.location || searchParams.get('location') || '');
    setTags(filters.tags || readArrayParam('tags'));
        
    setBedrooms({ count: filters.bedrooms ?? readNumberParam('bedrooms'), mode: filters.bedrooms || searchParams.has('bedrooms') ? 'exact' : 'any' });
    setBathrooms({ count: filters.bathrooms ?? readNumberParam('bathrooms'), mode: filters.bathrooms || searchParams.has('bathrooms') ? 'exact' : 'any' });
    setKitchens({ count: filters.kitchens ?? readNumberParam('kitchens'), mode: filters.kitchens || searchParams.has('kitchens') ? 'exact' : 'any' });
    setDiningRooms({ count: filters.diningRooms ?? readNumberParam('diningRooms'), mode: filters.diningRooms || searchParams.has('diningRooms') ? 'exact' : 'any' });
    setLivingRooms({ count: filters.livingRooms ?? readNumberParam('livingRooms'), mode: filters.livingRooms || searchParams.has('livingRooms') ? 'exact' : 'any' });
    setBikeParking({ count: filters.bikeParkingSpots ?? readNumberParam('bikeParkingSpots'), mode: filters.bikeParkingSpots || searchParams.has('bikeParkingSpots') ? 'exact' : 'any' });
    setCarParking({ count: filters.carParkingSpots ?? readNumberParam('carParkingSpots'), mode: filters.carParkingSpots || searchParams.has('carParkingSpots') ? 'exact' : 'any' });
  }, [initialFilters, searchParams]);


  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams.toString());

    // Helper to set or delete params
    const setOrDelete = (key: string, value: string | number | string[]) => {
        const stringValue = Array.isArray(value) ? value.join(',') : value.toString();
        if (stringValue && stringValue !== '0' && stringValue.length > 0) {
            newParams.set(key, stringValue);
        } else {
            newParams.delete(key);
        }
    };
    
    // Helper to handle stepper state
    const setStepperParams = (baseKey: string, state: StepperState) => {
        newParams.delete(baseKey);
        newParams.delete(`min${baseKey.charAt(0).toUpperCase() + baseKey.slice(1)}`);
        newParams.delete(`max${baseKey.charAt(0).toUpperCase() + baseKey.slice(1)}`);

        if (state.mode !== 'any') {
             switch (state.mode) {
                case 'exact':
                    newParams.set(baseKey, state.count.toString());
                    break;
                case 'more':
                    newParams.set(`min${baseKey.charAt(0).toUpperCase() + baseKey.slice(1)}`, state.count.toString());
                    break;
                case 'less':
                    newParams.set(`max${baseKey.charAt(0).toUpperCase() + baseKey.slice(1)}`, state.count.toString());
                    break;
            }
        }
    }
    
    setOrDelete('listingBy', listingBy);
    setOrDelete('minPrice', minPrice);
    setOrDelete('maxPrice', maxPrice);
    setOrDelete('purpose', purpose);
    setOrDelete('category', category);
    setOrDelete('type', usageType);
    setOrDelete('location', location);
    
    setStepperParams('bedrooms', bedrooms);
    setStepperParams('bathrooms', bathrooms);
    setStepperParams('kitchens', kitchens);
    setStepperParams('diningRooms', diningRooms);
    setStepperParams('livingRooms', livingRooms);
    setStepperParams('bikeParkingSpots', bikeParking);
    setStepperParams('carParkingSpots', carParking);
    
    const querySegment = pathname.split('?')[0];
    const queryText = querySegment.startsWith('/search/') ? decodeURIComponent(querySegment.slice('/search/'.length)) : '';
    newParams.set('page', '1'); // Reset to page 1 on new filter application
    router.push(`${queryText ? `/search/${encodeURIComponent(queryText)}` : '/search'}?${newParams.toString()}`);
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-4">
          <FilterSection title="Property By">
            <ToggleButtonGroup options={['owners', 'developers', 'agencies']} value={listingBy} onChange={setListingBy} />
          </FilterSection>

          <FilterSection title="Price Range">
            <div className="flex flex-col gap-2">
              <PriceInput value={minPrice} onChange={setMinPrice} placeholder="Min Price" name="minPrice" />
              <PriceInput value={maxPrice} onChange={setMaxPrice} placeholder="Max Price" name="maxPrice" />
            </div>
          </FilterSection>
          
          <FilterSection title="Listing Purpose">
            <ToggleButtonGroup options={['Sale', 'Rent', 'Lease']} value={purpose} onChange={setPurpose} />
          </FilterSection>

          <FilterSection title="Category">
            <ToggleButtonGroup options={['House', 'Apartment', 'Land', 'Flat']} value={category} onChange={setCategory} />
          </FilterSection>

           <FilterSection title="Usage Type">
            <ToggleButtonGroup options={['Residential', 'Commercial', 'Industrial', 'Agricultural']} value={usageType} onChange={setUsageType} />
          </FilterSection>

          <div className="space-y-3 border-t pt-4">
            <Label className="font-semibold text-base">Rooms & Parking</Label>
            <Stepper label="Bedrooms" state={bedrooms} onChange={setBedrooms} />
            <Stepper label="Bathrooms" state={bathrooms} onChange={setBathrooms} />
            <Stepper label="Kitchens" state={kitchens} onChange={setKitchens} />
            <Stepper label="Dining Rooms" state={diningRooms} onChange={setDiningRooms} />
            <Stepper label="Living Rooms" state={livingRooms} onChange={setLivingRooms} />
            <Stepper label="Bike Parkings" state={bikeParking} onChange={setBikeParking} />
            <Stepper label="Car Parkings" state={carParking} onChange={setCarParking} />
          </div>

          <FilterSection title="Location">
             <Input name="location" placeholder="e.g., New York, NY" value={location} onChange={(e) => setLocation(e.target.value)} />
          </FilterSection>
          
          <FilterSection title="AI Tags">
            {tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                    {tags.map(tag => (
                        <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-muted-foreground">No specific tags identified in your search.</p>
            )}
          </FilterSection>

        <Button htmlType="submit" className="w-full">Apply Filters</Button>
      </form>
    </div>
  );
}


