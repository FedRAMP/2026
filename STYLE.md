# FedRAMP Content Style Guide

Use this guide for public-facing prose in this repository, including manual
Markdown, generated-page templates, frontmatter, and human-readable text in the
rules data.

## Reference order

When guidance conflicts, use this order:

1. This file and exact project terminology in
   `tools/rules/fedramp-consolidated-rules.json`.
2. Required schemas, identifiers, official names, and exact source quotations.
3. Associated Press Style.
4. The Veterans Affairs Design System guidance for numbers, signs, and symbols.
5. Federal plain-language guidance.

Prefer clarity and consistency for this corpus over blindly applying a general
rule.

## Core approach

- Write for the people who must understand or act on the information.
- Put the actor and required action early in the sentence.
- Use active voice and concrete verbs.
- Keep paragraphs focused on 1 idea.
- Use short sentences when possible.
- Use lists for 3 or more related items or steps.
- Define an unfamiliar technical term when it is necessary.
- Prefer the audience's name, such as `providers`, `agencies`, or `assessors`,
  over vague terms such as `users`, `stakeholders`, or `folks`.

## Capitalization

Use sentence case in body copy. Titles and navigation labels may use title case.
Capitalize proper nouns, official program names, defined FedRAMP names, and
ruleset names. Do not capitalize a common noun merely because it is important.

### Ruleset names

Always use the exact capitalization in `FRR.<key>.info.name` in the rules JSON
when referring to a ruleset.

- Use: `Vulnerability Detection and Response rules`
- Avoid: `vulnerability detection and response rules`
- Use: `Collaborative Continuous Monitoring`
- Use lowercase for a generic activity: `The provider continuously monitors the
  service.`

### FedRAMP names

Capitalize the complete name when referring to the defined FedRAMP concept:

- FedRAMP Certification
- FedRAMP Certified
- FedRAMP Certification Class
- FedRAMP Certification Type
- FedRAMP Certification Path
- FedRAMP Certification Profile
- FedRAMP Certification Package
- FedRAMP Certification Data
- FedRAMP Recognition
- FedRAMP Recognized
- FedRAMP Marketplace
- Initial Certification
- Ongoing Certification
- Key Security Indicator
- Security Decision Record

Use lowercase when the same word is generic:

- `The provider obtained a FedRAMP Certification.`  
  `The provider also maintains an industry certification.`
- `The service is FedRAMP Certified.`  
  `The assessor certified the results.`
- `Review the FedRAMP Certification Package.`  
  `The agency assembled its own authorization package.`

Capitalize `Class A`, `Class B`, `Class C`, and `Class D` when they identify a
FedRAMP Certification Class.

### Common nouns

Use lowercase unless the words are part of an official title or exact quotation:

- federal government
- federal agency
- federal information
- government-wide
- cloud service provider
- cloud service offering
- independent assessment service
- independent assessor
- certification, authorization, assessment, and recognition when used
  generically

Use `a FedRAMP Recognized independent assessment service`, not
`a FedRAMP Recognized Independent Assessment Service`.

## Acronyms and initialisms

Avoid acronyms and initialisms when the full term is readable.

When an acronym or initialism is necessary, include the full term and shortened
form in every paragraph that uses it. Do not rely on a definition in an earlier
paragraph, heading, table, or page.

- Use: `The Cybersecurity and Infrastructure Security Agency (CISA) issued the
  directive. CISA also supplied implementation guidance.`
- Avoid: `CISA issued the directive.` when the paragraph does not also spell out
  the name.
- Prefer: `authorization to operate`
- If needed: `authorization to operate (ATO)` in the same paragraph as every use
  of `ATO`.

`FedRAMP`, `20x`, and `Rev5` function as program or product names and do not need
expansion. Exact identifiers and codes also do not need expansion, including
rule IDs such as `FRC-CLA-MFR`, control IDs, and publication numbers such as
`M-24-15`.

Do not use `3PAO` or `IAS` in new prose. Use:

- `independent assessment service` for the organization or service
- `assessor` when the shorter role name is clear

