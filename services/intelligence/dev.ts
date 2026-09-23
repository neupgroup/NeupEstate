
import { config } from 'dotenv';
config();

import '@/services/intelligence/ai-powered-recommendations.ts';
import '@/services/intelligence/natural-language-property-search.ts';
import '@/services/intelligence/extract-property-details-flow.ts';
import '@/services/intelligence/parse-admin-filter-flow.ts';
import '@/services/intelligence/property-approval-flow.ts';
import '@/services/intelligence/rewrite-property-details-flow.ts';
import '@/services/intelligence/property-amendment-flow.ts';
import '@/services/intelligence/extract-location-flow.ts';
import '@/services/intelligence/property-assurance-flow.ts';
import '@/services/intelligence/update-property-images-flow.ts';
import '@/services/intelligence/suggest-questions-flow.ts';
