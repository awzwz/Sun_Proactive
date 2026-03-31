import { openai } from "./openai";

interface VolunteerMatch {
  id: string;
  name: string;
  bio: string | null;
  skills: string[];
  interests: string[];
  goals: string | null;
  city: string | null;
  similarity: number;
}

interface TaskForMatching {
  title: string;
  description: string;
  date: Date;
  location: string;
  city: string | null;
  format: string;
  requiredSkills: string[];
  softSkills: string[];
}

interface RerankingFactors {
  semanticScore: number;
  cityMatch: boolean;
  formatMatch: boolean;
  experienceBoost: boolean;
  finalScore: number;
}

export interface RankedMatch {
  volunteer: VolunteerMatch;
  factors: RerankingFactors;
  reasoning?: string;
}

export function rerankVolunteers(
  volunteers: VolunteerMatch[],
  task: TaskForMatching,
  completedTaskCounts: Record<string, number>
): RankedMatch[] {
  return volunteers
    .map((volunteer) => {
      let score = volunteer.similarity;

      // City match: +0.1 boost if same city or task is ONLINE
      const cityMatch =
        task.format === "ONLINE" ||
        (!!volunteer.city &&
          !!task.city &&
          volunteer.city.toLowerCase() === task.city.toLowerCase());
      if (cityMatch) score += 0.1;

      // Format match (ONLINE tasks are accessible to everyone)
      const formatMatch = task.format === "ONLINE" || !!volunteer.city;

      // Experience boost: +0.05 per completed task (max +0.15)
      const completedCount = completedTaskCounts[volunteer.id] || 0;
      const experienceBoost = completedCount > 0;
      score += Math.min(completedCount * 0.05, 0.15);

      // Normalize to 0-1 range
      score = Math.min(Math.max(score, 0), 1);

      return {
        volunteer,
        factors: {
          semanticScore: volunteer.similarity,
          cityMatch,
          formatMatch,
          experienceBoost,
          finalScore: score,
        },
      };
    })
    .sort((a, b) => b.factors.finalScore - a.factors.finalScore);
}

export async function generateMatchExplanation(
  volunteerProfile: string,
  taskDescription: string,
  factors: RerankingFactors
): Promise<string> {
  const factorsList = [];
  if (factors.cityMatch) factorsList.push("совпадение по городу");
  if (factors.experienceBoost) factorsList.push("есть подтверждённый опыт волонтёрства");
  if (factors.formatMatch) factorsList.push("формат задачи подходит");

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Ты — AI-система для объяснения совпадений между волонтёрами и социальными задачами.
Дай краткое (2-3 предложения) объяснение, ПОЧЕМУ этот волонтёр подходит для задачи.
Будь конкретен: ссылайся на конкретные навыки, интересы и опыт из профиля.
Отвечай на русском языке.

Дополнительные факторы совпадения: ${factorsList.join(", ") || "нет дополнительных факторов"}.
Семантическая близость: ${Math.round(factors.semanticScore * 100)}%.
Итоговый скор: ${Math.round(factors.finalScore * 100)}%.`,
      },
      {
        role: "user",
        content: `Профиль волонтёра:\n${volunteerProfile}\n\nОписание задачи:\n${taskDescription}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 200,
  });

  return response.choices[0].message.content || "Объяснение недоступно";
}

export async function generateTaskMatchExplanation(
  taskDescription: string,
  volunteerProfile: string,
  similarity: number
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Ты — AI-система рекомендаций. Объясни волонтёру, ПОЧЕМУ ему подходит эта задача.
Будь конкретен: ссылайся на его навыки и интересы, которые совпадают с требованиями задачи.
Дай краткое объяснение в 2-3 предложения. Отвечай на русском.
Степень совпадения: ${Math.round(similarity * 100)}%.`,
      },
      {
        role: "user",
        content: `Задача:\n${taskDescription}\n\nПрофиль волонтёра:\n${volunteerProfile}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 200,
  });

  return response.choices[0].message.content || "Объяснение недоступно";
}
