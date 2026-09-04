'use client';

import React, { useState, useRef, useCallback } from 'react';
import {
  Upload,
  FileText,
  ArrowLeft,
  ArrowRight,
  Check,
  AlertCircle,
  Info,
  Calendar,
  Clock,
  Gauge,
  X,
  Loader2,
} from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

type Step = 1 | 2 | 3;

const steps = [
  { id: 1, label: 'Message' },
  { id: 2, label: 'Lead list' },
  { id: 3, label: 'Delivery' },
];

interface ParsedFile {
  file: File;
  uniqueEmails: string[];
  invalidCount: number;
  totalCount: number;
}

function parseCsvRow(row: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"') {
      if (inQuotes && row[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseEmailsFromCsv(text: string): { valid: string[]; invalid: number } {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const seen = new Set<string>();
  let invalid = 0;

  const lines = text.split(/\r?\n/).filter((l) => l.trim());

  if (lines.length === 0) return { valid: [], invalid: 0 };

  const firstRow = parseCsvRow(lines[0]);
  const hasHeader = firstRow.some((cell) =>
    ['email', 'e-mail', 'recipient', 'to', 'address'].includes(cell.toLowerCase())
  );

  const dataLines = hasHeader ? lines.slice(1) : lines;

  for (const line of dataLines) {
    const cells = parseCsvRow(line);
    for (const cell of cells) {
      const trimmed = cell.trim().toLowerCase();
      if (trimmed && emailRegex.test(trimmed)) {
        seen.add(trimmed);
      } else if (trimmed) {
        invalid++;
      }
    }
  }

  return { valid: Array.from(seen), invalid };
}

function parseEmailsFromText(text: string): { valid: string[]; invalid: number } {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const seen = new Set<string>();
  let invalid = 0;

  const lines = text.split(/[\r\n,;]+/).filter((l) => l.trim());

  for (const line of lines) {
    const trimmed = line.trim().toLowerCase();
    if (trimmed && emailRegex.test(trimmed)) {
      seen.add(trimmed);
    } else if (trimmed) {
      invalid++;
    }
  }

  return { valid: Array.from(seen), invalid };
}

export default function ComposeModal({ isOpen, onClose, onCreated }: ComposeModalProps) {
  const [step, setStep] = useState<Step>(1);
  const [senderEmail, setSenderEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null);
  const [startAt, setStartAt] = useState('');
  const [delaySeconds, setDelaySeconds] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(200);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsingFile, setParsingFile] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canNext = () => {
    if (step === 1) return senderEmail.trim() && subject.trim() && body.trim();
    if (step === 2) return parsedFile !== null && parsedFile.uniqueEmails.length > 0;
    return true;
  };

  const processFile = useCallback(async (file: File) => {
    setParsingFile(true);
    setParseError(null);
    try {
      const text = await file.text();
      const isCsv = file.name.endsWith('.csv') || file.type === 'text/csv';
      const { valid, invalid } = isCsv
        ? parseEmailsFromCsv(text)
        : parseEmailsFromText(text);

      if (valid.length === 0) {
        setParseError('No valid email addresses found in the file. Please check the format and try again.');
        setParsedFile(null);
      } else {
        setParsedFile({
          file,
          uniqueEmails: valid,
          invalidCount: invalid,
          totalCount: valid.length + invalid,
        });
      }
    } catch {
      setParseError('Failed to read the file. Please try again.');
      setParsedFile(null);
    } finally {
      setParsingFile(false);
    }
  }, []);

  const handleFile = useCallback((file: File) => {
    processFile(file);
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const removeFile = useCallback(() => {
    setParsedFile(null);
    setParseError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleSubmit = async () => {
    if (!parsedFile) return;
    setSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', parsedFile.file);
      const meta = {
        senderEmail: senderEmail.trim(),
        subject: subject.trim(),
        body: body.trim(),
        startAt: startAt ? new Date(startAt).toISOString() : new Date().toISOString(),
        delaySeconds: Number(delaySeconds),
        hourlyLimit: Number(hourlyLimit),
        totalRecipients: parsedFile.uniqueEmails.length,
      };
      formData.append('data', JSON.stringify(meta));

      const res = await fetch('/api/campaigns', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to create campaign' }));
        const message = err.details
          ? err.details.map((d: { field: string; message: string }) => `${d.field}: ${d.message}`).join('; ')
          : err.error || 'Failed to create campaign';
        throw new Error(message);
      }
      onCreated();
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setSenderEmail('');
    setSubject('');
    setBody('');
    setParsedFile(null);
    setStartAt('');
    setDelaySeconds(2);
    setHourlyLimit(200);
    setError(null);
    setParseError(null);
    setParsingFile(false);
    setIsDragOver(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Compose campaign"
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div>
            {step > 1 && (
              <Button variant="ghost" onClick={() => setStep((s) => (s - 1) as Step)} disabled={submitting}>
                <ArrowLeft size={14} />
                Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            {step < 3 ? (
              <Button onClick={() => setStep((s) => (s + 1) as Step)} disabled={!canNext()}>
                Next
                <ArrowRight size={14} />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={!canNext()} loading={submitting}>
                <Check size={14} />
                Schedule campaign
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Step indicator */}
        <div className="flex items-center gap-0">
          {steps.map((s, i) => (
            <React.Fragment key={s.id}>
              <div className="flex items-center gap-2">
                <div
                  className={`flex items-center justify-center w-7 h-7 rounded-full text-[12px] font-semibold transition-colors ${
                    step >= s.id
                      ? 'bg-[#5856D6] text-white'
                      : 'bg-[#E8E8ED] text-[#86868B]'
                  }`}
                >
                  {step > s.id ? <Check size={14} /> : s.id}
                </div>
                <span
                  className={`text-[12px] font-medium ${
                    step >= s.id ? 'text-[#1D1D1F]' : 'text-[#86868B]'
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-px mx-3 ${step > s.id ? 'bg-[#5856D6]' : 'bg-[#E8E8ED]'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-[#C93434]/10 text-[#C93434] text-sm">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Step 1: Message */}
        {step === 1 && (
          <div className="space-y-4">
            <Input
              label="Sender email"
              placeholder="you@company.com"
              value={senderEmail}
              onChange={(e) => setSenderEmail(e.target.value)}
            />
            <Input
              label="Subject line"
              placeholder="A compelling subject for your email"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
            <Input
              label="Email body"
              textarea
              rows={6}
              placeholder="Write your email body here. Use {{name}} for personalization."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <div className="flex items-start gap-2 p-3 rounded-lg bg-[#F5F5F7] border border-[#E8E8ED]">
              <Info size={16} className="text-[#86868B] mt-0.5 shrink-0" />
              <p className="text-[12px] text-[#86868B]">
                Write a compelling subject line and personalized body. Use {'{{name}}'} to insert recipient name.
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Lead list */}
        {step === 2 && (
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`w-full flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 transition-all cursor-pointer ${
                isDragOver
                  ? 'border-[#5856D6] bg-[#5856D6]/5'
                  : parsedFile
                  ? 'border-[#5856D6] bg-[#5856D6]/5'
                  : parseError
                  ? 'border-[#C93434]/40 bg-[#C93434]/5 hover:border-[#C93434]/60'
                  : 'border-[#D2D2D7] bg-white hover:border-[#5856D6]/40 hover:bg-[#F5F5F7]'
              }`}
            >
              {parsingFile ? (
                <Loader2 size={28} className="text-[#5856D6] animate-spin" />
              ) : parsedFile ? (
                <FileText size={28} className="text-[#5856D6]" />
              ) : parseError ? (
                <AlertCircle size={28} className="text-[#C93434]" />
              ) : (
                <Upload size={28} className={isDragOver ? 'text-[#5856D6]' : 'text-[#86868B]'} />
              )}
              <div className="text-center">
                {parsingFile ? (
                  <p className="text-[13px] font-medium text-[#6E6E73]">Reading file...</p>
                ) : parsedFile ? (
                  <>
                    <div className="flex items-center justify-center gap-2">
                      <p className="text-[13px] font-medium text-[#1D1D1F]">{parsedFile.file.name}</p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile();
                        }}
                        className="p-0.5 rounded hover:bg-[#E8E8ED] text-[#86868B] hover:text-[#6E6E73] transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <p className="text-[12px] text-[#6E6E73] mt-1">
                      {parsedFile.uniqueEmails.length} unique email{parsedFile.uniqueEmails.length !== 1 ? 's' : ''} detected
                      {parsedFile.invalidCount > 0 && (
                        <span className="text-[#B86E00]"> · {parsedFile.invalidCount} invalid/skipped</span>
                      )}
                    </p>
                  </>
                ) : parseError ? (
                  <>
                    <p className="text-[13px] font-medium text-[#C93434]">{parseError}</p>
                    <p className="text-[12px] text-[#86868B] mt-1">Click to try again</p>
                  </>
                ) : (
                  <>
                    <p className="text-[13px] font-medium text-[#1D1D1F]">
                      Drop your file here or <span className="text-[#5856D6] underline">browse</span>
                    </p>
                    <p className="text-[12px] text-[#86868B] mt-1">
                      Upload a file containing your lead email addresses
                    </p>
                    <p className="text-[12px] text-[#86868B] mt-1">
                      Supports .csv and .txt — one email per line or CSV column
                    </p>
                  </>
                )}
              </div>
            </div>

            {parsedFile && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-[#248A3D]/10 text-[#248A3D] text-sm">
                <Check size={16} />
                <span>
                  <strong>{parsedFile.uniqueEmails.length}</strong> recipients ready
                </span>
              </div>
            )}

            <div className="flex items-start gap-2 p-3 rounded-lg bg-[#F5F5F7] border border-[#E8E8ED]">
              <Info size={16} className="text-[#86868B] mt-0.5 shrink-0" />
              <p className="text-[12px] text-[#86868B]">
                Redis-backed limits and idempotent queue jobs protect delivery reliability.
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Delivery settings */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar size={16} className="text-[#5856D6]" />
              <label className="text-[12px] font-medium text-[#6E6E73]">Start time</label>
            </div>
            <Input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Clock size={16} className="text-[#5856D6]" />
                  <label className="text-[12px] font-medium text-[#6E6E73]">Delay (seconds)</label>
                </div>
                <Input
                  type="number"
                  min={1}
                  max={300}
                  value={delaySeconds}
                  onChange={(e) => setDelaySeconds(Number(e.target.value))}
                />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Gauge size={16} className="text-[#5856D6]" />
                  <label className="text-[12px] font-medium text-[#6E6E73]">Hourly limit</label>
                </div>
                <Input
                  type="number"
                  min={1}
                  max={1000}
                  value={hourlyLimit}
                  onChange={(e) => setHourlyLimit(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-[#F5F5F7] border border-[#E8E8ED]">
              <Info size={16} className="text-[#86868B] mt-0.5 shrink-0" />
              <p className="text-[12px] text-[#86868B]">
                Emails will be sent with a {delaySeconds}s delay between each. Hourly limit: {hourlyLimit} emails/hour.
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
