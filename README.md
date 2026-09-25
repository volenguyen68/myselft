# Võ Lê Nguyên — Trang giới thiệu cá nhân

Website tiếng Việt lấy cảm hứng từ Apple, nền đen xanh với ánh sáng xanh lam và xanh ngọc. Chân dung dùng nguyên bản PNG 2072 × 3106 do Nguyên chọn, không chỉnh ảnh hoặc thêm khung. Chữ tên hiện lần lượt với chuyển động 3D, ánh bạc xanh lướt trên tên; hiệu ứng được phát lại khi cuộn về đầu. Phần giới thiệu sáng dần từng từ theo vị trí cuộn. Đây là ảnh chân dung có hiệu ứng nghiêng theo chuột, không phải mô hình 3D xoay tự do.

Thông tin được dùng theo yêu cầu:

- Võ Lê Nguyên, sinh ngày 06/08/2008.
- Đang học tại Đại học Công nghiệp TP. Hồ Chí Minh.
- Facebook và Locket nằm cùng phần giới thiệu; Instagram và Threads hiển thị `....` để thêm sau.
- Chỉ có hai nút: **Để sau** → “có duyên gặp lại nhé”; **OK** → “kết bạn ngay nào bạn ơi”.

## Chạy và chỉnh nội dung

Mở `site/index.html` để xem ngay. Hoặc chạy `python -m http.server 8765 --directory site`, rồi mở `http://localhost:8765`.

Nội dung lời chào, các liên kết mạng xã hội và cấu hình công khai ở `site/config.js`; ngày sinh và trường học ở `site/index.html`. Không có thư viện bên ngoài cần tải khi mở trang. Hiệu ứng tự giảm khi thiết bị bật Reduce Motion.

## Đưa lên GitHub Pages

Kho đích: https://github.com/volenguyen68/myselft

Bản trong thư mục làm việc đã có Git, remote `origin` và commit. Bạn có thể nhấp đúp **PUSH-TO-GITHUB.cmd** để tự đẩy bản đã lưu; Git có thể yêu cầu đăng nhập tài khoản của bạn. Nếu tải bản ZIP và giải nén ở thư mục khác, dùng các bước khởi tạo Git bên dưới.

1. Đẩy toàn bộ mã nguồn này lên nhánh `main`. Không đưa tệp khóa riêng hoặc thư mục `work` lên GitHub.
2. Trong repository, chọn **Settings → Pages → Build and deployment → Source → GitHub Actions**.
3. Chọn **Actions → Publish personal website → Run workflow** nếu chưa có lần chạy sau khi đổi cài đặt.
4. Khi workflow thành công, GitHub hiển thị URL của trang trong mục Pages. URL dự kiến: `https://volenguyen68.github.io/myselft/` — chỉ hoạt động sau khi triển khai thành công.

Workflow chỉ xuất bản thư mục `site/`; mã máy chủ và khóa không được đưa vào trang công khai.

Nếu máy chưa khởi tạo Git:

```powershell
git init -b main
git add .
git commit -m "Build personal introduction website"
git remote add origin https://github.com/volenguyen68/myselft.git
git push -u origin main
```

Nếu đã có kho Git và remote, chỉ cần `git push -u origin main`.

## Bật thông báo Pushover trên iPhone

Phần máy chủ đã được triển khai tại `https://personal-intro-notifications.volenguyen68.workers.dev/events` và địa chỉ này đã được điền trong `site/config.js`. Khóa Pushover nằm trong Cloudflare Secrets, không có trong kho Git. Cấu hình hiện nhận sự kiện từ origin GitHub Pages `https://volenguyen68.github.io`; xem bằng file hoặc localhost chỉ thử giao diện, không gửi thông báo.

Các bước dưới đây dành cho lần cài đặt lại hoặc chuyển tài khoản; không cần chạy lại để đẩy bản giao diện này lên GitHub.

GitHub Pages không chạy mã máy chủ. Thư mục `worker/` là máy chủ Cloudflare Workers, giữ kín khóa Pushover và nhận ba sự kiện: `view`, `later`, `ok`.

