

import { notFound, redirect } from 'next/navigation';
import { getPropertyById, getProperties, getPropertyBySlug } from '@/services/property-service';
import { buildPublicAppUrl } from '@/services/auth/public-url';
import { logProblem } from '@/services/problem-service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BedDouble, Bath, SquareGanttChart, MapPin, Building, Home, Box, Utensils, Hash, Car, Bike, Milestone, School, Briefcase, LandPlot, Sprout, Tag, Mountain, Wallet, Banknote, Calendar, Check, Plane, Link as LinkIcon, Building2, User as UserIcon, FileText } from 'lucide-react';
import { PropertyImageCarousel, SafeImage, EmiCalculatorChart, PropertyMap, PropertyQA } from '@/components/estate';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PropertyDetailRenderNotice } from '@/components/property-detail-render-notice';
import type { Property } from '@/types';
import { areaValueToSqft } from '@/types';
import type { Metadata, ResolvingMetadata } from 'next';
import { requirePagePermission } from '@/logica/auth/page-guard';
import { PERMISSIONS } from '@/logica/auth/permissions';
import { getHiddenPriceLabel } from '@/logica/core/property-price-display';

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function RichTextHtml({ html }: { html: string }) {
    return <div className="prose max-w-none text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />;
}

type RenderIssue = {
  field: string;
  receivedType: string;
  fallback: 'N/A' | 'hidden';
};

function describeValueType(value: unknown): string {
  if (Array.isArray(value)) {
    return `array(${value.length})`;
  }

  if (value === null) {
    return 'null';
  }

  return typeof value;
}

function collectStringArray(value: unknown, field: string, issues: RenderIssue[]): string[] {
  if (Array.isArray(value)) {
    const items = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
    if (items.length !== value.length) {
      issues.push({
        field,
        receivedType: describeValueType(value),
        fallback: 'hidden',
      });
    }
    return items;
  }

  if (value !== undefined && value !== null) {
    issues.push({
      field,
      receivedType: describeValueType(value),
      fallback: 'hidden',
    });
  }

  return [];
}

function formatPricingOptions(value: unknown, issues: RenderIssue[]): string {
  if (Array.isArray(value)) {
    const options = value.filter((option): option is string => typeof option === 'string' && option.trim().length > 0);
    if (options.length !== value.length) {
      issues.push({
        field: 'pricing.options',
        receivedType: describeValueType(value),
        fallback: 'N/A',
      });
    }
    return options.length > 0 ? options.join(', ') : 'N/A';
  }

  if (value !== undefined && value !== null) {
    issues.push({
      field: 'pricing.options',
      receivedType: describeValueType(value),
      fallback: 'N/A',
    });
  }

  return 'N/A';
}

function formatOptionalText(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim() || 'N/A';
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return value == null ? 'N/A' : String(value);
}

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;
  let property: Property | null = null;
  
  try {
    property = await getPropertyBySlug(slug) || await getPropertyById(slug);
  } catch (error) {
     await logProblem(error, `generateMetadata for PropertyDetailPage (slug: ${slug})`);
  }

  if (!property) {
    return {
      title: 'Property Not Found | Neup.Estate',
      description: 'The property you are looking for does not exist or has been removed.',
    }
  }

  const siteName = 'Neup.Estate';
  const title = `${property.title} | ${siteName}`;
  const description = stripHtml(property.description).substring(0, 160);
  const imageUrl = Array.isArray(property.images) && property.images.length > 0 ? property.images[0] : 'https://placehold.co/1200x630.png';
  const propertyUrl = buildPublicAppUrl(undefined, `/properties/${property.slug || property.id}`);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: propertyUrl,
      siteName,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: property.title,
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  }
}

export async function generateStaticParams() {
  try {
    const properties = await getProperties();
    // Only generate static pages for approved properties that have a slug
    const approvedProperties = properties.filter(p => p.isApproved && p.slug);
    return approvedProperties.map((property) => ({
      slug: property.slug!,
    }));
  } catch (e) {
    await logProblem(e, 'generateStaticParams for PropertyDetailPage');
    return [];
  }
}

const DetailCard = ({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode}) => (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
                {icon}
                {title}
            </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {children}
        </CardContent>
    </Card>
);

