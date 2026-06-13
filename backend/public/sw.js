self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { body: event.data?.text() ?? "" };
  }

  const title = data.title ?? "Honey App";
  const options = {
    body: data.body ?? "",
    tag: data.tag ?? "honey-app",
    data: { url: data.url ?? "/dashboard.html", ...(data.data ?? {}) },
    icon: "/brand/honey-app-logo.png",
    badge: "/brand/honey-app-logo.png",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? "/dashboard.html";
  const absoluteUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes("/dashboard.html") && "focus" in client) {
          return client.focus();
        }
      }
      return clients.openWindow(absoluteUrl);
    }),
  );
});
