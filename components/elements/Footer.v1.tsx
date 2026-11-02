"use client";

import { Footer } from "@neup/components/elements/footer/footer";
import { Facebook, Twitter, Instagram } from "lucide-react";
import { Link } from "@neup/components/ui/link";

// Render estate branding, navigation, and contact details in the shared footer.
export function FooterV1({ showManagePanelLink }: { showManagePanelLink: boolean }) {
  return (
    <Footer>
      <div className="w-full min-w-0 py-4 text-white/90">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-1">
            <div className="mb-4 flex items-center gap-2">
              <img src="https://cdn.neupgroup.com/neupestate/logo.png" alt="Neup.Estate Logo" className="h-7 w-7 object-contain" />
              <h3 className="font-headline text-lg font-bold text-white/95">Neup.Estate</h3>
            </div>
            <p className="text-sm text-primary-50">
              Your modern solution to finding the perfect property. We simplify the search, so you can find home faster.
            </p>
            {showManagePanelLink && (
              <Link
                href="/manage"
                className="mt-4 inline-flex text-sm font-medium text-white/90 transition-colors hover:text-white"
              >
                Manage Panel
              </Link>
            )}
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-white/95">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/search" className="text-white/90 transition-colors hover:text-white">Listings</Link></li>
              <li><Link href="/collections" className="text-white/90 transition-colors hover:text-white">For You</Link></li>
              <li><Link href="/agencies" className="text-white/90 transition-colors hover:text-white">Agencies</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-white/95">Contact Us</h4>
            <ul className="space-y-2 text-sm text-white/90">
              <li>Email: contact.estate@neupgroup.com</li>
              <li>Phone: (977) 984-0710507</li>
              <li>Address: Maitidevi, Kathmandu</li>
              <li><Link href="https://neupgroup.com/sites/contact" className="transition-colors hover:text-white">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-white/95">Follow Us</h4>
          <div className="flex space-x-4">
              <Link href="https://facebook.com/neupestate" target="_blank" rel="noopener noreferrer" aria-label="Facebook" title="Facebook" className="text-white/90 transition-colors hover:text-white"><Facebook className="h-5 w-5" /></Link>
              <Link href="https://twitter.com/neupestate" target="_blank" rel="noopener noreferrer" aria-label="Twitter" title="Twitter" className="text-white/90 transition-colors hover:text-white"><Twitter className="h-5 w-5" /></Link>
              <Link href="https://instagram.com/neupestate" target="_blank" rel="noopener noreferrer" aria-label="Instagram" title="Instagram" className="text-white/90 transition-colors hover:text-white"><Instagram className="h-5 w-5" /></Link>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-white/20 pt-8 text-center text-sm text-white/90">
          <p>&copy; {new Date().getFullYear()} Neup.Estate, a company of Neup Group Private Limited. All rights reserved.</p>
        </div>
      </div>
    </Footer>
  );
}
