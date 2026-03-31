"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AIReasoningCard } from "./AIReasoningCard";
import Link from "next/link";

interface MatchCardProps {
  task?: {
    id: string;
    title: string;
    description: string;
    date: string;
    location: string;
    city?: string;
    format: string;
    requiredSkills: string[];
    volunteerQuota: number;
  };
  volunteer?: {
    id: string;
    name: string;
    bio?: string;
    skills: string[];
    interests: string[];
    city?: string;
  };
  similarity: number;
  reasoning?: string;
  factors?: {
    semanticScore: number;
    cityMatch: boolean;
    formatMatch: boolean;
    experienceBoost: boolean;
    finalScore: number;
  };
  mode: "task" | "volunteer";
  onApply?: () => void;
  onAccept?: () => void;
  onReject?: () => void;
}

export function MatchCard({
  task,
  volunteer,
  similarity,
  reasoning,
  factors,
  mode,
  onApply,
  onAccept,
  onReject,
}: MatchCardProps) {
  if (mode === "task" && task) {
    return (
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <Link
              href={`/volunteer/tasks/${task.id}`}
              className="text-base font-semibold hover:text-orange-600 transition-colors"
            >
              {task.title}
            </Link>
            <Badge
              variant="outline"
              className={`text-xs ${
                task.format === "ONLINE"
                  ? "bg-blue-50 text-blue-700"
                  : task.format === "HYBRID"
                    ? "bg-purple-50 text-purple-700"
                    : "bg-green-50 text-green-700"
              }`}
            >
              {task.format}
            </Badge>
          </div>

          <p className="text-sm text-gray-600 line-clamp-2 mb-3">
            {task.description}
          </p>

          <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-3">
            <span>
              &#128197; {new Date(task.date).toLocaleDateString("ru-RU")}
            </span>
            <span>&#128205; {task.location}</span>
            {task.city && <span>&#127961; {task.city}</span>}
            <span>&#128101; {task.volunteerQuota} чел.</span>
          </div>

          <div className="flex flex-wrap gap-1 mb-3">
            {task.requiredSkills.slice(0, 4).map((s) => (
              <Badge key={s} variant="secondary" className="text-[10px]">
                {s}
              </Badge>
            ))}
          </div>

          {reasoning && (
            <AIReasoningCard
              score={factors?.finalScore ?? similarity}
              reasoning={reasoning}
              type="match"
              factors={factors}
              className="mb-3"
            />
          )}

          {onApply && (
            <Button
              onClick={onApply}
              className="w-full bg-orange-600 hover:bg-orange-700"
              size="sm"
            >
              Откликнуться
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (mode === "volunteer" && volunteer) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-semibold">
              {volunteer.name.charAt(0)}
            </div>
            <div>
              <p className="font-medium">{volunteer.name}</p>
              {volunteer.city && (
                <p className="text-xs text-gray-500">
                  &#127961; {volunteer.city}
                </p>
              )}
            </div>
          </div>

          {volunteer.bio && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-2">
              {volunteer.bio}
            </p>
          )}

          <div className="flex flex-wrap gap-1 mb-3">
            {volunteer.skills.slice(0, 5).map((s) => (
              <Badge key={s} variant="secondary" className="text-[10px]">
                {s}
              </Badge>
            ))}
          </div>

          {reasoning && (
            <AIReasoningCard
              score={factors?.finalScore ?? similarity}
              reasoning={reasoning}
              type="match"
              factors={factors}
              className="mb-3"
            />
          )}

          {(onAccept || onReject) && (
            <div className="flex gap-2">
              {onAccept && (
                <Button
                  onClick={onAccept}
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  Принять
                </Button>
              )}
              {onReject && (
                <Button
                  onClick={onReject}
                  size="sm"
                  variant="outline"
                  className="flex-1"
                >
                  Отклонить
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return null;
}
