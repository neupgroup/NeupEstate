import { Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@neup/components/ui/card';
import { Button } from '@neup/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { prisma } from '@neup/core/database/prisma';
import { requireAuth } from '@/services/auth/account';
import { saveDisplayPreferences } from './actions';

type DisplayPreferences = { areaUnit: string; currency: string; numberSystem: string };

/** Read saved display settings for an account. */
async function getDisplayPreferences(accountId: string): Promise<DisplayPreferences> {
  const record = await prisma.account.findUnique({ where: { id: accountId }, select: { moreDetails: true } });
  const moreDetails = record?.moreDetails && typeof record.moreDetails === 'object'
    ? record.moreDetails as { preferences?: { display?: Partial<DisplayPreferences> } }
    : {};
  const preferences = moreDetails.preferences ?? {};
  return {
    areaUnit: preferences.display?.areaUnit ?? 'aana',
    currency: preferences.display?.currency ?? 'NPR',
    numberSystem: preferences.display?.numberSystem ?? 'Nepali',
  };
}

/** Show account wide defaults for numbers, prices, and property areas. */
export default async function PreferencesPage() {
  const account = await requireAuth();
  const preferences = await getDisplayPreferences(account.aid);

  return (
    <main className="container mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <p className="text-sm font-medium text-primary">Your account</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Preferences</h1>
        <p className="mt-2 text-muted-foreground">Choose how numbers, prices, and property measurements appear throughout the app.</p>
      </div>

      <form action={saveDisplayPreferences} className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Number system</CardTitle>
            <CardDescription>Choose how large numbers are grouped and displayed.</CardDescription>
          </CardHeader>
          <CardContent>
            <Select name="numberSystem" defaultValue={preferences.numberSystem}>
              <SelectTrigger aria-label="Number system"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Indian">Indian grouping (1,00,00,000)</SelectItem>
                <SelectItem value="Nepali">Nepali grouping (1,00,00,000)</SelectItem>
                <SelectItem value="Indian.readable">Indian readable (15 Lakhs 20 Thousands)</SelectItem>
                <SelectItem value="Nepali.readable">Nepali readable (15 Lakh 20 Hajar)</SelectItem>
                <SelectItem value="Indian.readable2">Indian readable 2 (10 Lakhs 20 Hajar)</SelectItem>
                <SelectItem value="Nepali.readable2">Nepali readable 2 (10 Lakh 20 Hajar)</SelectItem>
                <SelectItem value="Indian.readable.devanagari">Indian readable, Devanagari digits (१५ लाख)</SelectItem>
                <SelectItem value="Nepali.readable.devanagari">Nepali readable, Devanagari digits (१५ लाख)</SelectItem>
                <SelectItem value="Chinese">Chinese grouping (1,2345,6789)</SelectItem>
                <SelectItem value="Japanese">Japanese grouping (1,2345,6789)</SelectItem>
                <SelectItem value="Korean">Korean grouping (1,2345,6789)</SelectItem>
                <SelectItem value="France">French grouping (12 345 678)</SelectItem>
                <SelectItem value="Germany">German grouping (12.345.678)</SelectItem>
                <SelectItem value="Switzerland">Swiss grouping (12'345'678)</SelectItem>
                <SelectItem value="International">International grouping (123,456,789)</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-2 text-xs text-muted-foreground">This format is used for counts, measurements, and other numeric values.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pricing system</CardTitle>
            <CardDescription>Select the currency you prefer for property prices.</CardDescription>
          </CardHeader>
          <CardContent>
            <Select name="currency" defaultValue={preferences.currency}>
              <SelectTrigger aria-label="Currency"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NPR">NPR — Nepalese rupee</SelectItem>
                <SelectItem value="INR">INR — Indian rupee</SelectItem>
                <SelectItem value="USD">USD — US dollar</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-2 text-xs text-muted-foreground">This sets the default currency shown for pricing.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Property units</CardTitle>
            <CardDescription>Choose the default area unit for property measurements.</CardDescription>
          </CardHeader>
          <CardContent>
            <Select name="areaUnit" defaultValue={preferences.areaUnit}>
              <SelectTrigger aria-label="Property area unit"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="aana">Aana</SelectItem>
                <SelectItem value="ropani">Ropani</SelectItem>
                <SelectItem value="paisa">Paisa</SelectItem>
                <SelectItem value="daam">Daam</SelectItem>
                <SelectItem value="bigha">Bigha</SelectItem>
                <SelectItem value="kattha">Kattha</SelectItem>
                <SelectItem value="dhur">Dhur</SelectItem>
                <SelectItem value="sqft">Square feet</SelectItem>
                <SelectItem value="sqm">Square meters</SelectItem>
              </SelectContent>
            </Select>
            <p className="mt-2 text-xs text-muted-foreground">Property areas and per unit pricing will use this unit by default.</p>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit"><Check className="mr-2 h-4 w-4" />Save preferences</Button>
        </div>
      </form>
    </main>
  );
}
