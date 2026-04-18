
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const modelTasks = [
  {
    id: 'default',
    name: 'Default Task Model',
    description: 'The primary model used for most AI tasks like data extraction, verification, and content generation.',
    currentModel: 'gemini-2.5-flash',
  },
  {
    id: 'search',
    name: 'Natural Language Search',
    description: 'A model fine-tuned for parsing user search queries into structured data.',
    currentModel: 'gemini-2.5-flash',
  },
  {
    id: 'embedding',
    name: 'Text Embedding',
    description: 'Generates vector embeddings for semantic search and recommendations.',
    currentModel: 'gemini-embedding-001',
  }
];

const availableModels = [
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.5-flash-lite',
    'gemini-embedding-001',
];

export default function ModelSelectionPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-semibold leading-none tracking-tight">
                    AI Model Selection
                </h2>
                <p className="text-sm text-muted-foreground">
                    Configure which AI models are used for different tasks. Editing is coming soon.
                </p>
            </div>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Task</TableHead>
                        <TableHead>Current Model</TableHead>
                        <TableHead className="text-right">Change Model</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {modelTasks.map((task) => (
                        <TableRow key={task.id}>
                            <TableCell>
                                <p className="font-medium">{task.name}</p>
                                <p className="text-sm text-muted-foreground">{task.description}</p>
                            </TableCell>
                            <TableCell>
                                <span className="font-mono text-xs">{task.currentModel}</span>
                            </TableCell>
                            <TableCell className="text-right">
                                <Select disabled>
                                    <SelectTrigger className="w-[280px]">
                                        <SelectValue placeholder="Select a model" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableModels.map(model => (
                                            <SelectItem key={model} value={model}>{model}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
