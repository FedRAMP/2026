---
tags:
  - Historical
picto:
  source: person
---

# Changelog

!!! info "This changelog displays a summary of changes made in each release after June 23, 2026."

    The changelog should be perused occasionally to ensure minor changes to the Consolidated Rules
    and site content are understood. In general, FedRAMP will minimize changes to the Consolidated
    Rules to the maximum extent possible but may occasionally need to update things due to typos,
    confusion, or urgent critical updates.

## 2026.07.14.01 (July 14, 2026)

This update clarifies some FedRAMP rules and corrects some issues in the FedRAMP JSON schemas

## Rules Content Changes

- **FRD-PAI** (Potential Agency Impact): Added a `note` clarifying that Potential Agency Impact N-rating (PAIN) levels are defined in `VER-EVA-EPA` (Estimate Potential Agency Impact).
- **FRC-CSO-PKG** (FedRAMP Certification Package): Reworked bullets to point to `CPO-CSO-OVR` (Overview of the Cloud Service Offering) and `SDR-CSO-FRR` (FedRAMP Rules) making it easier for users to find more detailed related rules.
- **CPO-CSF-CPM** (Certification Package Maintenance for Rev5): Removed the Class A variant (annual persistent-maintenance obligation) from `varies_by_class`, since Class A certifications are now handled under 20x rather than Rev5.
- **FRC-CLA-MFR**: Clarified in `notes` that providers MUST address the included Key Security Indicators to receive a Class A certification even if they intend to pursue a Rev 5 Program Certification path in the future.
- `CTL.IA.IA-05` control guidance: Reworded class b/c/d guidance to cite "the most recent NIST Digital Identity Guidelines" instead of naming/linking `NIST SP 800-63-3`.
- Terminology rename (display text only, schema key/URL unchanged): `schema.name` for `FRC-CSO-PKG` renamed from "FedRAMP Certification Overview Package" to "FedRAMP Certification Package Overview" across six requirements — `FRC-CSO-PKG`, `CDS-CSO-PUB`, `CDS-CSO-SVC`, `CDS-CSO-UTC`, `MAS-CSO-TPR`, and `SCG-CSO-RSC`.

## Schema And Structure Changes

- Added an optional `updated` property (referencing the existing `updated_list` definition) to CTL control-guidance objects, so per-control guidance entries (e.g. `CTL.IA.IA-05`) can carry an update history like other rule/definition/indicator objects. Structural inference: this is an additive, optional field — not breaking.


## 2026.07.06.01 (July 6, 2026)

This update applies some changes described in the 2026.06.25.01 release that were not previously reflected in the consolidated rules.

### Content Updates

- [Choosing a Certification Path](https://fedramp.gov/2026/providers/start/path/): Combined the separate Lost Sponsor and Ready Conversion sections
  into a single Lost Sponsor/Ready Conversion pipeline description and clarified the eligibility criteria for applicants.

## 2026.07.02.01 (July 2, 2026)

This update fixes several typos in the FedRAMP consolidated rules. No significant changes to requirements are included.

## General Updates

- Corrected a typo in the description of "significant change evaluation."
- Updated terminology across multiple definitions and statements, replacing "Response" with "Communication" in FedRAMP Incident Evaluation rules to enhance clarity and consistency.
- Many updates to key names in schema files to improve consistency and readability.

## 2026.07.01.01 (July 1, 2026)

This update contains minor enhancements and fixes to make the content more accurate and easier to understand. No significant changes to requirements are included.

## General Updates

- Rename assessor and advisor schema files from versioned format to date format. 
- Rename certification overview package schema file to certification package overview, and update corresponding $id and title references.
- Fix typos in field names: correct "frrAssesment" to "frrAssessment" and "ksiAssesment" to "ksiAssessment" in `fedramp-security-decision-record-schema-2026-06-24.json`.

## Rule Changes

- `FRC-CLA-MFR` removed Independent Verification and Validation: IVV-CSF-AIA (Annual Independent Assessments for Rev5) from the class a requirements. All class a packages will use the 20x rules.
- `FRC-CSO-PKG` Fixed a typo which incorrectly referenced class b specifically.  This rule applies to all classes.
- `CDS-CSO-AVR` appeared in both Mandatory and Recommended FedRAMP Rules for Class A. Removed this rule from the Mandatory list.

## Content Updates

- Added tooltips to the PAIN timeframe table column headers in `VDR-TFR-PVR`, `IEC-CSO-IIR`, `IEC-CSO-OIR`, and `IEC-CSO-FIR`. Hovering over `PAIN`, `LEV + IRV`, `LEV + NIRV`, or `NLEV` now shows the full acronym expansion.
- [Choosing a Certification Path](https://fedramp.gov/2026/providers/start/path/): Fixed two instances of "Ready Conversation" to "Ready Conversion" — one in the introductory eligibility description and one in the FedRAMP help form link label.

## 2026.06.25.01 (June 25, 2026)

This update contains minor adjustments after initial release to clarify some content and fix some
inaccurate content in places.

### General Updates

- The grace period related to independent assessments has been changed from _"On the first FedRAMP independent assessment **completed** after..."_ to _"On the first FedRAMP independent assessment **started** after..."_; this change ensures the rules do not change during an assessment. Credit: @cbaerschellman

### Rules Changes

- `CPO-CSO-OSA` was added to require Class B, Class C, and Class D providers to include the assessor-supplied overall summary of assessment in the Certification Package Overview, while allowing Class A providers to include it optionally.
- `FRC.info.subsets.CLA` was narrowed from both 20x/Rev5 and Program/Agency applicability to 20x Program applicability only (this was already defacto but the schema was not updated previously).
- `FRC-CLA-MFR` fixed a wording typo from “Class Arules” to “Class A rules.”
- `FRC-CSO-PKG` was clarified to apply to all provider classes by removing the dangling “Class B” qualifier from the certification package requirement.
- `IEC-CSO-FIR`, `IEC-CSO-IIR`, and `IEC-CSO-OIR` renamed the FedRAMP notification contact display name from “FedRAMP Security Team” to `fedramp_security@fedramp.gov`; this ensures the email address is displayed in human-readable versions of the Consolidated Rules..
- The following duplicative agency rules were removed because they are addressed by `AGU-AGC-NAI` and `AGU-AGC-NAR` already: `CCM-AGM-NAR`, `CCM-AGM-NFA`, `VER-AGM-DRE`, `VER-AGM-NFR`

### Content Updates

- Updated [Choosing a Certification Path](https://fedramp.gov/2026/providers/start/path/) with direct FedRAMP help forms for Ready Conversion and Lost Sponsor eligibility confirmation.
- Fixed the [Getting Support](https://fedramp.gov/2026/support/) Source Data link so readers stay within the Consolidated Rules site.
- Corrected [Important Dates](https://fedramp.gov/2026/timeline/) to direct providers from FedRAMP Ready toward FedRAMP 20x Class A Certification and clarify that the August 3, 2026 Class A pipeline opens for FedRAMP 20x applications.
