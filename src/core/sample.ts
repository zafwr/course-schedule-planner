import { parseMeetings } from "./time";
import type { Course } from "./types";

const sec = (id: string, instructor: string, meetings: string) => ({ id, instructor, meetings: parseMeetings(meetings) });

/** A fictional third-year computer engineering semester used as the demo. */
export const SAMPLE_COURSES: Course[] = [
  {
    code: "CS301",
    name: "Algorithms",
    sections: [
      sec("1", "Dr. Aydın", "Mon 09:30-11:20, Wed 09:30-10:20"),
      sec("2", "Dr. Aydın", "Tue 13:30-15:20, Thu 13:30-14:20"),
      sec("3", "Dr. Şahin", "Mon 15:30-17:20, Thu 08:30-09:20"),
    ],
  },
  {
    code: "CS303",
    name: "Operating Systems",
    sections: [
      sec("1", "Dr. Kaya", "Tue 09:30-11:20, Thu 09:30-10:20"),
      sec("2", "Dr. Kaya", "Mon 13:30-15:20, Wed 13:30-14:20"),
    ],
  },
  {
    code: "CS303L",
    name: "Operating Systems Lab",
    sections: [
      sec("A", "R.A. Çelik", "Wed 15:30-17:20"),
      sec("B", "R.A. Çelik", "Fri 13:30-15:20"),
      sec("C", "R.A. Öztürk", "Thu 15:30-17:20"),
    ],
  },
  {
    code: "CS305",
    name: "Database Systems",
    sections: [
      sec("1", "Dr. Yıldız", "Mon 08:30-10:20, Fri 10:30-11:20"),
      sec("2", "Dr. Yıldız", "Wed 10:30-12:20, Thu 11:30-12:20"),
      sec("3", "Dr. Polat", "Tue 15:30-17:20, Thu 15:30-16:20"),
    ],
  },
  {
    code: "CS311",
    name: "Software Engineering",
    sections: [
      sec("1", "Dr. Demir", "Tue 11:30-13:20, Thu 10:30-11:20"),
      sec("2", "Dr. Demir", "Wed 08:30-09:20, Fri 08:30-10:20"),
    ],
  },
  {
    code: "CS321",
    name: "Computer Networks",
    sections: [
      sec("1", "Dr. Koç", "Mon 11:30-13:20, Wed 11:30-12:20"),
      sec("2", "Dr. Koç", "Tue 08:30-10:20, Fri 11:30-12:20"),
      sec("3", "Dr. Arslan", "Thu 13:30-15:20, Fri 15:30-16:20"),
    ],
  },
  {
    code: "CS455",
    name: "Machine Learning (elective)",
    sections: [
      sec("1", "Dr. Erdem", "Mon 13:30-16:20"),
      sec("2", "Dr. Erdem", "Fri 13:30-16:20"),
    ],
  },
];

export const SAMPLE_SEMESTER = { start: "2026-09-21", end: "2027-01-08" };
