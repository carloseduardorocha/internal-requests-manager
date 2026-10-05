export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;

  return (
    <span id={id} className="text-xs leading-[18px] text-destructive">
      {message}
    </span>
  );
}
