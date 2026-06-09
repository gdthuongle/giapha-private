"use client";

import { createAdminEvent } from "@/app/actions/events";
import PersonSelector from "@/components/PersonSelector";
import type { Person } from "@/types";
import { CalendarPlus, Loader2, MapPin, Users2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

const EVENT_TYPES = [
  { value: "wedding", label: "Đám cưới / Thiệp cưới" },
  { value: "custom", label: "Sự kiện chung" },
];

const PRECISIONS = [
  { value: "day", label: "Chính xác ngày", placeholder: "dd-mm-yyyy, ví dụ 21-07-2026" },
  { value: "month", label: "Chỉ tháng/năm", placeholder: "mm-yyyy, ví dụ 07-2026" },
  { value: "year", label: "Chỉ năm", placeholder: "yyyy, ví dụ 2026" },
  { value: "unknown", label: "Không rõ ngày", placeholder: "Để trống" },
];

type AdminEventFormProps = {
  persons: Person[];
};

export default function AdminEventForm({ persons }: AdminEventFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [eventType, setEventType] = useState("wedding");
  const [precision, setPrecision] = useState("day");
  const [rootPersonId, setRootPersonId] = useState<string | null>(null);
  const [brideId, setBrideId] = useState<string | null>(null);
  const [groomId, setGroomId] = useState<string | null>(null);
  const [relatedPersonId, setRelatedPersonId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedPersonIds = useMemo(
    () =>
      [rootPersonId, brideId, groomId, relatedPersonId]
        .filter(Boolean)
        .join(","),
    [rootPersonId, brideId, groomId, relatedPersonId],
  );

  const handleSubmit = (formData: FormData) => {
    setError(null);
    setMessage(null);

    formData.set("type", eventType);
    formData.set("date_precision", precision);
    if (rootPersonId) formData.set("root_person_id", rootPersonId);
    if (brideId) formData.set("bride_id", brideId);
    if (groomId) formData.set("groom_id", groomId);
    if (relatedPersonId) formData.set("related_person_ids", relatedPersonId);

    startTransition(() => {
      void (async () => {
        const result = await createAdminEvent(formData);

        if (result?.error) {
          setError(result.error);
          return;
        }

        setMessage("Đã tạo sự kiện.");
        setIsOpen(false);
      })();
    });
  };

  return (
    <section className="rounded-3xl border border-amber-200/70 bg-gradient-to-br from-amber-50 via-white to-stone-50 p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl border border-amber-100 bg-white p-3 text-amber-700 shadow-sm">
            <CalendarPlus className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-stone-900">Tạo sự kiện</h2>
            <p className="mt-1 text-sm leading-6 text-stone-600">
              Admin/Editor có thể tạo sự kiện chung, thiệp cưới hoặc đám cưới sắp tới và chọn nhánh được phép xem bằng gốc hiển thị.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setError(null);
            setMessage(null);
            setIsOpen((value) => !value);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-amber-800"
        >
          <CalendarPlus className="size-4" />
          {isOpen ? "Đóng form" : "Tạo sự kiện"}
        </button>
      </div>

      {message ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {isOpen ? (
        <form action={handleSubmit} className="mt-5 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <input type="hidden" name="selected_person_ids" value={selectedPersonIds} readOnly />

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-stone-500">Loại sự kiện</span>
              <select
                name="type_select"
                value={eventType}
                onChange={(event) => setEventType(event.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              >
                {EVENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-stone-500">Tiêu đề</span>
              <input
                name="title"
                defaultValue={eventType === "wedding" ? "Đám cưới / Thiệp cưới" : "Sự kiện gia đình"}
                className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                placeholder="Ví dụ: Thiệp cưới Nguyễn Văn A và Trần Thị B"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-stone-500">Độ chính xác ngày</span>
              <select
                name="date_precision_select"
                value={precision}
                onChange={(event) => setPrecision(event.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
              >
                {PRECISIONS.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-stone-500">Ngày tổ chức</span>
              <input
                name="date_text"
                className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                placeholder={PRECISIONS.find((item) => item.value === precision)?.placeholder ?? "dd-mm-yyyy"}
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-stone-500">Giờ tổ chức</span>
              <input
                name="time_text"
                className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                placeholder="Ví dụ: 17:30 hoặc 17 giờ 30"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-stone-500">Địa điểm</span>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
                <input
                  name="place_text"
                  className="w-full rounded-xl border border-stone-200 py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                  placeholder="Nhà hàng, tư gia, địa chỉ tổ chức..."
                />
              </div>
            </label>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <PersonSelector
              persons={persons}
              selectedId={rootPersonId}
              onSelect={setRootPersonId}
              label="Gốc hiển thị"
              placeholder="Chọn root để chia sẻ theo nhánh"
              className="w-full"
              showAllOption
              allOptionLabel="Chỉ admin/editor"
            />
            <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-3 text-xs leading-5 text-stone-600">
              <div className="mb-1 flex items-center gap-2 font-bold text-stone-700">
                <Users2 className="size-4" />
                Quyền hiển thị
              </div>
              Chọn gốc hiển thị để member thuộc nhánh được phép thấy sự kiện. Nếu để “Chỉ admin/editor”, sự kiện không mở rộng thêm cho member ngoài quyền hiện có.
            </div>

            {eventType === "wedding" ? (
              <>
                <PersonSelector
                  persons={persons}
                  selectedId={brideId}
                  onSelect={setBrideId}
                  label="Cô dâu"
                  placeholder="Chọn cô dâu"
                  className="w-full"
                />
                <PersonSelector
                  persons={persons}
                  selectedId={groomId}
                  onSelect={setGroomId}
                  label="Chú rể"
                  placeholder="Chọn chú rể"
                  className="w-full"
                />
              </>
            ) : null}

            <PersonSelector
              persons={persons}
              selectedId={relatedPersonId}
              onSelect={setRelatedPersonId}
              label="Người liên quan thêm"
              placeholder="Chọn người liên quan"
              className="w-full"
              showAllOption
              allOptionLabel="Không chọn thêm"
            />
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-stone-500">Nội dung thiệp cưới</span>
              <textarea
                name="invitation_text"
                rows={5}
                className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                placeholder="Thông tin thiệp cưới, lời mời, ghi chú thời gian đón khách..."
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-stone-500">Ghi chú</span>
              <textarea
                name="description"
                rows={5}
                className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                placeholder="Ghi chú nội bộ hoặc mô tả thêm cho sự kiện..."
              />
            </label>
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-bold text-stone-600 transition hover:bg-stone-50"
              disabled={isPending}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-amber-800 disabled:opacity-60"
              disabled={isPending}
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <CalendarPlus className="size-4" />}
              Lưu sự kiện
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
