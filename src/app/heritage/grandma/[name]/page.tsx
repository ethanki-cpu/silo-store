import { UniversalBoard } from "@/components/shared/UniversalBoard";

export default async function GrandmaHeritagePage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const displayName = decodeURIComponent(name);

  return <UniversalBoard title={`${displayName} 할머니 이야기`} />;
}
