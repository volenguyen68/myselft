# Võ Lê Nguyên — Trang giới thiệu cá nhân

Website tiếng Việt lấy cảm hứng từ Apple, nền đen xanh với ánh sáng xanh lam và xanh ngọc. Chân dung dùng nguyên bản PNG 2072 × 3106 do Nguyên chọn, không chỉnh ảnh hoặc thêm khung. Chữ tên hiện lần lượt với chuyển động 3D, ánh bạc xanh lướt trên tên; hiệu ứng được phát lại khi cuộn về đầu. Phần giới thiệu sáng dần từng từ theo vị trí cuộn. Đây là ảnh chân dung có hiệu ứng nghiêng theo chuột, không phải mô hình 3D xoay tự do.

Bản tương tác có nền hạt sáng, điểm sáng theo chuột, các ghi chú nổi quanh chân dung, dòng chữ chuyển động, liên kết mạng xã hội nghiêng nhẹ khi rê chuột và hạt sáng khi nhấn OK. Hiệu ứng tự giảm khi bật Reduce Motion và nền hạt dừng khi tab bị ẩn. Ảnh gốc và hai lời nhắn được giữ nguyên.

Thông tin được dùng theo yêu cầu:

- Võ Lê Nguyên, sinh ngày 06/08/2008.
- Đang học tại Đại học Công nghiệp TP. Hồ Chí Minh.
- Facebook và Locket nằm cùng phần giới thiệu; Instagram và Threads hiển thị `....` để thêm sau.
- Chỉ có hai nút: **Để sau** → “có duyên gặp lại nhé”; **OK** → “kết bạn ngay nào bạn ơi”.

## Website và trang quản trị

Font được nhúng trực tiếp trong `site/assets/fonts/`: Inter Variable 4.1 cho tên và nội dung, SVN-Jabana cho chữ viết tay. Trình duyệt tự tải bản WOFF2, không cần khách cài font trên máy hoặc kết nối tới dịch vụ font bên ngoài. Jabana có OTF dự phòng; hai font được preload trong HTML. Inter kèm giấy phép tại `site/assets/fonts/Inter-LICENSE.txt` và nguồn chính thức https://rsms.me/inter/.

