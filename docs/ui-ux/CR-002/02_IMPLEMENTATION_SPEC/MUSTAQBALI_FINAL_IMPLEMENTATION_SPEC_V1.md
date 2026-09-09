# مستقبلي — Final UI/UX Implementation Specification

> **STATUS:** APPROVED DESIGN IMPLEMENTATION SOURCE
> **VERSION:** 1.0
> **DATE:** 2026-09-06
> **PRODUCT:** مستقبلي
> **BRAND DESCRIPTOR:** إدارة أذكى لحياتك المالية
> **CHANGE CONTEXT:** CR-002 — Design-Led Product Reconstruction
> **PURPOSE:** مرجع تنفيذي تفصيلي واحد لبناء المنصة دون اجتهاد بصري أو تغيير الهوية أثناء البرمجة.

---

# 0. قاعدة المرجع الأعلى

هذا الملف هو **Implementation Source of Truth** للتنفيذ البصري الحالي، ويُقرأ مع ملف الهوية الرئيسي `MUSTAQBALI_UIUX_MASTER_IDENTITY_AND_DESIGN_LOCK.md`.

عند التعارض بين Mockup مولّد وبين هذا الملف، **هذا الملف يتقدم**. الصور تستخدم لفهم الشكل العام والتوزيع فقط، ولا يجوز استخراج خط أو شعار أو ألوان جديدة منها إذا خالفت القواعد هنا.

## ممنوع أثناء التنفيذ
- تغيير شعار مستقبلي أو إعادة رسمه من تلقاء المطور.
- استخدام رمز الريال كشعار.
- استخدام IBM Plex Sans Arabic أو أي خط تطبيق آخر بدل **Tajawal**.
- إنشاء Sidebar جديدة أو Top Bar مختلفة من صفحة إلى أخرى.
- إدخال لون Primary جديد أو اتجاه بصري منفصل.
- جعل Mobile نسخة مصغرة من Desktop.
- استخدام نافذة ضخمة لمسار رئيسي على الجوال.
- جعل كل حقل في الجوال صفًا مستقلًا بلا داعٍ.
- استخدام قيم CSS عشوائية خارج Tokens النظام.

---

# 1. الهوية الثابتة

## 1.1 الاسم
**مستقبلي**

## 1.2 العبارة التعريفية
**إدارة أذكى لحياتك المالية**

تظهر العبارة في السياقات ذات الحضور العلامي القوي مثل:
- تسجيل الدخول.
- Onboarding.
- Splash / Entry.
- About.
- Empty/Intro states المناسبة.

ولا يلزم تكرارها داخل كل صفحة تشغيلية.

## 1.3 الشعار
يستخدم **الشعار الهندسي الصاعد المعتمد** في حزمة الهوية: الرمز + Wordmark «مستقبلي».

النسخ المسموحة:
- Primary stacked.
- Horizontal.
- Symbol-only للمساحات الصغيرة.
- Monochrome فقط عند ضرورة التباين.

### Clear Space
اترك حول الشعار مساحة لا تقل عن ارتفاع أحد أعمدة الرمز الداخلية تقريبًا، ولا يلتصق بأي حافة أو زر.

### الحد الأدنى المقترح
- Desktop wordmark: عرض 112–144px حسب Shell.
- Mobile wordmark: عرض 88–104px.
- Symbol-only: 28–36px.

---

# 2. Typography

## الخط الوحيد داخل المنتج
**Tajawal**

### الأوزان
- 400 Regular
- 500 Medium
- 700 Bold

### Scale — Desktop
- Display/rare hero: 32px / 1.35 / 700
- Page title: 28px / 1.35 / 700
- Section title: 20px / 1.45 / 700
- Card title: 16px / 1.45 / 700
- Body: 14px / 1.7 / 400
- Supporting: 13px / 1.6 / 400–500
- Meta: 12px / 1.5 / 400–500
- KPI value: 28–34px / 1.15 / 700

### Scale — Mobile
- Page title: 20–22px / 1.35 / 700
- Section title: 17–18px / 1.4 / 700
- Card title: 14–16px / 1.45 / 700
- Body: 14px / 1.65 / 400
- Supporting: 12–13px / 1.55 / 400–500
- Meta: 11–12px / 1.45 / 400–500
- KPI value: 24–30px / 1.15 / 700

