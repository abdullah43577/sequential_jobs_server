import moment from "moment";

//   {
//       "date": "2025-04-10",
//       "start_time": "09:00 AM",
//       "end_time": "12:00 PM",
//       "break_time": "15 mins",
//       "interview_duration": "45 mins"
//     }

export const generateAvailableSlots = (date: string, startTime: string, endTime: string, breakTime: string, interviewDuration: string) => {
  const slots = [];
  let start = moment(`${date} ${startTime}`, "YYYY-MM-DD hh:mm A");
  const end = moment(`${date} ${endTime}`, "YYYY-MM-DD hh:mm A");

  // Parse the duration strings properly
  const breakMinutes = parseInt(breakTime.split(" ")[0]);
  const interviewMinutes = parseInt(interviewDuration.split(" ")[0]);

  while (start.isBefore(end)) {
    let slotEnd = start.clone().add(interviewMinutes, "minutes"); // Add interview duration

    if (slotEnd.isAfter(end)) break; // Stop if the slot goes beyond the end time

    slots.push({
      start_time: start.format("hh:mm A"),
      end_time: slotEnd.format("hh:mm A"),
    });

    // Create a new moment object for the next start time
    start = start.clone().add(interviewMinutes + breakMinutes, "minutes");
  }

  return slots;
};
