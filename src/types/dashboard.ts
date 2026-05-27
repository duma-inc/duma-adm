export type DashboardIssueFetchStatus = 'complete' | 'partial';

export interface DashboardPlanCount {
  id: string;
  name: string;
  count: number;
}

export interface DashboardStageMetric {
  name: string;
  total: number;
}

export interface DashboardMonthlyEnrollment {
  month: string;
  sortKey: string;
  [planName: string]: string | number;
}

export interface DashboardTeacherSummary {
  teacherId: string;
  teacherName: string;
  total: number;
  lastMeetingAt?: string;
}

export interface DashboardSummary {
  totalEnrollments: number;
  issueCount: number;
  issueFetchStatus: DashboardIssueFetchStatus;
  finishedMeetingsCount: number;
  cancelledMeetingsCount: number;
  planCounts: DashboardPlanCount[];
  studentsPerStage: DashboardStageMetric[];
  monthlyEnrollments: DashboardMonthlyEnrollment[];
  monthlyPlanSeries: string[];
  enrollmentsWithoutDate: number;
  attemptsByStage: DashboardStageMetric[];
  totalAttempts: number;
  completedByTeacher: DashboardTeacherSummary[];
  generatedAt: string;
}