Retain obsolete terminology only inside an exact quotation, official title, or
historical source that must remain faithful to the original.

## Numbers, signs, and symbols

Follow the [Veterans Affairs Design System numbers guidance](https://design.va.gov/content-style-guide/numbers).

- Use numerals for all numbers, including 1 through 10.
- Spell out `one` in expressions such as `one-time`, `one-to-one`, and `one of`.
- Spell out ordinals through `tenth` unless they are part of a series or range.
  Use `11th`, `12th`, and so on.
- Use the `%` symbol with no space: `25%`.
- Use numerals with units: `3 months`, `5 business days`, `2 years`.
- In body copy, write duration fractions in words: `7 hours and 30 minutes`.
- Do not use `&` in prose or headings unless it is part of an official name.
  Write `and`.
- Use `from ... to ...` or `between ... and ...` for prose ranges.

## Dates and times

Spell out dates in visible prose, lists, and tables:

- Use: `March 31, 1989`
- Avoid: `1989-03-31`
- Use: `from July 1, 2026, to December 31, 2026`

Use year-month-day dates only where a machine-readable format requires them,
including JavaScript Object Notation (JSON) date values, schema examples, code,
filenames, and other structured metadata. Do not rewrite structured dates as
prose.

Write times with minutes and lowercase periods: `9:00 a.m. Eastern time (ET)`.
Use `noon` and `midnight`, not `12:00 p.m.` or `12:00 a.m.`.

## Plain language and word choice

Use the simplest accurate term.

| Prefer | Avoid |
| --- | --- |
| use | utilize, leverage |
| before | prior to |
| to | in order to |
| people or the specific audience | folks |
| a specific noun | stuff, things |
| cannot | can not |
| third parties | third-parties |
| third-party service | third party service |
| `A, B, or both` | `A and/or B` |

Contractions are acceptable in explanatory content when they sound natural.
Avoid casual jokes, idioms, and conversational filler when they could obscure a
requirement.

Use lowercase `must`, `should`, and `may` in explanatory prose. Preserve
uppercase `MUST`, `MUST NOT`, `SHOULD`, `SHOULD NOT`, and `MAY` when quoting or
rendering the formal force of a FedRAMP Rule.

## Source fidelity and machine-readable content

- Do not modernize or silently correct exact quotations, laws, policies,
  historical documents, official titles, identifiers, URLs, filenames, schema
  keys, or code.
- Apply this guide to the framing text around quoted or reproduced material.
- Keep schema-required values in their required format, even when that format
  differs from visible prose.
- Treat frontmatter descriptions and purposes as public-facing text.
- Do not hand-edit generated `src/` or `html/` output. Change `content/`, the
  rules data, configuration, scripts, or templates that produce it.

## Markdown and structure

- Use 1 top-level heading (H1) per page and do not skip heading levels.
- Make headings descriptive and distinct.
- Use descriptive link text; avoid `click here` and bare URLs when a useful
  label is available.
- Keep list items grammatically parallel.
- Use bold sparingly for labels or genuinely important scan points, not as a
  substitute for headings.

## Agent checklist

Before completing a content change:

1. Confirm whether the text is editable prose, structured data, or an exact
   source quotation.
2. Check named terms and ruleset names against the canonical rules JSON.
3. Expand or remove acronyms in each paragraph.
4. Check capitalization, numbers, dates, and symbols.
5. Replace vague or bureaucratic language with direct wording.
6. Verify that the change was made in source content, not generated output.
7. Read the result once as a standalone excerpt that someone might copy and
   paste without surrounding context.

## References

- [Associated Press Stylebook](https://www.apstylebook.com/)
- [Veterans Affairs numbers, signs, and symbols](https://design.va.gov/content-style-guide/numbers)
- [Veterans Affairs abbreviations and acronyms](https://design.va.gov/content-style-guide/abbreviations-and-acronyms)
- [Veterans Affairs capitalization](https://design.va.gov/content-style-guide/capitalization)
- [Veterans Affairs dates and times](https://design.va.gov/content-style-guide/dates-and-numbers)
- [Digital.gov plain-language guides](https://digital.gov/guides/plain-language)
