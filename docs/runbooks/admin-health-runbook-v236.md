Tiếp tục làm **Admin Health runbook + final checklist v2.3.6**, rồi chuẩn bị merge về `main`.

## 1. Tạo runbook

```bash
cd /opt/giapha-os

mkdir -p docs/runbooks
nano docs/runbooks/admin-health-runbook-v236.md
```

Dán nội dung:

````md
# Admin Health Runbook v2.3.6

## 1. Mục tiêu

Admin Health là trang tổng quan nhanh cho quản trị viên sau các phase:

- Family Model migration
- Event Model migration
- GEDCOM Import/Merge
- Data Maintenance

Route:

```text
/dashboard/admin-health
````

Trang này chỉ đọc dữ liệu, không sửa DB.

---

## 2. Các chỉ số chính

Admin Health hiện theo dõi:

```text
Unknown persons
Events missing links
Duplicate event groups
Empty families
Open import sessions
Pending merge suggestions
Approved merge suggestions
```

---

## 3. Ý nghĩa từng chỉ số

### 3.1. Unknown persons

Link:

```text
/dashboard/data-maintenance/unknown-persons
```

Ý nghĩa:

```text
Người active còn tên Unknown hoặc Chưa rõ tên.
```

Kỳ vọng tốt:

```text
0
```

Nếu > 0:

* Mở card Unknown persons.
* Kiểm tra từng người.
* Nếu là người thật, cập nhật tên trong trang sửa person.
* Nếu là dữ liệu import lỗi, xử lý theo Data Maintenance hoặc soft-delete nếu có policy riêng.

---

### 3.2. Events missing links

Link:

```text
/dashboard/data-maintenance/events-missing-links
```

Ý nghĩa:

```text
Birth/death events có legacy_person_id nhưng thiếu person_events link.
```

Kỳ vọng tốt:

```text
0
```

Nếu > 0:

* Mở Events missing links.
* Kiểm tra danh sách.
* Bấm Repair links nếu đúng.
* Repair dùng RPC:

```text
repair_events_missing_person_links()
```

Quy tắc:

```text
birth -> principal
death -> deceased
ON CONFLICT DO NOTHING
```

Đây là lỗi blocking trong Admin Health.

---

### 3.3. Duplicate event groups

Link:

```text
/dashboard/data-maintenance/duplicate-events
```

Ý nghĩa:

```text
Nhóm birth/death events trùng exact-match theo:
legacy_person_id + type + start_date + sort_date
```

Kỳ vọng tốt:

```text
0
```

Nếu > 0:

* Mở Duplicate events.
* Xem danh sách.
* Nếu đúng là duplicate, bấm soft-delete duplicates.
* RPC:

```text
soft_delete_duplicate_birth_death_events()
```

Quy tắc:

```text
Mỗi nhóm giữ lại 1 event đại diện.
Các event còn lại chỉ set deleted_at.
Không hard delete.
```

---

### 3.4. Empty families

Link:

```text
/dashboard/data-maintenance/empty-families
```

Ý nghĩa:

```text
Families active không có family_parents và không có family_children.
```

Kỳ vọng tốt:

```text
0
```

Nếu > 0:

* Mở Empty families.
* Kiểm tra danh sách.
* Nếu đúng là rỗng/thừa, bấm soft-delete.
* RPC:

```text
soft_delete_empty_families()
```

Quy tắc:

```text
Chỉ set deleted_at.
Không hard delete.
Không đụng family có parent hoặc child.
```

---

### 3.5. Open import sessions

Link:

```text
/dashboard/import
```

Ý nghĩa:

```text
Import sessions chưa committed/cancelled.
```

Có thể > 0 nếu đang test GEDCOM round-trip hoặc đang review import.

Nếu là session test đã xong:

```sql
DELETE FROM public.import_sessions
WHERE id = '<SESSION_ID>'
  AND status <> 'committed';
```

Không xóa session đã committed.

---

### 3.6. Pending merge suggestions

Link:

```text
/dashboard/import
```

Ý nghĩa:

```text
Merge suggestions đang chờ duyệt.
```

Nếu > 0:

* Mở session import tương ứng.
* Vào Merge Plan.
* Approve / skip / reject từng suggestion.

---

### 3.7. Approved merge suggestions

Link:

```text
/dashboard/import
```

Ý nghĩa:

```text
Merge suggestions đã approve nhưng chưa commit.
```

Nếu > 0:

* Mở Merge Plan.
* Kiểm tra lại.
* Nếu đúng, bấm Commit approved suggestions.
* Nếu chưa chắc, chuyển về pending/skipped/rejected.

---

## 4. Full SQL audit

Dùng khi muốn kiểm tra nhanh ngoài UI.

```sql
SELECT COUNT(*) AS active_unknown_left
FROM public.persons
WHERE full_name IN ('Unknown', 'Chưa rõ tên')
  AND deleted_at IS NULL;