const DetailItem = ({ label, value }: { label: string, value: React.ReactNode }) => (
    <div>
        <p className="text-muted-foreground">{label}</p>
        <p className="font-semibold">{value ?? 'N/A'}</p>
    </div>
);

function generateSchema(property: Property) {
    const slugOrId = property.slug || property.id;
    const propertyUrl = buildPublicAppUrl(undefined, `/properties/${slugOrId}`);

    let schemaType = 'Residence';
    switch (property.category) {
        case 'House':
        case 'Flat':
            schemaType = 'SingleFamilyResidence';
            break;
        case 'Apartment':
            schemaType = 'Apartment';
            break;
        case 'Land':
            schemaType = 'Place';
            break;
    }

    const schema = {
        '@context': 'https://schema.org',
        '@type': schemaType,
        name: property.title,
        description: property.description,
        image: property.images,
        url: propertyUrl,
        ...(property.structuredLocation && {
            address: {
                '@type': 'PostalAddress',
                streetAddress: property.structuredLocation.street,
                addressLocality: property.structuredLocation.municipality,
                addressRegion: property.structuredLocation.province,
                postalCode: '', // Not available
                addressCountry: property.structuredLocation.country,
            }
        }),
        ...(property.latitude && property.longitude && {
            geo: {
                '@type': 'GeoCoordinates',
                latitude: property.latitude,
                longitude: property.longitude,
            }
        }),
        ...(property.area && {
            floorSize: {
                '@type': 'QuantitativeValue',
                value: property.area,
                unitCode: property.areaUnit === 'sqft' ? 'FTK' : 'MTK', // FTK for square foot, MTK for square meter
                unitText: property.areaUnit,
            }
        }),
        ...(property.bedrooms && { numberOfRooms: property.bedrooms }),
        ...(Array.isArray(property.amenities) && property.amenities.length > 0 && {
            amenityFeature: property.amenities.map(amenity => ({
                '@type': 'LocationFeatureSpecification',
                name: amenity,
                value: true,
            }))
        }),
        offers: {
            '@type': 'Offer',
            url: propertyUrl,
            price: property.price,
            priceCurrency: property.pricing?.currency || 'USD',
            availability: 'https://schema.org/InStock', // Assuming it's available if listed
            seller: {
                '@type': 'Organization',
                name: property.agency.name,
            },
        },
    };

    return JSON.stringify(schema);
}

