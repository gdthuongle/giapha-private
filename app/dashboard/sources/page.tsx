import SourcesManager from "@/components/SourcesManager";

export const dynamic = "force-dynamic";

export default function SourcesPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Nguồn thông tin</h1>
        <p className="mt-2 text-sm text-stone-600">
          Quản lý toàn bộ tài liệu, hình ảnh, lời kể, website và nguồn xác minh trong gia phả.
        </p>
      </div>

      <SourcesManager />
    </main>
  );
}
