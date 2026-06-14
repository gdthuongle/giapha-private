import PlacesManager from "@/components/places/PlacesManager";

export const dynamic = "force-dynamic";

export default function PlacesPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Địa điểm</h1>
        <p className="mt-2 text-sm text-stone-600">
          Quản lý địa chỉ theo chính quyền 2 cấp hiện tại, địa danh cũ và liên kết Google Maps.
        </p>
      </div>

      <PlacesManager />
    </main>
  );
}