1. Cài Pushover trên iPhone, đăng nhập và bật quyền thông báo iOS.
2. Lấy **User Key** trong tài khoản Pushover và **Application API Token** từ ứng dụng đã đăng ký ở https://pushover.net/apps. Hai khóa khác nhau, không phải API token của dịch vụ khác.
3. Tạo/đăng nhập tài khoản Cloudflare. Cài Node.js để dùng công cụ triển khai.
4. Từ thư mục `worker/`, chạy:

```powershell
npx wrangler login
npx wrangler deploy
npx wrangler secret put PUSHOVER_APP_TOKEN
npx wrangler secret put PUSHOVER_USER_KEY
```

Mỗi lệnh `secret put` sẽ yêu cầu nhập giá trị riêng. Không đưa khóa vào lệnh, ảnh chụp, GitHub hoặc `site/config.js`. Có thể đặt thêm secret `PUSHOVER_DEVICE` nếu chỉ muốn nhận trên một thiết bị; để trống sẽ gửi tới các thiết bị hoạt động trong tài khoản.

5. Trong `worker/wrangler.jsonc`, `ALLOWED_ORIGIN` là `https://volenguyen68.github.io`, không gồm `/myselft/`. Nếu dùng tên miền khác phải sửa origin và triển khai lại.
6. Sao chép địa chỉ Worker được trả về và thêm `/events`; điền vào `notificationEndpoint` trong `site/config.js`, rồi đẩy thay đổi lên GitHub. **Không điền URL giả hoặc chỉ thêm khóa ở frontend.**
7. Mở trang trong tab mới. iPhone sẽ nhận thông báo lượt mở trang; thử từng nút để kiểm tra hai thông báo còn lại.

### Cách tính sự kiện và giới hạn

- Mỗi tab trình duyệt gửi tối đa một thông báo lượt mở và một thông báo cho mỗi lựa chọn. Tải lại cùng tab không gửi lại sự kiện đã được chấp nhận. Chỉ mở trang khi đang hiển thị mới tính lượt xem.
- Máy chủ dùng hàng đợi bền vững, xóa dấu nhận diện phiên sau khoảng 24 giờ. Không gửi tên khách, vị trí, địa chỉ IP hoặc lịch sử truy cập tới Pushover. IP chỉ được dùng tạm thời để hạn chế spam ở Cloudflare.
- Giới hạn mặc định: 12 yêu cầu/phút/IP, 20 sự kiện mới/phút toàn trang, tối đa 50 sự kiện đang chờ và 400 dấu sự kiện trong 24 giờ. Đây là cấu hình cho trang cá nhân, có thể điều chỉnh sau.
- CORS chỉ chặn yêu cầu từ website khác trong trình duyệt; không phải cơ chế xác thực chống mọi chương trình tự gửi yêu cầu. Có giới hạn gửi để giảm spam. Không thể nhận diện chính xác ai đã mở trang nếu họ không tự cung cấp thông tin.
- Pushover chấp nhận tin không đảm bảo iPhone đã hiển thị; thiết bị phải có mạng và cho phép thông báo. Hết hạn mức hoặc sai khóa sẽ làm tin thất bại. Mất kết nối sau khi đã gửi có thể tạo kết quả không xác định; không tự gửi lại trong trường hợp đó để tránh spam.
- Lời nhắn của hai nút luôn xuất hiện ngay cả khi dịch vụ thông báo gặp lỗi. Giao diện không tuyên bố chủ trang đã nhận tin.

## Kiểm tra

```powershell
node --check site/app.js
node --check site/config.js
node --test worker/index.test.mjs
```

Kiểm tra gồm ba sự kiện hợp lệ, dữ liệu sai/quá lớn, origin, giới hạn yêu cầu, chống trùng, thứ tự hàng đợi, lỗi Pushover và trường hợp gửi không chắc chắn. Các bài kiểm tra dùng dịch vụ giả lập, không gửi tin thật.

Tài liệu chính thức: [Pushover API](https://pushover.net/api), [Cloudflare secrets](https://developers.cloudflare.com/workers/configuration/secrets/), [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
