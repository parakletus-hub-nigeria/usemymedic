import { format } from "date-fns";

interface IcsEvent {
  title: string;
  description?: string;
  startDate: Date;
  durationMins: number;
  meetLink?: string;
}

function pad(d: Date): string {
  return format(d, "yyyyMMdd'T'HHmmss");
}

export function generateIcs(event: IcsEvent): string {
  const start = event.startDate;
  const end = new Date(start.getTime() + event.durationMins * 60000);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MyMedic//EN",
    "BEGIN:VEVENT",
    `DTSTART:${pad(start)}`,
    `DTEND:${pad(end)}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description || "MyMedic Consultation"}`,
    ...(event.meetLink ? [`URL:${event.meetLink}`, `LOCATION:${event.meetLink}`] : []),
    `UID:${crypto.randomUUID()}@mymedic`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

export function downloadIcs(event: IcsEvent) {
  const content = generateIcs(event);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `mymedic-appointment.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
