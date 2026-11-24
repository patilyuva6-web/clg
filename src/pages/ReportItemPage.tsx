import { CheckCircle2, ImagePlus, Lock } from 'lucide-react';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { apiFetch, safeImageUrl } from '../api';
import type { Category, ItemRecord, PageRoute, ReportType, StudentUser } from '../types';

interface ReportItemPageProps {
  reportType: ReportType;
  student: StudentUser | null;
  token: string | null;
  onNavigate: (route: PageRoute) => void;
}

const CAMPUS_LOCATIONS = [
  'Central Library — 2nd Floor Reading Wing',
  'Computer Science Block — Lab 304',
  'Student Cafeteria',
  'Main Auditorium',
  'Academic Block A — Reception',
  'Campus Parking & Gate 2',
];

export function ReportItemPage({ reportType, student, token, onNavigate }: ReportItemPageProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [itemName, setItemName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [itemDate, setItemDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [location, setLocation] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submittedItem, setSubmittedItem] = useState<ItemRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setSubmittedItem(null);
    setError(null);
  }, [reportType]);

  useEffect(() => {
    apiFetch<{ categories: Category[] }>('/api/categories')
      .then((res) => {
        setCategories(res.categories);
        if (res.categories.length > 0 && !categoryId) {
          setCategoryId(String(res.categories[0].category_id));
        }
      })
      .catch(() => {});
  }, [categoryId]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selected = e.target.files?.[0];
    if (!selected) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type)) {
      setError('Please upload a JPG, PNG, or WEBP photograph.');
      e.target.value = '';
      return;
    }
    if (selected.size > 5 * 1024 * 1024) {
      setError('Photograph file size must be 5 MB or smaller.');
      e.target.value = '';
      return;
    }
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('item_name', itemName);
      formData.append('category_id', categoryId);
      formData.append('description', description);
      formData.append('report_type', reportType);
      formData.append('item_date', itemDate);
      formData.append('location', location);
      if (file) {
        formData.append('image', file);
      }

      const res = await apiFetch<{ item: ItemRecord }>('/api/student/items', {
        method: 'POST',
        formData,
        token,
      });

      setSubmittedItem(res.item);
      setItemName('');
      setDescription('');
      setLocation('');
      setFile(null);
      setPreviewUrl(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  const isLost = reportType === 'lost';

  if (!student || !token) {
    return (
      <div className="mx-auto max-w-xl px-4 sm:px-6 py-14">
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EEF2F6] text-[#0F2544]">
            <Lock className="h-5 w-5" aria-hidden="true" />
          </div>
          <h1 className="mt-4 font-display text-xl font-bold text-[#0F2544]">
            Student Sign-In Required
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            To prevent spam and link each report to a verified campus USN, please sign in or register before submitting a {isLost ? 'lost' : 'found'} item report.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate({ name: 'login' })}
              className="rounded-lg bg-[#0F2544] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#193A68]"
            >
              Student Login
            </button>
            <button
              type="button"
              onClick={() => onNavigate({ name: 'register' })}
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-[#0F2544] hover:bg-slate-50"
            >
              Register New Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
        <div className="border-b border-slate-100 pb-5">
          <p className={`text-xs font-semibold ${isLost ? 'text-[#B91C1C]' : 'text-[#1D4ED8]'}`}>
            {isLost ? 'Lost Item Registry Submission' : 'Found Item Registry Submission'}
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold text-[#0F2544]">
            {isLost ? 'Report a Lost Item' : 'Report a Found Item'}
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            {isLost
              ? 'Provide accurate details of the belonging you misplaced so administrators and finders can match it.'
              : 'Log the item you found on campus. Reports appear publicly after administrator verification.'}
          </p>
        </div>

        {submittedItem && (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-[#15803D] shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#0F2544]">
                  Report #{submittedItem.item_id} (“{submittedItem.item_name}”) saved as Pending Review.
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  You can view it right now in <strong>My Portal</strong> or <strong>Browse Items</strong> while signed in. It becomes visible to everyone else once approved in the Admin Portal.
                </p>
                {safeImageUrl(submittedItem.image) && (
                  <img
                    src={safeImageUrl(submittedItem.image)!}
                    alt={submittedItem.item_name}
                    referrerPolicy="no-referrer"
                    className="mt-3 h-20 w-28 rounded-lg border border-emerald-200 object-cover"
                  />
                )}
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => onNavigate({ name: 'details', itemId: submittedItem.item_id })}
                    className="rounded-lg bg-[#0F2544] px-4 py-2 text-xs font-semibold text-white hover:bg-[#193A68]"
                  >
                    Open Uploaded Item
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate({ name: 'student-dashboard' })}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-[#0F2544] hover:bg-slate-50"
                  >
                    View My Portal
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubmittedItem(null)}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-[#0F2544] hover:bg-slate-50"
                  >
                    Submit Another Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-[#B91C1C]"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="item-name" className="block text-sm font-medium text-[#0F2544]">
                Item Name
              </label>
              <input
                id="item-name"
                type="text"
                required
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder={isLost ? 'e.g. Silver HP Laptop Charger' : 'e.g. Blue Umbrella with Wooden Handle'}
                className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#0F2544] focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
              />
            </div>

            <div>
              <label htmlFor="item-category" className="block text-sm font-medium text-[#0F2544]">
                Item Category
              </label>
              <select
                id="item-category"
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#0F2544] focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
              >
                {categories.map((cat) => (
                  <option key={cat.category_id} value={cat.category_id}>
                    {cat.category_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="item-date" className="block text-sm font-medium text-[#0F2544]">
                {isLost ? 'Date Lost' : 'Date Found'}
              </label>
              <input
                id="item-date"
                type="date"
                required
                value={itemDate}
                onChange={(e) => setItemDate(e.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm text-[#0F2544] focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
              />
            </div>

            <div>
              <label htmlFor="item-location" className="block text-sm font-medium text-[#0F2544]">
                {isLost ? 'Location Where It Was Lost' : 'Location Where It Was Found'}
              </label>
              <input
                id="item-location"
                type="text"
                required
                list="campus-locations"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Central Library — 2nd Floor"
                className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#0F2544] focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
              />
              <datalist id="campus-locations">
                {CAMPUS_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc} />
                ))}
              </datalist>
            </div>
          </div>

          <div>
            <label htmlFor="item-desc" className="block text-sm font-medium text-[#0F2544]">
              Detailed Description
            </label>
            <textarea
              id="item-desc"
              rows={4}
              required
              minLength={10}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Include brand, colour, visible marks, or helpful context (do not post private phone numbers here)."
              className="mt-1.5 block w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-[#0F2544] focus:border-[#1D4ED8] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]/20"
            />
          </div>

          <div>
            <label htmlFor="item-photo" className="block text-sm font-medium text-[#0F2544]">
              Item Photograph (Optional · JPG, PNG, WEBP up to 5 MB)
            </label>
            <div className="mt-2 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <label
                htmlFor="item-photo"
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-[#F8FAFC] px-4 py-2.5 text-sm font-medium text-[#0F2544] hover:bg-slate-100"
              >
                <ImagePlus className="h-4 w-4" aria-hidden="true" />
                <span>{file ? 'Change Photograph' : 'Upload Photograph'}</span>
                <input
                  id="item-photo"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="sr-only"
                />
              </label>
              {file && (
                <span className="text-xs text-slate-600">
                  {file.name} ({Math.round(file.size / 1024)} KB)
                </span>
              )}
            </div>

            {previewUrl && (
              <div className="mt-4 w-56 overflow-hidden rounded-lg border border-slate-200 bg-[#F8FAFC]">
                <img src={previewUrl} alt="Uploaded preview" className="aspect-[4/3] w-full object-cover" />
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => onNavigate({ name: 'search' })}
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-[#0F2544] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#193A68] disabled:opacity-60"
            >
              {submitting
                ? 'Submitting Report...'
                : isLost
                  ? 'Submit Lost Item Report'
                  : 'Submit Found Item Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
