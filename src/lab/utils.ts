export const format = (value: number) => new Intl.NumberFormat('en-US').format(value);
export const percent = (value: number, total: number) => total ? `${(100 * value / total).toFixed(1)}%` : '—';

export function download(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
