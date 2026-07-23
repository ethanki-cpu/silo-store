export function ComingSoon({ title }: { title: string }) {
  return (
    <main className="flex-1 p-8 max-w-xl mx-auto w-full text-center">
      <h1 className="text-2xl font-bold mb-4">{title}</h1>
      <p className="text-gray-500">준비 중입니다.</p>
    </main>
  );
}
