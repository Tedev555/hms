# Module 10: Multilingual Support (i18n / L10n)

**Phase:** 6 — Internationalization & Localization
**Priority:** High
**Dependencies:** All existing UI modules (Modules 1–9)

---

## 1. Overview

The Multilingual Support module introduces internationalization (i18n) and localization (L10n) capabilities to the HMS. This module enables the entire user interface — including navigation, forms, error messages, notifications, and reports — to be displayed in multiple languages. The initial release will support **English (`en`)** and **Lao (`lo`)** as the two available languages. The goal is to make HMS accessible to hospital staff in Laos who may prefer using the system in Lao language, improve usability in the Lao healthcare environment, and prepare the system for additional languages in the future.

### Scope

- Frontend UI text translation (all pages, components, dialogs, toasts)
- Locale-aware formatting (dates, times, numbers, currencies)
- Language selection and persistence per user
- Admin management of supported languages
- RTL (right-to-left) layout support for applicable languages
- API error message localization

### Out of Scope (Future Iterations)

- Translation of user-generated content (patient notes, medical records)
- Automated machine translation
- Multi-language PDF report generation (Phase 7+)
- Database-level multilingual field storage (e.g., department names in multiple languages)

---

## 2. User Stories

### US-10.1: Language Selection

**As a** hospital staff member,
**I want to** select my preferred language from the application interface,
**So that** all labels, menus, messages, and notifications are displayed in a language I understand.

**Acceptance Criteria:**

- A language selector is available in the top navigation bar / header area
- The selector displays available languages with their native names (e.g., "English", "ລາວ")
- Selecting a language immediately switches all UI text to the chosen language without a page reload
- The selected language is visually indicated in the selector

### US-10.2: Language Persistence

**As a** logged-in user,
**I want** my language preference to be saved to my profile,
**So that** the system remembers my choice across sessions and devices.

**Acceptance Criteria:**

- The user's language preference is stored in their user profile in the database
- On login, the application loads the user's saved language preference
- If no preference is saved, the system falls back to the browser's preferred language, then to the default system language (English)
- Changing the language updates the user's profile automatically
- For unauthenticated pages (login), the language is determined by browser preference or a cookie fallback

### US-10.3: Complete UI Translation

**As a** non-English-speaking staff member,
**I want** all user-facing text (labels, buttons, menus, tooltips, form placeholders, validation messages, error messages, and toast notifications) to be displayed in my selected language,
**So that** I can use the system effectively without needing to understand English.

**Acceptance Criteria:**

- All hardcoded English strings across the application are replaced with translation keys
- Every translation key has a corresponding translation in all supported languages
- Form validation error messages are translated
- Toast / notification messages are translated
- Empty states and placeholder text are translated
- The login page is fully translated
- The dashboard, patient, appointment, billing, staff, pharmacy, laboratory, ward, and reports modules are all translated
- No untranslated strings appear when a supported language is selected

### US-10.4: Locale-Aware Formatting

**As a** hospital staff member working in a specific locale,
**I want** dates, times, numbers, and currencies to be formatted according to my locale conventions,
**So that** I can read data naturally and avoid misinterpretation.

**Acceptance Criteria:**

- Date formats adapt to the selected locale (English: `MM/DD/YYYY`, Lao: `DD/MM/YYYY`)
- Time formats adapt to locale conventions (English: 12-hour, Lao: 24-hour)
- Number formatting uses locale-appropriate separators (e.g., `1,000.50`)
- Currency formatting supports Lao Kip (₭ / LAK) alongside other currencies
- Calendar components (date pickers) display locale-appropriate month names (Lao: ມັງກອນ, ກຸມພາ, etc.) and first day of week

### US-10.5: RTL Layout Support (Future — Not Required for Initial Release)

**As a** staff member who uses a right-to-left language (e.g., Arabic, Hebrew),
**I want** the entire application layout to mirror correctly for RTL reading direction,
**So that** the interface feels natural and usable.

> **Note:** Both English and Lao are left-to-right (LTR) languages. RTL support is not required for the initial release but is documented here for future language expansion.

**Acceptance Criteria:**

- The `<html>` element `dir` attribute is set to `rtl` when an RTL language is active
- Sidebar navigation moves to the right side
- Text alignment, padding, margins, and flexbox/grid directions are mirrored
- Icons that convey directionality (arrows, chevrons) are flipped
- Form layouts read naturally from right to left
- Tailwind CSS RTL utilities or a CSS logical properties approach is used