### القواعد
- لا تستخدم عنوانًا ضخمًا يستهلك الجزء العلوي من الشاشة.
- القيم المالية تتقدم بصريًا على الشرح.
- استخدم `font-variant-numeric: tabular-nums` حيث يدعم المتصفح.
- اعزل الأرقام/الرموز المالية عند الحاجة لضبط BiDi داخل RTL.

---

# 3. Color Tokens

## Brand
```css
--ux-brand-primary: #0B2D5B;
--ux-brand-secondary: #0EA5A2;
--ux-brand-accent: #22C55E;
--ux-success: #16A34A;
--ux-warning: #F59E0B;
--ux-error: #EF4444;
--ux-neutral-800: #334155;
--ux-neutral-400: #94A3B8;
--ux-surface-muted: #F1F5F9;
--ux-surface-base: #FFFFFF;
```

## Light theme surfaces
```css
--ux-page-bg: #F1F5F9;
--ux-card-bg: #FFFFFF;
--ux-shell-topbar-bg: #E6EDF5;
--ux-shell-topbar-border: #D6E0EA;
--ux-shell-sidebar-bg: #0B2D5B;
--ux-shell-sidebar-hover: #123D72;
--ux-shell-sidebar-active: #0EA5A2;
--ux-shell-sidebar-active-soft: rgba(14,165,162,.16);
--ux-section-soft-blue: #EAF3FA;
--ux-section-soft-teal: #E7F7F5;
--ux-border-default: #D9E2EC;
--ux-text-primary: #0B2D5B;
--ux-text-secondary: #475569;
--ux-text-muted: #64748B;
```

### قرار Shell الجديد
**Top Bar وMobile Header أغمق قليلًا من خلفية الصفحة** حتى يتم تمييز طبقة النظام عن المحتوى، لكن بدون تحويل الواجهة إلى Dark UI.

- Page: `#F1F5F9`
- Top Bar / Mobile Header: `#E6EDF5`
- Cards: `#FFFFFF`
- Sidebar: `#0B2D5B`

هذا يخلق 3 طبقات واضحة: **Shell → Page → Card**.

## Dark theme
```css
--ux-dark-page-bg: #08111F;
--ux-dark-card-bg: #0D1B2A;
--ux-dark-shell-topbar-bg: #0A1726;
--ux-dark-shell-sidebar-bg: #07101C;
--ux-dark-surface-muted: #12263A;
--ux-dark-border: #24364B;
--ux-dark-text-primary: #F8FAFC;
--ux-dark-text-secondary: #CBD5E1;
```

Teal يبقى Accent رئيسيًا في الوضع الداكن، والأخضر/البرتقالي/الأحمر تبقى Semantic فقط.

---

# 4. Grid, Spacing, Radius, Shadow

## Spacing scale
`4, 8, 12, 16, 20, 24, 32, 40, 48`

## Page padding
- Desktop >= 1024: 32px
- Wide >= 1440: 40px
- Medium 768–1023: 24px
- Mobile < 768: 16px

## Grid
- Desktop: 12 columns / 24px gutter
- Mobile: 4 columns / 16px gutter

## Radius
```css
--ux-radius-xs: 8px;
--ux-radius-sm: 10px;
--ux-radius-md: 12px;
--ux-radius-lg: 16px;
--ux-radius-xl: 20px;
```

المكونات التشغيلية الافتراضية: 12px. البطاقات الكبرى: 16px. Sheets: 20px أعلى الجوال.

## Borders
- Standard: 1px
- Emphasis/focus: 2px

## Shadows
- S: subtle input/compact card
- M: elevated card/dropdown
- L: modal/sheet only

لا تستخدم Shadow قويًا لكل بطاقة؛ الفصل الأساسي يتم بالسطح/الحدود/المسافة.

---

# 5. Global Shell — Desktop

## 5.1 App frame
```text
[Sidebar RTL] [Main Application Area]
               ├─ Top Bar
               └─ Page Content
```

