

import { getModels } from '@/services/model-service';
import { AIModelsClient } from '@/components/manage/ai-models-client';

export const dynamic = 'force-dynamic';

export default async function AIModelsPage() {
    const models = await getModels();
    
    return <AIModelsClient initialModels={models} />;
}
