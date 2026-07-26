export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-400 text-sm">
      {message}
    </div>
  );
}