## 5.2 Sidebar — قابلة للتحكم بالكامل

### Expanded
- Width: **248px**
- Background: `#0B2D5B`
- Position: الجانب الأيمن في RTL.
- Full height: 100dvh.
- Sticky/fixed داخل App Shell.

### Collapsed
- Width: **72px**
- تظهر الأيقونات فقط.
- Tooltips عند Hover/Focus.
- الشعار يتحول إلى Symbol-only.

### Hide/Reveal
المستخدم يستطيع:
1. **Collapse** إلى Icon rail.
2. **Expand** مرة أخرى.

لا نسمح بحالة «اختفت ولا يمكن إظهارها». زر التحكم يظل متاحًا دائمًا في:
- أعلى Sidebar، أو
- Top Bar عند الحالة collapsed.

### Persistence
احفظ اختيار المستخدم محليًا:
`sidebarState = expanded | collapsed`

ولا تجعل Sidebar تختفي بالكامل على Desktop إلا في Focus Mode مستقبلي موثق.

### Active item
- Indicator + Teal accent.
- لا تعتمد على اللون وحده: خلفية/شريط/وزن نص.

### Navigation order
1. الرئيسية
2. الحركة المالية
3. التخطيط والميزانية
4. الأهداف
5. الالتزامات
6. التمويل الداخلي
7. التقارير
8. المستشار الذكي
9. المزيد/الإعدادات حسب السياق

Profile/Settings في الجزء السفلي من Sidebar أو Top Bar، لكن بنفس المكان في كل الصفحات.

---

# 6. Global Top Bar — Desktop

## الحجم
- Height: **64px** standard.
- Background: `#E6EDF5` Light.
- Dark: `#0A1726`.
- Border bottom: 1px.

## المحتوى RTL
من اليمين إلى اليسار:
1. Context / page title المختصر عند الحاجة.
2. Search — المساحة المرنة الرئيسية.
3. Notifications.
4. Quick settings/theme عند الحاجة.
5. Profile trigger.
6. Sidebar collapse/expand control إذا لم يكن داخل Sidebar.

## Search
- Height: 40px.
- Max width: 420px.
- لا يستهلك العرض بالكامل.
- Placeholder: «ابحث في مستقبلي…» أو نص سياقي.

## Icon controls
- Visual icon: 20px.
- Effective target: 40–44px Desktop.
- Notification badge لا يغطي الأيقونة.

## Profile trigger
- Avatar 32px.
- الاسم/الحالة اختياريان حسب العرض.
- Dropdown لا يغير مكان Top Bar بين الصفحات.

---

# 7. Global Shell — Mobile

## 7.1 Mobile Header
المطلوب الجديد: **Header أغمق قليلًا من Page surface**.

- Height: 56px.
- Light background: `#E6EDF5`.
- Dark background: `#0A1726`.
- Sticky top.
- Respect safe-area inset top.

### Default structure
- Brand symbol/compact wordmark.
- Page/context title عند الحاجة.
- Notifications.
- Menu button عند الحاجة للملاحة الثانوية.

لا تكرر Search دائمًا في Header إذا لم تكن الصفحة تحتاجه؛ Search يظهر كمكون داخل الصفحة عندما يكون أكثر فائدة.

## 7.2 Mobile navigation
Primary destinations = Bottom Navigation, max 5:
1. الرئيسية
2. الحركة
3. التخطيط
4. المستشار
5. المزيد

- Height content: 56–64px + safe-area.
- Active = icon + label + Teal/Navy treatment.
- كل item target >= 44×44.

## 7.3 Mobile secondary navigation drawer
إذا احتجنا بقية الأقسام، Menu button يفتح **Navigation Drawer** وليس نافذة عشوائية.

### Drawer behavior
- RTL: يفتح من اليمين.
- Width: min(84vw, 320px).
- Contains secondary destinations/settings/account.
- Close via X, swipe, backdrop, Escape when keyboard available.
- لا يستبدل Bottom Nav للأقسام الأساسية.

---

# 8. Buttons

