import moment from "moment";

export const generateAvailableSlots = (date: string, startTime: string, endTime: string, breakTime: string = "0 min", interviewDuration: string) => {
  const slots = [];
  let start = moment(`${date} ${startTime}`, "YYYY-MM-DD hh:mm A");
  const end = moment(`${date} ${endTime}`, "YYYY-MM-DD hh:mm A");

  if (end.isBefore(start)) {
    end.add(1, "days");
  }

  // Parse the duration strings properly
  const breakMinutes = parseInt(breakTime.split(" ")[0]);
  const interviewMinutes = parseInt(interviewDuration.split(" ")[0]);

  while (start.isBefore(end)) {
    let slotEnd = start.clone().add(interviewMinutes, "minutes");

    if (slotEnd.isAfter(end)) break;

    slots.push({
      start_time: start.format("hh:mm A"),
      end_time: slotEnd.format("hh:mm A"),
    });

    start = start.clone().add(interviewMinutes + breakMinutes, "minutes");
  }

  //  throw error if no slots were generated
  if (slots.length === 0) {
    throw new Error(`Unable to generate time slots. The time window (${startTime} - ${endTime}) is too small for the specified duration (${interviewDuration}) and break time (${breakTime}). Please adjust your schedule parameters.`);
  }

  return slots;
};
