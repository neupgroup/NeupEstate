

import { Search } from 'lucide-react';
import { Link } from '@neup/components/ui/link';
import { Input } from '@neup/components/ui/input';

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold leading-none tracking-tight">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Manage your application settings, integrations, and configurations.
        </p>
        <div className="relative pt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input placeholder="Search for settings or support..." className="pl-10" />
        </div>
      </div>
      
      {/* General Section */}
      <div className="py-6">
        <h3 className="text-xl font-semibold">General</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          Manage general site configuration and system information.
        </p>
        <div className="border rounded-lg overflow-hidden">
            <div className="block px-4 py-3 font-medium opacity-50 cursor-not-allowed">
                Pages Management
            </div>
            <Link href="/manage/team" className="block px-4 py-3 border-t hover:bg-muted/50 transition-colors font-medium">
                Team & Agency
            </Link>
            <Link href="/manage/settings/site/devlogs" className="block px-4 py-3 border-t hover:bg-muted/50 transition-colors font-medium">
                Site Dev Logs
            </Link>
        </div>
      </div>

      {/* Permission Management Section */}
      <div className="py-6">
        <h3 className="text-xl font-semibold">Permission Management</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          Manage user roles and access levels.
        </p>
        <div className="border rounded-lg overflow-hidden">
          <Link href="/manage/accounts" className="block px-4 py-3 hover:bg-muted/50 transition-colors font-medium">
              Users & Permissions
          </Link>
        </div>
      </div>

      {/* Payments Section */}
      <div className="py-6">
        <h3 className="text-xl font-semibold">Payments</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          Configure payment gateways and view account charges.
        </p>
        <div className="border rounded-lg overflow-hidden">
          <div className="block px-4 py-3 font-medium opacity-50 cursor-not-allowed">
              Payment Gateway Setup (Coming Soon)
          </div>
          <div className="block px-4 py-3 border-t font-medium opacity-50 cursor-not-allowed">
              Total Account Charges (Coming Soon)
          </div>
        </div>
      </div>

      {/* Integrations Section */}
      <div className="py-6">
        <h3 className="text-xl font-semibold">Integrations</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          Connect third-party services to your application.
        </p>
        <div className="border rounded-lg overflow-hidden">
            <div className="block px-4 py-3 font-medium opacity-50 cursor-not-allowed">
                Messaging (SMS) Integration (Coming Soon)
            </div>
            <div className="block px-4 py-3 border-t font-medium opacity-50 cursor-not-allowed">
                Facebook Page Integration (Coming Soon)
            </div>
            <div className="block px-4 py-3 border-t font-medium opacity-50 cursor-not-allowed">
                Instagram Account Integration (Coming Soon)
            </div>
            <div className="block px-4 py-3 border-t font-medium opacity-50 cursor-not-allowed">
                TikTok Account Integration (Coming Soon)
            </div>
        </div>
      </div>
      
        {/* Automation & AI Section */}
      <div className="py-6">
        <h3 className="text-xl font-semibold">Automation & AI</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          Manage AI agents and automation workflows.
        </p>
        <div className="border rounded-lg overflow-hidden">
            <Link href="/manage/approver" className="block px-4 py-3 hover:bg-muted/50 transition-colors font-medium">
                Intelligence Agents
            </Link>
              <Link href="/manage/automation" className="block px-4 py-3 border-t hover:bg-muted/50 transition-colors font-medium">
                Sitemap Automation
            </Link>
            <Link href="/manage/import" className="block px-4 py-3 border-t hover:bg-muted/50 transition-colors font-medium">
                Manual Property Import
            </Link>
             <Link href="/manage/settings/ai-configuration" className="block px-4 py-3 border-t hover:bg-muted/50 transition-colors font-medium">
                AI Prompt Management
            </Link>
             <Link href="/manage/settings/ai-models" className="block px-4 py-3 border-t hover:bg-muted/50 transition-colors font-medium">
                AI Models
            </Link>
        </div>
      </div>

        {/* Bugs and Support Section */}
      <div className="py-6">
        <h3 className="text-xl font-semibold">Bugs and Support</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          View system error logs or get help.
        </p>
        <div className="border rounded-lg overflow-hidden">
            <Link href="/manage/site/errors" className="block px-4 py-3 hover:bg-muted/50 transition-colors font-medium">
                Error Log
            </Link>
            <Link href="/manage/site/devlogs" className="block px-4 py-3 border-t hover:bg-muted/50 transition-colors font-medium">
                Request Dev Logs
            </Link>
            <div className="block px-4 py-3 border-t font-medium opacity-50 cursor-not-allowed">
                Request a Feature
            </div>
              <div className="block px-4 py-3 border-t font-medium opacity-50 cursor-not-allowed">
                Report a Bug
            </div>
        </div>
      </div>

    </div>
  );
}
