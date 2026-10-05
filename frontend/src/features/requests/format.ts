const dateTime = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const date = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

// Both use the browser's time zone; the API sends UTC.
// pt-BR puts a comma between date and time ("04/10/2026, 09:12").
export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso)).replace(", ", " ");
}

export function formatDate(iso: string): string {
  return date.format(new Date(iso));
}
