Tiếp theo làm **Tree Hardening Runbook + final checklist v2.3.7**, rồi chuẩn bị merge phase này về `main`.

## 1. Tạo runbook

```bash
cd /opt/giapha-os

mkdir -p docs/runbooks
nano docs/runbooks/vietnamese-tree-hardening-runbook-v237.md
```

Dán nội dung:

````md
# Vietnamese Tree Hardening Runbook v2.3.7

## 1. Mục tiêu

v2.3.7 tập trung hardening cây gia phả tiếng Việt:

- Thêm diagnostics panel.
- Đo performance layout.
- Cảnh báo khi cây quá lớn.
- Copy diagnostics snapshot để debug.
- Thêm large tree guard: auto-collapse to 4 generations.
- Bổ sung invariant tests cho Vietnamese tree layout.

Không thay đổi schema DB.

---

## 2. Các file chính

```text
components/VietnameseFamilyTree.tsx
utils/tree/vietnameseTreeLayout.ts
tests/tree/vietnameseTreeLayout.test.ts
components/MembersViews.tsx
app/dashboard/vietnamese-tree-test/page.tsx
````

---

## 3. Diagnostics Panel

Trong cây gia phả, bấm:

```text
Tree diagnostics
```

Panel hiển thị:

```text
Total persons
Families
Visible nodes
Visible people
Family groups
Expanded
Collapsed
Max depth
Spouse nodes
Multi-spouse
Width
Height
Layout ms
Measured
```

Ý nghĩa:

* `Total persons`: tổng số person được load vào cây.
* `Visible nodes`: số node đang render thật.
* `Visible people`: số người duy nhất đang hiển thị.
* `Family groups`: số group gia đình visible.
* `Expanded`: số group đang mở.
* `Collapsed`: số group có con nhưng đang thu gọn.
* `Max depth`: độ sâu thế hệ visible.
* `Spouse nodes`: số node spouse đang render.
* `Multi-spouse`: số người có nhiều quan hệ spouse.
* `Layout ms`: thời gian build layout gần nhất.

---

## 4. Health status

Diagnostics có 3 trạng thái:

```text
Healthy
Large tree
Heavy tree
```

Ngưỡng hiện tại:

```text
visibleNodes >= 300 hoặc layoutDurationMs >= 80ms  -> Large tree
visibleNodes >= 600 hoặc layoutDurationMs >= 150ms -> Heavy tree
```

Nếu `Large tree` hoặc `Heavy tree`, panel hiện nút:

```text
Auto-collapse to 4 generations
```

Nút này chỉ đổi `autoCollapseLevel`, không sửa DB.

---

## 5. Copy snapshot

Bấm:

```text
Copy snapshot
```

Snapshot JSON gồm:

```json
{
  "kind": "vietnamese-tree-diagnostics",
  "version": "v2.3.7",
  "capturedAt": "...",
  "url": "/dashboard/members",
  "health": {
    "level": "ok",
    "label": "Healthy"
  },
  "diagnostics": {
    "totalPersons": 453,
    "totalFamilies": 125,
    "visibleNodes": 0,
    "visiblePeople": 0,
    "layoutDurationMs": 0
  }
}
```

Nếu clipboard API bị chặn trên HTTP LAN, fallback dùng textarea copy. Nếu vẫn lỗi, snapshot được ghi ra browser Console.

Khi báo lỗi cây, gửi kèm:

```text
- Ảnh màn hình
- Snapshot JSON
- Root person đang chọn
- Các filter đang bật/tắt
```

---

## 6. Layout invariant tests

Test file:

```text
tests/tree/vietnameseTreeLayout.test.ts
```

Đã kiểm tra:

* Parent/spouse horizontal alignment.
* Children nằm dưới family center.
* Child-down line đi đúng tâm node con.
* Spouse line đi đúng tâm child ↔ spouse.
* Layout đủ rộng khi child có expanded spouses.
* Requested child unit width được tôn trọng.
* Children sort theo birth_order rồi birth_year.

Chạy:

```bash
bun run test
```

---

## 7. Test UI thủ công

Mở:

```text
/dashboard/members
```

Kiểm tra:

```text
□ Cây render được.
□ Nút Tree diagnostics hiện.
□ Panel mở/đóng được.
□ Layout ms có giá trị.
□ Copy snapshot copy được.
□ Nếu tree Large/Heavy, nút Auto-collapse hiện.
□ Bấm Auto-collapse không crash.
□ Expand/collapse vẫn hoạt động.
□ Filter nam/nữ/dâu/rể/con trai/con gái vẫn hoạt động.
□ Đường nối spouse/child không lệch rõ rệt.
```

Test route phụ:

```text
/dashboard/vietnamese-tree-test
```

---

## 8. SQL/DB

Phase này không có migration DB.

Không cần chạy SQL.

---

## 9. Không được làm

Không làm trong phase này:

```text
- Không đổi schema.
- Không sửa GEDCOM/import.
- Không sửa statistics.
- Không hard delete dữ liệu.
- Không đổi layout algorithm lớn nếu chưa có snapshot/lỗi cụ thể.
```

---

## 10. Checklist hoàn thành v2.3.7

Hoàn thành khi:

```text
- Tree diagnostics panel hoạt động.
- Layout ms hiển thị.
- Copy snapshot hoạt động trên HTTP LAN.
- Large tree warning hoạt động.
- Auto-collapse guard hoạt động.
- Vietnamese tree invariant tests pass.
- bun run test pass.
- bun run build pass.
- Runbook được commit.
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

git add docs/runbooks/vietnamese-tree-hardening-runbook-v237.md

git commit -m "docs(tree): add Vietnamese tree hardening runbook"

git push
```

---

## 4. Merge v2.3.7 về main

Khi working tree clean:

```bash
git checkout main
git pull origin main

git merge upgrade-v2.3.7-tree-hardening

bun run test
bun run build

git push origin main

git tag -a v2.3.7-tree-hardening -m "v2.3.7 Vietnamese Tree hardening"
git push origin v2.3.7-tree-hardening
```

---

Sau khi xong v2.3.7, bước tiếp theo nên là **v2.4.0 Release Cleanup**: tổng hợp changelog, kiểm tra toàn bộ route, dọn branch, và chuẩn bị một bản release ổn định.
