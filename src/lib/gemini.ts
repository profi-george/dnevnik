const MODEL = "gemini-3.6-flash";

// Легенда сокращений из практики директолога — чтобы ИИ писал "суть действия" так же
// компактно, как в исходной таблице, а не развёрнутым текстом.
const ABBREVIATION_LEGEND = `
Устройства: СФ — смартфоны, ПК — компьютер, ПТ — планшет
Стратегии: CPA/ОЗК, oCPA, срс — максимум кликов со средней ценой, mCPC, НБ — недельный бюджет, ЦД — целевое действие
Атрибуция: 1П — 1 переход, ПП — последний переход, ПЗ — последний значимый переход, ПД — последний переход из Директа, АП — автомодель атрибуции, КД — кросс-девайс
Инструменты: АТ — автотаргетинг, ОФР — офферный ретаргетинг, ТГ — товарная галерея, МК — мастер кампаний, ДК — динамическая кампания, Кол — коллтрекинг, ОЦ — офлайн-цель, СПП/СПК — средняя позиция показа/клика
Места показа: ДМ — динамические места, ТГО — текстово-графические объявления, ТО(фид) — товарное объявление, К(ф) — страницы каталога по файлу
Прочее: ≥ > ≈ — изменение настроек (напр. CPA 1000 > 900), /д /н /м — периодичность (раз в день/неделю/месяц), +- — корректировка ставок, x — умножить, / — разделить
`.trim();

export type ParsedAction = {
  place: string;
  description: string;
  justification: string;
  note: string;
};

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    actions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          place: { type: "string" },
          description: { type: "string" },
          justification: { type: "string" },
          note: { type: "string" },
        },
        required: ["place", "description", "justification", "note"],
      },
    },
  },
  required: ["actions"],
};

type GeminiResult = { ok: true; actions: ParsedAction[] } | { ok: false; error: string };
type GeminiRawResult = { ok: true; json: unknown } | { ok: false; error: string };

// Низкоуровневый вызов Gemini с произвольной схемой ответа — обработка перегрузки (503)
// и таймаута общая для всех сценариев разбора (правки, результат проверки, карточка проекта).
async function callGeminiRaw(
  systemInstruction: string,
  userText: string,
  schema: Record<string, unknown>,
): Promise<GeminiRawResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "Не настроен ключ Gemini на сервере." };
  }
  if (!userText.trim()) {
    return { ok: false, error: "Нет текста для разбора." };
  }

  const requestBody = JSON.stringify({
    system_instruction: { parts: [{ text: systemInstruction }] },
    contents: [{ parts: [{ text: userText }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

  try {
    let response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(45_000),
      body: requestBody,
    });

    // Gemini иногда кратковременно перегружен (503) — один автоповтор через паузу
    // решает это без ручного нажатия «попробовать снова».
    if (response.status === 503) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(45_000),
        body: requestBody,
      });
    }

    if (!response.ok) {
      if (response.status === 503) {
        return {
          ok: false,
          error: "Gemini сейчас перегружен даже после повтора — подождите минуту и попробуйте снова.",
        };
      }
      const body = await response.text();
      return { ok: false, error: `Gemini вернул ошибку (${response.status}): ${body.slice(0, 200)}` };
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return { ok: false, error: "Gemini не вернул текст ответа." };
    }

    return { ok: true, json: JSON.parse(text) };
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      return { ok: false, error: "Gemini не ответил за 45 секунд — попробуйте ещё раз или сократите текст." };
    }
    return { ok: false, error: `Не удалось связаться с Gemini: ${(err as Error).message}` };
  }
}

async function callGemini(systemInstruction: string, userText: string): Promise<GeminiResult> {
  const result = await callGeminiRaw(systemInstruction, userText, RESPONSE_SCHEMA);
  if (!result.ok) return result;
  const parsed = result.json as { actions: ParsedAction[] };
  const actions = (parsed.actions ?? []).filter((a) => a.place?.trim() && a.description?.trim());
  return { ok: true, actions };
}

