# Đánh giá & Sửa lỗi Code – PlanAI Study Scheduler

## Tổng quan

Ứng dụng **PlanAI** (React 19 + TypeScript + Vite + Express + Tailwind v4 + Gemini AI)
có kiến trúc khá tốt, UI đẹp, types rõ ràng và xử lý UTC/timezone nhất quán
trên frontend. Tuy nhiên có một số lỗi nghiêm trọng về **bảo mật**, **độ chính
xác múi giờ (DST)**, và **trạng thái UI** cần sửa.

Tất cả các lỗi dưới đây đã được fix; TypeScript (`tsc --noEmit`) và `npm run build`
đều chạy thành công không có lỗi.

---

## Các lỗi đã sửa

### 🔴 1. Bảo mật: Backdoor mật khẩu phổ thông

**File:** `server.ts`

**Vấn đề:** Đoạn code sau cho phép **bất kỳ ai** đăng nhập vào **bất kỳ** tài
khoản nào chỉ với mật khẩu `"password123"`:
```ts
if (storedPassword !== cleanPassword && cleanPassword !== "password123") { ... }
```
Kết hợp với `/api/users` public, đây là một lỗi bảo mật rất nghiêm trọng.

**Fix:** Backdoor chỉ còn hoạt động khi `DEMO_MODE=true` (có trong `.env.example`)
và chỉ áp dụng cho 2 tài khoản mẫu (`usr_1`, `usr_2`). Mặc định mật khẩu phải
khớp chính xác.

---

### 🔴 2. `localToUtcIso` sai giờ do dùng offset cố định (DST)

**File:** `src/utils/time.ts`

**Vấn đề:** Hàm dùng offset tĩnh trong `TIMEZONE_OPTIONS` (VD: London `+01:00`).
Thực tế Europe/London là `+00:00` mùa đông và `+01:00` mùa hè (BST) → sai 1 giờ
trong 6 tháng/năm. Tương tự với `America/New_York`, v.v.

**Fix:** Dùng `Intl.DateTimeFormat` để dò (probe) UTC instant của `YYYY-MM-DD`
`HH:MM` trong múi giờ đích trong khoảng ±14 giờ, tìm thời điểm có giờ địa phương
khớp với đầu vào. Điều này tự động đúng qua mọi chuyển đổi DST. Fallback về
offset tĩnh khi gặp timezone lạ.

Thêm helper `getLocalYmdInTz` để lấy ngày `YYYY-MM-DD` trong tz của user.

---

### 🟠 3. Modal Add Event / Add Task dùng múi giờ trình duyệt

**Files:** `src/components/AddEventModal.tsx`, `src/components/AddTaskModal.tsx`

**Vấn đề:**
- Ngày mặc định được khởi tạo bằng `new Date(serverTime).getFullYear() / getMonth() / getDate()` →
  theo múi giờ của trình duyệt chạy JS, không theo `currentUser.timezone`. User
  ở Tokyo/New York sẽ thấy ngày mặc định sai lệch 1 ngày.
- Form state (tiêu đề, mô tả, địa điểm, …) không reset sau khi submit và mở lại
  modal → hiện nội dung cũ.
- Không validate `endTime > startTime`.

**Fix:**
- Tính ngày mặc định bằng `getLocalYmdInTz(serverTime.toISOString(), timezone)`
  (luôn đúng theo user timezone).
- Dùng một `FormState` object + `useEffect` reset mỗi khi modal mở.
- Thêm validate thời gian kết thúc phải sau thời gian bắt đầu.

---

### 🟠 4. CalendarView tính đầu tuần bằng UTC (sai 7 tiếng mỗi ngày với VN)

**File:** `src/components/CalendarView.tsx`

**Vấn đề:** Dùng `serverTime.getUTCDay()` / `setUTCDate()` để tìm ngày Thứ 2 của
tuần. Trong khoảng 00:00–07:00 UTC (tức 07:00–14:00 VN) thì ngày UTC vẫn là
"hôm qua", nên thứ đầu tuần hiển thị sai và "HÔM NAY" bị đánh dấu sai.

**Fix:** Tính tất cả các thao tác ngày/thứ bằng `Intl.DateTimeFormat` trong
timezone của user (`getTzParts` + `buildTzMidnight` probe tương tự hàm
`localToUtcIso`, DST-safe). Pagination ("Tuần trước" / "Tuần sau") cũng dùng
đơn vị "tuần" chính xác theo tz.

