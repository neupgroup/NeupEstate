import { getCompetitorsAction } from './actions';
import type { Competitor } from './types';
import { CompetitionIndexClient } from './index-client';

export default async function IntelligenceCompetitionPage() {
  const competitors = await getCompetitorsAction();
  return <CompetitionIndexClient initialCompetitors={competitors} />;
}