export default async function PropertyDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  await requirePagePermission(PERMISSIONS.public.propertyView);
  const { slug } = await params;
  let property;
  
  try {
    // First, try to find the property by its slug.
    property = await getPropertyBySlug(slug);

    // If no property is found by slug, it might be an old URL using just the ID.
    if (!property) {
      property = await getPropertyById(slug);
    }
  } catch (e) {
    await logProblem(e, `Error fetching property on detail page for slug/ID: ${slug}`);
    notFound();
  }
  
  if (!property || !property.isApproved) {
    notFound();
  }

  // Redirect to the canonical URL if a slug exists and the current URL doesn't match.
  // This handles both old ID-based links and outdated slugs.
  if (property.slug && property.slug !== slug) {
    return redirect(`/properties/${property.slug}`);
  }

  const renderIssues: RenderIssue[] = [];
  const safeImages = Array.isArray(property.images) ? property.images : [];
  const safeAmenities = collectStringArray(property.amenities, 'amenities', renderIssues);
  const safePricingOptions = formatPricingOptions(property.pricing?.options, renderIssues);
  const safeDocuments = Array.isArray(property.documents)
    ? property.documents.filter((doc) => Array.isArray(doc?.urls))
    : [];
  if (property.documents !== undefined && !Array.isArray(property.documents)) {
    renderIssues.push({
      field: 'documents',
      receivedType: describeValueType(property.documents),
      fallback: 'hidden',
    });
  }

  const safeOwnerNames = Array.isArray(property.owners)
    ? property.owners.map((owner) => owner.clientName).filter((name): name is string => Boolean(name))
    : [];
  if (property.owners !== undefined && !Array.isArray(property.owners)) {
    renderIssues.push({
      field: 'owners',
      receivedType: describeValueType(property.owners),
      fallback: 'N/A',
    });
  }
  const primaryOwnerName = safeOwnerNames[0] || 'N/A';
  const safePlots = Array.isArray(property.plots) ? property.plots : [];
  if (property.plots !== undefined && !Array.isArray(property.plots)) {
    renderIssues.push({
      field: 'plots',
      receivedType: describeValueType(property.plots),
      fallback: 'hidden',
    });
  }
  const safeApartmentUnits = Array.isArray(property.apartmentUnits) ? property.apartmentUnits : [];
  if (property.apartmentUnits !== undefined && !Array.isArray(property.apartmentUnits)) {
    renderIssues.push({
      field: 'apartmentUnits',
      receivedType: describeValueType(property.apartmentUnits),
      fallback: 'hidden',
    });
  }
  if (property.images !== undefined && !Array.isArray(property.images)) {
    renderIssues.push({
      field: 'images',
      receivedType: describeValueType(property.images),
      fallback: 'hidden',
    });
  }

  if (renderIssues.length > 0) {
    await logProblem(
      new Error('Property detail page rendered with malformed property data.'),
      `PropertyDetailPage render (slug/ID: ${slug})`,
      {
        propertyId: property.id,
        propertySlug: property.slug || null,
        issues: renderIssues,
      },
    );
  }

  const formatPrice = (price: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const schemaJson = generateSchema({ ...property, images: safeImages, amenities: safeAmenities });
  const hiddenPriceLabel = getHiddenPriceLabel(property);

  return (
    <>
      <PropertyDetailRenderNotice show={renderIssues.length > 0} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: schemaJson }}
      />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <PropertyImageCarousel images={safeImages} title={property.title} />

            <div className="mt-8">
              <h1 className="text-4xl font-headline font-bold">{property.title}</h1>
              <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                  <MapPin className="h-5 w-5" />
                  <span>{property.location}</span>
              </div>
            </div>

            <div className="border-t pt-6">
              <h2 className="text-2xl font-headline font-semibold mb-4">About this property</h2>
              <RichTextHtml html={property.description} />
            </div>

            <div className="border-t pt-6">
              <h2 className="text-2xl font-headline font-semibold mb-4">Rooms & Spaces</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2"><BedDouble className="h-4 w-4 text-primary" /> {property.bedrooms} Bedrooms</div>
                  <div className="flex items-center gap-2"><Bath className="h-4 w-4 text-primary" /> {property.bathrooms} Bathrooms</div>
                  {property.kitchens && <div className="flex items-center gap-2"><Utensils className="h-4 w-4 text-primary" /> {property.kitchens} Kitchens</div>}
                  {property.diningRooms && <div className="flex items-center gap-2"><Hash className="h-4 w-4 text-primary" /> {property.diningRooms} Dining Rooms</div>}
                  {property.livingRooms && <div className="flex items-center gap-2"><Home className="h-4 w-4 text-primary" /> {property.livingRooms} Living Rooms</div>}
                  {property.carParkingSpots && <div className="flex items-center gap-2"><Car className="h-4 w-4 text-primary" /> {property.carParkingSpots} Car Parking</div>}
                  {property.bikeParkingSpots && <div className="flex items-center gap-2"><Bike className="h-4 w-4 text-primary" /> {property.bikeParkingSpots} Bike Parking</div>}
              </div>
            </div>

            <div className="border-t pt-6">
              <h2 className="text-2xl font-headline font-semibold mb-4">Amenities</h2>
              {safeAmenities.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {safeAmenities.map((amenity) => {
                    const iconName = amenity.toLowerCase().replace(/\s+/g, '-');
                    const iconUrl = `https://neupgroup.com/estate/assets/ammenity/${iconName}.svg`;

                    return (
                      <div key={amenity} className="flex items-center gap-3 p-3 border rounded-lg bg-secondary/30">
                        <SafeImage
                            src={iconUrl}
                            alt={amenity}
                            width={24}
                            height={24}
                            className="h-6 w-6"
                            fallbackSrc="https://placehold.co/24x24.png"
                        />
                        <span className="text-sm font-medium">{amenity}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">N/A</p>
              )}
            </div>
            
            {property.pricing && (
              <DetailCard title="Pricing Details" icon={<Tag className="h-5 w-5"/>}>
                  <DetailItem label="Listed Price" value={hiddenPriceLabel || (property.pricing.listed ? formatPrice(property.pricing.listed, property.pricing.currency) : 'N/A')} />
                  <DetailItem label="Minimum Price" value={hiddenPriceLabel || (property.pricing.minimum ? formatPrice(property.pricing.minimum, property.pricing.currency) : 'N/A')} />
                  <DetailItem label="Maximum Price" value={hiddenPriceLabel || (property.pricing.maximum ? formatPrice(property.pricing.maximum, property.pricing.currency) : 'N/A')} />
                  <DetailItem label="Negotiable" value={property.pricing.negotiable ? 'Yes' : 'No'} />
                  <DetailItem label="Basis" value={formatOptionalText(property.pricing.basis)} />
                  <DetailItem label="Options" value={safePricingOptions} />
              </DetailCard>
            )}

            {property.structuredLocation && (
              <DetailCard title="Location Details" icon={<MapPin className="h-5 w-5"/>}>
                  <DetailItem label="Country" value={property.structuredLocation.country} />
                  <DetailItem label="Province" value={property.structuredLocation.province} />
                  <DetailItem label="District" value={property.structuredLocation.district} />
                  <DetailItem label="Municipality" value={property.structuredLocation.municipality} />
                  <DetailItem label="Ward" value={property.structuredLocation.ward} />
                  <DetailItem label="Street/Tole" value={property.structuredLocation.street} />
                  <DetailItem label="Landmark" value={property.structuredLocation.landmark} />
                  <DetailItem label="Coordinates" value={property.structuredLocation.coordinates} />
              </DetailCard>
            )}
            
            <DetailCard title="Owner Information" icon={<UserIcon className="h-5 w-5"/>}>
              <DetailItem label="Primary Owner" value={primaryOwnerName} />
              <DetailItem label="All Owners" value={safeOwnerNames.length ? safeOwnerNames.join(', ') : 'N/A'} />
            </DetailCard>

            {safeDocuments.length > 0 && (
              <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><FileText/>Documents</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                      {safeDocuments.map((doc, index) => (
                          <div key={index}>
                              <h4 className="font-semibold">{doc.name}</h4>
                              <ul className="list-disc list-inside mt-1">
                                  {doc.urls.map((url: { value: string }) => (
                                      <li key={url.value}><a href={url.value} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{url.value}</a></li>
                                  ))}
                              </ul>
                          </div>
                      ))}
                  </CardContent>
              </Card>
            )}

            {property.roadAccessDetails && (
              <DetailCard title="Road Access" icon={<Milestone className="h-5 w-5"/>}>
                  <DetailItem label="Type" value={property.roadAccessDetails.type} />
                  <DetailItem label="Width" value={`${property.roadAccessDetails.widthValue} ${property.roadAccessDetails.widthUnit}`} />
                  <DetailItem label="Condition" value={property.roadAccessDetails.condition} />
                  <DetailItem label="Distance to Main Road" value={`${property.roadAccessDetails.distanceToMainRoadValue} ${property.roadAccessDetails.distanceToMainRoadUnit}`} />
                  <DetailItem label="Accessibility" value={property.roadAccessDetails.accessibility} />
              </DetailCard>
            )}

            {property.distancing && (
              <DetailCard title="Nearby Places" icon={<School className="h-5 w-5"/>}>
                  <DetailItem label="Distance Unit" value={property.distancing.unit} />
                  <DetailItem label="Temple" value={property.distancing.temple} />
                  <DetailItem label="Main Road" value={property.distancing.mainRoad} />
                  <DetailItem label="Airport" value={property.distancing.airport} />
                  <DetailItem label="School" value={property.distancing.school} />
              </DetailCard>
            )}

            {property.earnings && (
              <DetailCard title="Earning Potential" icon={<Banknote className="h-5 w-5"/>}>
                  <DetailItem label="Type" value={property.earnings.type} />
                  <DetailItem label="Monthly" value={property.earnings.monthly ? formatPrice(property.earnings.monthly, property.earnings.currency) : 'N/A'} />
                  <DetailItem label="Yearly" value={property.earnings.yearly ? formatPrice(property.earnings.yearly, property.earnings.currency) : 'N/A'} />
              </DetailCard>
            )}


            {property.category === 'Land' && property.landDetails && (
              <div className="mt-6 border-t pt-6">
                  <h2 className="text-2xl font-headline font-semibold mb-4">Land Details</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-2">
                      {property.landDetails.area && <div className="p-3 bg-secondary rounded-md"><p className="text-xs text-muted-foreground">Area</p><p className="font-semibold">{areaValueToSqft(property.landDetails.area).toLocaleString()} {property.landDetails.areaUnit}</p></div>}
                      {property.landDetails.frontage && <div className="p-3 bg-secondary rounded-md"><p className="text-xs text-muted-foreground">Frontage</p><p className="font-semibold">{property.landDetails.frontage} ft</p></div>}
                      {property.landDetails.depth && <div className="p-3 bg-secondary rounded-md"><p className="text-xs text-muted-foreground">Depth</p><p className="font-semibold">{property.landDetails.depth} ft</p></div>}
                      {property.landDetails.facing && <div className="p-3 bg-secondary rounded-md"><p className="text-xs text-muted-foreground">Facing</p><p className="font-semibold">{property.landDetails.facing}</p></div>}
                      {property.landDetails.usage && <div className="p-3 bg-secondary rounded-md"><p className="text-xs text-muted-foreground">Usage</p><p className="font-semibold">{property.landDetails.usage}</p></div>}
                      {property.landDetails.zoning && <div className="p-3 bg-secondary rounded-md"><p className="text-xs text-muted-foreground">Zoning</p><p className="font-semibold">{property.landDetails.zoning}</p></div>}
                      {property.landDetails.topography && <div className="p-3 bg-secondary rounded-md"><p className="text-xs text-muted-foreground">Topography</p><p className="font-semibold">{property.landDetails.topography}</p></div>}
                  </div>
              </div>
            )}

            {property.category === 'Land' && safePlots.length > 0 && (
              <div className="mt-6 border-t pt-6">
                  <h2 className="text-2xl font-headline font-semibold mb-4">Available Plots</h2>
                  <Table>
                      <TableHeader>
                          <TableRow>
                              <TableHead>Plot ID</TableHead>
                              <TableHead>Area</TableHead>
                              <TableHead>Frontage</TableHead>
                              <TableHead>Zoning</TableHead>
                              <TableHead>Topography</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {safePlots.map((plot) => (
                              <TableRow key={plot.id}>
                                  <TableCell className="font-medium">{plot.id}</TableCell>
                                  <TableCell>{areaValueToSqft(plot.area).toLocaleString()} {plot.areaUnit}</TableCell>
                                  <TableCell>{plot.frontage ? `${plot.frontage} ft` : 'N/A'}</TableCell>
                                  <TableCell>{plot.zoning || 'N/A'}</TableCell>
                                  <TableCell>{plot.topography || 'N/A'}</TableCell>
                              </TableRow>
                          ))}
                      </TableBody>
                  </Table>
              </div>
            )}

            {property.category === 'Apartment' && property.apartmentDetails && (
              <div className="mt-6 border-t pt-6">
                  <h2 className="text-2xl font-headline font-semibold mb-4">Apartment Building Details</h2>
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-2">
                      {(property.apartmentDetails as any).buildingArea && <div className="p-3 bg-secondary rounded-md"><p className="text-xs text-muted-foreground">Building Area</p><p className="font-semibold">{(property.apartmentDetails as any).buildingArea} {(property.apartmentDetails as any).areaUnit}</p></div>}
                      {property.apartmentDetails.furnishing && <div className="p-3 bg-secondary rounded-md"><p className="text-xs text-muted-foreground">Furnishing</p><p className="font-semibold">{property.apartmentDetails.furnishing}</p></div>}
                      {(property.apartmentDetails as any).buildStart && <div className="p-3 bg-secondary rounded-md"><p className="text-xs text-muted-foreground">Built</p><p className="font-semibold">{(property.apartmentDetails as any).buildStart} - {(property.apartmentDetails as any).buildCompleted}</p></div>}
                  </div>
              </div>
            )}

            {property.category === 'Apartment' && safeApartmentUnits.length > 0 && (
              <div className="mt-6 border-t pt-6">
                  <h2 className="text-2xl font-headline font-semibold mb-4">Available Units</h2>
                  <div className="space-y-4">
                      {safeApartmentUnits.map((unit) => (
                          <Card key={unit.id}>
                              <CardHeader>
                                  <CardTitle className="flex items-center gap-2"><Home className="h-5 w-5 text-primary" /> {unit.id}</CardTitle>
                              </CardHeader>
                              <CardContent>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                      {unit.area && <div className="flex items-center gap-2"><SquareGanttChart className="h-4 w-4 text-muted-foreground" /> {areaValueToSqft(unit.area).toLocaleString()} {unit.areaUnit}</div>}
                                      {unit.furnishing && <div className="flex items-center gap-2"><Box className="h-4 w-4 text-muted-foreground" /> {unit.furnishing}</div>}
                                      {unit.bedrooms && <div className="flex items-center gap-2"><BedDouble className="h-4 w-4 text-muted-foreground" /> {unit.bedrooms} Beds</div>}
                                      {unit.bathrooms && <div className="flex items-center gap-2"><Bath className="h-4 w-4 text-muted-foreground" /> {unit.bathrooms} Baths</div>}
                                      {unit.kitchens && <div className="flex items-center gap-2"><Utensils className="h-4 w-4 text-muted-foreground" /> {unit.kitchens} Kitchens</div>}
                                      {unit.diningRooms && <div className="flex items-center gap-2"><Hash className="h-4 w-4 text-muted-foreground" /> {unit.diningRooms} Dining</div>}
                                  </div>
                              </CardContent>
                          </Card>
                      ))}
                  </div>
              </div>
            )}


            {(property.latitude && property.longitude) || property.location || property.structuredLocation ? (
              <div className="mt-6 border-t pt-6">
                <h2 className="text-2xl font-headline font-semibold mb-4">Location on Map</h2>
                <PropertyMap
                  center={property.latitude && property.longitude ? { lat: property.latitude, lng: property.longitude } : null}
                  query={[
                    property.structuredLocation?.street,
                    property.structuredLocation?.landmark,
                    property.structuredLocation?.municipality,
                    property.structuredLocation?.district,
                    property.structuredLocation?.province,
                    property.structuredLocation?.country,
                    property.location,
                  ].filter(Boolean).join(", ")}
                />
              </div>
            ) : null}

            {property.purpose === 'Sale' && <EmiCalculatorChart price={property.price} />}
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-white p-6 rounded-lg shadow-lg border">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-3xl font-bold text-primary">
                      {hiddenPriceLabel || formatPrice(property.price)}
                  </p>
                  {!hiddenPriceLabel && property.purpose === 'Rent' && <span className="text-sm font-normal text-muted-foreground">/month</span>}
                </div>
                <Badge variant={property.purpose === 'Sale' ? 'default' : 'secondary'}>For {property.purpose}</Badge>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-center border-y py-4 my-4">
                <div>
                  <BedDouble className="h-6 w-6 mx-auto text-primary" />
                  <p className="font-semibold mt-1">{property.bedrooms}</p>
                  <p className="text-xs text-muted-foreground">Bedrooms</p>
                </div>
                <div>
                  <Bath className="h-6 w-6 mx-auto text-primary" />
                  <p className="font-semibold mt-1">{property.bathrooms}</p>
                  <p className="text-xs text-muted-foreground">Bathrooms</p>
                </div>
                <div>
                  <SquareGanttChart className="h-6 w-6 mx-auto text-primary" />
                  <p className="font-semibold mt-1">{property.area.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">sqft</p>
                </div>
              </div>

              <Button className="w-full text-lg h-12">Contact Agency</Button>
              
              <PropertyQA propertyId={property.id} />

              <div className="mt-6 border-t pt-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Listed by
                  </h3>
                  <div className="flex items-center gap-4 mt-4">
                      <SafeImage src={property.agency.logoUrl} alt={property.agency.name} width={80} height={32} data-ai-hint="company logo" fallbackSrc="https://placehold.co/80x32.png" />
                      <p className="font-medium">{property.agency.name}</p>
                  </div>
              </div>

            </div>
          </div>
        </div>
      </main>
    </>
  );
}