const SYSTEM_INSTRUCTION = `
Ты помогаешь директологу вести дневник правок в рекламных кампаниях. Тебе присылают
кусок сырого текста (переписка, голосовая заметка, черновик) с описанием ОДНОЙ ИЛИ
НЕСКОЛЬКИХ правок, сделанных в кампаниях. Разбей его на отдельные действия.

Для каждого отдельного действия (правки) верни:
- place — конкретное место: номер кампании И её название, если название есть в тексте
  (пиши оба через запятую, например «№ 55211, Ремонт квартир СПб — Поиск»), группа или
  площадка. Если исходный текст — это выгрузка «история изменений» из Директа/Метрики
  (там обычно рядом стоят ID кампании, её название и техническое поле, которое менялось),
  не отбрасывай название кампании даже если она упомянута только один раз в начале —
  используй его для всех правок этой кампании ниже по тексту.
- description — суть правки, ОДНА фраза. Пиши компактно, используй сокращения из
  легенды ниже так же, как их использует сам директолог — не расписывай их
  расшифровку, если у них длиннее вышло понятнее сказать своими словами. Если в
  истории изменений указано конкретное техническое поле и значения до/после —
  включи их (например «CPA 130 > 135 ₽»), не пересказывай общими словами.
- justification — если из текста понятна причина правки, коротко её укажи.
  Если причина не названа явно — оставь пустую строку.
- note — любая деталь, которая не относится к сути или причине (например,
  договорённость на будущее, отложенная идея). Если её нет — пустая строка.

Легенда сокращений (используй их вместо длинных формулировок, где уместно):
${ABBREVIATION_LEGEND}

Правила:
- Каждая отдельная правка — отдельный элемент массива, даже если они про один и тот же
  проект/кампанию.
- Не выдумывай числа или детали, которых нет в исходном тексте.
- Если во всём тексте только одна правка — верни массив из одного элемента.
- Если текст вообще не про правки в рекламе — верни пустой массив.
`.trim();

// Разбор произвольного текста (переписка/заметка) на одну или несколько правок —
// для формы массовой записи «Разобрать через ИИ».
export async function parseActionsFromText(rawText: string): Promise<GeminiResult> {
  const result = await callGemini(SYSTEM_INSTRUCTION, rawText);
  if (result.ok && result.actions.length === 0) {
    return { ok: false, error: "Не удалось найти в тексте ни одной правки — перефразируйте или впишите вручную." };
  }
  return result;
}

const followUpSystemInstruction = (place: string, lastChange?: string) => `
Ты помогаешь директологу вести дневник правок в рекламных кампаниях. Она прислала текст,
который написала при снятии результата предыдущей проверки (через сутки/неделю/месяц
после правки). Иногда это просто наблюдение без новых действий — например «трафика мало,
конверсий 3» — тогда верни пустой массив actions. Но если в тексте описано, что по итогам
проверки она СРАЗУ ЖЕ сделала новое изменение в кампании (например «трафика мало, подняла
CPA до 130 и увеличила бюджет до 10000») — вычлени каждое такое изменение как отдельное
действие, отдельным элементом массива.

Место действия (place) для каждого — то же самое, где шла правка, результат которой она
сейчас снимает: «${place}». Указывай именно его, если в тексте явно не назвали другое место.
${
  lastChange
    ? `\nПоследняя зафиксированная правка по этому месту: «${lastChange}». Если в тексте
результата описано ДАЛЬНЕЙШЕЕ изменение того же параметра (например снова меняют CPA) —
формулируй «было > стало» от ЗНАЧЕНИЯ ПОСЛЕ этой последней правки, а не от более раннего
или исходного значения. Не путай число из названия места (например «Корзина 100» — это
название сегмента, не значение CPA) со значением параметра из последней правки.`
    : ""
}

Для каждого действия верни:
- place — см. правило выше.
- description — суть изменения, ОДНА фраза, компактно, с сокращениями и знаками
  ≥ > ≈ +- x /, как в легенде ниже. Не пересказывай наблюдения и результаты проверки —
  только сами изменения (что и на что поменяли).
- justification — причина изменения, если названа в тексте (например «трафика мало»).
  Если причина не названа явно — оставь пустую строку.
- note — прочие детали, не относящиеся к сути или причине. Если их нет — пустая строка.

Легенда сокращений:
${ABBREVIATION_LEGEND}

Правила:
- Если в тексте нет описания нового изменения, сделанного прямо сейчас — верни пустой массив.
- Не выдумывай числа и детали, которых нет в тексте.
`.trim();

// Разбор текста результата проверки на новые действия — если снятие результата само
// стало поводом для новой правки (например, увеличила бюджет по итогам просмотра цифр),
// эта правка тоже должна попасть в дневник отдельной строкой со своими проверками.
// lastChange — описание последней зафиксированной правки по этому месту: без него ИИ
// не знает, от какого значения считать «было», и может перепутать его с числом из
// названия места или с более ранней правкой.
export async function parseFollowUpActionsFromResult(
  resultText: string,
  place: string,
  lastChange?: string,
): Promise<GeminiResult> {
  return callGemini(followUpSystemInstruction(place, lastChange), resultText);
}

// ——— Заполнение карточки проекта через ИИ: один вольный текст → все вкладки разом ———

export type ParsedProjectInfo = {
  info: {
    topic?: string;
    site?: string;
    budget?: string;
    regions?: string;
    priorities?: string;
    businessGoals?: string;
    qualifiedLeadParams?: string;
    clientWishes?: string;
    constraints?: string;
    directLogin?: string;
    history?: string;
    problems?: string;
    questions?: string;
  };
  links: { label: string; url: string }[];
  goals: { goalId: string; name: string; level: string; description: string; validDatesNote: string }[];
  risks: { risk: string; url: string; frequency: string }[];
  passwords: { label: string; value: string }[];
};

