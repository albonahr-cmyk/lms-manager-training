"use client";

import { useState } from "react";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  mockCategories,
  mockCourseProgress,
  mockPopularVideos,
  mockSidebarCourses,
} from "@/lib/dashboard-mock";
import { CategoryTable } from "./CategoryTable";
import { CourseProgressSection } from "./CourseProgressSection";
import { PopularVideosCarousel } from "./PopularVideosCarousel";

type Props = {
  userName: string;
};

export function StudentTrainingDashboard({ userName }: Props) {
  const [activeCourseId, setActiveCourseId] = useState<string>(
    mockSidebarCourses[0]?.id ?? "",
  );

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "#F8F9FA", color: "#1A1A2E" }}
    >
      {/* ページ内ヘッダー */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "#1A1A2E" }}>
            マイダッシュボード
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {userName} さん、こんにちは
          </p>
        </div>
        <AlbonaLogo />
      </div>

      {/* サイドバー + メインエリア */}
      <div className="flex gap-6 items-start">
        {/* 左サイドバー */}
        <aside
          className="shrink-0 rounded-xl border bg-white shadow-sm"
          style={{ width: "200px" }}
          aria-label="受講中コース"
        >
          <div className="px-4 py-3 border-b">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              受講中コース
            </p>
          </div>
          <nav>
            <ul role="list" className="py-2">
              {mockSidebarCourses.map((course) => {
                const isActive = course.id === activeCourseId;
                return (
                  <li key={course.id}>
                    <button
                      type="button"
                      onClick={() => setActiveCourseId(course.id)}
                      className={cn(
                        "w-full text-left px-4 py-2.5 text-sm transition-colors flex items-start gap-2",
                        isActive
                          ? "text-[#1A1A2E] font-medium bg-[#3B4FD4]/5"
                          : "text-muted-foreground hover:text-[#1A1A2E] hover:bg-muted/40",
                      )}
                      style={
                        isActive
                          ? { borderLeft: "3px solid #3B4FD4" }
                          : { borderLeft: "3px solid transparent" }
                      }
                      aria-current={isActive ? "page" : undefined}
                    >
                      <BookOpen className="size-3.5 mt-0.5 shrink-0" aria-hidden="true" />
                      <span className="leading-snug">{course.title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {/* メインエリア */}
        <div className="min-w-0 flex-1 space-y-8">
          <PopularVideosCarousel videos={mockPopularVideos} />
          <CourseProgressSection progress={mockCourseProgress} />
          <CategoryTable categories={mockCategories} />
        </div>
      </div>
    </div>
  );
}

function AlbonaLogo() {
  return (
    <div className="flex items-center gap-2.5">
      {/* 「a」グラデーション円形アイコン */}
      <div
        className="flex size-9 items-center justify-center rounded-full text-white font-bold text-lg select-none shadow-sm"
        style={{
          background: "linear-gradient(135deg, #3B4FD4 0%, #E0607E 100%)",
        }}
        aria-hidden="true"
      >
        a
      </div>
      <span
        className="text-xl font-bold tracking-tight"
        style={{ color: "#1A1A2E" }}
      >
        albona
      </span>
    </div>
  );
}