SELECT COUNT(*) AS events_without_person_events
FROM public.events e
WHERE e.deleted_at IS NULL
  AND e.legacy_person_id IS NOT NULL
  AND e.type IN ('birth', 'death')
  AND NOT EXISTS (
    SELECT 1 FROM public.person_events pe
    WHERE pe.event_id = e.id
      AND pe.person_id = e.legacy_person_id
  );

WITH grouped AS (
  SELECT
    e.legacy_person_id,
    e.type,
    e.start_date,
    e.sort_date,
    COUNT(*) AS c
  FROM public.events e
  WHERE e.deleted_at IS NULL
    AND e.legacy_person_id IS NOT NULL
    AND e.type IN ('birth', 'death')
  GROUP BY e.legacy_person_id, e.type, e.start_date, e.sort_date
  HAVING COUNT(*) > 1
)
SELECT COUNT(*) AS duplicate_groups
FROM grouped;

SELECT COUNT(*) AS active_empty_families
FROM public.families f
WHERE f.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.family_parents fp
    WHERE fp.family_id = f.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.family_children fc
    WHERE fc.family_id = f.id
  );

SELECT COUNT(*) AS open_import_sessions
FROM public.import_sessions
WHERE status NOT IN ('committed', 'cancelled');

SELECT status, COUNT(*)
FROM public.import_merge_suggestions
GROUP BY status
ORDER BY status;
```

Kỳ vọng tốt:

```text
active_unknown_left = 0
events_without_person_events = 0
duplicate_groups = 0
active_empty_families = 0
approved merge suggestions = 0 hoặc đã hiểu rõ
pending merge suggestions = 0 hoặc đang review
```

---

## 5. Quy tắc an toàn

Không làm:

```text
- Không hard delete persons.
- Không hard delete events.
- Không hard delete families.
- Không commit import session round-trip.
- Không commit approved merge suggestions nếu chưa hiểu payload.
- Không chạy SQL update/delete thủ công khi đã có RPC maintenance.
```

---

## 6. Checklist hoàn thành v2.3.6

Hoàn thành khi:

```text
- /dashboard/admin-health mở được.
- Dashboard có card Admin Health.
- HeaderMenu có link Admin Health.
- Data Quality có quick link Admin Health.
- Admin Health metrics load được.
- Events missing links = 0.
- Duplicate event groups = 0 hoặc đã hiểu rõ.
- Empty families = 0 hoặc đã xử lý.
- Unknown persons = 0.
- test pass.
- build pass.
- runbook được commit.
```

````

---

## 2. Chạy test/build

```bash
bun run test
bun run build
````

## 3. Commit runbook

```bash
git status

git add docs/runbooks/admin-health-runbook-v236.md

git commit -m "docs(admin): add admin health runbook"

git push
```

---

## 4. Kiểm tra route sau cùng

Mở:

```text
/dashboard/admin-health
/dashboard/data-maintenance
/dashboard/data-quality
/dashboard/import
```

Kỳ vọng:

```text
Admin Health hiển thị metrics
Data Maintenance mở đủ cards
Data Quality có quick links
Import vẫn mở được các route session/matches/merge/audit
```

---

## 5. Merge v2.3.6 về main

Khi test/build pass và working tree clean:

```bash
git checkout main
git pull origin main
git merge upgrade-v2.3.6-admin-health

bun run test
bun run build

git push origin main

git tag -a v2.3.6-admin-health -m "v2.3.6 Admin Health and UX polish"
git push origin v2.3.6-admin-health
```

Sau khi xong, mốc hiện tại sẽ là:

```text
v2.3.4 GEDCOM Import/Merge ✅
v2.3.5 Data Maintenance ✅
v2.3.6 Admin Health ✅
```

Bước kế tiếp hợp lý sau đó là **v2.3.7 Vietnamese Tree performance/hardening** hoặc **v2.4.0 release cleanup**.
