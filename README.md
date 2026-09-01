# Дневник ведения

Веб-инструмент директолога: фиксирует правки в рекламных кампаниях и напоминает
проверить результат через сутки, неделю и месяц.

## Локальный запуск

```bash
npm install
npm run dev
```

Откроется на http://localhost:3000. База — обычный файл `dev.db` рядом с проектом,
никакой настройки не требует. Для массового ИИ-разбора (`/diary/bulk`) добавьте
`GEMINI_API_KEY` в `.env` (см. `.env.example`).

## Деплой на Vercel

Локальная файловая SQLite-база не переживает деплой на Vercel (там файловая система
read-only между запросами) — поэтому в проде используется облачный SQLite (Turso).
Код это уже умеет: если задана переменная `TURSO_DATABASE_URL`, приложение
подключается к Turso, иначе — к локальному файлу.

Шаги (все — в личных аккаунтах, через сайты, не через терминал):

1. **Создать репозиторий на GitHub** и запушить туда код (см. ниже).
2. **Создать базу в Turso** — https://turso.tech → New Database. Взять оттуда
   `Database URL` (начинается с `libsql://`) и создать `Auth Token`.
3. **Прогнать миграции на новую базу один раз** — локально:
   ```bash
   TURSO_DATABASE_URL="libsql://..." TURSO_AUTH_TOKEN="..." npx prisma migrate deploy
   ```
4. **Импортировать проект в Vercel** — https://vercel.com/new → выбрать репозиторий.
5. **Добавить переменные окружения** в настройках проекта на Vercel (Settings →
   Environment Variables):
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `GEMINI_API_KEY`
6. Нажать **Deploy**.

### Как запушить код на GitHub

```bash
git init
git add .
git commit -m "Первая версия Дневника ведения"
gh repo create dnevnik-vedeniya --private --source=. --push
```

(команда `gh repo create` требует `gh auth login` один раз, если ещё не входили).