### US-10.6: Admin Language Management

**As a** system administrator,
**I want to** view which languages are currently supported and manage language availability,
**So that** I can control which languages are offered to staff.

**Acceptance Criteria:**

- An admin settings page lists all available languages with their activation status
- Admin can enable or disable languages (at least one language must remain active)
- Admin can set the default system language
- Disabling a language switches affected users to the default language
- Adding a new language requires uploading or adding a complete translation file

### US-10.7: Translation Completeness Visibility

**As a** system administrator,
**I want to** see the translation completeness percentage for each language,
**So that** I can ensure languages are fully translated before enabling them.

**Acceptance Criteria:**

- Admin language management page shows a completeness indicator (%) for each language
- Languages below 100% completeness show a warning when being enabled
- Missing translation keys are listed or exportable for review
- The system falls back to the default language for any missing translation keys

### US-10.8: API Error Message Localization

**As a** frontend developer,
**I want** API error responses to include a translation key or localized message,
**So that** the frontend can display errors in the user's chosen language.

**Acceptance Criteria:**

- API error responses include a `messageKey` field alongside the human-readable `message`
- The frontend maps `messageKey` to the user's locale for display
- Standard error keys are defined for common errors (validation, not found, unauthorized, etc.)
- If no `messageKey` is provided, the raw `message` is displayed as a fallback

---

## 3. Business Requirements

### BR-10.1: Supported Languages

- The system SHALL support **English (`en`)** as the default and always-available language
- The system SHALL support **Lao (`lo`)** as the second language at initial release
- The system SHALL be architected to support an unlimited number of additional languages in the future
- Each supported language SHALL have a complete set of translations before being enabled in production
- The Lao translation SHALL use standard Lao script (ອັກສອນລາວ) and follow official Lao terminology for medical and administrative terms

### BR-10.2: Translation Architecture

- All user-facing strings SHALL be externalized into structured translation files (JSON namespace files)
- Translation keys SHALL follow a hierarchical, dot-notation naming convention organized by module (e.g., `patients.form.firstName`, `common.buttons.save`)
- A `common` namespace SHALL be defined for shared strings (buttons, actions, statuses, generic labels)
- Each module SHALL have its own translation namespace to allow independent development
- Translation files SHALL be statically bundled with the application (not fetched from a remote server at runtime)

### BR-10.3: Language Switching Behavior

- Language switching SHALL be instantaneous (client-side, no full page reload)
- The application SHALL NOT lose page state or form data when the language is changed
- The language selector SHALL be accessible from every page in the application
- The URL structure SHALL remain the same regardless of the selected language (no `/en/`, `/lo/` path prefixes)

### BR-10.4: Fallback Strategy

- If a translation key is missing for the selected language, the system SHALL fall back to the default language (English)
- If a translation key is missing in both the selected and default language, the system SHALL display the translation key itself as a visual indicator of a missing translation
- In development mode, missing translations SHALL log a console warning

### BR-10.5: Locale Formatting

- Date, time, number, and currency formatting SHALL use the Intl API (built-in browser internationalization) for consistency
- The system SHALL support locale-specific calendar configurations (first day of week, date input formats)
- The formatting locale SHALL follow the user's selected language by default but MAY be independently configurable in future iterations

### BR-10.6: Accessibility

- Language changes SHALL update the `<html lang>` attribute to reflect the active language (e.g., `en` or `lo`)
- Screen readers SHALL announce content in the correct language after a switch
- The application SHALL ensure Lao script is rendered with sufficient font size and line-height for readability

### BR-10.7: Performance

- Translation files SHALL be loaded on-demand per namespace, not as a single large bundle
- Only the active language's translations SHALL be loaded into memory
- Translation file loading SHALL NOT block the initial page render (async loading with fallback)
- Total translation bundle size per language SHALL NOT exceed 200KB (uncompressed)

---

## 4. Technical Specifications

### 4.1 Technology Choice

| Concern | Solution |
|---------|----------|
| i18n Framework | `next-intl` (recommended for Next.js App Router) |
| Locale Formatting | Native `Intl` API + `date-fns/locale` |
| RTL Support | Tailwind CSS logical properties + `dir` attribute |
| Translation File Format | JSON (one file per namespace per locale) |
| Language Detection | `Accept-Language` header → user profile → cookie → default |

