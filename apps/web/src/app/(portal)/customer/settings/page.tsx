'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CompanyDetailsForm } from './_components/company-details-form';
import { AddressesSection } from './_components/addresses-section';
import { TeamMembersSection } from './_components/team-members-section';
import { CommunicationPreferences } from './_components/communication-preferences';
import { PasswordChange } from './_components/password-change';

// Demo IDs - in production these come from the session
const DEMO_ORG_ID = 'demo-org-id';
const DEMO_USER_ID = 'demo-user-id';

export default function CustomerSettingsPage() {
  const [activeTab, setActiveTab] = useState('company');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-500 mt-1">
          Manage your company profile, addresses, team, and preferences.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="company">Company Details</TabsTrigger>
          <TabsTrigger value="addresses">Addresses</TabsTrigger>
          <TabsTrigger value="team">Team Members</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <CompanyDetailsForm organizationId={DEMO_ORG_ID} />
        </TabsContent>

        <TabsContent value="addresses">
          <AddressesSection organizationId={DEMO_ORG_ID} />
        </TabsContent>

        <TabsContent value="team">
          <TeamMembersSection organizationId={DEMO_ORG_ID} />
        </TabsContent>

        <TabsContent value="preferences">
          <CommunicationPreferences organizationId={DEMO_ORG_ID} />
        </TabsContent>

        <TabsContent value="security">
          <PasswordChange userId={DEMO_USER_ID} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
