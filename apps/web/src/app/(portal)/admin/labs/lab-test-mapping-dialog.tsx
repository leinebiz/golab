'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface LabInfo {
  id: string;
  code: string;
  name: string;
}

interface TestCatalogueItem {
  id: string;
  code: string;
  name: string;
  category: string;
  basePrice: string;
  standardTatDays: number;
  accreditation: string;
}

interface LabTestMapping {
  testCatalogueId: string;
  testCatalogue: TestCatalogueItem;
  accreditation: 'ACCREDITED' | 'NON_ACCREDITED';
  labTatDays: number;
  labPrice: string | null;
  isActive: boolean;
}

interface MappingEdit {
  testCatalogueId: string;
  enabled: boolean;
  accreditation: 'ACCREDITED' | 'NON_ACCREDITED';
  labTatDays: number;
  labPrice: string;
  isActive: boolean;
}

interface LabTestMappingDialogProps {
  lab: LabInfo;
  onClose: () => void;
}

export function LabTestMappingDialog({ lab, onClose }: LabTestMappingDialogProps) {
  const [allTests, setAllTests] = useState<TestCatalogueItem[]>([]);
  const [edits, setEdits] = useState<Map<string, MappingEdit>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [testsRes, mappingsRes] = await Promise.all([
      fetch('/api/v1/tests?pageSize=100'),
      fetch(`/api/v1/laboratories/${lab.id}/tests`),
    ]);

    const testsJson = await testsRes.json();
    const mappingsJson = await mappingsRes.json();

    const tests: TestCatalogueItem[] = testsJson.data ?? [];
    const mappings: LabTestMapping[] = mappingsJson.data ?? [];

    setAllTests(tests);

    // Build edits map from existing mappings
    const editMap = new Map<string, MappingEdit>();
    for (const test of tests) {
      const existing = mappings.find((m: LabTestMapping) => m.testCatalogueId === test.id);
      editMap.set(test.id, {
        testCatalogueId: test.id,
        enabled: !!existing,
        accreditation:
          existing?.accreditation ?? (test.accreditation as 'ACCREDITED' | 'NON_ACCREDITED'),
        labTatDays: existing?.labTatDays ?? test.standardTatDays,
        labPrice: existing?.labPrice ? String(existing.labPrice) : '',
        isActive: existing?.isActive ?? true,
      });
    }
    setEdits(editMap);
    setLoading(false);
  }, [lab.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function updateEdit(testId: string, updates: Partial<MappingEdit>) {
    setEdits((prev) => {
      const next = new Map(prev);
      const current = next.get(testId);
      if (current) {
        next.set(testId, { ...current, ...updates });
      }
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    const mappings = Array.from(edits.values())
      .filter((e) => e.enabled)
      .map((e) => ({
        testCatalogueId: e.testCatalogueId,
        accreditation: e.accreditation,
        labTatDays: e.labTatDays,
        labPrice: e.labPrice || undefined,
        isActive: e.isActive,
      }));

    const res = await fetch(`/api/v1/laboratories/${lab.id}/tests`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mappings }),
    });

    const json = await res.json();

    if (!res.ok) {
      setError(json.error ?? 'An error occurred');
      setSaving(false);
      return;
    }

    setSaving(false);
    onClose();
  }

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Test Capabilities: {lab.name} ({lab.code})
          </DialogTitle>
          <DialogDescription>
            Enable tests this laboratory can perform and set lab-specific TAT and pricing overrides.
          </DialogDescription>
        </DialogHeader>

        {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</p>}

        {loading ? (
          <p className="text-center py-8 text-gray-500">Loading tests...</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">On</TableHead>
                  <TableHead>Test</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Catalogue Price</TableHead>
                  <TableHead>Accreditation</TableHead>
                  <TableHead>Lab TAT (days)</TableHead>
                  <TableHead>Lab Price Override</TableHead>
                  <TableHead>Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allTests.map((test) => {
                  const edit = edits.get(test.id);
                  if (!edit) return null;
                  return (
                    <TableRow key={test.id} className={!edit.enabled ? 'opacity-50' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={edit.enabled}
                          onCheckedChange={(checked) => updateEdit(test.id, { enabled: !!checked })}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">{test.code}</span>
                          <br />
                          <span className="text-sm text-gray-500">{test.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{test.category}</Badge>
                      </TableCell>
                      <TableCell>R {Number(test.basePrice).toFixed(2)}</TableCell>
                      <TableCell>
                        <Select
                          value={edit.accreditation}
                          onValueChange={(v) =>
                            updateEdit(test.id, {
                              accreditation: v as 'ACCREDITED' | 'NON_ACCREDITED',
                            })
                          }
                          disabled={!edit.enabled}
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ACCREDITED">Accredited</SelectItem>
                            <SelectItem value="NON_ACCREDITED">Non-accredited</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          max={365}
                          value={edit.labTatDays}
                          onChange={(e) =>
                            updateEdit(test.id, {
                              labTatDays: parseInt(e.target.value, 10) || 1,
                            })
                          }
                          disabled={!edit.enabled}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="Catalogue"
                          value={edit.labPrice}
                          onChange={(e) => updateEdit(test.id, { labPrice: e.target.value })}
                          disabled={!edit.enabled}
                          className="w-28"
                        />
                      </TableCell>
                      <TableCell>
                        <Checkbox
                          checked={edit.isActive}
                          onCheckedChange={(checked) =>
                            updateEdit(test.id, { isActive: !!checked })
                          }
                          disabled={!edit.enabled}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            {Array.from(edits.values()).filter((e) => e.enabled).length} / {allTests.length} tests
            enabled
          </div>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? 'Saving...' : 'Save Mappings'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