const PROJECT_INFO_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    info: {
      type: "object",
      properties: {
        topic: { type: "string" },
        site: { type: "string" },
        budget: { type: "string" },
        regions: { type: "string" },
        priorities: { type: "string" },
        businessGoals: { type: "string" },
        qualifiedLeadParams: { type: "string" },
        clientWishes: { type: "string" },
        constraints: { type: "string" },
        directLogin: { type: "string" },
        history: { type: "string" },
        problems: { type: "string" },
        questions: { type: "string" },
      },
    },
    links: {
      type: "array",
      items: {
        type: "object",
        properties: { label: { type: "string" }, url: { type: "string" } },
        required: ["label", "url"],
      },
    },
    goals: {
      type: "array",
      items: {
        type: "object",
        properties: {
          goalId: { type: "string" },
          name: { type: "string" },
          level: { type: "string", enum: ["MACRO", "MICRO"] },
          description: { type: "string" },
          validDatesNote: { type: "string" },
        },
        required: ["goalId", "name", "level"],
      },
    },
    risks: {
      type: "array",
      items: {
        type: "object",
        properties: { risk: { type: "string" }, url: { type: "string" }, frequency: { type: "string" } },
        required: ["risk"],
      },
    },
    passwords: {
      type: "array",
      items: {
        type: "object",
        properties: { label: { type: "string" }, value: { type: "string" } },
        required: ["label", "value"],
      },
    },
  },
  required: ["info", "links", "goals", "risks", "passwords"],
};

const PROJECT_INFO_SYSTEM_INSTRUCTION = `
Ты помогаешь директологу быстро заполнить карточку проекта в её инструменте учёта. Она
присылает один вольный кусок текста (переписка с клиентом, бриф, заметки) — твоя задача
разложить из него всё, что относится к делу, по нужным полям и вкладкам. Не выдумывай —
если для поля в тексте нет данных, просто не включай его в ответ (оставь пустым).

Поля вкладки «Вводные» (info):
- topic — тематика/ниша бизнеса
- site — сайт (домен или ссылка)
- budget — рекламный бюджет
- regions — регионы показа
- priorities — приоритеты по кампаниям/направлениям
- businessGoals — бизнес-цели клиента
- qualifiedLeadParams — что считается квалифицированным лидом
- clientWishes — пожелания клиента к ведению
- constraints — ограничения (что нельзя делать)
- directLogin — логин в Яндекс.Директе

Поля свободных разделов (тоже внутри info):
- history — история проекта крупными мазками: вехи, решения, тесты, результаты
- problems — текущие нерешённые проблемы
- questions — вопросы к анализу, на которые пока нет ответа

Вкладка «Важные ссылки» (links) — массив {label, url}: любые упомянутые в тексте ссылки
на отчёты, документы, визуализации с понятным названием.

Вкладка «Карта целей» (goals) — массив {goalId, name, level, description, validDatesNote}:
цели Метрики/Директа. level — "MACRO" (сводная/основная цель) или "MICRO" (промежуточная).
Включай цель, только если в тексте явно назван её ID или название.

Вкладка «Риски» (risks) — массив {risk, url, frequency}: что регулярно нужно проверять,
чтобы не прозевать проблему (например «поисковые запросы по фидам»), ссылка для проверки
(если есть) и как часто проверять (например «1 р/день»).

Вкладка «Пароли» (passwords) — массив {label, value}: логины/доступы, упомянутые в тексте,
например «Яндекс.Директ: login / pass». label — понятное название сервиса, value — сами
логин/пароль как есть в тексте.

Правила:
- Ничего не придумывай сверх того, что есть в тексте.
- Если в тексте вообще нет данных ни для одного поля/раздела — верни все поля пустыми и
  все массивы пустыми.
`.trim();

export async function parseProjectInfoFromText(
  rawText: string,
): Promise<{ ok: true; data: ParsedProjectInfo } | { ok: false; error: string }> {
  const result = await callGeminiRaw(PROJECT_INFO_SYSTEM_INSTRUCTION, rawText, PROJECT_INFO_RESPONSE_SCHEMA);
  if (!result.ok) return result;
  const data = result.json as ParsedProjectInfo;
  const hasAnyInfo = data.info && Object.values(data.info).some((v) => v?.trim());
  const hasAnyList =
    (data.links?.length ?? 0) > 0 ||
    (data.goals?.length ?? 0) > 0 ||
    (data.risks?.length ?? 0) > 0 ||
    (data.passwords?.length ?? 0) > 0;
  if (!hasAnyInfo && !hasAnyList) {
    return { ok: false, error: "Не удалось найти в тексте данных для карточки проекта." };
  }
  return { ok: true, data };
}
