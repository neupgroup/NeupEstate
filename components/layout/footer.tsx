
"use client";

import { Facebook, Twitter, Instagram } from 'lucide-react';
import { ClientLink } from '@/components/client-link';

const Footer = ({ showManagePanelLink }: { showManagePanelLink: boolean }) => {

  return (
    <footer className="bg-secondary/70 text-secondary-foreground mt-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About Section */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img src="/estate/logo.png" alt="Neup.Estate Logo" className="h-7 w-7 object-contain" />
              <h3 className="text-lg font-headline font-bold">Neup.Estate</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Your modern solution to finding the perfect property. We simplify the search, so you can find home faster.
            </p>
          </div>

          {/* Quick Links Section */}
          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><ClientLink href="/search" className="text-muted-foreground hover:text-primary transition-colors">Listings</ClientLink></li>
              <li><ClientLink href="/collections" className="text-muted-foreground hover:text-primary transition-colors">For You</ClientLink></li>
              <li><ClientLink href="/agencies" className="text-muted-foreground hover:text-primary transition-colors">Agencies</ClientLink></li>
              <li><ClientLink href="/faq" className="text-muted-foreground hover:text-primary transition-colors">FAQs</ClientLink></li>
              {showManagePanelLink && <li><ClientLink href="/manage" className="text-muted-foreground hover:text-primary transition-colors">Manage Panel</ClientLink></li>}
            </ul>
          </div>
          
          {/* Contact Section */}
           <div>
            <h4 className="font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Email: contact.estate@neupgroup.com</li>
              <li>Phone: (977) 984-0710507</li>
              <li>Address: Maitidevi, Kathmandu</li>
              <li><ClientLink href="/contact" className="text-muted-foreground hover:text-primary transition-colors">Contact Form</ClientLink></li>
            </ul>
          </div>

          {/* Social Media Section */}
          <div>
            <h4 className="font-semibold mb-4">Follow Us</h4>
            <div className="flex space-x-4">
              <a href="https://facebook.com/neupestate" target="_blank" rel="noopener noreferrer" aria-label="Facebook" title="Facebook" className="text-muted-foreground hover:text-primary transition-colors"><Facebook className="h-5 w-5" /></a>
              <a href="https://twitter.com/neupestate" target="_blank" rel="noopener noreferrer" aria-label="Twitter" title="Twitter" className="text-muted-foreground hover:text-primary transition-colors"><Twitter className="h-5 w-5" /></a>
              <a href="https://instagram.com/neupestate" target="_blank" rel="noopener noreferrer" aria-label="Instagram" title="Instagram" className="text-muted-foreground hover:text-primary transition-colors"><Instagram className="h-5 w-5" /></a>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Neup.Estate, a company of Neup Group Private Limited. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
