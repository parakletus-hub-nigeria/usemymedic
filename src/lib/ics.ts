import { format } from "date-fns";

interface IcsEvent {
  title: string;
  description?: string;
  startDate: Date;
  durationMins: number;
  meetLink?: string;
  cancel?: boolean;
  uid?: string;
}

function pad(d: Date): string {
  return format(d, "yyyyMMdd'T'HHmmss");
}

export function generateIcs(event: IcsEvent): string {
  const start = event.startDate;
  const end = new Date(start.getTime() + event.durationMins * 60000);
  const uid = event.uid || crypto.randomUUID();

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MyMedic//EN",
    ...(event.cancel ? ["METHOD:CANCEL"] : ["METHOD:PUBLISH"]),
    "BEGIN:VEVENT",
    `DTSTART:${pad(start)}`,
    `DTEND:${pad(end)}`,
    `SUMMARY:${event.cancel ? "[CANCELLED] " : ""}${event.title}`,
    `DESCRIPTION:${event.description || "MyMedic Consultation"}`,
    ...(event.cancel ? ["STATUS:CANCELLED"] : []),
    ...(event.meetLink ? [`URL:${event.meetLink}`, `LOCATION:${event.meetLink}`] : []),
    `UID:${uid}@mymedic`,
    "SEQUENCE:1",
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
  a.download = event.cancel ? `mymedic-cancellation.ics` : `mymedic-appointment.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
