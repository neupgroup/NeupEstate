
import { getFaqs } from '@/services/faq-service';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { HelpCircle } from 'lucide-react';
import type { FAQ } from '@/types';

export default async function FaqPage() {
    const faqs = await getFaqs();

    const groupedFaqs = faqs.reduce((acc, faq) => {
        const category = faq.category || 'General';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(faq);
        return acc;
    }, {} as Record<string, FAQ[]>);

    const categories = Object.keys(groupedFaqs).sort();

    return (
        <main className="flex-1">
            <div className="bg-secondary">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <h1 className="text-4xl font-headline font-bold flex items-center gap-3">
                    <HelpCircle className="h-8 w-8 text-primary" />
                    Frequently Asked Questions
                </h1>
                <p className="mt-2 text-muted-foreground">
                    Find answers to common questions about our platform and services.
                </p>
                </div>
            </div>
            
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {categories.length > 0 ? (
                     <div className="max-w-4xl mx-auto space-y-8">
                        {categories.map(category => (
                            <section key={category}>
                                <h2 className="text-2xl font-headline font-bold text-gray-800 mb-4">{category}</h2>
                                <Accordion type="single" collapsible className="w-full">
                                    {groupedFaqs[category].map(faq => (
                                        <AccordionItem value={faq.id} key={faq.id}>
                                            <AccordionTrigger>{faq.question}</AccordionTrigger>
                                            <AccordionContent>
                                                {faq.answer}
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            </section>
                        ))}
                    </div>
                ) : (
                    <div className="max-w-4xl mx-auto">
                        <Alert>
                            <HelpCircle className="h-4 w-4" />
                            <AlertTitle>No FAQs Available</AlertTitle>
                            <AlertDescription>
                                We're currently compiling our list of frequently asked questions. Please check back later.
                            </AlertDescription>
                        </Alert>
                    </div>
                )}
            </div>
        </main>
    )
}
