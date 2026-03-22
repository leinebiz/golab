'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CompanyDetailsForm } from './company-details-form';
import { AddressesSection } from './addresses-section';
import { TeamMembersSection } from './team-members-section';
import { CommunicationPreferences } from './communication-preferences';
import { PasswordChange } from './password-change';

interface SettingsContentProps {
  organizationId: string;
  userId: string;
}

export function SettingsContent({ organizationId, userId }: SettingsContentProps) {
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
          <CompanyDetailsForm organizationId={organizationId} />
        </TabsContent>

        <TabsContent value="addresses">
          <AddressesSection organizationId={organizationId} />
        </TabsContent>

        <TabsContent value="team">
          <TeamMembersSection organizationId={organizationId} />
        </TabsContent>

        <TabsContent value="preferences">
          <CommunicationPreferences organizationId={organizationId} />
        </TabsContent>

        <TabsContent value="security">
          <PasswordChange userId={userId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
