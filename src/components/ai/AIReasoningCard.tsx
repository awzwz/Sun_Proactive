"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface AIReasoningCardProps {
  score?: number;
  reasoning: string;
  type?: "match" | "verification" | "recommendation";
  factors?: {
    semanticScore: number;
    cityMatch: boolean;
    formatMatch: boolean;
    experienceBoost: boolean;
  };
  className?: string;
}

export function AIReasoningCard({
  score,
  reasoning,
  type = "match",
  factors,
  className = "",
}: AIReasoningCardProps) {
  const typeLabels = {
    match: "AI-Подбор",
    verification: "AI-Верификация",
    recommendation: "AI-Рекомендация",
  };

  const typeColors = {
    match: "bg-blue-50 border-blue-200",
    verification: "bg-purple-50 border-purple-200",
    recommendation: "bg-orange-50 border-orange-200",
  };

  return (
    <Card className={`${typeColors[type]} border ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full bg-gradient-to-r from-orange-400 to-orange-600 flex items-center justify-center">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
            >
              <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" />
              <path d="M9 21h6" />
              <path d="M10 21v1a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-1" />
            </svg>
          </div>
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            {typeLabels[type]}
          </span>
          {score !== undefined && (
            <Badge
              variant="secondary"
              className={`ml-auto ${
                score >= 0.8
                  ? "bg-green-100 text-green-800"
                  : score >= 0.6
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-gray-100 text-gray-800"
              }`}
            >
              {Math.round(score * 100)}%
            </Badge>
          )}
        </div>

        {score !== undefined && (
          <Progress value={score * 100} className="h-1.5 mb-3" />
        )}

        <p className="text-sm text-gray-700 leading-relaxed">{reasoning}</p>

        {factors && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {factors.cityMatch && (
              <Badge variant="outline" className="text-[10px] bg-white">
                Город совпадает
              </Badge>
            )}
            {factors.experienceBoost && (
              <Badge variant="outline" className="text-[10px] bg-white">
                Есть опыт
              </Badge>
            )}
            {factors.formatMatch && (
              <Badge variant="outline" className="text-[10px] bg-white">
                Формат подходит
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
