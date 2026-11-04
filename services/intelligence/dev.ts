
import { config } from 'dotenv';
config();

import '@/services/intelligence/ai-powered-recommendations.ts';
import '@/services/intelligence/natural-language-listing-search.ts';
import '@/services/intelligence/extract-listing-details-flow.ts';
import '@/services/intelligence/parse-admin-filter-flow.ts';
import '@/services/intelligence/listing-approval-flow.ts';
import '@/services/intelligence/rewrite-listing-details-flow.ts';
import '@/services/intelligence/listing-amendment-flow.ts';
import '@/services/intelligence/extract-location-flow.ts';
import '@/services/intelligence/listing-assurance-flow.ts';
import '@/services/intelligence/update-listing-images-flow.ts';
import '@/services/intelligence/suggest-questions-flow.ts';
