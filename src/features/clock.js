export function initializeClock(timeElement, dateElement) {
  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const update = () => {
    const now = new Date();
    timeElement.dateTime = now.toISOString();
    timeElement.textContent = timeFormatter.format(now);
    dateElement.dateTime = now.toISOString().slice(0, 10);
    dateElement.textContent = dateFormatter.format(now);
  };

  update();
  const timerId = globalThis.setInterval(update, 15_000);
  return () => globalThis.clearInterval(timerId);
}
