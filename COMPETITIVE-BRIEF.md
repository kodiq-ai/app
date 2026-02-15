# Kodiq — Competitive Brief

**Дата:** 15 февраля 2026
**Цель:** Product strategy — определить позиционирование, приоритеты функционала и дифференциацию
**Категория:** AI Terminal / IDE-wrapper для AI CLI инструментов

---

## 1. Конкурентный ландшафт

Kodiq находится на пересечении трёх рынков: терминалы-обёртки (Warp, Wave), AI-powered IDE (Cursor, Windsurf), и no-code AI-билдеры (Bolt, Lovable). Ни один из конкурентов не занимает ту же нишу — **оффлайн-десктоп-обёртка над нативными AI CLI**.

### Прямые конкуренты (терминал-фокус)

| | Warp | Wave Terminal | Ghostty | Tabby |
|---|---|---|---|---|
| **Тип** | Коммерческий AI-терминал | Open-source терминал | Open-source терминал | Open-source терминал |
| **Технологии** | Rust | TypeScript, React, Go | Zig, GTK4 | TypeScript, Electron |
| **AI** | Встроенный (собственная модель + BYOK) | Пресеты для OpenAI/Claude/Gemini | Нет | MCP-сервер для IDE |
| **Фандинг** | $73M (Series B, Sequoia) | Open-source, без венчурного | Non-profit (Hack Club) | Open-source, без венчурного |
| **Пользователи** | 500K+ активных | ~15-17K GitHub stars | Быстрорастущий (Hashimoto) | 60K+ GitHub stars |
| **Платформы** | macOS, Linux, Windows | macOS, Linux, Windows | macOS, Linux | macOS, Linux, Windows |
| **Цена** | Free / $20/мес / $50/мес | Бесплатно | Бесплатно | Бесплатно |
| **Лицензия** | Proprietary | Apache 2.0 | MIT | MIT |

### Косвенные конкуренты (AI IDE / билдеры)

| | Cursor | Windsurf | Claude Code CLI | Bolt.new |
|---|---|---|---|---|
| **Тип** | AI IDE (форк VS Code) | AI IDE (форк VS Code) | CLI-агент | Web AI-билдер |
| **Подход** | Полная IDE с AI агентами | Полная IDE с Cascade | Терминальный агент | Браузерная генерация |
| **Цена** | $20/мес Pro | $15/мес | ~$20/мес (Claude Pro) | Freemium |
| **Целевая аудитория** | Опытные разработчики | Опытные разработчики | Power-users CLI | Не-программисты |
| **Offline** | Нет | Нет | Частично (с API) | Нет |

---

## 2. Глубокий анализ: Warp

**Главный прямой конкурент.** Единственный терминал с серьёзным венчурным финансированием и AI-фокусом.

### Позиционирование
Warp называет себя "Agentic Development Environment" (ADE). В 2025 они перестали быть "просто терминалом" и двигаются к платформе для AI-разработки с агентами, работающими параллельно.

### Сильные стороны
- **Block-based output** — главная UX-инновация, по отзывам пользователей это реальное улучшение workflow, а не AI
- **Collaboration** — можно создать "notebook" терминальной сессии и расшарить ссылкой. Отличная фича для тимов и обучения
- **Финансирование и команда** — $73M, Sequoia, 500K+ пользователей. Серьёзный ресурс на R&D
- **Cross-platform** — macOS, Linux, Windows (с 2025)
- **Warp 2.0** — мультиагентный режим, голосовой ввод, встроенный редактор кода

### Слабые стороны
- **Обязательная авторизация** — нужен аккаунт чтобы запустить терминал. Многие разработчики принципиально против
- **AI oversold** — пользователи жалуются что AI — это маркетинг, а реальная ценность в UX; AI "ломает работающий код"
- **Телеметрия** — отправляет данные об использовании, привязанные к аккаунту. Опасения по приватности
- **Ограниченная кастомизация** — 7 тем, 11 шрифтов. Минимум настроек
- **Pricing backlash** — переход на $20/мес вызвал волну критики. "Зачем платить за терминал когда можно подписаться на Claude Code?"
- **Closed source** — нет прозрачности, зависимость от вендора
- **Linux — "второй класс"** — пользователи жалуются на недоработки

### Критические цитаты пользователей
- "Its least-marketed feature (block-based output) is the one that actually changes how you work, while the most-marketed feature (AI) is the one you'll forget exists after a week"
- "Why do I need an account to use a terminal app?"
- "For the same $20/month you could subscribe to Claude Code"

