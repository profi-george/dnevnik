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

export async function parseActionsFromText(
  rawText: string,
): Promise<{ ok: true; actions: ParsedAction[] } | { ok: false; error: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "Не настроен ключ Gemini на сервере." };
  }
  if (!rawText.trim()) {
    return { ok: false, error: "Вставьте текст с описанием правок." };
  }

  const requestBody = JSON.stringify({
    system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents: [{ parts: [{ text: rawText }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
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

    const parsed = JSON.parse(text) as { actions: ParsedAction[] };
    const actions = (parsed.actions ?? []).filter((a) => a.place?.trim() && a.description?.trim());

    if (actions.length === 0) {
      return { ok: false, error: "Не удалось найти в тексте ни одной правки — перефразируйте или впишите вручную." };
    }

    return { ok: true, actions };
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      return { ok: false, error: "Gemini не ответил за 45 секунд — попробуйте ещё раз или сократите текст." };
    }
    return { ok: false, error: `Не удалось связаться с Gemini: ${(err as Error).message}` };
  }
}
