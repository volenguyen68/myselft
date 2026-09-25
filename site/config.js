// Chỉ đặt thông tin công khai ở đây. KHÔNG đặt Pushover token hoặc user key.
window.PROFILE = Object.freeze({
  name: "Võ Lê Nguyên",
  eyebrow: "VÕ LÊ NGUYÊN / GÓC NHỎ CỦA MÌNH",
  intro: "Đây là một chút về mình.\nCuộn xuống, rồi mình kết bạn nhé.",
  socials: [
    { label: "Facebook", kind: "facebook", detail: "Võ Lê Nguyên", href: "https://www.facebook.com/vlnguyen.0608", mark: "f" },
    { label: "Locket", kind: "locket", detail: "vlnguyen.68", href: "https://locket.cam/vlnguyen.68", mark: "♡" },
    { label: "Instagram", kind: "instagram", href: "", mark: "◎" },
    { label: "Threads", kind: "threads", href: "", mark: "@" },
  ],
  invitation: "Hãy kết bạn với mình để biết thêm về mình nhé.",
  signature: "Bạn vừa ghé một góc của Nguyên. Cảm ơn bạn nhé.",
  okMessage: "kết bạn ngay nào bạn ơi",
  laterMessage: "có duyên gặp lại nhé",
  // URL HTTPS của Cloudflare Worker, ví dụ: https://your-worker.your-account.workers.dev/events
  notificationEndpoint: "https://personal-intro-notifications.volenguyen68.workers.dev/events",
  notifyOnVisit: true,
});
