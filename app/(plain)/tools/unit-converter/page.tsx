'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Ruler, Calculator } from 'lucide-react';

type UnitCategory = 'area' | 'length' | 'price-per-area' | 'volume';

interface Unit {
  value: string;
  label: string;
  factor: number;
}

interface Category {
  id: UnitCategory;
  label: string;
  units: Unit[];
}

const categories: Category[] = [
  {
    id: 'area',
    label: 'Area',
    units: [
      { value: 'sqft', label: 'Square Feet (sq ft)', factor: 1 },
      { value: 'sqm', label: 'Square Meters (sq m)', factor: 10.7639 },
      { value: 'sqyd', label: 'Square Yards (sq yd)', factor: 9 },
      { value: 'acre', label: 'Acre', factor: 43560 },
      { value: 'hectare', label: 'Hectare', factor: 107639 },
      { value: 'biswa', label: 'Biswa', factor: 1350 },
      { value: 'bigha', label: 'Bigha', factor: 27000 },
      { value: 'kattha', label: 'Kattha', factor: 3375 },
      { value: 'ropani', label: 'Ropani', factor: 5476 },
      { value: 'aana', label: 'Aana', factor: 342.25 },
    ],
  },
  {
    id: 'length',
    label: 'Length',
    units: [
      { value: 'ft', label: 'Feet (ft)', factor: 1 },
      { value: 'm', label: 'Meters (m)', factor: 3.28084 },
      { value: 'yd', label: 'Yards (yd)', factor: 3 },
      { value: 'mi', label: 'Miles (mi)', factor: 5280 },
      { value: 'km', label: 'Kilometers (km)', factor: 3280.84 },
      { value: 'in', label: 'Inches (in)', factor: 0.0833333 },
      { value: 'cm', label: 'Centimeters (cm)', factor: 0.0328084 },
      { value: 'mm', label: 'Millimeters (mm)', factor: 0.00328084 },
    ],
  },
  {
    id: 'price-per-area',
    label: 'Price per Unit Area',
    units: [
      { value: 'per-sqft', label: 'per sq ft', factor: 1 },
      { value: 'per-sqm', label: 'per sq m', factor: 10.7639 },
      { value: 'per-sqyd', label: 'per sq yd', factor: 9 },
      { value: 'per-acre', label: 'per Acre', factor: 43560 },
      { value: 'per-hectare', label: 'per Hectare', factor: 107639 },
      { value: 'per-bigha', label: 'per Bigha', factor: 27000 },
    ],
  },
  {
    id: 'volume',
    label: 'Volume',
    units: [
      { value: 'cubic-ft', label: 'Cubic Feet (cu ft)', factor: 1 },
      { value: 'cubic-m', label: 'Cubic Meters (cu m)', factor: 35.3147 },
      { value: 'liter', label: 'Liters (L)', factor: 0.0353147 },
      { value: 'gallon', label: 'Gallons (US)', factor: 0.133681 },
      { value: 'cubic-yd', label: 'Cubic Yards (cu yd)', factor: 27 },
    ],
  },
];

const formatNumber = (value: number): string => {
  if (isNaN(value) || value === 0) return '';
  if (Math.abs(value) >= 1e9) return value.toExponential(4);
  if (Number.isInteger(value)) return value.toLocaleString('en-US');
  return value.toLocaleString('en-US', { maximumFractionDigits: 6 });
};