---

## 3. Глубокий анализ: Wave Terminal

**Ближайший по духу конкурент.** Open-source, block-based, интеграция AI.

### Позиционирование
"Open-source terminal that combines terminal features with graphical capabilities." Позиционируется как терминал для seamless workflows.

### Сильные стороны
- **Блочная система** — терминальные блоки, preview-блоки (markdown, изображения, код), web-блоки (браузер прямо в терминале)
- **AI Chat** — пресеты для OpenAI, Claude, Gemini. Pipe терминального вывода в AI
- **SSH / WSL / S3** — встроенные удалённые подключения
- **Open source** (Apache 2.0) — полная прозрачность
- **Cross-platform** — macOS, Linux, Windows
- **Бесплатный** — нет платных тарифов

### Слабые стороны
- **Нет фокуса на CLI-агентах** — AI Chat встроен, но нет интеграции с Claude Code, Gemini CLI и т.д. как с нативными инструментами
- **Меньшее сообщество** — ~15-17K stars vs Warp 500K пользователей
- **Нет коммерческой модели** — устойчивость под вопросом
- **Electron-based** (TypeScript/React) — потенциально тяжелее нативных решений
- **Нет live preview** — можно открыть web-блок, но нет автоматического обнаружения dev-сервера

---

## 4. Глубокий анализ: Ghostty

**Не прямой конкурент, но важный игрок.** Создан Mitchell Hashimoto (Terraform, Vagrant).

### Позиционирование
"Fast, feature-rich terminal that uses platform-native UI and GPU acceleration." Фокус на производительности и нативности.

### Сильные стороны
- **Нативный UI** — GTK4 на Linux, нативный на macOS. Не Electron
- **Производительность** — GPU-ускорение, минимальные задержки
- **libghostty** — embeddable библиотека для встраивания терминала. **Потенциально полезна для Kodiq**
- **Mitchell Hashimoto** — огромный авторитет в dev-tools сообществе
- **Non-profit** — устойчивая модель через Hack Club

### Слабые стороны
- **Нет AI** — чисто терминальный эмулятор
- **Нет Windows** — только macOS + Linux
- **Нишевый** — для power-users, не для новичков

### Важно для Kodiq
libghostty-vt — это embeddable парсер терминальных последовательностей. Если Kodiq когда-то решит заменить xterm.js на нативный терминал, это потенциальная зависимость.

---

## 5. Минимальные конкуренты

### Tabby (tabby.sh)
SSH/Telnet клиент с MCP-интеграцией для AI IDE. Другая ниша — управление серверными подключениями, а не AI-разработка. Electron-based, 60K+ stars. Потребляет ~200MB+ RAM через 4 часа.

### Alacritty / Kitty
Минималистичные GPU-ускоренные терминалы. Никакого AI, никакого UI поверх. Целевая аудитория — tmux-пользователи, vim-энтузиасты. Не конкуренты Kodiq.

### Rio
Rust-based терминал на базе кода Alacritty. Красивый, быстрый, с адаптивными темами. Плагины в разработке. Пока нишевый.

---

## 6. Feature Comparison Matrix

| Функция | Kodiq | Warp | Wave | Ghostty | Cursor |
|---------|-------|------|------|---------|--------|
| **Нативные AI CLI** | ✅ Ядро продукта | ❌ Свой AI | ❌ Свой AI Chat | ❌ | ❌ |
| **Мульти-CLI табы** | ✅ | ❌ Один AI | ✅ Блоки | ❌ | ❌ |
| **Live Preview** | ✅ Авто-детект порта | ❌ | ⚠️ Web-блоки | ❌ | ❌ |
| **File tree** | ✅ | ❌ | ✅ Preview-блоки | ❌ | ✅ |
| **Syntax highlighting** | ✅ Shiki | ✅ | ✅ | ❌ | ✅ CodeMirror |
| **Git integration** | ⚠️ Базовый | ❌ | ❌ | ❌ | ✅ Полный |
| **Code editing** | ❌ Read-only | ⚠️ Warp 2.0 | ❌ | ❌ | ✅ Полный |
| **Block-based output** | ❌ (roadmap) | ✅ Ядро UX | ✅ | ❌ | ❌ |
| **Collaboration** | ❌ (roadmap) | ✅ Shared sessions | ❌ | ❌ | ❌ |
| **SSH / Remote** | ❌ | ✅ | ✅ | ❌ | ✅ |
| **CLI парсинг** | ⚠️ Roadmap | ❌ | ❌ | ❌ | ❌ |
| **Offline** | ✅ 100% | ❌ Нужен аккаунт | ✅ | ✅ | ❌ |
| **Open source** | ✅ Apache 2.0 | ❌ | ✅ Apache 2.0 | ✅ MIT | ❌ |
| **Бесплатно** | ✅ | ⚠️ Limited free | ✅ | ✅ | ⚠️ Free tier |
| **Нативный (не Electron)** | ✅ Tauri/Rust | ✅ Rust | ❌ TS/React | ✅ Zig | ❌ Electron |
| **Community / Social** | ❌ (roadmap) | ❌ | ❌ | ❌ | ❌ |
| **Deploy** | ❌ (roadmap) | ❌ | ❌ | ❌ | ❌ |

