import { getCompetitorsAction } from './actions';
import { CompetitionClient } from './client';

export default async function IntelligenceCompetitionPage() {
  const competitors = await getCompetitorsAction();
  return <CompetitionClient initialCompetitors={competitors} />;
}