- Website chính: [Trang của Nguyên](https://personal-intro-notifications.volenguyen68.workers.dev/).
- Quản trị riêng: [Quản lý truy cập](https://personal-intro-notifications.volenguyen68.workers.dev/admin), yêu cầu mật khẩu.
- Kho mã nguồn: [volenguyen68/myselft](https://github.com/volenguyen68/myselft).
- [Địa chỉ GitHub Pages cũ](https://volenguyen68.github.io/myselft/) chỉ chuyển hướng sang website chính. Workflow Pages xuất bản **`redirect/`**, không xuất bản `site/`.

Cloudflare Worker phục vụ giao diện trong `site/`, kiểm tra quyền truy cập trước khi trả HTML hoặc tài nguyên, nhận sự kiện tại `/events` và cung cấp trang quản trị. Giữ **`assets.run_worker_first: true`** trong `worker/wrangler.jsonc`; nếu bỏ cơ chế này, tài nguyên có thể được phục vụ trước khi kiểm tra IP.

## Chạy và chỉnh nội dung

Để xem giao diện cục bộ, mở `site/index.html` hoặc chạy:

```powershell
python -m http.server 8765 --directory site
```

Sau đó mở `http://localhost:8765`. Bản xem tĩnh chỉ dùng để chỉnh giao diện, không thay thế kiểm tra chặn IP, đăng nhập và thông báo trên Worker.

Lời chào, mạng xã hội và cấu hình công khai ở `site/config.js`; ngày sinh và trường học ở `site/index.html`. Không có thư viện bên ngoài cần tải khi mở trang. Hiệu ứng tự giảm khi thiết bị bật Reduce Motion.

## Quản lý và chặn IP

Thông báo Pushover có liên kết `/admin?visit=<UUID>`. Đây là mã lượt truy cập không chứa IP; mở liên kết yêu cầu đăng nhập và **không tự chặn**. Dashboard đưa lượt được chọn lên đầu, có tìm kiếm IP, danh sách đang chặn và truy cập gần đây. Chọn **Chặn IP** hoặc **Bỏ chặn** để thay đổi quyền truy cập.

Dashboard có tổng lượt mở, số IP đã ghi nhận, IP quay lại và IP đang chặn; từng IP có bộ đếm `visitCount`, mốc bắt đầu đếm `countingSince`, loại thiết bị và thời gian gần nhất. Có thể tìm theo IP/thiết bị, lọc trạng thái và sắp xếp theo số lượt hoặc thời gian.

Một lượt được tính khi máy chủ trả thành công HTML trang chính cho yêu cầu mở trang (`GET /` hoặc `/index.html`), bao gồm tải lại. Không tính ảnh, font, API kiểm tra quyền truy cập, trang quản trị, sự kiện nút bấm, tải trước/prerender đã được trình duyệt đánh dấu, hoặc IP bị chặn. Đây là số lượt HTML được máy chủ ghi nhận, không phải số người duy nhất; trình duyệt phục hồi trang từ bộ nhớ có thể không gửi yêu cầu mới. Bộ đếm không phụ thuộc việc gửi Pushover thành công. Bản ghi cũ bắt đầu từ 0, không suy đoán số lượt trước khi có tính năng này.

Bộ đếm cộng dồn trong thời gian bản ghi IP còn được lưu, giữ nguyên khi chặn/bỏ chặn; nó đặt lại nếu bản ghi đã hết hạn hoặc bị thay thế theo giới hạn 500 IP. Khi bộ lưu thống kê đầy, trang vẫn mở nếu lần kiểm tra truy cập tiếp theo xác nhận IP được phép.

IP bị chặn nhận đúng thông báo “bạn đã bị block🤔”; HTML, tài nguyên, `/access` và sự kiện thông báo đều bị chặn. Trang `/admin` vẫn truy cập được để chủ trang có thể bỏ chặn mạng của mình. Tab công khai đang mở kiểm tra quyền truy cập mỗi 15 giây khi đang hiển thị.

IP gần đây được giữ 7 ngày, tối đa 500 bản ghi; IP đã chặn được giữ đến khi bỏ chặn. IP có thể dùng chung hoặc thay đổi, nên cùng IP không chứng minh là cùng người hay cùng thiết bị. Nhãn thiết bị chỉ là ước đoán từ trình duyệt; không lưu chuỗi User-Agent đầy đủ.

Nhãn thiết bị trong quản trị và Pushover có tên model **khi trình duyệt gửi đủ thông tin**. Với iPhone, chỉ ánh xạ mã phần cứng rõ ràng đã biết (ví dụ `iPhone16,2` → `iPhone 15 Pro Max`, `iPhone10,1` / `iPhone10,4` → `iPhone 8`); Safari thông thường chỉ cho biết iPhone nên hiện `iPhone (chưa xác định đời máy)`. Không suy ra model từ số phiên bản iOS, mã `Mobile/15E148`, màn hình hay GPU.

Với Android, trang yêu cầu `Sec-CH-UA-Model` qua `Accept-CH`; trình duyệt hỗ trợ có thể gửi model trong các yêu cầu tiếp theo. Nếu không có, chỉ dùng model rõ ràng trong User-Agent, bỏ qua giá trị đã rút gọn như `K`. Không dùng `Critical-CH`, không tải lại trang để lấy model, không tăng lượt khi cập nhật nhãn từ sự kiện. Chỉ giữ nhãn ngắn đã kiểm tra, không giữ header gốc. Thông tin vẫn có thể bị giả mạo; IP dùng chung chỉ hiển thị nhãn từ lần ghi nhận gần nhất. Các bản ghi cũ cập nhật nhãn khi có lần truy cập/sự kiện mới.

Tham khảo: [mã thiết bị do DeviceKit duy trì](https://github.com/devicekit/DeviceKit/blob/master/Source/Device.generated.swift), [User-Agent Client Hints của Chrome](https://developer.chrome.com/docs/privacy-security/user-agent-client-hints), [giới hạn thông tin User-Agent trong Safari](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/).

IP nguyên bản chỉ nằm trong `AccessRegistry` riêng, không đưa vào URL quản trị hoặc gửi tới Pushover. Khóa giới hạn tần suất được băm có khóa riêng. Dấu chống trùng sự kiện trong hàng đợi thông báo hết hạn sau khoảng 24 giờ.

Thông tin đăng nhập của chủ trang đã được chuẩn bị trong tệp cục bộ `work/private/ADMIN-LOGIN.txt` ở thư mục làm việc **bên ngoài kho mã nguồn**. Không đưa tệp này hoặc thư mục `work` lên GitHub.

## Thông báo Pushover

Endpoint đang dùng là `https://personal-intro-notifications.volenguyen68.workers.dev/events`, được đặt trong `site/config.js`. Máy chủ nhận ba sự kiện: `view`, `later`, `ok`, rồi gửi qua hàng đợi bền vững. Pushover nhận loại sự kiện, thời gian Việt Nam, nhãn thiết bị ước đoán và liên kết quản trị bằng UUID; không nhận IP nguyên bản.

- Mỗi tab gửi tối đa một thông báo lượt mở và một thông báo cho mỗi lựa chọn. Tải lại cùng tab không gửi lại sự kiện đã được chấp nhận; tab phải đang hiển thị mới gửi thông báo lượt mở. Bộ đếm trong quản trị được ghi riêng trên máy chủ và vẫn tăng khi tải lại trang.
- Giới hạn mặc định: 12 yêu cầu/phút/IP, 20 sự kiện mới/phút toàn trang, tối đa 50 sự kiện đang chờ và 400 dấu sự kiện trong 24 giờ.
- Pushover chấp nhận tin không bảo đảm iPhone đã hiển thị: thiết bị cần có mạng và quyền thông báo. Nếu kết nối đứt sau khi gửi, hàng đợi không tự gửi lại trường hợp không rõ kết quả để tránh trùng tin.
- Hai lời nhắn phản hồi trên giao diện vẫn xuất hiện khi dịch vụ thông báo gặp lỗi.

`PUBLIC_ORIGIN` là origin của website Worker; `ALLOWED_ORIGIN` giữ origin GitHub Pages cũ. Khi đổi tên miền, cập nhật cấu hình origin và endpoint rồi triển khai lại. CORS và giới hạn tần suất giúp giảm yêu cầu không mong muốn; quyền quản trị dùng phiên đăng nhập riêng.

## Cấu hình bí mật và triển khai

Các giá trị riêng nằm trong Cloudflare Secrets, không ở frontend hoặc Git:

- `ADMIN_PASSWORD`: mật khẩu ngẫu nhiên ít nhất 32 ký tự.
- `ADMIN_SESSION_KEY`, `IP_HASH_KEY`: hai khóa ngẫu nhiên riêng, mỗi khóa ít nhất 32 ký tự.
- `PUSHOVER_APP_TOKEN`, `PUSHOVER_USER_KEY`: khóa ứng dụng và tài khoản Pushover.
- `PUSHOVER_DEVICE`: tùy chọn, nếu chỉ muốn gửi tới một thiết bị.

Để đặt hoặc đổi secret, chạy `npx wrangler secret put TEN_SECRET` từ thư mục `worker/` và nhập giá trị khi được hỏi. Không ghi giá trị bí mật vào câu lệnh hoặc `site/config.js`. Đổi `ADMIN_SESSION_KEY` làm hết hiệu lực phiên cũ; giữ ổn định `IP_HASH_KEY` để các IP đang chặn tiếp tục được đối chiếu đúng.

Triển khai cả giao diện và máy chủ từ thư mục gốc của kho:

```powershell
cd worker
npx wrangler deploy
```

Lệnh này xuất bản tài nguyên `../site`, các mô-đun Worker và cấu hình Durable Objects. Migration `v1` tạo `NotificationQueue`; migration **`v2` tạo `AccessRegistry`**. Giữ các migration đã triển khai trong `worker/wrangler.jsonc`. Nếu cần đăng nhập Cloudflare trên máy mới, chạy `npx wrangler login` trước.

Đẩy Git bằng Git hoặc `PUSH-TO-GITHUB.cmd` chỉ lưu mã nguồn và kích hoạt workflow Pages xuất bản trang chuyển hướng. **`git push` không triển khai thay đổi Worker hoặc website chính**; sau khi sửa `site/` hay `worker/`, cần chạy `npx wrangler deploy`.

## Kiểm tra

Chạy từ thư mục gốc của kho:

```powershell
node --check site/app.js
node --check site/config.js
node --check site/effects.js
node --check worker/index.mjs
node --check worker/admin-auth.mjs
node --check worker/admin-ui.mjs
node --check worker/access-registry.mjs
node --test worker/*.test.mjs
```

Kiểm tra dùng dịch vụ giả lập, không gửi tin thật: chữ ký và hạn phiên đăng nhập, CSRF, IP đáng tin cậy, vòng đời dữ liệu, chặn/bỏ chặn, truy cập quản trị khi IP bị chặn, xử lý registry lỗi không để lộ nội dung, sự kiện thông báo, chống trùng và hàng đợi Pushover.

Bản triển khai đã được kiểm tra: khách chưa đăng nhập được chuyển tới trang đăng nhập, API quản trị trả 401; IP thử nghiệm bị chặn ở HTML/tài nguyên/kiểm tra truy cập, quản trị vẫn mở được, và bỏ chặn khôi phục truy cập. Thông báo thử nghiệm đã đạt trạng thái `sent` ở hàng đợi.

Tài liệu chính thức: [Pushover API](https://pushover.net/api), [Cloudflare secrets](https://developers.cloudflare.com/workers/configuration/secrets/), [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).
