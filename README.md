# Biến ý tưởng thành chuyển động

Motion graphic tiếng Việt dài 15 giây, khung dọc 1080 × 1920, 30 fps. Bốn cảnh lần lượt trình bày hook, phát triển, ba điểm nhấn và thông điệp kết. Video không có âm thanh.

## Chạy preview

Yêu cầu Node.js 20 trở lên. Trong môi trường cloud này, dùng cache npm ở `/tmp`:

```bash
cd /workspace/Motion-graphic-Claude-Test-1
npm_config_cache=/tmp/motion-npm-cache npm ci
npm run dev
```

Mở địa chỉ do Vite in ra (thường là `http://localhost:5173`). Trang preview có nút phát/tạm dừng, phát lại, thanh tua và danh sách cảnh để nhảy nhanh. Thêm `?frame=390` vào địa chỉ để mở tại một frame cụ thể.

## Xuất video

Yêu cầu Chromium tại `/usr/bin/chromium` và FFmpeg. Chạy:

```bash
npm run render
```

Video được ghi vào [`out/motion-graphic.mp4`](out/motion-graphic.mp4) dưới dạng H.264, yuv420p, không âm thanh. Ảnh tĩnh để xem nhanh nằm tại [`out/preview.png`](out/preview.png). Lệnh dùng các thư mục cấu hình Chromium trong `/tmp` để chạy được trên cloud. Nếu Chromium ở vị trí khác, đặt biến `CHROMIUM_PATH` khi chạy, ví dụ `CHROMIUM_PATH=/đường/dẫn/chromium npm run render`.

## Chỉnh sửa

- Nội dung, bảng màu, kích thước và thời lượng cảnh: [`src/config.ts`](src/config.ts).
- Bố cục và chuyển động theo frame: [`src/Motion.tsx`](src/Motion.tsx).
- Trang preview và điều khiển: [`src/main.tsx`](src/main.tsx), [`src/preview.css`](src/preview.css).
- Đăng ký composition Remotion: [`src/remotion.tsx`](src/remotion.tsx).

Nếu thay đổi thời lượng tổng hoặc mốc cảnh, chỉnh `VIDEO` trong `src/config.ts`; khoảng 60 frame cuối nên được giữ ổn định để đọc thông điệp kết. Font Noto Sans Display được lưu tại `public/fonts` để giữ dấu tiếng Việt nhất quán giữa preview và video xuất. Giấy phép font nằm trong `public/fonts/LICENSE.txt`.
