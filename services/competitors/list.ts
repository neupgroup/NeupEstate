'use server';

import { getCompetitors, type Competitor } from './service';

export async function getCompetitorsAction(): Promise<Competitor[]> {
  return getCompetitors();
}