## Heights
- Small: 40px visual / >=44px effective touch on mobile.
- Medium: 48px.
- Large: 56px — فقط للHero/entry أو إجراء كبير مقصود.

## Padding
- Small: 12–16px horizontal
- Medium: 16–20px
- Large: 20–24px

## Types
- Primary: Navy / white.
- Secondary: soft/tinted / Navy.
- Accent action selectively: Teal.
- Tertiary: text/outline.
- Destructive: Error.

## Button sizing rule
**الحجم يتبع السياق وليس عرض الحاوية.**

- Card action: compact.
- Form submit on Mobile: full width غالبًا.
- Desktop form: يمكن أن يكون auto-width.
- لا تجعل «عرض التفاصيل» زرًا ضخمًا.
- Icon-only action: 40–44px target.

---

# 9. Forms — Mobile-First Density

## Adaptive 1–2 columns

### Two columns when short/compatible
- المبلغ + التاريخ.
- النوع + التصنيف.
- الحالة + الأولوية.
- من حساب + إلى حساب إذا كان المحتوى قصيرًا.
- اليوم + التكرار.

### Full width
- الوصف.
- الملاحظات.
- البحث.
- اسم طويل.
- Combobox ذات خيارات طويلة.

## Input dimensions
- Height: 48px Mobile.
- Textarea min-height: 96px.
- Gap between fields: 12px.
- Row gap: 12–16px.
- Section gap: 24px.

## Labels
Persistent label above field أو داخل Field group، ولا تعتمد على Placeholder كLabel وحيد.

## Action Zone
في نهاية Form:
- 24px فصل عن آخر Field.
- Primary action واضح.
- Secondary/Cancel منفصل.
- Sticky submit فقط للعمليات الطويلة إذا لا يغطي Navigation.

---

# 10. Page vs Bottom Sheet / Modal — Mobile

## Full Page
استخدمها عندما تكون المهمة:
- رئيسية.
- Multi-step.
- تحتوي أقسامًا متعددة.
- تحتاج حفظ/استكمال.
- إنشاء ميزانية كاملة.
- إضافة عملية مالية رئيسية.
- إعادة توزيع خطة كاملة.

## Bottom Sheet
استخدمه فقط لإجراء فرعي داخل Context موجود:
- إضافة بند للميزانية.
- تعديل بند بسيط.
- اختيار تصنيف.
- فلتر.
- تغيير حالة.
- تأكيد.

## Conversion rule
إذا تجاوزت النافذة تقريبًا 4–5 حقول فعلية أو احتاجت Sections/Scroll طويل، حوّلها إلى Page.

---

# 11. Card Architecture

كل Card تشغيلية:

```text
Header: [Icon/Status] [Title]
Content: main value / summary
Meta: date / category / source / secondary facts
Actions: context actions
```

## Notification card example
- Header: severity icon + title.
- Content: الرسالة المختصرة.
- Meta: التاريخ/الوقت.
- Actions: «عرض التفاصيل» compact.

لا يدخل الزر بين العنوان والتاريخ، ولا تستخدم Layout يعتمد على absolute positioning للمحتوى المتغير.

## Card padding
- Desktop: 20–24px.
- Mobile: 16px.
- Compact list item: 12–16px.

---

# 12. Data Visualization Rules

نوع الرسم يتبع السؤال:

- Cash flow over time → Line/Area أو grouped bars حسب المقارنة.
- Income vs expenses → Grouped bars.
- Category distribution → Donut فقط عندما عدد الفئات محدود.
- Goal progress → Progress bar / Ring.
- Upcoming obligations → Rings/indicators إذا المطلوب نظرة سريعة، وليس جدول تفصيلي على Dashboard.
- Risk/attention → status indicator + semantic label، وليس Gauge لمجرد الزينة.

## Dashboard rule
المستخدم يجب أن يفهم خلال ثوانٍ:
1. أين أنا ماليًا؟
2. ماذا يحتاج انتباهي؟
3. ما الإجراء التالي؟

التفاصيل تنتقل للصفحة المتخصصة.

---

# 13. Dashboard / Home

