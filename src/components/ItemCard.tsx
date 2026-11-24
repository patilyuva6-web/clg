import { PackageSearch } from 'lucide-react';
import { formatDate, safeImageUrl } from '../api';
import type { ItemRecord } from '../types';
import { ItemStatusLabel, ReportTypeText } from './StatusText';

interface ItemCardProps {
  item: ItemRecord;
  onSelect: (itemId: number) => void;
}

export function ItemCard({ item, onSelect }: ItemCardProps) {
  const imageSrc = safeImageUrl(item.image);

  return (
    <article className="group flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden transition-colors duration-150 hover:border-[#0F2544]/35">
      <div className="relative aspect-[4/3] w-full bg-[#EEF2F6] overflow-hidden border-b border-slate-200">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={item.item_name}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#EEF2F6] to-[#E2E8F0] px-4 text-center">
            <PackageSearch className="h-9 w-9 text-[#0F2544]/40" aria-hidden="true" />
            <span className="text-xs font-medium text-slate-500 line-clamp-1">{item.category_name}</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
          <ReportTypeText type={item.report_type} />
          <span aria-hidden="true">·</span>
          <span>{item.category_name}</span>
          <span aria-hidden="true">·</span>
          <span className="tabular-nums">{formatDate(item.item_date)}</span>
        </div>

        <h3 className="mt-2 font-display text-base font-semibold leading-snug text-[#0F2544] line-clamp-2">
          {item.item_name}
        </h3>

        <p className="mt-1.5 text-sm leading-relaxed text-slate-600 line-clamp-2">
          {item.description}
        </p>

        <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-slate-500 truncate">{item.location}</p>
            <div className="mt-1">
              <ItemStatusLabel status={item.status} />
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSelect(item.item_id)}
            className="shrink-0 whitespace-nowrap rounded-lg border border-slate-200 bg-[#F8FAFC] px-3.5 py-2 text-xs font-semibold text-[#0F2544] transition-colors hover:bg-[#0F2544] hover:text-white hover:border-[#0F2544] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
          >
            View Details
          </button>
        </div>
      </div>
    </article>
  );
}
