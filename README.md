# Sun Proactive — AI-биржа социальных задач

**AI-powered платформа** для координации социальных проектов: кураторы создают задачи через диалог с ИИ, система семантически подбирает волонтёров, а верификация выполнения происходит через Computer Vision.

> Проект фонда устойчивого развития **Sun** | Хакатон AIS 2026

---

## Содержание

- [Архитектура](#архитектура)
- [AI-пайплайны](#ai-пайплайны)
- [Стек технологий](#стек-технологий)
- [Структура проекта](#структура-проекта)
- [Запуск](#запуск)
- [API Endpoints](#api-endpoints)
- [База данных](#база-данных)

---

## Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│   Next.js 16 App Router · React 19 · Tailwind CSS 4        │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Куратор UI  │  │ Волонтёр UI  │  │   Trust UI       │  │
│  │  - AI-чат    │  │ - Профиль    │  │   (объяснения    │  │
│  │  - Дашборд   │  │ - Рекоменд.  │  │    решений AI)   │  │
│  │  - Верифик.  │  │ - Консульт.  │  │                  │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                     API LAYER (Route Handlers)              │
│                                                             │
│  /api/ai/interviewer   → Structured Outputs (JSON Schema)   │
│  /api/ai/consultant    → Context-grounded QA                │
│  /api/ai/match         → Semantic Matching + Explainable AI │
│  /api/ai/verify        → Computer Vision верификация        │
│  /api/cron/ai-manager  → Автономный AI-менеджер             │
└──────────┬────────────────────────────┬─────────────────────┘
           │                            │
┌──────────▼──────────┐    ┌────────────▼─────────────────────┐
│   OpenAI API        │    │   PostgreSQL + pgvector           │
│                     │    │                                   │
│  gpt-4.1            │    │  User.profileEmbedding (1536d)    │
│  gpt-4o (vision)    │    │  Task.descriptionEmbedding (1536d)│
│  gpt-4o-mini        │    │  Cosine similarity (<=>)          │
│  text-embedding-    │    │                                   │
│    3-small          │    │  Prisma ORM + Raw SQL для         │
│                     │    │  векторных операций                │
└─────────────────────┘    └───────────────────────────────────┘
```

---

## AI-пайплайны

### 1. AI-Интервьюер (Structured Outputs)

Куратор **не заполняет форму** — он пишет свободный текст, а ИИ ведёт диалог:

```
Куратор: "Нужны люди на эко-субботник в парке"
    ↓
AI (gpt-4.1): задаёт уточняющие вопросы по одному
    ↓
Маркер READY_TO_FINALIZE → JSON Schema extraction
    ↓
Строгий JSON: {title, description, date, location, city,
               format, requiredSkills, softSkills,
               volunteerQuota, verificationCriteria}
    ↓
Сохранение + генерация embedding (text-embedding-3-small)
```

- **Модель:** `gpt-4.1` с `response_format: { type: "json_schema" }`
- **Гарантия формата:** strict JSON Schema с `additionalProperties: false`
- **Валидация:** серверная проверка всех обязательных полей

### 2. AI-Консультант (Context-grounded QA)

Волонтёр задаёт вопросы по задаче — бот отвечает **строго на основе описания**:

```
Контекст задачи (title, description, date, location,
                 skills, criteria, curator) → system prompt
    ↓
Волонтёр: "Нужно ли брать свои перчатки?"
    ↓
AI (gpt-4o-mini): анализирует контекст → даёт ответ или
                   честно говорит "уточните у куратора"
```

- **Защита от галлюцинаций:** промпт запрещает выдумывать факты, не содержащиеся в контексте
- **Прозрачность:** бот явно разделяет прямые ответы (`"Судя по описанию..."`) и предположения (`"Скорее всего..."`)

### 3. Семантический Matching (Embeddings + Reranking)

```
Профиль волонтёра → text-embedding-3-small → vector(1536)
Описание задачи   → text-embedding-3-small → vector(1536)
    ↓
pgvector: cosine similarity (оператор <=>)
    ↓
Гибридный реранкинг:
  +0.10  совпадение по городу
  +0.05  за каждую завершённую задачу (макс +0.15)
  бонус  формат (ONLINE доступен всем)
    ↓
Top-5 → GPT-4o-mini генерирует аргументацию:
  "Рекомендуем кандидата: его опыт ведения школьного
   Instagram идеально закрывает потребность в SMM"
```

- **Explainable AI:** каждая рекомендация сопровождается `matchReasoning` и `rerankingFactors`
- **Trust UI:** пользователь видит не "чёрный ящик", а конкретные факторы принятия решения

### 4. Автономный AI-Менеджер (Background Jobs)

```
Cron trigger → GET /api/cron/ai-manager
    ↓
Поиск: задачи с датой < 24ч И незаполненной квотой
    ↓
Для каждой задачи:
  embedding задачи → findSimilarVolunteers (pgvector)
    ↓
  Фильтрация: исключить уже откликнувшихся
    ↓
  GPT-4o-mini: персонализированное уведомление
    "Горит дедлайн! Твои навыки организации толпы
     идеально подходят для этой задачи..."
    ↓
  Сохранение Notification в БД
```

- **Автономность:** система действует без участия человека
- **Персонализация:** каждое уведомление учитывает навыки и интересы конкретного волонтёра
- **Безопасность:** защита через `CRON_SECRET` для продакшена

### 5. Верификация результата (Computer Vision)

```
Волонтёр загружает фото-отчёт
    ↓
GPT-4o (vision): анализирует фото + сверяет с ТЗ задачи
    ↓
Structured Output (JSON Schema):
  {
    approved: true/false,
    confidence: 0.0–1.0,
    comment: "На фото виден убранный участок парка...",
    detectedElements: ["мешки с мусором", "чистая поляна"]
  }
    ↓
AI-рекомендация → куратор принимает финальное решение
```

- **Модель:** `gpt-4o` (multimodal)
- **Строгий формат:** JSON Schema с `strict: true`
- **Human-in-the-loop:** AI даёт рекомендацию, но куратор — окончательный судья

---

## Стек технологий

| Слой | Технология |
|------|-----------|
| Frontend | **Next.js 16.2**, React 19, TypeScript |
| Стилизация | Tailwind CSS 4, shadcn/ui, Lucide icons |
| Аутентификация | NextAuth v5 (Credentials, JWT) |
| ORM | Prisma 7 + `@prisma/adapter-pg` |
| База данных | PostgreSQL 16 + **pgvector** |
| AI / LLM | OpenAI SDK (`gpt-4.1`, `gpt-4o`, `gpt-4o-mini`, `text-embedding-3-small`) |
| Валидация | Zod 4 |
| Контейнеризация | Docker + Docker Compose |
| Уведомления | sonner (toast), Notification model в БД |

---

## Структура проекта

```
sun-proactive/
├── prisma/
│   ├── schema.prisma          # Схема БД (User, Task, Application, Chat, Notification)
│   ├── seed.ts                # Сидирование тестовых данных
│   └── generate-embeddings.ts # Генерация embeddings для seed-данных
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── ai/
│   │   │   │   ├── interviewer/route.ts  # AI-интервьюер (Structured Outputs)
│   │   │   │   ├── consultant/route.ts   # AI-консультант (Context QA)
│   │   │   │   ├── match/route.ts        # Семантический Matching
│   │   │   │   └── verify/route.ts       # Computer Vision верификация
│   │   │   ├── cron/
│   │   │   │   └── ai-manager/route.ts   # Автономный AI-менеджер
│   │   │   ├── tasks/                    # CRUD задач
│   │   │   ├── applications/             # Управление заявками
│   │   │   ├── volunteers/               # Поиск и профили волонтёров
│   │   │   ├── notifications/            # Система уведомлений
│   │   │   ├── conversations/            # Мессенджер
│   │   │   └── auth/                     # Регистрация, авторизация
│   │   ├── curator/                      # Страницы куратора
│   │   ├── volunteer/                    # Страницы волонтёра
│   │   ├── login/                        # Авторизация
│   │   ├── register/                     # Регистрация
│   │   └── page.tsx                      # Лендинг
│   ├── components/
│   │   ├── ai/                           # AI-виджеты (чат, matching, верификация)
│   │   ├── layout/                       # AppShell, Sidebar, Header
│   │   └── ui/                           # UI-примитивы (shadcn)
│   ├── lib/
│   │   ├── openai.ts                     # OpenAI клиент
│   │   ├── embeddings.ts                 # Генерация/хранение/поиск embeddings
│   │   ├── matching.ts                   # Гибридный реранкинг + Explainable AI
│   │   ├── prisma.ts                     # Prisma клиент
│   │   └── auth.ts                       # NextAuth конфигурация
│   └── types/
├── docker-compose.yml                    # PostgreSQL (pgvector) + App
├── Dockerfile
└── package.json
```

---

## Запуск

### Предварительные требования

- **Node.js** 20+
- **Docker** и **Docker Compose**
- **OpenAI API ключ**

### 1. Клонирование и установка

```bash
cd sun-proactive
npm install
```

### 2. Настройка переменных окружения

Создайте файл `.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5434/sunproactive"
OPENAI_API_KEY="sk-..."
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Запуск базы данных

```bash
docker compose up db -d
```

### 4. Инициализация БД

```bash
npx prisma generate
npx prisma db push
```

Для загрузки тестовых данных:

```bash
npx tsx prisma/seed.ts
npx tsx prisma/generate-embeddings.ts
```

### 5. Запуск приложения

```bash
npm run dev
```

Приложение доступно по адресу: **http://localhost:3000**

### Запуск через Docker Compose (всё сразу)

```bash
docker compose up --build
```

---

## API Endpoints

### AI-эндпоинты

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/ai/interviewer` | AI-интервьюер: диалог → JSON-задача |
| POST | `/api/ai/consultant` | AI-консультант: QA по задаче |
| GET | `/api/ai/match` | Matching задач для волонтёра |
| POST | `/api/ai/match` | Matching волонтёров для задачи |
| POST | `/api/ai/verify` | Vision-верификация фото-отчёта |
| GET | `/api/cron/ai-manager` | Фоновый AI-менеджер (дедлайны) |

### Доменные эндпоинты

| Метод | Путь | Описание |
|-------|------|----------|
| GET/POST | `/api/tasks` | Список / создание задач |
| GET/PATCH/DELETE | `/api/tasks/[id]` | Управление задачей |
| POST | `/api/tasks/[id]/apply` | Подача заявки |
| GET/PATCH | `/api/applications` | Список / обновление заявок |
| GET | `/api/notifications` | Уведомления пользователя |
| POST | `/api/auth/register` | Регистрация |
| GET/POST | `/api/conversations` | Мессенджер |

---

## База данных

### ER-диаграмма (упрощённая)

```
User (CURATOR | VOLUNTEER)
  ├── profileEmbedding: vector(1536)    ← pgvector
  ├── skills[], interests[], goals
  ├── tasksCreated[] ──→ Task
  ├── applications[] ──→ Application
  └── notifications[] ──→ Notification

Task
  ├── descriptionEmbedding: vector(1536) ← pgvector
  ├── interviewHistory: JSON             ← история AI-диалога
  ├── verificationCriteria               ← для Vision API
  ├── requiredSkills[], softSkills[]
  └── applications[] ──→ Application

Application
  ├── matchScore, matchReasoning         ← Explainable AI
  ├── rerankingFactors: JSON             ← Trust UI
  ├── completionPhotos[]                 ← для верификации
  └── verificationResult: JSON           ← Vision API вердикт
      {approved, confidence, comment, detectedElements}

Notification
  ├── type: "deadline_alert" | "match_found" | ...
  └── metadata: JSON {taskId, similarity, slotsLeft}
```

### Векторные операции (pgvector)

```sql
-- Поиск похожих задач по профилю волонтёра
SELECT *, 1 - ("descriptionEmbedding" <=> $1::vector) as similarity
FROM "Task"
WHERE status = 'ACTIVE'
ORDER BY "descriptionEmbedding" <=> $1::vector
LIMIT 10;

-- Поиск подходящих волонтёров по задаче
SELECT *, 1 - ("profileEmbedding" <=> $1::vector) as similarity
FROM "User"
WHERE role = 'VOLUNTEER'
ORDER BY "profileEmbedding" <=> $1::vector
LIMIT 20;
```

---

## Соответствие ТЗ

| Критерий | Вес | Покрытие |
|----------|-----|----------|
| **Сложность AI-интеграции** | 30% | Structured Outputs, Context QA, Embeddings + pgvector, Vision (GPT-4o), Explainable AI |
| **Работоспособность MVP** | 25% | Полный флоу: AI-интервью → создание задачи → matching → отклик → верификация |
| **Архитектура и код** | 15% | Prisma ORM, pgvector, Docker, TypeScript, модульная структура |
| **Автономность системы** | 15% | Cron AI-менеджер: дедлайн-алерты + семантический подбор + персонализация |
| **UI/UX и Trust UI** | 15% | Аргументация решений AI, факторы реранкинга, human-in-the-loop верификация |

---

## Лицензия

Проект разработан в рамках хакатона AIS 2026 для Фонда устойчивого развития Sun.