## Desktop hierarchy
1. الوضع الآن / Safe-to-spend.
2. KPIs الرئيسية.
3. Cash flow.
4. Spending distribution.
5. Upcoming commitments — compact indicators.
6. Attention/alerts.
7. Goals/progress.
8. Recent activity.

## Mobile hierarchy
1. Safe-to-spend.
2. Attention.
3. Next best action.
4. 2-column KPI grid.
5. One priority chart.
6. Upcoming commitments compact indicators.
7. Recent movement.

لا تحاول عرض نسخة Desktop كاملة على شاشة الهاتف.

---

# 14. Transactions / Money Movement

## Desktop
- KPI strip.
- Search/filter toolbar.
- Data table.
- Row actions via menu.
- Add transaction primary action.

## Mobile
- Search/filter compact.
- Transaction cards/list rows.
- Amount visually prominent.
- Type/category/date as supporting metadata.
- Primary Add action accessible without covering content.

### Creation flows
- Add Expense = Page.
- Add Income = Page.
- Transfer = Page.
- Refund = Page.
- Add category inside those flows = Bottom Sheet.

---

# 15. Budget & Planning

Dashboard-only design is **not sufficient**. الصفحة يجب أن تدعم العمل.

## Required actions
- Add budget.
- Add category/item.
- Edit budget.
- Edit item.
- Delete item.
- Move/reallocate amount.
- Copy previous month.
- Save draft.
- Activate/confirm budget.
- View item details/history.

## Desktop
Action bar at top:
- `+ إضافة بند`
- `تعديل الميزانية`
- `نسخ من شهر سابق`
- `⋯ المزيد`

Each budget row/card:
- planned
- spent
- remaining
- utilization
- row actions menu

## Mobile
- Add item prominent inside page.
- Add/Edit small item = Bottom Sheet.
- Create/Edit full budget = Page.
- Reallocation involving several categories = Page.

---

# 16. Goals & Commitments

## Goals
- Goal title.
- target amount.
- saved amount.
- percent complete.
- target date.
- health/on-track state.
- Add contribution / Edit goal / Details.

## Commitments
On summary screens prefer:
- upcoming count.
- due soon indicator.
- amount due.
- circular/progress indicator where meaningful.

Detailed due dates and payment actions live in the commitments page.

---

# 17. Reports & Advisor

## Reports
- Filters/date range.
- KPI summary.
- chart chosen per task.
- key interpretation statement.
- details/export only where useful.

## Advisor
Every recommendation follows:
**Finding → Why → Impact → Recommended action**

Example structure:
- «مصروف المطاعم أعلى من خطتك 18%.»
- سبب/سياق مختصر.
- أثر محتمل على المتاح الآمن للإنفاق.
- CTA: «راجع المصروفات».

---

# 18. States Required

راجع كل مكون حسب ما ينطبق:
- DEFAULT
- HOVER
- FOCUS
- PRESSED
- SELECTED
- LOADING
- SKELETON
- EMPTY
- NO_RESULTS
- ERROR
- SUCCESS
- DISABLED
- OFFLINE
- PERMISSION_DENIED

لا تعتبر الشاشة مكتملة إذا صُممت الحالة الطبيعية فقط.

---

# 19. Accessibility & RTL

## Minimum implementation contract
- Effective touch target Mobile: >= 44×44px.
- Visible focus.
- Keyboard navigable Desktop.
- Labels programmatically associated.
- Errors associated and announced.
- No positive tabindex.
- Modal/Sheet focus management.
- Arabic `lang="ar"` + `dir="rtl"`.
- Logical DOM order follows visual reading order.
- Directional icons mirror where semantically required.
- Color is never the only state indicator.
- Reduced Motion supported.

---

# 20. Responsive Breakpoints

```css
/* Mobile */
@media (max-width: 767px) {}

/* Transitional medium */
@media (min-width: 768px) and (max-width: 1023px) {}

/* Desktop */
@media (min-width: 1024px) {}

/* Wide */
@media (min-width: 1440px) {}
```

Mobile وDesktop مستقلان منطقيًا، وليسا مجرد scaling.

---

# 21. Shell Behavior Matrix

