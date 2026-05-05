export const formatRupiah = (value) => {
  if (value === null || value === undefined) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatKWh = (value, decimals = 3) => {
  if (value === null || value === undefined) return '0';
  return parseFloat(value).toFixed(decimals);
};

export const formatVoltage = (value) => `${(value || 0).toFixed(1)} V`;
export const formatAmpere = (value) => `${(value || 0).toFixed(3)} A`;
export const formatWatt = (value) => `${(value || 0).toFixed(1)} W`;
