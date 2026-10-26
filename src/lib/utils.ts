// src/lib/utils.ts

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

// Rekomendasi Kategori
export const CATEGORIES = [
  { id: 'makanan', name: 'Makanan & Minuman', icon: 'Utensils', color: 'bg-amber-500' },
  { id: 'transport', name: 'Transportasi', icon: 'Car', color: 'bg-blue-500' },
  { id: 'belanja', name: 'Belanja & Hobi', icon: 'ShoppingBag', color: 'bg-purple-500' },
  { id: 'gaji', name: 'Gaji & Pendapatan', icon: 'Wallet', color: 'bg-emerald-500' },
  { id: 'tagihan', name: 'Tagihan & Utilitas', icon: 'Receipt', color: 'bg-rose-500' },
  { id: 'kesehatan', name: 'Kesehatan', icon: 'HeartPulse', color: 'bg-red-500' },
  { id: 'hiburan', name: 'Hiburan', icon: 'Film', color: 'bg-indigo-500' },
  { id: 'lainnya', name: 'Lainnya', icon: 'MoreHorizontal', color: 'bg-slate-500' },
];