---

## 7. Positioning Analysis

### Как конкуренты позиционируются

| Конкурент | Категория | Целевой клиент | Ключевой дифференциатор |
|-----------|-----------|----------------|------------------------|
| **Warp** | AI Terminal → ADE | Профессиональные разработчики, тимы | Block-based UX + AI агенты |
| **Wave** | Modern terminal | Разработчики, DevOps | Блочный workspace с SSH/Web |
| **Ghostty** | Performance terminal | Power users | Нативность + скорость + libghostty |
| **Cursor** | AI IDE | Профессиональные разработчики | AI-first редактирование кода |
| **Claude Code** | CLI Agent | Power users, senior devs | 200K контекст, MCP, pay-per-use |

### Где Kodiq

**Текущее позиционирование (из ARCHITECTURE.md):**
"Единая среда для программистов, где можно запускать любые AI CLI в терминалах, удобно работать с проектами через Git/GitHub, и получать live preview."

**Проблема:** Это описание не объясняет, почему не использовать просто iTerm2 + Claude Code.

**Предлагаемое позиционирование:**

> **Kodiq — open-source desktop IDE для AI-эры.**
> Запускай Claude Code, Gemini CLI, Codex, Aider и Ollama в одном окне.
> Переключайся между AI-агентами как между вкладками браузера.
> Видь результаты в live preview. Никаких API-ключей. Работает оффлайн.
> Ты платишь провайдерам — мы даём интерфейс.

### Уникальное ценностное предложение Kodiq

**Единственный продукт, который:**
1. Оборачивает *настоящие* AI CLI (а не создаёт свой AI)
2. Open source + полностью оффлайн
3. Даёт live preview с автоматическим обнаружением dev-сервера
4. Позволяет переключаться между разными AI в одном окне
5. Построен на Tauri/Rust (лёгкий, нативный, быстрый)

**Это не ещё один AI IDE.** Cursor и Windsurf — это форки VS Code с собственным AI. Kodiq — это обёртка над существующими CLI-агентами. Мы не конкурируем с моделями — мы делаем их удобнее.

---

## 8. Opportunities (Возможности)

### 8.1 Незанятая ниша: CLI-агностик
Ни один продукт не позволяет удобно переключаться между Claude Code, Gemini CLI, Codex и Aider в одном UI. Каждый разработчик использует 2-3 инструмента, но вынужден жонглировать терминальными окнами.

### 8.2 Anti-Warp positioning
Warp критикуют за: обязательный аккаунт, телеметрию, closed-source, $20/мес. Kodiq может позиционироваться как *полная противоположность*:
- Без аккаунта
- Без телеметрии
- Open source
- Бесплатный core

### 8.3 CLI Output Intelligence
Ни один терминал не парсит вывод AI CLI и не добавляет ценность поверх. "Apply diff", "Run command", "Reject" — кнопки действий поверх CLI-вывода. Это *настоящий* дифференциатор, которого нет ни у кого.

### 8.4 Аудитория "не-программистов"
VISION.md описывает чат-режим и визуальный инспектор для новичков. Warp целится в профи, Cursor — в профи, Claude Code — в power users. Никто не делает красивый UI для людей, которые *не умеют программировать*, но хотят использовать AI CLI для создания сайтов.

### 8.5 Community / Social layer
Ни один терминал или AI IDE не имеет встроенного сообщества. "Посмотри что я сделал" + шаринг промптов — это потенциально вирусный механизм.

---

## 9. Threats (Угрозы)

