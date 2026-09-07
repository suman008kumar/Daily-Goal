import { ACTIVITY_TYPES } from "../utils/constants";

export const mockStats = {
  overview: {
    focusScore: 86,
    studyTime: 7200,
    focusedTime: 6120,
    distractionTime: 1080,
    breakTime: 300,
    phoneTime: 240,
    averageAttention: 88,
  },

  dailyGoal: {
    targetSeconds: 7200,
    completedSeconds: 6120,
    progress: 85,
    remainingSeconds: 1080,
    completed: false,
  },

  activityBreakdown: [
    {
      id: ACTIVITY_TYPES.FOCUSED,
      label: "Focused",
      seconds: 6120,
      percentage: 70,
    },
    {
      id: ACTIVITY_TYPES.DISTRACTION,
      label: "Distraction",
      seconds: 1080,
      percentage: 12,
    },
    {
      id: ACTIVITY_TYPES.BREAK,
      label: "Break",
      seconds: 300,
      percentage: 4,
    },
    {
      id: ACTIVITY_TYPES.PHONE,
      label: "Phone",
      seconds: 240,
      percentage: 3,
    },
    {
      id: ACTIVITY_TYPES.AWAY,
      label: "Away from Desk",
      seconds: 420,
      percentage: 5,
    },
    {
      id: ACTIVITY_TYPES.DROWSY,
      label: "Drowsy",
      seconds: 480,
      percentage: 6,
    },
  ],

  hourlyFocus: [
    {
      hour: 8,
      label: "8 AM",
      score: 74,
    },
    {
      hour: 9,
      label: "9 AM",
      score: 88,
    },
    {
      hour: 10,
      label: "10 AM",
      score: 92,
    },
    {
      hour: 11,
      label: "11 AM",
      score: 84,
    },
    {
      hour: 12,
      label: "12 PM",
      score: 68,
    },
    {
      hour: 13,
      label: "1 PM",
      score: 63,
    },
    {
      hour: 14,
      label: "2 PM",
      score: 79,
    },
    {
      hour: 15,
      label: "3 PM",
      score: 86,
    },
    {
      hour: 16,
      label: "4 PM",
      score: 90,
    },
    {
      hour: 17,
      label: "5 PM",
      score: 82,
    },
  ],

  weeklyFocus: [
    {
      day: "Mon",
      score: 82,
      studyTime: 5400,
    },
    {
      day: "Tue",
      score: 87,
      studyTime: 6900,
    },
    {
      day: "Wed",
      score: 78,
      studyTime: 4500,
    },
    {
      day: "Thu",
      score: 91,
      studyTime: 7200,
    },
    {
      day: "Fri",
      score: 85,
      studyTime: 6300,
    },
    {
      day: "Sat",
      score: 89,
      studyTime: 7500,
    },
    {
      day: "Sun",
      score: 76,
      studyTime: 4200,
    },
  ],

  insights: [
    {
      id: "insight-001",
      type: "positive",
      title: "Strong focus periods",
      message:
        "Your strongest focus usually appears during the morning study period.",
    },
    {
      id: "insight-002",
      type: "attention",
      title: "Afternoon dip",
      message:
        "Your focus tends to decrease around early afternoon.",
    },
    {
      id: "insight-003",
      type: "phone",
      title: "Phone distraction",
      message:
        "Reducing phone interruptions could improve your overall focus score.",
    },
  ],
};

export const getMockStats = () => {
  return {
    ...mockStats,
    overview: {
      ...mockStats.overview,
    },
    dailyGoal: {
      ...mockStats.dailyGoal,
    },
    activityBreakdown: mockStats.activityBreakdown.map(
      (item) => ({ ...item })
    ),
    hourlyFocus: mockStats.hourlyFocus.map(
      (item) => ({ ...item })
    ),
    weeklyFocus: mockStats.weeklyFocus.map(
      (item) => ({ ...item })
    ),
    insights: mockStats.insights.map(
      (item) => ({ ...item })
    ),
  };
};

export default mockStats;