### 4.2 Translation File Structure

```
src/
  locales/
    en/
      common.json          # Shared strings (buttons, statuses, labels)
      auth.json            # Login page, auth errors
      dashboard.json       # Dashboard page
      patients.json        # Patient module
      appointments.json    # Appointment module
      billing.json         # Billing module
      users.json           # Staff management module
      pharmacy.json        # Pharmacy module
      laboratory.json      # Laboratory module
      ward.json            # Ward management module
      reports.json         # Reports module
      validation.json      # Form validation messages
      errors.json          # API and system error messages
    lo/
      common.json          # Lao translations
      auth.json
      dashboard.json
      patients.json
      appointments.json
      billing.json
      users.json
      pharmacy.json
      laboratory.json
      ward.json
      reports.json
      validation.json
      errors.json
    <locale>/              # Future languages follow the same structure
      ...
```

### 4.3 Translation Key Convention

```
<namespace>.<section>.<element>

Examples (English → Lao):
  common.buttons.save          → "Save"              / "ບັນທຶກ"
  common.buttons.cancel        → "Cancel"            / "ຍົກເລີກ"
  common.status.active         → "Active"            / "ເປີດໃຊ້ງານ"
  patients.form.firstName      → "First Name"        / "ຊື່"
  patients.form.lastName       → "Last Name"         / "ນາມສະກຸນ"
  patients.list.title          → "Patient List"      / "ລາຍຊື່ຄົນເຈັບ"
  patients.list.empty          → "No patients found" / "ບໍ່ພົບຄົນເຈັບ"
  appointments.queue.title     → "Appointment Queue"  / "ຄິວນັດໝາຍ"
  billing.invoice.totalAmount  → "Total Amount"       / "ຈຳນວນເງິນທັງໝົດ"
  auth.login.title             → "Sign in to HMS"     / "ເຂົ້າສູ່ລະບົບ HMS"
  auth.login.error             → "Invalid credentials" / "ຂໍ້ມູນເຂົ້າສູ່ລະບົບບໍ່ຖືກຕ້ອງ"
  validation.required          → "{field} is required" / "{field} ຈຳເປັນຕ້ອງລະບຸ"
  errors.notFound              → "Resource not found"  / "ບໍ່ພົບຂໍ້ມູນ"
  errors.serverError           → "An unexpected error occurred" / "ເກີດຂໍ້ຜິດພາດທີ່ບໍ່ຄາດຄິດ"
```

### 4.4 Interpolation and Pluralization

```json
// Dynamic values (interpolation)
{
  "patients.list.showing": "Showing {count} of {total} patients",
  "appointments.queue.position": "Position #{position} in queue"
}

// Pluralization
{
  "patients.list.resultCount": "{count, plural, =0 {No patients found} one {1 patient found} other {# patients found}}"
}
```

### 4.5 API Endpoints

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| GET | `/api/v1/locales` | List all available languages | No | — |
| GET | `/api/v1/locales/{locale}` | Get translation completeness info | Yes | admin, director |
| PATCH | `/api/v1/users/{id}/locale` | Update user's language preference | Yes | Self or admin |

### 4.6 Database Schema Changes

```prisma
// Add to User model
model User {
  // ... existing fields
  locale    String   @default("en")  // User's preferred locale (ISO 639-1)
}

// New model for managing available languages
model SupportedLocale {
  id           String   @id @default(uuid()) @db.Uuid
  code         String   @unique              // ISO 639-1 code (e.g., "en", "lo")
  name         String                        // English name (e.g., "Lao")
  nativeName   String                        // Native name (e.g., "ລາວ")
  isActive     Boolean  @default(true)
  isDefault    Boolean  @default(false)
  completeness Float    @default(0)          // Translation completeness percentage
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

### 4.7 Next.js Integration

```typescript
// next.config.ts — add i18n configuration
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig = { /* existing config */ };

export default withNextIntl(nextConfig);
```

```typescript
// src/i18n/request.ts — server-side locale resolution
import { getRequestConfig } from "next-intl/server";
import { getUserLocale } from "@/lib/locale";

export default getRequestConfig(async () => {
  const locale = await getUserLocale();
  return {
    locale,
    messages: (await import(`@/locales/${locale}/common.json`)).default,
  };
});
```

```typescript
// Usage in components
"use client";
import { useTranslations } from "next-intl";

