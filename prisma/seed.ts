import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { hash } from "bcryptjs";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  const password = await hash("password123", 12);

  // Curators
  const curator1 = await prisma.user.upsert({
    where: { email: "curator@sun.org" },
    update: {},
    create: {
      email: "curator@sun.org",
      passwordHash: password,
      name: "Алексей Петров",
      role: "CURATOR",
      bio: "Координатор социальных проектов фонда Sun. 5 лет опыта в организации волонтёрских мероприятий.",
      city: "Москва",
    },
  });

  const curator2 = await prisma.user.upsert({
    where: { email: "curator2@sun.org" },
    update: {},
    create: {
      email: "curator2@sun.org",
      passwordHash: password,
      name: "Мария Иванова",
      role: "CURATOR",
      bio: "Менеджер проектов в области экологии и устойчивого развития.",
      city: "Санкт-Петербург",
    },
  });

  // Volunteers
  const volunteers = [
    {
      email: "volunteer1@mail.ru",
      name: "Дмитрий Козлов",
      bio: "Студент-фотограф, увлекаюсь экологией. Веду блог про раздельный сбор мусора. Опыт съёмки мероприятий 3 года.",
      skills: ["фотография", "видеосъёмка", "SMM", "Instagram"],
      interests: ["экология", "устойчивое развитие", "фотография"],
      goals: "Хочу использовать свои навыки фотографии для социальных проектов",
      city: "Москва",
    },
    {
      email: "volunteer2@mail.ru",
      name: "Анна Сидорова",
      bio: "Учительница начальных классов. Обожаю работать с детьми и организовывать образовательные мероприятия.",
      skills: ["преподавание", "организация мероприятий", "работа с детьми", "педагогика"],
      interests: ["образование", "дети", "социальные проекты"],
      goals: "Помогать детям из малообеспеченных семей получать качественное образование",
      city: "Москва",
    },
    {
      email: "volunteer3@mail.ru",
      name: "Игорь Белов",
      bio: "IT-специалист, frontend разработчик. Хочу применять технические навыки для социального блага.",
      skills: ["веб-разработка", "React", "дизайн", "UX/UI"],
      interests: ["технологии", "образование", "open source"],
      goals: "Создавать цифровые решения для НКО",
      city: "Москва",
    },
    {
      email: "volunteer4@mail.ru",
      name: "Елена Морозова",
      bio: "Волонтёр-эколог с 7-летним стажем. Организую субботники и экологические акции.",
      skills: ["организация толпы", "экология", "первая помощь", "ландшафтный дизайн"],
      interests: ["экология", "природа", "субботники", "озеленение"],
      goals: "Сделать города чище и зеленее",
      city: "Санкт-Петербург",
    },
    {
      email: "volunteer5@mail.ru",
      name: "Артём Волков",
      bio: "Графический дизайнер, работаю в креативном агентстве. Делаю плакаты и баннеры для благотворительных акций.",
      skills: ["графический дизайн", "Figma", "Photoshop", "иллюстрация"],
      interests: ["дизайн", "искусство", "социальная реклама"],
      goals: "Помогать НКО с визуальной коммуникацией",
      city: "Москва",
    },
    {
      email: "volunteer6@mail.ru",
      name: "Ольга Кузнецова",
      bio: "Переводчик, владею английским и немецким. Люблю помогать людям преодолевать языковые барьеры.",
      skills: ["перевод", "английский язык", "немецкий язык", "копирайтинг"],
      interests: ["языки", "культура", "международные проекты"],
      goals: "Помогать мигрантам и международным проектам",
      city: "Казань",
    },
    {
      email: "volunteer7@mail.ru",
      name: "Максим Новиков",
      bio: "Спортивный тренер и организатор марафонов. Опыт работы с большими группами людей.",
      skills: ["спорт", "организация мероприятий", "тимбилдинг", "первая помощь"],
      interests: ["спорт", "здоровье", "командная работа"],
      goals: "Продвигать здоровый образ жизни через волонтёрство",
      city: "Москва",
    },
    {
      email: "volunteer8@mail.ru",
      name: "Светлана Попова",
      bio: "Психолог, работаю с подростками. Провожу тренинги по коммуникации и лидерству.",
      skills: ["психология", "коучинг", "тренинги", "работа с подростками"],
      interests: ["психология", "молодёжь", "личностный рост"],
      goals: "Помогать молодёжи находить своё призвание",
      city: "Санкт-Петербург",
    },
    {
      email: "volunteer9@mail.ru",
      name: "Роман Лебедев",
      bio: "Журналист и блогер. Пишу о социальных инициативах и волонтёрском движении.",
      skills: ["журналистика", "копирайтинг", "SMM", "видеоблогинг"],
      interests: ["медиа", "социальные инициативы", "сторителлинг"],
      goals: "Рассказывать истории людей, которые меняют мир к лучшему",
      city: "Москва",
    },
    {
      email: "volunteer10@mail.ru",
      name: "Наталья Егорова",
      bio: "Повар-кондитер, организую благотворительные обеды. Люблю кормить людей вкусной едой.",
      skills: ["кулинария", "организация питания", "менеджмент", "санитарные нормы"],
      interests: ["кулинария", "благотворительность", "здоровое питание"],
      goals: "Организовывать благотворительные обеды для нуждающихся",
      city: "Казань",
    },
  ];

  for (const v of volunteers) {
    await prisma.user.upsert({
      where: { email: v.email },
      update: {},
      create: {
        email: v.email,
        passwordHash: password,
        name: v.name,
        role: "VOLUNTEER",
        bio: v.bio,
        skills: v.skills,
        interests: v.interests,
        goals: v.goals,
        city: v.city,
      },
    });
  }

  // Sample task
  await prisma.task.upsert({
    where: { id: "seed-task-1" },
    update: {},
    create: {
      id: "seed-task-1",
      curatorId: curator1.id,
      title: "Эко-субботник в Парке Горького",
      description:
        "Организуем большой эко-субботник в Парке Горького. Будем убирать территорию, сажать деревья и проводить мастер-класс по раздельному сбору мусора. Нужны волонтёры с опытом организации мероприятий, фотографы для документации, и люди готовые к физической работе на свежем воздухе. Перчатки и мешки предоставляем.",
      date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // in 3 days
      location: "Парк Горького, главный вход",
      city: "Москва",
      format: "OFFLINE",
      requiredSkills: ["экология", "организация мероприятий", "фотография"],
      softSkills: ["командная работа", "коммуникабельность", "ответственность"],
      volunteerQuota: 15,
      status: "ACTIVE",
      verificationCriteria:
        "Фото убранной территории: чистая зона без мусора, посаженные деревья, волонтёры в процессе работы",
    },
  });

  await prisma.task.upsert({
    where: { id: "seed-task-2" },
    update: {},
    create: {
      id: "seed-task-2",
      curatorId: curator2.id,
      title: "Онлайн-тренинг для детей из детдомов",
      description:
        "Проводим серию онлайн-занятий по базовой компьютерной грамотности для детей из детских домов. Нужны волонтёры-преподаватели, которые могут простым языком объяснить работу с компьютером, интернетом и базовыми программами.",
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // in 7 days
      location: "Zoom (ссылка будет в чате)",
      city: "Санкт-Петербург",
      format: "ONLINE",
      requiredSkills: ["преподавание", "работа с детьми", "компьютерная грамотность"],
      softSkills: ["терпение", "доброжелательность", "умение объяснять"],
      volunteerQuota: 5,
      status: "ACTIVE",
      verificationCriteria:
        "Скриншот Zoom-сессии с участниками, или запись фрагмента занятия",
    },
  });

  console.log("Seed completed!");
  console.log("Demo accounts:");
  console.log("  Curator: curator@sun.org / password123");
  console.log("  Volunteer: volunteer1@mail.ru / password123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
