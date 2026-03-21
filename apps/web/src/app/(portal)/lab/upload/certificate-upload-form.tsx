'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SubRequestOption {
  id: string;
  subReference: string;
  status: string;
}

export function CertificateUploadForm({ subRequests }: { subRequests: SubRequestOption[] }) {
  const [subRequestId, setSubRequestId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function validateFile(f: File): string | null {
    if (f.type !== 'application/pdf') {
      return 'Only PDF files are accepted.';
    }
    const maxSize = 20 * 1024 * 1024;
    if (f.size > maxSize) {
      return 'File size exceeds 20MB limit.';
    }
    return null;
  }

  function handleFileSelect(f: File) {
    const validationError = validateFile(f);
    if (validationError) {
      setError(validationError);
      setFile(null);
      return;
    }
    setError('');
    setFile(f);
  }

  function handleDrag(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files?.[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.[0]) {
      handleFileSelect(e.target.files[0]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!subRequestId) {
      setError('Please select a sub-request.');
      return;
    }
    if (!file) {
      setError('Please select a PDF file.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/v1/sub-requests/${subRequestId}/upload-certificate`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to upload certificate');
        return;
      }

      setSubRequestId('');
      setFile(null);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subRequest">Sub-Request Reference</Label>
            <Select value={subRequestId} onValueChange={setSubRequestId}>
              <SelectTrigger id="subRequest">
                <SelectValue placeholder="Select sub-request..." />
              </SelectTrigger>
              <SelectContent>
                {subRequests.map((sr) => (
                  <SelectItem key={sr.id} value={sr.id}>
                    {sr.subReference}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Certificate (PDF)</Label>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf"
                onChange={handleInputChange}
                className="hidden"
              />
              {file ? (
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Drop PDF here or click to browse
                  </p>
                  <p className="text-xs text-gray-400 mt-1">PDF only, max 20MB</p>
                </div>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" disabled={loading || !file || !subRequestId}>
            {loading ? 'Uploading...' : 'Upload Certificate'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