export default function UnitConverterPage() {
  const [categoryId, setCategoryId] = useState<UnitCategory>('area');
  const [fromUnit, setFromUnit] = useState<string>('sqft');
  const [toUnit, setToUnit] = useState<string>('sqm');
  const [fromValue, setFromValue] = useState<string>('');
  const [toValue, setToValue] = useState<string>('');

  const category = categories.find((c) => c.id === categoryId)!;

  const fromUnitData = useMemo(
    () => category.units.find((u) => u.value === fromUnit)!,
    [category, fromUnit],
  );

  const toUnitData = useMemo(
    () => category.units.find((u) => u.value === toUnit)!,
    [category, toUnit],
  );

  const convert = (value: number, from: Unit, to: Unit): number => {
    if (from.value === to.value) return value;
    const baseValue = value * from.factor;
    return baseValue / to.factor;
  };

  const handleFromChange = (value: string) => {
    setFromValue(value);
    if (value === '') {
      setToValue('');
      return;
    }
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      const result = convert(numValue, fromUnitData, toUnitData);
      setToValue(formatNumber(result));
    }
  };

  const handleToChange = (value: string) => {
    setToValue(value);
    if (value === '') {
      setFromValue('');
      return;
    }
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      const result = convert(numValue, toUnitData, fromUnitData);
      setFromValue(formatNumber(result));
    }
  };

  const handleCategoryChange = (value: string) => {
    const newCategory = categories.find((c) => c.id === value);
    if (!newCategory) return;

    setCategoryId(newCategory.id);
    setFromUnit(newCategory.units[0]?.value || '');
    setToUnit(newCategory.units[1]?.value || newCategory.units[0]?.value || '');
    setFromValue('');
    setToValue('');
  };

  return (
    <main className="flex-1">
      <div className="bg-secondary">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-headline font-bold flex items-center gap-3">
            <Ruler className="h-8 w-8 text-primary" />
            Unit Converter
          </h1>
          <p className="mt-2 text-muted-foreground">
            Convert between common units of measurement used in real estate and construction.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-3xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                Convert Units
              </CardTitle>
              <CardDescription>
                Select a category, enter a value, and get instant conversions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={categoryId} onValueChange={handleCategoryChange}>
                  <SelectTrigger id="category" className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="from-unit">From</Label>
                  <Select value={fromUnit} onValueChange={setFromUnit}>
                    <SelectTrigger id="from-unit" className="w-full">
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {category.units.map((unit) => (
                        <SelectItem key={unit.value} value={unit.value}>
                          {unit.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    id="from-value"
                    type="text"
                    inputMode="decimal"
                    placeholder="Enter value"
                    value={fromValue}
                    onChange={(e) => handleFromChange(e.target.value)}
                    className="text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="to-unit">To</Label>
                  <Select value={toUnit} onValueChange={setToUnit}>
                    <SelectTrigger id="to-unit" className="w-full">
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {category.units.map((unit) => (
                        <SelectItem key={unit.value} value={unit.value}>
                          {unit.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    id="to-value"
                    type="text"
                    inputMode="decimal"
                    placeholder="Converted value"
                    value={toValue}
                    onChange={(e) => handleToChange(e.target.value)}
                    className="text-lg text-primary font-semibold"
                    readOnly
                  />
                </div>
              </div>

              {fromValue && toValue && (
                <div className="rounded-lg border bg-muted/50 p-4">
                  <p className="text-sm text-muted-foreground text-center">
                    {fromValue} {fromUnitData.label.toLowerCase()} ={' '}
                    <span className="font-semibold text-foreground">{toValue}</span>{' '}
                    {toUnitData.label.toLowerCase()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Common Conversions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center justify-between rounded-md border p-3">
                  <span className="text-muted-foreground">1 sq ft</span>
                  <span className="font-medium">0.0929 sq m</span>
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <span className="text-muted-foreground">1 sq m</span>
                  <span className="font-medium">10.764 sq ft</span>
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <span className="text-muted-foreground">1 Acre</span>
                  <span className="font-medium">43,560 sq ft</span>
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <span className="text-muted-foreground">1 Hectare</span>
                  <span className="font-medium">107,639 sq ft</span>
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <span className="text-muted-foreground">1 Bigha</span>
                  <span className="font-medium">27,000 sq ft</span>
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <span className="text-muted-foreground">1 sq yd</span>
                  <span className="font-medium">9 sq ft</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
