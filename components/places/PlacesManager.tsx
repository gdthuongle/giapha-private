"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  searchPlaces,
  updatePlace,
  softDeletePlace,
  type PlaceInput,
  type PlaceSearchResult,
} from "@/app/actions/places";
import PlaceMapLinks from "@/components/places/PlaceMapLinks";
import { MapPin, Pencil, Search, Trash2, X } from "lucide-react";

const emptyForm: PlaceInput = {
  name: "",
  province: "",
  commune: "",
  addressDetail: "",
  oldProvince: "",
  oldDistrict: "",
  oldCommune: "",
  latitude: "",
  longitude: "",
  googleMapsUrl: "",
  note: "",
};

function toForm(place: PlaceSearchResult): PlaceInput {
  return {
    name: place.name ?? "",
    province: place.province ?? "",
    commune: place.commune ?? "",
    addressDetail: place.address_detail ?? "",
    oldProvince: place.old_province ?? "",
    oldDistrict: place.old_district ?? "",
    oldCommune: place.old_commune ?? "",
    latitude: place.latitude ?? "",
    longitude: place.longitude ?? "",
    googleMapsUrl: place.google_maps_url ?? "",
    note: place.note ?? "",
  };
}

function placeSearchText(place: PlaceSearchResult) {
  return [
    place.name,
    place.province,
    place.commune,
    place.address_detail,
    place.old_province,
    place.old_district,
    place.old_commune,
    place.google_maps_url,
    place.note,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export default function PlacesManager() {
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<PlaceSearchResult[]>([]);
  const [editing, setEditing] = useState<PlaceSearchResult | null>(null);
  const [form, setForm] = useState<PlaceInput>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredPlaces = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return places;

    return places.filter((place) => placeSearchText(place).includes(q));
  }, [places, query]);

  const loadPlaces = () => {
    setError(null);

    startTransition(async () => {
      const result = await searchPlaces("", 200);

      if (!result.ok) {
        setError(result.error);
        setPlaces([]);
        return;
      }

      setPlaces(result.places);
    });
  };

  useEffect(() => {
    loadPlaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startEdit = (place: PlaceSearchResult) => {
    setEditing(place);
    setForm(toForm(place));
    setError(null);
  };

  const cancelEdit = () => {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
  };

  const updateForm = (key: keyof PlaceInput, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleUpdate = () => {
    if (!editing) return;

    setError(null);

    startTransition(async () => {
      const result = await updatePlace(editing.id, form);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      cancelEdit();
      loadPlaces();
    });
  };

  const handleDelete = (place: PlaceSearchResult) => {
    if (
      !window.confirm(
        `Xóa mềm địa điểm "${place.name}"?\n\nCác sự kiện đang gắn place_id sẽ vẫn giữ mã place_id, nhưng địa điểm bị ẩn khỏi danh sách active.`,
      )
    ) {
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await softDeletePlace(place.id);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      if (editing?.id === place.id) {
        cancelEdit();
      }

      loadPlaces();
    });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-stone-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm theo tên, tỉnh, xã, địa chỉ, địa danh cũ..."
            className="w-full rounded-xl border border-stone-300 py-2 pl-9 pr-3 text-sm"
          />
        </div>
      </section>

      {error ? (
        <section className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </section>
      ) : null}

      {editing ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-stone-900">
                Sửa địa điểm
              </h2>
              <p className="mt-1 text-sm text-stone-600">
                Thay đổi ở đây sẽ áp dụng cho mọi sự kiện dùng địa điểm này.
              </p>
            </div>

            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-full p-2 text-stone-500 hover:bg-white hover:text-stone-900"
              title="Đóng"
            >
              <X className="size-4" />
            </button>
          </div>

          <div className="grid gap-3">
            <Field
              label="Tên địa điểm"
              value={form.name ?? ""}
              onChange={(value) => updateForm("name", value)}
              placeholder="Nhà thờ họ, Mộ ông..., Nơi tổ chức giỗ..."
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Tỉnh / Thành phố hiện tại"
                value={form.province ?? ""}
                onChange={(value) => updateForm("province", value)}
              />

              <Field
                label="Xã / Phường / Đặc khu hiện tại"
                value={form.commune ?? ""}
                onChange={(value) => updateForm("commune", value)}
              />
            </div>

            <Field
              label="Địa chỉ chi tiết"
              value={form.addressDetail ?? ""}
              onChange={(value) => updateForm("addressDetail", value)}
              placeholder="Ấp, khóm, số nhà, đường..."
            />

            <div className="grid gap-3 sm:grid-cols-3">
              <Field
                label="Tỉnh cũ"
                value={form.oldProvince ?? ""}
                onChange={(value) => updateForm("oldProvince", value)}
              />

              <Field
                label="Huyện cũ"
                value={form.oldDistrict ?? ""}
                onChange={(value) => updateForm("oldDistrict", value)}
              />

              <Field
                label="Xã cũ"
                value={form.oldCommune ?? ""}
                onChange={(value) => updateForm("oldCommune", value)}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Latitude"
                value={String(form.latitude ?? "")}
                onChange={(value) => updateForm("latitude", value)}
                placeholder="Ví dụ: 9.176"
              />

              <Field
                label="Longitude"
                value={String(form.longitude ?? "")}
                onChange={(value) => updateForm("longitude", value)}
                placeholder="Ví dụ: 105.15"
              />
            </div>

            <Field
              label="Google Maps URL"
              value={form.googleMapsUrl ?? ""}
              onChange={(value) => updateForm("googleMapsUrl", value)}
              placeholder="Dán link Google Maps nếu có"
            />

            <label className="grid gap-1 text-sm">
              <span className="font-medium text-stone-700">Ghi chú</span>
              <textarea
                value={form.note ?? ""}
                onChange={(event) => updateForm("note", event.target.value)}
                rows={3}
                className="w-full rounded-lg border border-stone-300 px-3 py-2"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleUpdate}
                disabled={isPending || !String(form.name ?? "").trim()}
                className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? "Đang lưu..." : "Lưu thay đổi"}
              </button>

              <button
                type="button"
                onClick={() => handleDelete(editing)}
                disabled={isPending}
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Xóa địa điểm
              </button>

              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                Hủy
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-200 px-4 py-3">
          <h2 className="text-base font-semibold text-stone-900">
            Danh sách địa điểm
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            {filteredPlaces.length} / {places.length} địa điểm
          </p>
        </div>

        {isPending && places.length === 0 ? (
          <p className="p-4 text-sm text-stone-500">Đang tải địa điểm...</p>
        ) : filteredPlaces.length === 0 ? (
          <p className="p-4 text-sm text-stone-500">Chưa có địa điểm phù hợp.</p>
        ) : (
          <div className="divide-y divide-stone-100">
            {filteredPlaces.map((place) => (
              <article key={place.id} className="p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <MapPin className="size-4 text-amber-700" />
                      <h3 className="font-semibold text-stone-900">
                        {place.name}
                      </h3>
                    </div>

                    <PlaceMapLinks place={place} showName={false} />
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={() => startEdit(place)}
                      className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      <Pencil className="size-3.5" />
                      Sửa
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(place)}
                      className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="size-3.5" />
                      Xóa
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium text-stone-700">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-stone-300 px-3 py-2"
      />
    </label>
  );
}
