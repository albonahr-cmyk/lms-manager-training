"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { PopularVideo } from "@/lib/dashboard-mock";

const AUTO_SLIDE_MS = 3000;
const CARD_WIDTH_PERCENT = 28;

const DEFAULT_GRADIENTS = [
  "from-brand-start/80 to-brand-end/60",
  "from-brand-end/70 to-brand-start/50",
  "from-violet-500/70 to-brand-start/60",
  "from-brand-start/60 to-rose-400/70",
] as const;

type Props = {
  videos: PopularVideo[];
  thumbGradients?: readonly string[];
};

export function PopularVideosCarousel({
  videos,
  thumbGradients = DEFAULT_GRADIENTS,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const scrollToIndex = useCallback(
    (index: number) => {
      const el = scrollRef.current;
      if (!el || videos.length === 0) return;
      const next = ((index % videos.length) + videos.length) % videos.length;
      const card = el.querySelector<HTMLElement>(`[data-card-index="${next}"]`);
      if (card) {
        el.scrollTo({ left: card.offsetLeft - 4, behavior: "smooth" });
      }
      setActiveIndex(next);
    },
    [videos.length],
  );

  useEffect(() => {
    if (videos.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % videos.length;
        const el = scrollRef.current;
        const card = el?.querySelector<HTMLElement>(
          `[data-card-index="${next}"]`,
        );
        card?.scrollIntoView({
          behavior: "smooth",
          inline: "start",
          block: "nearest",
        });
        return next;
      });
    }, AUTO_SLIDE_MS);
    return () => window.clearInterval(timer);
  }, [videos.length]);

  if (videos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">表示できる動画がありません。</p>
    );
  }

  return (
    <section aria-labelledby="popular-videos-heading" className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <h2
          id="popular-videos-heading"
          className="text-lg font-semibold tracking-tight"
        >
          人気の研修動画
        </h2>
        <div className="hidden items-center gap-1 sm:flex">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => scrollToIndex(activeIndex - 1)}
            aria-label="前の動画へ"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => scrollToIndex(activeIndex + 1)}
            aria-label="次の動画へ"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scroll-smooth pb-2 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="人気動画カルーセル"
        onScroll={() => {
          const el = scrollRef.current;
          if (!el) return;
          const cards = el.querySelectorAll<HTMLElement>("[data-card-index]");
          let closest = 0;
          let minDist = Infinity;
          cards.forEach((card) => {
            const dist = Math.abs(card.offsetLeft - el.scrollLeft);
            if (dist < minDist) {
              minDist = dist;
              closest = Number(card.dataset.cardIndex);
            }
          });
          setActiveIndex(closest);
        }}
      >
        {videos.map((video, index) => {
          const gradient =
            thumbGradients[index % thumbGradients.length] ??
            DEFAULT_GRADIENTS[0];

          return (
            <Card
              key={video.id}
              data-card-index={index}
              className="shrink-0 snap-start overflow-hidden border shadow-sm transition-shadow hover:shadow-md"
              style={{ width: `${CARD_WIDTH_PERCENT}%`, minWidth: "220px" }}
            >
              <div
                className={cn(
                  "relative flex aspect-video w-full items-center justify-center bg-gradient-to-br",
                  !video.thumbnailUrl && gradient,
                )}
              >
                {video.thumbnailUrl ? (
                  <Image
                    src={video.thumbnailUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 70vw, 28vw"
                  />
                ) : (
                  <Play
                    className="size-10 text-white/90 drop-shadow"
                    aria-hidden="true"
                  />
                )}
              </div>
              <CardContent className="space-y-2 p-4">
                <Badge
                  variant="secondary"
                  className="border-0 bg-brand-start/10 text-brand-start"
                >
                  {video.tag}
                </Badge>
                <p className="line-clamp-2 text-sm font-medium leading-snug">
                  {video.title}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div
        className="flex justify-center gap-1.5"
        role="tablist"
        aria-label="スライド位置"
      >
        {videos.map((video, index) => (
          <button
            key={video.id}
            type="button"
            role="tab"
            aria-selected={index === activeIndex}
            aria-label={`${index + 1}枚目`}
            className={cn(
              "size-2 rounded-full transition-colors",
              index === activeIndex
                ? "bg-brand-start"
                : "bg-muted-foreground/30 hover:bg-muted-foreground/50",
            )}
            onClick={() => scrollToIndex(index)}
          />
        ))}
      </div>
    </section>
  );
}
