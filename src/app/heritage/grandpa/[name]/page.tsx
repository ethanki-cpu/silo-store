import { UniversalBoard } from "@/components/shared/UniversalBoard";

export default async function GrandpaHeritagePage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const displayName = decodeURIComponent(name);

  return <UniversalBoard title={`${displayName} 할아버지 이야기`} />;
}
