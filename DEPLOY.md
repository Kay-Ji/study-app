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