| Element | Desktop Expanded | Desktop Collapsed | Mobile |
|---|---|---|---|
| Sidebar | 248px | 72px icon rail | Drawer only for secondary nav |
| Main navigation | Sidebar | Icon rail | Bottom Nav max 5 |
| Top/Header | 64px darker shell surface | same | 56px darker shell surface |
| Search | Top Bar | Top Bar | page/contextual |
| Notifications | Top Bar | Top Bar | Header |
| Profile | Top Bar/Sidebar footer | compact | Drawer/Profile entry |
| Logo | wordmark | symbol | compact symbol/wordmark |
| Show/Hide control | always reachable | always reachable | menu opens drawer |

---

# 22. Implementation Acceptance Checklist

كل صفحة قبل اعتبارها جاهزة يجب أن تحقق:

### Identity
- [ ] Correct logo asset.
- [ ] Tajawal only.
- [ ] Approved palette only.
- [ ] Currency symbol used only for money.

### Shell
- [ ] Top Bar/Header visibly separated from page by darker shell surface.
- [ ] Sidebar matches single global component.
- [ ] Sidebar can collapse and re-expand.
- [ ] Navigation active state clear.
- [ ] Mobile Bottom Nav <= 5.

### Mobile
- [ ] Avoidable vertical scroll reduced.
- [ ] Short fields paired when appropriate.
- [ ] Long text full width.
- [ ] Primary workflow is Page.
- [ ] Secondary action uses Sheet/Modal only where appropriate.
- [ ] Buttons proportionate to card/form.
- [ ] Targets >= 44×44.

### Cards/Data
- [ ] Header/Content/Meta/Actions organized.
- [ ] No overlapping CTA/date/text.
- [ ] Chart type matches task.
- [ ] Dashboard does not over-expose detail.

### States/A11y
- [ ] Loading/empty/error/success covered where relevant.
- [ ] RTL verified.
- [ ] Focus/keyboard/labels verified.
- [ ] Light and Dark mode verified.

---

# 23. Final Design Decisions Locked by This Specification

1. **Brand:** مستقبلي.
2. **Descriptor:** إدارة أذكى لحياتك المالية.
3. **Font:** Tajawal.
4. **Logo:** approved geometric growth mark; currency symbol is not logo.
5. **Themes:** Light + Dark.
6. **Light Shell:** Top Bar + Mobile Header use a slightly darker surface than the page (`#E6EDF5`).
7. **Desktop Sidebar:** Navy, 248px expanded, 72px collapsed, always re-openable.
8. **Mobile:** Bottom Nav for 5 primary destinations; Drawer for secondary destinations.
9. **Mobile forms:** adaptive 1–2 columns.
10. **Primary flows:** Full Pages; secondary contextual additions: Bottom Sheets/Modals.
11. **Cards:** Header → Content → Meta → Actions.
12. **Charts:** selected by information task.
13. **Budget:** operational actions must be visible; not dashboard-only.
14. **No visual drift:** no alternate logo, font, sidebar, palette or page shell may be introduced without governed change.

---

# 24. Handoff Instruction to Implementation Team

ابدأ التنفيذ من **Global Shell + Design Tokens + Core Components** قبل بناء الصفحات.

الترتيب الإجباري للتنفيذ:

`Tokens → Typography → Logo assets → Icons → Buttons → Inputs → Cards → Shell → Navigation → Forms → Charts → Page templates → Screens → States → Responsive → Accessibility → Pixel QA`

لا تنسخ Layout من صورة مولدة بشكل مباشر. استخدم الصور كمرجع بصري، واستخدم هذا الملف للمقاسات والسلوك والهوية.

**أي Component يتكرر مرتين يجب أن يصبح Component مشتركًا، لا نسخة مستقلة لكل صفحة.**

---

# 25. Approval State

**DESIGN DIRECTION:** LOCKED

**NEW SHELL DECISION:** APPROVED
- darker light Top Bar/Mobile Header
- globally consistent collapsible/re-expandable Desktop Sidebar
- secondary Mobile Drawer + primary Bottom Navigation

**NEXT IMPLEMENTATION OUTPUT:** build the full platform against this specification, then perform responsive/accessibility/pixel audit before final certification.

