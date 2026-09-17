# Hướng dẫn Deploy PlanAI Study Scheduler

Ứng dụng này là **full-stack hybrid**: frontend React/Vite + backend Express.
Tùy nền tảng, backend chạy theo 1 trong 2 chế độ — **code đã tự động nhận diện**,
bạn không cần sửa gì:

| Nền tảng | Chế độ | Cấu hình |
|---|---|---|
| Local / AI Studio / Cloud Run / Render / Railway / VPS | Tiến trình Node thường trực (`npm run dev` hoặc `npm run build && npm start`) | Tự đọc `process.env.PORT` |
| **Vercel** (serverless) | Function `api/index.ts` xử lý mọi request `/api/*` | Tự động qua `vercel.json` |

---

## Deploy lên Vercel

1. Push code lên GitHub (branch này đã chứa `api/index.ts` + `vercel.json`).
2. Trên [vercel.com](https://vercel.com) → **Add New → Project** → chọn repo.
3. Vercel sẽ tự đọc `vercel.json`:
   - **Build Command:** `vite build`
   - **Output Directory:** `dist`
   - Function `/api` từ thư mục `api/`
4. *(Tuỳ chọn)* Vào **Settings → Environment Variables** thêm `GEMINI_API_KEY`
   để bật tính năng AI. Thiếu key thì app vẫn chạy, chỉ mất gợi ý AI thông minh.
5. Bấm **Deploy**.

### ⚠️ Giới hạn quan trọng trên Vercel

Vercel là nền tảng **serverless** — filesystem của function là **read-only**,
chỉ ghi được vào `/tmp` và **mất khi lambda khởi động lại (cold start) hoặc
redeploy**. Trên Vercel, dữ liệu (tài khoản đăng ký, sự kiện, task...) sẽ:

- Hoạt động bình thường trong lúc instance còn "ấm"
- **Reset về dữ liệu mẫu** khi serverless instance khởi động lại

Đây là giới hạn của mô hình file-JSON + serverless, không phải bug. Nếu cần
lưu trữ bền vững, chọn một trong hai hướng:

- **Giữ Vercel** nhưng thay `data/db.json` bằng database thật
  (Neon / Supabase / MongoDB Atlas — đều có free tier).
- **Chuyển sang nền tảng tiến trình thường trực** (giữ nguyên 100% code hiện tại):
  - Google Cloud Run — `gcloud run deploy --source .`
  - Render / Railway — Build: `npm run build`, Start: `npm start`

---

## Chạy local

```bash
npm install
npm run dev    # http://localhost:3000 (server Express + Vite middleware)
```

Tài khoản mẫu: `nguyenvana@gmail.com / password123` hoặc
`son.le@gmail.com / password123`.

---

## 📱 Cài làm app độc lập trên điện thoại (PWA)

Ứng dụng đã được đóng gói thành **PWA** — cài trực tiếp lên màn hình chính,
không cần App Store / Google Play, và **chạy độc lập cả khi mất mạng hoặc
máy chủ không khả dụng** (chế độ Offline lưu dữ liệu vào bộ nhớ thiết bị).

### Cách cài

- **Android (Chrome/Edge):** mở trang web → bấm nút **"Cài PlanAI lên điện thoại"**
  trong banner xuất hiện (hoặc menu ⋮ → *Thêm vào Màn hình chính*).
- **iPhone/iPad (Safari):** mở trang web → nút **Chia sẻ** ⬆️ →
  **"Thêm vào Màn hình chính"**.

### Chế độ hoạt động

| Chế độ | Dữ liệu | Khi nào dùng |
|---|---|---|
| **Tự động** (mặc định) | Dò máy chủ khi mở app; không có server → tự chuyển Offline | Dùng hằng ngày |
| **Online** | Lưu trên máy chủ | Khi muốn đồng bộ qua backend |
| **Offline** | Lưu ngay trên thiết bị (localStorage) | Khi máy chủ không khả dụng / muốn dùng hoàn toàn độc lập |

Chuyển đổi tại: **Hồ sơ & Cài đặt → Chế độ điện thoại độc lập**.

> Lưu ý: dữ liệu Offline nằm trong bộ nhớ trình duyệt của thiết bị. App đang
> chạy offline tự động quay lại máy chủ (ở chế độ Tự động) nếu server truy
> cập được trở lại khi mở app lần sau.

---

## 🔧 Xử lý lỗi "HTTP 500" khi đăng nhập trên Vercel

Nếu đăng nhập báo **"Đăng nhập không thành công (HTTP 500)"** trên bản deploy
Vercel, nghĩa là **serverless function đã crash khi khởi động** (trả body rỗng).
Đã khắc phục sẵn trong code hiện tại:

1. **Function `api/index.ts`** do Vercel tự biên dịch — có crash-proof wrapper:
   mọi lỗi trong function đều trả về JSON có thông điệp cụ thể thay vì body
   rỗng tối nghĩa.
2. **Tự động fallback Offline** — nếu backend 500/404, app (chế độ Tự động)
   tự chuyển sang lưu trữ trên thiết bị và **vẫn đăng nhập được ngay**.

> ⚠️ **Bài học 16/09/2026:** cơ chế "self-bundled" `api/index.cjs` (bundle
> esbuild sẵn, commit vào repo + buildCommand rebuild trên Vercel — PR #9/#10)
> khiến **mọi deployment fail** kể từ đó (build Vercel không chạy được cấu hình
> này). Đã quay về đúng cấu hình thời kỳ deploy xanh: function `api/index.ts`,
> `buildCommand: "vite build"`, không commit artifact bundle vào repo.
> File `api/index.cjs` đã được thêm vào `.gitignore` để tránh tái phạm.

### Cách khắc phục khi gặp 500

1. **Redeploy với code mới nhất** (merge branch này rồi deploy lại).
2. Nếu vẫn lỗi: vào **Vercel Dashboard → project → Logs** xem dòng
   `[planai] ...` đỏ để biết nguyên nhân chính xác (function khi load luôn in
   banner `[planai] api function loaded — node ...`).
3. **Giải pháp tức thì:** mở app → tab **Hồ sơ & Cài đặt → Chế độ điện thoại
   độc lập** → chọn **Offline** → đăng nhập lại bình thường (dữ liệu lưu trên
   thiết bị, không cần server).

### 🚨 Bài học 17/09/2026: `"type": "module"` trong package.json phá vỡ function Vercel

**Triệu chứng:** MỌI request `/api/*` trả **HTTP 500 body rỗng** (frontend báo
"Lỗi máy chủ (HTTP 500). Backend đã crash hoặc cold-start thất bại…"), kể cả
`/api/time`. Không có dòng JSON lỗi từ crash-proof wrapper → function crash
ngay **khi load module** (cold start), chưa kịp xử lý request nào.

**Nguyên nhân gốc:** `package.json` có `"type": "module"`. Vercel biên dịch
function theo module format của project:

- Chế độ **ESM**: `import app from "../server"` (không có đuôi file) trong
  `api/index.ts` **bất hợp lệ** — bộ phân giải ESM của Node bắt buộc import
  tương đối phải kèm đuôi `.js` → `ERR_MODULE_NOT_FOUND` khi load module.
- Kể cả khi toolchain biên dịch ra CJS, flag `"type": "module"` khiến esbuild
  phát `__toESM(require("../server"), 1)` — `.default` trỏ về object namespace
  thay vì app Express → `app is not a function` → 500 mỗi request
  (đã tái hiện được local bằng esbuild của chính project).

**Fix (đã áp dụng):**

1. **Xóa `"type": "module"` khỏi `package.json`** — function quay lại CommonJS
   (pattern chuẩn của Vercel + Express): `require("../server")` resolve đúng,
   interop trả về app Express. KHÔNG ảnh hưởng gì đến `vite build`, `tsx`
   (dev) hay `node dist/server.cjs` (start) — cả ba đều không cần flag này.
   ⚠️ **LUÔN tránh thêm `"type": "module"` lại vào `package.json`** — nó sẽ
   phá deploy Vercel một lần nữa.
2. **`@google/genai` chuyển sang dynamic import** trong `getAIClient()`
   (`import type` cho type, `await import(...)` khi cần client) — nếu sau này
   gói AI SDK gặp sự cố đóng gói trên Vercel, chỉ tính năng AI bị downgrade
   (dùng lý do do thuật toán sinh ra), **không kéo cả API login/lịch xuống 500**.

**Đã kiểm chứng (mô phỏng Vercel function cold-start local):** module load OK,
14/14 endpoint trả đúng status (login 200 + token, sai mật khẩu 401, register
201, CRUD 200/201, AI recommend 200 không cần GEMINI_API_KEY, 404 JSON).
`npm run build`, `npm start`, `npm run dev` đều chạy bình thường sau khi sửa.

---

## 🔄 Quy trình khi bắt đầu phiên coding mới

Mỗi phiên agent làm việc trên một branch riêng `arena/<session-id>-study-app`
được tạo từ `main`. Để đưa thay đổi lên production:

1. Commit lên branch của phiên (`arena/...-study-app`).
2. `git push origin arena/...-study-app`.
3. Tạo PR vào `main` rồi merge (ví dụ: `gh pr create --base main` →
   `gh pr merge --merge`).
4. Merge vào `main` sẽ kích hoạt **Vercel tự động redeploy** production.
5. Theo dõi check **Vercel** trên commit/PR ở GitHub:
   - ✅ **Xanh:** deploy thành công, app đã cập nhật.
   - ❌ **Đỏ:** mở **Vercel Dashboard → deployment lỗi → tab Build Logs**,
     copy **dòng lỗi cuối cùng** gửi lại cho agent để xử lý. Nếu có lỗi runtime
     thì function API (`api/index.ts`) sẽ in thông báo rõ ràng với tiền tố
     `[planai]` ngay trong logs thay vì body rỗng tối nghĩa như trước. Bản
     thân code build locally đã được xác nhận pass
     (`vite build` + bundle esbuild < 5 giây).

> 📌 **Ghi chú 16/09/2026:** commit `eb4c79b` của phiên trước chưa kịp push
> nên đã mất khi sandbox cũ bị thu hồi (không tồn tại trên GitHub). Nội dung
> dự kiến của commit đó — hướng dẫn workflow này, banner/log chẩn đoán
> `[planai]` cho API function, và chuyển `esbuild` sang `dependencies`
> (phòng trường hợp Vercel bỏ cài devDependencies khi `NODE_ENV=production`)
> — đã được dựng lại toàn bộ trong commit hiện tại.
