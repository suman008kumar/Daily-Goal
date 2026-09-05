const isSupported = () =>
  typeof window !== "undefined" &&
  "Notification" in window;

export const getNotificationPermission = () => {
  if (!isSupported()) {
    return "unsupported";
  }

  return Notification.permission;
};

export const requestPermission =
  async () => {
    if (!isSupported()) {
      return "unsupported";
    }

    if (
      Notification.permission ===
      "granted"
    ) {
      return "granted";
    }

    if (
      Notification.permission ===
      "denied"
    ) {
      return "denied";
    }

    try {
      return await Notification.requestPermission();
    } catch (error) {
      console.warn(
        "Notification permission request failed.",
        error
      );

      return "denied";
    }
  };

export const sendNotification = (
  title,
  options = {}
) => {
  if (!isSupported()) {
    return null;
  }

  if (
    Notification.permission !==
    "granted"
  ) {
    return null;
  }

  try {
    const notification =
      new Notification(
        title || "Daily Goal",
        {
          icon:
            options.icon ||
            "/favicon.svg",

          body:
            options.body ||
            "Daily Goal has an update for you.",

          tag:
            options.tag ||
            "daily-goal",

          silent:
            options.silent ?? false,

          requireInteraction:
            options.requireInteraction ??
            false,

          ...options,
        }
      );

    if (options.autoClose !== false) {
      const duration =
        Number(
          options.autoCloseDuration
        ) || 5000;

      window.setTimeout(() => {
        try {
          notification.close();
        } catch {
          // Notification may already be closed.
        }
      }, duration);
    }

    return notification;
  } catch (error) {
    console.warn(
      "Unable to create browser notification.",
      error
    );

    return null;
  }
};

export const sendPhoneAlert = () =>
  sendNotification(
    "📱 Phone detected",
    {
      body:
        "Try to keep your phone away during your study session.",
      tag: "daily-goal-phone",
    }
  );

export const sendDrowsinessAlert = () =>
  sendNotification(
    "😴 You may be getting sleepy",
    {
      body:
        "Take a short break and refresh your focus.",
      tag: "daily-goal-drowsiness",
    }
  );

export const sendSessionCompleteNotification =
  () =>
    sendNotification(
      "🎉 Daily Goal Completed!",
      {
        body:
          "Great work! You completed your study goal.",
        tag: "daily-goal-complete",
        requireInteraction: true,
      }
    );

export const sendBreakNotification = () =>
  sendNotification(
    "☕ Break time",
    {
      body:
        "Take a short break before your next focused session.",
      tag: "daily-goal-break",
    }
  );

export const sendFocusNotification = (
  message
) =>
  sendNotification(
    "🎯 Daily Goal",
    {
      body:
        message ||
        "Stay focused and keep going!",
      tag: "daily-goal-focus",
    }
  );

const notificationService = {
  isSupported,
  getNotificationPermission,
  requestPermission,
  sendNotification,
  sendPhoneAlert,
  sendDrowsinessAlert,
  sendSessionCompleteNotification,
  sendBreakNotification,
  sendFocusNotification,
};

export default notificationService;