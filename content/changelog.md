---
description: "A history of changes to overall rules and this website through the Consolidated Rules for 2026 Public Preview period."
purpose: "Gives folks a consistent place to come and see summaries of the changes since last visit."
google_doc: ""
picto:
  source: person
  status: stable
---

# Changelog

## 2026.05.25.01-preview

**Release Date:** May 25, 2026

### Content Updates

- [Using the Consolidated Rules](https://preview.fedramp.gov/2026/rules/): Added a new overview page that explains how FedRAMP rulesets, subsets, rules, definitions, applicability, rule force, and rule identifiers fit together.
- [Getting Started as a Cloud Service Provider](https://preview.fedramp.gov/2026/providers/start/): Expanded the page with a step-by-step path for providers, from finding support through choosing a certification class, type, and path.
- [Getting Support](https://preview.fedramp.gov/2026/providers/support/): Added guidance on where providers should look for help, including documentation, public community channels, FedRAMP.gov updates, the help desk, and limits on what FedRAMP can do for private stakeholders.
- [Getting Support from FedRAMP](https://preview.fedramp.gov/2026/agencies/support/): Expanded the agency support page with direct contact guidance and links to the Agency Liaison Program, support groups, concern reporting, and CISA directive support.
- [Certification Classes](https://preview.fedramp.gov/2026/agencies/use/classes/): Added an explanation of how FedRAMP Certification classes differ from FIPS 199 security categories and how agencies should use that distinction in risk decisions.
- [Federal Agencies](https://preview.fedramp.gov/2026/agencies/): Updated the landing page cards so agencies are directed to the support page and the card labels read more consistently.
- [Advisory Services](https://preview.fedramp.gov/2026/advisors/): Removed internal source-document metadata without changing the public page text.

## Rules Changes

- A [significant number of underlying Rules changes were made on May 25 and earlier](https://github.com/FedRAMP/rules/pull/11).
- [Incident Communications Procedures](https://preview.fedramp.gov/2026/reference/incident-communications-procedures) were updated based on the outcome from RFC-0031.

### Site Structure

- Reorganized the overview navigation into clearer groups for understanding FedRAMP, preview information, and the complete ruleset reference.
- Added a [Complete Ruleset Reference](https://preview.fedramp.gov/2026/reference/) section with standalone generated pages for each ruleset.
- Added [Using the Consolidated Rules](https://preview.fedramp.gov/2026/rules/) to the overview navigation.
- Replaced the separate agency getting-started page with the expanded [Getting Support as a Federal Agency](https://preview.fedramp.gov/2026/agencies/support/) section.

### Generated Page Experience

- Added complete generated reference pages for each ruleset, with a reference index that lists ruleset status, subset counts, rule counts, and most recent update dates. Examples: [Complete Ruleset Reference](https://preview.fedramp.gov/2026/reference/) and [Incident Communications Procedures](https://preview.fedramp.gov/2026/reference/incident-communications-procedures/).
- Improved generated rule pages with subset navigation, activity workflow diagrams, PAIN timeframe tables, notes, following-information lists, source references, and links between related rules.
- Updated [FedRAMP Definitions](https://preview.fedramp.gov/2026/definitions/) so definitions render as one alphabetical list with an Important Related Terms table and links back to the relevant related-terms group.

### Tooling

- Updated the Markdown generation pipeline, templates, and tests for the new reference pages, definitions layout, workflow diagrams, related-rule links, and richer rule metadata.
- Improved build and deployment scripts, TypeScript checking, and documentation for generated page mappings.
- Updated the rules sync workflow so maintainers can sync the rules submodule from a named branch.

## 2026.05.17.01-preview

**Release Date:** May 17, 2026

- Moved Definitions from the FedRAMP section to the Overview section as they apply to all stakeholders.
- Added Cloud Service Providers -> Getting Started as a Cloud Service Provider -> [Finding an Advisor](providers/start/advisor)
- Added Cloud Service Providers -> Getting Started as a Cloud Service Provider -> [Finding an Assessor](providers/start/assessor)
- Added placeholder [FedRAMP Recognition for Independent Assessment Services rules](assessors/recognition/rules/fedramp-recognition.md)
- Lots of work continues behind the scenes

## 2026.05.04.01-preview

**Release Date:** May 4, 2026

This section contains a high-level summary of key takeaways:

- A consolidated annual rules model with expected support through December 31, 2028.
- FedRAMP Certification as the single official label for FedRAMP's outcome.
- Certification Classes A, B, C, and D replace previous FIPS-199 Security Categorization-based labels.
- Program Certification as an explicit path separate from Agency Certification.
- Rev5 Class A as a successor path connected to FedRAMP Ready transition.
- Marketplace rules for providers, assessors, advisors, and Preparation Phase listings.
- Agency Use rules.
- Class-specific timing and applicability throughout the structured rules.
- FedRAMP Certification Data, FedRAMP Certification Package, Ongoing Certification, Ongoing Certification Report, and Security Category definitions.
- Explicit artifacts in structured rules.
- Empty placeholders for Independent Assessment Plan, Independent Assessment Report, and Security Decision Record rules.
- Rev5 Balance Improvement Releases shift from optional or beta materials into staged mandatory CR26 rules.
- The role of assessors shifts toward verification and validation of processes and outcomes, not just review of static documents.
- Continuous monitoring shifts from monthly artifact-heavy submissions toward shared 3-month reporting and quarterly review patterns.
- Vulnerability management shifts toward contextual vulnerability detection and response, including exploitability, internet reachability, and potential adverse impact.
- Significant change handling shifts from requests to notification rules with change categories.
- Minimum Assessment Scope reduces reliance on a single traditional Authorization Boundary Diagram.
- Key Security Indicators shift to outcome language and a smaller set of indicators.
- Agency responsibilities become more explicit and machine-readable.
- "Authorization" terminology changes to "Certification" terminology when referring to FedRAMP's action.
- "Authorization Data Sharing" changes to "Certification Data Sharing".
- "Ongoing Authorization Report" changes to "Ongoing Certification Report".

### 20x moves from pilot materials toward formal rules

The 20x pilot model becomes part of the same consolidated rule structure.

- The count of Key Security Indicators has been reduced from 60 indicators to 46 indicators.
- The separate old "Authorization by FedRAMP" Key Security Indicator domain is removed. Those items are now handled as FedRAMP Certification rules and rule-set cross-references instead of security indicators.
- Key Security Indicators were broadly rewritten from imperative statements into outcome-style statements. Most retained indicators keep the same intent with clearer, more consistent statement shape.
    - **Old style**: "Securely manage the lifecycle and privileges..."
    - **New style**: "The lifecycle and privileges... are securely managed..."

Stakeholders should not confuse the small number of Key Security Indicators for a small number of rules - there are 150+ overall rules, in addition to the Key Security Indicators, that apply to cloud service providers seeking FedRAMP Certification.

### Specific Key Security Indicator Changes

 The meaningful removals and consolidations are:

#### Removed Key Security Indicator domain

The **Authorization by FedRAMP** Key Security Indicator domain was removed. These 10 indicators no longer appear as Key Security Indicators:

- `KSI-AFR-ADS` Authorization Data Sharing
- `KSI-AFR-CCM` Collaborative Continuous Monitoring
- `KSI-AFR-FSI` FedRAMP Security Inbox
- `KSI-AFR-ICP` Incident Communications Procedures
- `KSI-AFR-MAS` Minimum Assessment Scope
- `KSI-AFR-PVA` Persistent Validation and Assessment
- `KSI-AFR-SCG` Secure Configuration Guide
- `KSI-AFR-SCN` Significant Change Notifications
- `KSI-AFR-UCM` Using Cryptographic Modules
- `KSI-AFR-VDR` Vulnerability Detection and Response

These are now better represented as FedRAMP Certification rules and rule-set obligations.

#### Consolidated cybersecurity education indicators

The old Cybersecurity Education domain had 4 indicators:

- `KSI-CED-RGT` Reviewing General Training
- `KSI-CED-RST` Reviewing Role-Specific Training
- `KSI-CED-DET` Reviewing Development and Engineering Training
- `KSI-CED-RRT` Reviewing Response and Recovery Training

The new domain has 1 indicator, consolidating the same training themes into a single broader outcome.:

- `KSI-CED-RAT` Reviewing All Training.

#### Removed standalone phishing-resistant multifactor authentication indicator

The old standalone `KSI-IAM-MFA` phishing-resistant multifactor authentication indicator was removed. The remaining Identity and Access Management indicator for passwordless methods now includes strong passwords with phishing-resistant multifactor authentication when passwordless methods are not feasible.

### Still in Progress

The following areas should not be treated as fully settled in the current preview:

- FedRAMP Certification rules are still being built out as formal rules.
- Marketplace Listing rules are still being built out as formal rules.
- Incident Communications Procedures rules are pending the outcome of RFC-0031.
- Using Cryptographic Modules rules are still being built out as formal rules.
- Agency Use rules are still going through review.
- Independent Assessment Plan rules are empty.
- Independent Assessment Report rules are empty.
- Security Decision Record rules are empty.
- Many narrative pages in the 2026 Markdown corpus are empty or incomplete.
- Some machine-generated sections still need tuning or have not yet been converted into the structured rules file.

#### Monitoring TO DO

A complete summary of the status of all pages based on their own metadata is available on the [TO DO](todo.md) page.