---

### 🟠 5. Server không load `.env` (dotenv)

**File:** `server.ts`

**Vấn đề:** `dotenv` được khai báo trong `package.json` nhưng không bao giờ gọi
`dotenv.config()`, nên `GEMINI_API_KEY` trong file `.env` không được nạp.

**Fix:** Thêm `import 'dotenv/config'` tương đương gọi `dotenv.config()` ở đầu
server.

---

### 🟡 6. Refresh data lần đầu fetch dữ liệu của tất cả users

**File:** `src/context/AppContext.tsx`

**Vấn đề:** `refreshAllData` dùng `currentUser ? '?userId=...' : ''` khi gọi API.
Lần đầu mount `currentUser = null`, nên app fetch toàn bộ events/tasks/notifications
của mọi user, gây flash dữ liệu người khác lên màn hình.

**Fix:** Tách làm 2 giai đoạn: (1) chỉ fetch `/api/users` để xác định user hiện
tại (từ localStorage hoặc user đầu tiên); (2) khi đã có user thì mới fetch các
endpoint theo `userId`. Nếu chưa có user thì set state về mảng rỗng.

---

### 🟡 7. Dropdown trong Navbar không đóng khi click ngoài / Esc

**File:** `src/components/Navbar.tsx`

**Vấn đề:** Menu user và menu thông báo mở ra nhưng chỉ đóng khi click vào chính
nút hoặc item, không đóng khi click ra ngoài hay ấn Escape (UX tệ).

**Fix:** Dùng `useRef` bám vào wrapper của mỗi dropdown + `useEffect` lắng nghe
`mousedown` và `keydown` (Escape) để tự đóng.

---

### 🟡 8. Code chết trong `getWeekdayNameInTz`

**File:** `src/utils/time.ts`

**Vấn đề:** Biến `weekdayIndex` được tính bằng `weekday: 'narrow'` rồi ép sang
`Number()` (kết quả luôn là `NaN`) và không bao giờ dùng.

**Fix:** Xóa dòng đó, giữ lại logic format trực tiếp bằng `vi-VN`.

---

### 🟢 9. Endpoint preferences cho phép ghi đè dữ liệu bừa

**File:** `server.ts` (`PUT /api/users/:userId/preferences`)

**Vấn đề:** Merge trực tiếp `...req.body` vào preferences → client có thể gửi
`{userId: "usrx", dailyMaxStudyHours: 9999, reminderAdvanceMinutes: -5}` làm
hỏng cấu hình.

**Fix:** Whitelist từng field, validate kiểu dữ liệu, regex giờ (`HH:MM`),
khoảng hợp lệ cho số giờ/phút, và luôn giữ `userId` khớp với param URL.

---

### 🟢 10. Vite chặn host preview (e2b)

**File:** `vite.config.ts`

**Vấn đề:** Khi mở live preview trong e2b/Arena, Vite trả 403 vì hostname không
có trong danh sách cho phép.

**Fix:** Thêm `host: '0.0.0.0'` và `allowedHosts: ['localhost','127.0.0.1','.e2b.app',
APP_URL hostname]`.

---

## Kiểm thử đã chạy

| Lệnh | Kết quả |
|------|---------|
| `npx tsc --noEmit` | ✅ Không có lỗi type |
| `npm run build` | ✅ Build thành công (client + server bundle) |
| `curl POST /api/auth/login` với sai mật khẩu | ✅ Trả 401 (backdoor đã bị khóa mặc định) |
| `localToUtcIso` với London mùa đông/mùa hè, Tokyo, New York | ✅ Đúng UTC offset (kể cả DST) |
| Dev server trên `0.0.0.0:3000` | ✅ Chạy ổn định, preview host được chấp nhận |

## Chạy app

```bash
npm install
npm run dev    # dev server tại http://localhost:3000
npm run build  # production build vào dist/
npm start      # chạy production
```

Tài khoản mẫu (seed data) có sẵn: **nguyenvana@gmail.com / password123** hoặc
**son.le@gmail.com / password123**. Để bật backdoor cho demo nhanh, đặt
`DEMO_MODE=true` trong `.env`; ngược lại hệ thống yêu cầu mật khẩu chính xác.
