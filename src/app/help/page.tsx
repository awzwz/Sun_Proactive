"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";

const FAQ_ITEMS = [
  {
    question: "Как откликнуться на задачу?",
    answer:
      'Откройте задачу и нажмите "Откликнуться". После этого куратор увидит вашу заявку и сможет одобрить или отклонить её. Статус заявки можно отслеживать в вашем списке заявок/задач.',
  },
  {
    question: "Почему мне показываются (или не показываются) рекомендации задач?",
    answer:
      "Рекомендации зависят от заполненности профиля (навыки, интересы, цели, город) и вашего графика доступности. Если профиль пустой или доступность не указана, список может быть менее точным или пустым — заполните профиль и попробуйте снова.",
  },
  {
    question: "Как работает верификация фотоотчёта?",
    answer:
      "После выполнения задачи вы загружаете фотоотчёт на странице задачи. Куратор проверяет отчёт и подтверждает выполнение. После подтверждения задача становится верифицированной, а ваш опыт/часы/баллы учитываются в профиле.",
  },
  {
    question: "Как загрузить отчёт по выполненной задаче?",
    answer:
      "Откройте задачу, перейдите к завершению и загрузке фотоотчёта, выберите фотографии и отправьте. Если задача уже закрыта/отменена, загрузка может быть недоступна — в этом случае напишите куратору в сообщения.",
  },
  {
    question: "Что делать, если куратор долго не отвечает по заявке или отчёту?",
    answer:
      'Напишите куратору через "Сообщения" (или через кнопку "Написать" в задаче/профиле). Если ответа нет длительное время — используйте контакты поддержки ниже.',
  },
  {
    question: "Как написать куратору напрямую?",
    answer:
      'Перейдите в раздел "Сообщения" или откройте задачу и нажмите "Написать" в блоке организатора. Переписка сохраняется и доступна вам и куратору.',
  },
  {
    question: "Можно ли удалить переписку или сообщение?",
    answer:
      "Да. Можно удалить весь диалог (он исчезает у обеих сторон), а также удалить или отредактировать только свои сообщения — изменения видны собеседнику.",
  },
  {
    question: "Как редактировать график доступности?",
    answer:
      'Откройте "Профиль", нажмите "Редактировать", затем в блоке "График доступности" отметьте дни и укажите удобное время. Сохраните профиль — рекомендации задач будут учитывать доступные дни.',
  },
];

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-outline-variant/20 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left bg-surface-container-lowest hover:bg-surface-container transition-colors"
      >
        <span className="font-semibold text-on-surface text-sm leading-snug">{question}</span>
        <span
          className={`material-symbols-outlined text-outline flex-shrink-0 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        >
          expand_more
        </span>
      </button>
      {open && (
        <div className="px-6 py-4 bg-surface-container-low/50 border-t border-outline-variant/10">
          <p className="text-sm text-on-surface-variant leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}

export default function HelpPage() {
  return (
    <AppShell>
      <div className="space-y-10 max-w-2xl">
        <div>
          <h2 className="text-4xl font-extrabold font-headline text-on-surface tracking-tight leading-none mb-2">
            Помощь
          </h2>
          <p className="text-on-surface-variant">
            Ответы на частые вопросы и контакты поддержки
          </p>
        </div>

        {/* FAQ Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-primary/10 p-2 rounded-lg">
              <span className="material-symbols-outlined text-primary">quiz</span>
            </div>
            <h3 className="text-xl font-bold font-headline">Частые вопросы</h3>
          </div>

          <div className="space-y-2">
            {FAQ_ITEMS.map((item) => (
              <FaqItem key={item.question} question={item.question} answer={item.answer} />
            ))}
          </div>
        </section>

        {/* Contacts Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-secondary/10 p-2 rounded-lg">
              <span className="material-symbols-outlined text-secondary">contact_support</span>
            </div>
            <h3 className="text-xl font-bold font-headline">Контакты</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <a
              href="mailto:awzwz0401x@gmail.com"
              className="flex flex-col items-center gap-3 p-5 bg-surface-container-lowest rounded-2xl border border-outline-variant/20 hover:bg-surface-container transition-colors text-center"
            >
              <div className="bg-primary/10 p-3 rounded-xl">
                <span
                  className="material-symbols-outlined text-primary text-[28px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  mail
                </span>
              </div>
              <div>
                <p className="font-bold text-sm text-on-surface">Email</p>
                <p className="text-xs text-on-surface-variant mt-0.5">awzwz0401x@gmail.com</p>
              </div>
            </a>

            <a
              href="https://t.me/awz_wz"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-3 p-5 bg-surface-container-lowest rounded-2xl border border-outline-variant/20 hover:bg-surface-container transition-colors text-center"
            >
              <div className="bg-secondary/10 p-3 rounded-xl">
                <span
                  className="material-symbols-outlined text-secondary text-[28px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  send
                </span>
              </div>
              <div>
                <p className="font-bold text-sm text-on-surface">Telegram</p>
                <p className="text-xs text-on-surface-variant mt-0.5">@awz_wz</p>
              </div>
            </a>

            <a
              href="tel:+77054781552"
              className="flex flex-col items-center gap-3 p-5 bg-surface-container-lowest rounded-2xl border border-outline-variant/20 hover:bg-surface-container transition-colors text-center"
            >
              <div className="bg-tertiary/10 p-3 rounded-xl">
                <span
                  className="material-symbols-outlined text-tertiary text-[28px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  call
                </span>
              </div>
              <div>
                <p className="font-bold text-sm text-on-surface">Телефон</p>
                <p className="text-xs text-on-surface-variant mt-0.5">+7-705-478-15-52</p>
              </div>
            </a>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
