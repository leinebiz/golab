'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { InviteUserSchema, type InviteUserInput } from '@golab/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { UserPlus, UserX } from 'lucide-react';

interface UsersContentProps {
  organizationId: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  phone: string | null;
  preferredChannel: string;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  CUSTOMER_ADMIN: 'Admin',
  CUSTOMER_USER: 'User',
};

const ROLE_VARIANT: Record<string, 'default' | 'secondary'> = {
  CUSTOMER_ADMIN: 'default',
  CUSTOMER_USER: 'secondary',
};

export function UsersContent({ organizationId }: UsersContentProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<InviteUserInput>({
    resolver: zodResolver(InviteUserSchema),
    defaultValues: {
      email: '',
      name: '',
      role: 'CUSTOMER_USER',
    },
  });

  const watchedRole = watch('role');

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/users?organizationId=${organizationId}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch {
      // Fetch error
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const onSubmit = async (data: InviteUserInput) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, organizationId }),
      });

      if (res.status === 409) {
        setError('A user with this email already exists.');
        return;
      }
      if (!res.ok) throw new Error('Failed to invite user');

      const user = (await res.json()) as User;
      setUsers((prev) => [user, ...prev]);
      setDialogOpen(false);
      reset();
    } catch {
      setError('Failed to send invitation. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const deactivateUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/v1/users/${userId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to deactivate');
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isActive: false } : u)));
    } catch {
      // Error handling
    }
  };

  const reactivateUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/v1/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true }),
      });
      if (!res.ok) throw new Error('Failed to reactivate');
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isActive: true } : u)));
    } catch {
      // Error handling
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Team Members</h1>
        <p className="text-gray-500 mt-1">
          Manage who has access to your organization and their roles.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Users</CardTitle>
            <CardDescription>Invite team members and manage their access levels.</CardDescription>
          </div>
          <Button
            onClick={() => {
              reset();
              setError(null);
              setDialogOpen(true);
            }}
            size="sm"
          >
            <UserPlus className="h-4 w-4 mr-1" />
            Invite Member
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-gray-500 py-4 text-center">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">
              No team members yet. Invite your first team member.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={ROLE_VARIANT[user.role] ?? 'secondary'}>
                        {ROLE_LABELS[user.role] ?? user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? 'success' : 'destructive'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {user.isActive ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deactivateUser(user.id)}
                          title="Deactivate user"
                        >
                          <UserX className="h-4 w-4 text-red-500" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => reactivateUser(user.id)}>
                          Reactivate
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join your organization. They will receive an email with
              instructions to set up their account.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-name">Full Name</Label>
              <Input id="invite-name" placeholder="Jane Smith" {...register('name')} />
              {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="jane@company.com"
                {...register('email')}
              />
              {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={watchedRole}
                onValueChange={(v) => setValue('role', v as InviteUserInput['role'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CUSTOMER_ADMIN">Admin (full access)</SelectItem>
                  <SelectItem value="CUSTOMER_USER">User (limited access)</SelectItem>
                </SelectContent>
              </Select>
              {errors.role && <p className="text-sm text-red-600">{errors.role.message}</p>}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Sending...' : 'Send Invitation'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
