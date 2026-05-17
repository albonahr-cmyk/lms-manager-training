export type SidebarCourse = {
  id: string;
  title: string;
};

export const mockSidebarCourses: SidebarCourse[] = [
  { id: "cma001manager0001albona", title: "自分をマネジメントする" },
  { id: "cma002manager0002albona", title: "部下をマネジメントする" },
  { id: "cma003manager0003albona", title: "チームをマネジメントする" },
  { id: "cma004manager0004albona", title: "上・横をマネジメントする" },
  { id: "cma005manager0005albona", title: "事業と数字をマネジメントする" },
  { id: "cma006manager0006albona", title: "自分を成長させ続ける" },
];

export type PopularVideo = {
  id: string;
  title: string;
  tag: string;
  /** 空文字の場合はグラデーションサムネイルを表示 */
  thumbnailUrl: string;
};

export type CategoryProgressStatus = "not_started" | "in_progress" | "completed";

export type CategoryRow = {
  id: number;
  name: string;
  dueDate: string;
  status: CategoryProgressStatus;
};

export type CourseProgressSummary = {
  completionRate: number;
  completedCategories: number;
  totalCategories: number;
  completedBlocks: number;
  totalBlocks: number;
  deadline: string;
  continueCourseId: string;
};

export const mockPopularVideos: PopularVideo[] = [
  {
    id: "v1",
    title: "マネジメント基礎：チームビルディング",
    tag: "リーダーシップ",
    thumbnailUrl: "",
  },
  {
    id: "v2",
    title: "1on1ミーティングの進め方",
    tag: "コミュニケーション",
    thumbnailUrl: "",
  },
  {
    id: "v3",
    title: "フィードバックの伝え方",
    tag: "人材育成",
    thumbnailUrl: "",
  },
  {
    id: "v4",
    title: "目標設定とOKRの活用",
    tag: "目標管理",
    thumbnailUrl: "",
  },
  {
    id: "v5",
    title: "コンフリクトマネジメント",
    tag: "組織運営",
    thumbnailUrl: "",
  },
  {
    id: "v6",
    title: "心理的安全性のつくり方",
    tag: "チーム文化",
    thumbnailUrl: "",
  },
];

export const mockCourseProgress: CourseProgressSummary = {
  completionRate: 68,
  completedCategories: 4,
  totalCategories: 6,
  completedBlocks: 12,
  totalBlocks: 18,
  deadline: "2026-06-30",
  continueCourseId: "cma001manager0001albona",
};

export const mockCategories: CategoryRow[] = [
  { id: 1, name: "マネジメント基礎", dueDate: "2026-04-15", status: "completed" },
  { id: 2, name: "コミュニケーション", dueDate: "2026-04-30", status: "in_progress" },
  { id: 3, name: "人材育成", dueDate: "2026-05-15", status: "in_progress" },
  { id: 4, name: "目標管理", dueDate: "2026-05-31", status: "not_started" },
  { id: 5, name: "組織運営", dueDate: "2026-06-15", status: "not_started" },
  { id: 6, name: "コンプライアンス", dueDate: "2026-06-30", status: "completed" },
];

export const CATEGORY_STATUS_LABEL: Record<CategoryProgressStatus, string> = {
  not_started: "未完了",
  in_progress: "進行中",
  completed: "完了",
};