### 9.1 Warp как AI платформа
$73M funding и движение к "Agentic Development Environment". Если Warp добавит поддержку внешних CLI (BYOK agents), они перекроют ключевое преимущество Kodiq.

### 9.2 Claude Code / Gemini CLI сами станут IDE
Anthropic уже делает Claude Code с MCP. Если они добавят GUI-обёртку (а они могут — у них ресурсы), Kodiq теряет основной use case.

### 9.3 VS Code + терминал + Copilot
Для большинства разработчиков "VS Code + встроенный терминал + Copilot" уже достаточно хорошо. Kodiq должен быть *значительно* лучше этого baseline.

### 9.4 Wave Terminal как open-source альтернатива
Wave уже делает блочный терминал с AI. Если они добавят CLI-интеграцию и live preview, они станут прямым конкурентом с преимуществом в сообществе (~17K stars).

### 9.5 "Терминал — бесплатный инструмент"
Как показала реакция на Warp pricing, многие разработчики принципиально считают что терминал должен быть бесплатным. Монетизация через community/deploy (Phase 6) — далеко и неочевидно.

---

## 10. Strategic Implications

### Что строить в первую очередь (дифференциация)

1. **CLI Output Intelligence (Phase 3 в roadmap) → перенести выше.** Это единственная фича, которой нет ни у кого. Парсинг вывода Claude Code / Gemini CLI с кнопками "Apply", "Run", "Reject" — это killer feature. Без неё Kodiq — просто красивый терминал.

2. **Multi-CLI UX** — уже есть табы, но нужен более продуманный опыт: быстрое переключение, профили CLI, сравнение результатов side-by-side. Это core value proposition.

3. **Chat-mode (из VISION.md)** — для аудитории "не-программистов" это необходимо. Терминальный вывод пугает новичков. Нужен мессенджер-подобный интерфейс поверх CLI.

### Что НЕ строить (пока)

1. **Собственный AI** — не конкурировать с Warp. Мы обёртка, не AI-компания.
2. **SSH / Remote** — не конкурировать с Wave и Tabby. Это другая ниша.
3. **Полноценный code editor** — не конкурировать с Cursor. Shiki read-only достаточно для v1.
4. **Community / Deploy (Phase 6)** — слишком рано. Сначала нужен продукт, который люди хотят использовать ежедневно.

### Где достичь паритета

1. **Block-based output** — и Warp, и Wave это делают. Для Kodiq это must-have, но не дифференциатор.
2. **Git panel** — Cursor-уровень не нужен, но базовый stage/commit/push/pull — стандарт.
3. **Cross-platform** — macOS first, но Linux нужен быстро (Warp критикуют за Linux как "second class").

### Как корректировать позиционирование

- **Не** "AI Terminal" (это Warp)
- **Не** "AI IDE" (это Cursor)
- **Да** → "Open-source desktop for AI CLI tools"
- **Да** → "One window for all your AI coding agents"
- Подчёркивать: open source, offline, no account, no telemetry, BYOC (Bring Your Own CLI)

### Что мониторить

| Что | Почему | Как часто |
|-----|--------|-----------|
| Warp blog / changelog | Движение к CLI-интеграции или BYOK agents | Еженедельно |
| Wave Terminal releases | AI-фичи, preview-функционал | Ежемесячно |
| Claude Code / Gemini CLI updates | GUI-обёртки от провайдеров | Еженедельно |
| libghostty progress | Потенциальная замена xterm.js | Ежеквартально |
| Cursor / Windsurf terminal features | Улучшения встроенного терминала | Ежемесячно |

---

## 11. Revised Priority Recommendation

На основе конкурентного анализа, предлагаемый порядок Phase 1-3:

### Now (текущий спринт)
- ✅ Modular Rust backend (сделано)
- ✅ SQLite + DB commands (сделано)
- Frontend restructure (features-based)
- i18n → English default

### Next (1-3 месяца)
- **CLI Output Intelligence** (moved up from Phase 3) — парсинг вывода, rich rendering, action buttons
- **Chat-mode UI** — мессенджер-подобный интерфейс поверх CLI для новичков
- Git panel (stage/commit/push/pull)

### Later (3-6 месяцев)
- Block-based output (parity с Warp/Wave)
- Visual diff viewer
- Multi-CLI сравнение side-by-side
- Community MVP (лента проектов)
- Auto-update system

---

*Этот анализ актуален на 15 февраля 2026. Рынок AI-инструментов меняется быстро — рекомендуется обновлять каждые 2-3 месяца.*
