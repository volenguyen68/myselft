// Chỉ đặt thông tin công khai ở đây. KHÔNG đặt Pushover token hoặc user key.
window.PROFILE = Object.freeze({
  name: "Võ Lê Nguyên",
  eyebrow: "Một lời chào. Một kết nối mới.",
  intro: "Một góc nhỏ của mình.\nCuộn xuống và mình làm quen nhé.",
  socials: [
    { label: "Facebook", href: "https://www.facebook.com/share/vlnguyen.0608", mark: "f" },
    { label: "Locket", href: "https://locket.cam/vlnguyen.68", mark: "♡" },
    { label: "Instagram", href: "", mark: "◎" },
    { label: "Threads", href: "", mark: "@" },
  ],
  invitation: "Hãy kết bạn với mình để biết thêm về mình nhé :DD",
  signature: "Võ Lê Nguyên. Rất vui vì bạn đã ở đây.",
  okMessage: "kết bạn ngay nào bạn ơi",
  laterMessage: "có duyên gặp lại nhé",
  // URL HTTPS của Cloudflare Worker, ví dụ: https://your-worker.your-account.workers.dev/events
  notificationEndpoint: "https://personal-intro-notifications.volenguyen68.workers.dev/events",
  notifyOnVisit: true,
});
