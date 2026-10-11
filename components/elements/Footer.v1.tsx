"use client";

import { Facebook, Twitter, Instagram } from "lucide-react";
import { Link } from "@neup/components/ui/link";

export function FooterV1({ showManagePanelLink }: { showManagePanelLink: boolean }) {
  return (
    <footer className="mt-auto bg-secondary text-secondary-foreground">
      <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-1">
            <div className="mb-4 flex items-center gap-2">
              <img src="https://cdn.neupgroup.com/neupestate/logo.png" alt="Neup.Estate Logo" className="h-7 w-7 object-contain" />
              <h3 className="font-headline text-lg font-bold">Neup.Estate</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Your modern solution to finding the perfect property. We simplify the search, so you can find home faster.
            </p>
            {showManagePanelLink && (
              <Link
                href="/manage"
                className="mt-4 inline-flex text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                Manage Panel
              </Link>
            )}
          </div>

          <div>
            <h4 className="mb-4 font-semibold">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/search" className="text-muted-foreground transition-colors hover:text-primary">Listings</Link></li>
              <li><Link href="/collections" className="text-muted-foreground transition-colors hover:text-primary">For You</Link></li>
              <li><Link href="/agencies" className="text-muted-foreground transition-colors hover:text-primary">Agencies</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-semibold">Contact Us</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Email: contact.estate@neupgroup.com</li>
              <li>Phone: (977) 984-0710507</li>
              <li>Address: Maitidevi, Kathmandu</li>
              <li><Link href="https://neupgroup.com/sites/contact" className="text-muted-foreground transition-colors hover:text-primary">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-semibold">Follow Us</h4>
            <div className="flex space-x-4">
              <Link href="https://facebook.com/neupestate" target="_blank" rel="noopener noreferrer" aria-label="Facebook" title="Facebook" className="text-muted-foreground transition-colors hover:text-primary"><Facebook className="h-5 w-5" /></Link>
              <Link href="https://twitter.com/neupestate" target="_blank" rel="noopener noreferrer" aria-label="Twitter" title="Twitter" className="text-muted-foreground transition-colors hover:text-primary"><Twitter className="h-5 w-5" /></Link>
              <Link href="https://instagram.com/neupestate" target="_blank" rel="noopener noreferrer" aria-label="Instagram" title="Instagram" className="text-muted-foreground transition-colors hover:text-primary"><Instagram className="h-5 w-5" /></Link>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Neup.Estate, a company of Neup Group Private Limited. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
