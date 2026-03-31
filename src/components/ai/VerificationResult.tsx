"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface VerificationResultProps {
  photoUrls: string[];
  result: {
    approved: boolean;
    confidence: number;
    comment: string;
    detectedElements: string[];
  };
  isCurator?: boolean;
  onConfirm?: () => void;
  onOverride?: () => void;
}

export function VerificationResult({
  photoUrls,
  result,
  isCurator = false,
  onConfirm,
  onOverride,
}: VerificationResultProps) {
  return (
    <Card
      className={`overflow-hidden border-2 ${
        result.approved ? "border-green-200" : "border-red-200"
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-gradient-to-r from-orange-400 to-orange-600 flex items-center justify-center">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            AI-Рекомендация по верификации
          </CardTitle>
          <Badge
            className={
              result.approved
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }
          >
            {result.approved ? "Рекомендовано к принятию" : "Рекомендовано к отклонению"}
          </Badge>
        </div>
        <p className="text-[10px] text-gray-400 uppercase tracking-wide">
          Это AI-рекомендация, не окончательное решение
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Photos */}
          <div className="grid grid-cols-2 gap-2">
            {photoUrls.map((url, idx) => (
              <div key={idx} className="rounded-lg overflow-hidden border">
                <img
                  src={url}
                  alt={`Фото-отчёт ${idx + 1}`}
                  className="w-full h-48 object-cover"
                />
              </div>
            ))}
          </div>

          {/* Analysis */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Уверенность AI</span>
                <span className="font-medium">
                  {Math.round(result.confidence * 100)}%
                </span>
              </div>
              <Progress
                value={result.confidence * 100}
                className={`h-2 ${
                  result.confidence >= 0.8
                    ? "[&>div]:bg-green-500"
                    : result.confidence >= 0.5
                      ? "[&>div]:bg-yellow-500"
                      : "[&>div]:bg-red-500"
                }`}
              />
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 mb-1 uppercase">
                Комментарий AI
              </p>
              <p className="text-sm text-gray-700">{result.comment}</p>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 mb-1 uppercase">
                Обнаружено на фото
              </p>
              <div className="flex flex-wrap gap-1">
                {result.detectedElements.map((el, i) => (
                  <Badge key={i} variant="outline" className="text-[10px]">
                    {el}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        {isCurator && (
          <div className="flex gap-2 pt-2 border-t">
            <Button
              onClick={onConfirm}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              Подтвердить выполнение
            </Button>
            <Button onClick={onOverride} variant="outline" className="flex-1">
              Отклонить / Пересмотреть
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