export function PatientList() {
  const t = useTranslations("patients.list");
  return <h1>{t("title")}</h1>; // "Patient List" or translated equivalent
}
```

### 4.8 Language Selector Component

```typescript
// src/components/layout/language-selector.tsx
"use client";
import { useLocale } from "next-intl";

export function LanguageSelector() {
  const currentLocale = useLocale();
  // Renders a dropdown of active languages from SupportedLocale table
  // On change: PATCH /api/v1/users/{id}/locale, update cookie, trigger re-render
}
```

### 4.9 API Error Response Format (Updated)

```json
{
  "statusCode": 400,
  "message": "First name is required",
  "messageKey": "validation.required",
  "messageParams": { "field": "firstName" }
}
```

---

## 5. Implementation Strategy

### Phase 6a: Foundation (Recommended First)

1. Install and configure `next-intl` with Next.js App Router
2. Create the translation file directory structure
3. Extract all English strings from existing components into `en/*.json` files
4. Replace hardcoded strings with `useTranslations()` / `getTranslations()` calls
5. Add `locale` field to the User model (Prisma migration)
6. Create the `SupportedLocale` model and seed with English and Lao
7. Implement the language selector component in the header
8. Implement locale persistence (user profile + cookie fallback)

### Phase 6b: Lao Translations

1. Translate `common.json` namespace to Lao (`lo`)
2. Translate module-specific namespaces one by one (auth → patients → appointments → billing → users)
3. Ensure Lao medical terminology is reviewed by domain experts for clinical accuracy
4. Implement locale-aware date/time/number formatting using `Intl` API (Lao locale: `lo-LA`)
5. Configure currency formatting for Lao Kip (LAK / ₭)
6. Update form validation messages to use translation keys
7. Update toast notifications to use translation keys

### Phase 6c: Advanced Features

1. Add admin language management page
2. Implement RTL layout support using Tailwind CSS logical properties (when RTL languages are added)
3. Implement translation completeness tracking
4. Add API `messageKey` to all error responses
5. Add development-mode missing translation warnings

---

## 6. Additional Information

### Translation Guidelines

- Keep translations concise — UI space is limited especially in sidebar and table headers
- Avoid concatenating translated fragments; use interpolation instead (e.g., `"Welcome, {name}"` not `"Welcome, " + name`)
- Use ICU message format for pluralization and gender-specific translations
- Maintain consistent terminology across namespaces (create a glossary for medical terms)

### Testing Requirements

- Unit tests SHALL verify that all translation keys used in components exist in all supported language files
- A CI check SHALL detect untranslated keys (completeness validation)
- Visual regression tests SHOULD verify layouts are not broken by Lao translated strings (which may differ in length from English)
- Lao rendering tests SHOULD verify that Lao script displays correctly with proper diacritical marks and line-height across the main dashboard, patient list, and appointment queue pages

### Performance Considerations

- Use namespace-based code splitting to load only the translations needed for the current page
- Cache translation files aggressively (they change infrequently)
- Measure and monitor bundle size impact of translation files

### Lao Language Considerations

- Lao script (ອັກສອນລາວ) requires proper Unicode font support — ensure the application fonts include Lao glyphs (e.g., Noto Sans Lao, Phetsarath OT)
- Lao text does not use spaces between words (similar to Thai); CSS `word-break` and `overflow-wrap` properties must handle Lao line-breaking correctly
- Lao numerals (໐໑໒໓໔໕໖໗໘໙) exist but Arabic numerals (0-9) are commonly used in Lao medical contexts — use Arabic numerals for consistency
- Some medical terms in Lao may not have standard translations; in such cases, transliterated English terms are acceptable (e.g., "ອັລຕຣາຊາວ" for ultrasound)
- Lao text may render slightly taller than English due to vowel marks above/below consonants — ensure line-height accommodates this

### Edge Cases

- If a language is disabled while users have it selected, the system should gracefully switch them to the default language on their next request
- Lao translations may vary in length compared to English — test layouts with both languages to avoid overflow or truncation issues
- Medical terminology should be validated by Lao healthcare professionals to ensure clinical accuracy
- Numbers in medical context (dosages, vitals) should always use Arabic numerals for unambiguous reading

### Dependencies

- This module touches all existing UI modules (Modules 1–9) since every hardcoded string must be extracted
- No functional dependency on unimplemented modules — i18n can be applied incrementally
- Requires `next-intl` package to be added to project dependencies
