import { CheckCircle2, Clock, SearchCheck, XCircle } from 'lucide-react';
import type { ClaimStatus, ItemStatus, ReportType } from '../types';

export function ItemStatusLabel({ status }: { status: ItemStatus }) {
  switch (status) {
    case 'approved':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#15803D]">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Active Listing</span>
        </span>
      );
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#B45309]">
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Pending Review</span>
        </span>
      );
    case 'returned':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0F2544]">
          <SearchCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Returned to Owner</span>
        </span>
      );
    case 'rejected':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#B91C1C]">
          <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Rejected</span>
        </span>
      );
  }
}

export function ClaimStatusLabel({ status }: { status: ClaimStatus }) {
  switch (status) {
    case 'approved':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#15803D]">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Approved</span>
        </span>
      );
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#B45309]">
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Under Review</span>
        </span>
      );
    case 'rejected':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#B91C1C]">
          <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Rejected</span>
        </span>
      );
  }
}

export function ReportTypeText({ type }: { type: ReportType }) {
  return (
    <span className={`font-semibold ${type === 'lost' ? 'text-[#B91C1C]' : 'text-[#1D4ED8]'}`}>
      {type === 'lost' ? 'Lost Item' : 'Found Item'}
    </span>
  );
}
