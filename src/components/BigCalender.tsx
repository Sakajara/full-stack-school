"use client";

import { Calendar, momentLocalizer, View, Views } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useEffect, useState } from "react";

const localizer = momentLocalizer(moment);

const BigCalendar = ({ data }: { data: { title: string; start: Date; end: Date }[] }) => {
  const hasSaturday = data.some((e) => e.start.getDay() === 6);
  const [view, setView] = useState<View>(hasSaturday ? Views.WEEK : Views.WORK_WEEK);

  // Phones show one day at a time.
  useEffect(() => {
    if (window.innerWidth < 640) setView(Views.DAY);
  }, []);

  // Evening and weekend classes are common, so the day runs 7:00 to 21:00.
  const day = new Date();
  return (
    <Calendar
      localizer={localizer}
      events={data}
      startAccessor="start"
      endAccessor="end"
      views={["work_week", "week", "day"]}
      view={view}
      style={{ height: "98%" }}
      onView={setView}
      min={new Date(day.getFullYear(), day.getMonth(), day.getDate(), 7, 0, 0)}
      max={new Date(day.getFullYear(), day.getMonth(), day.getDate(), 21, 0, 0)}
    />
  );
};

export default BigCalendar;
