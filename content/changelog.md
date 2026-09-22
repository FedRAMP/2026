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

## 2026.09.22.01 (September 22, 2026)

This is purely a content (and build pipeline) update that clarifies the "obtain", "maintain", "optional_adoption", and "grace" attributes for each Ruleset.

This update was inspired by [InfusionPoints Behind the Shield Episode 48 - FedRAMP CR26 Explained: VDR/VER, Key Deadlines & the Move to 20x](https://www.youtube.com/watch?v=6EaimqojsTY), where Mike and Aidan spent quite a bit of time explaining how confusing it was that we used simple one word labels for these.

### Content Changes

- [Provider Rev5 Deadlines](providers/updating/deadlines/rev5) and [Provider 20x Deadlines](providers/updating/deadlines/20x) now explain how to apply the different deadline dates.

### General Updates

Each dynamically rendered Ruleset introduction now uses clearer wording for effective dates in the Effective Date(s) & Overall Applicability section:

- _Obtain_ is now _Obtaining Initial Certification_
- _Maintain_ is now _Maintaining Initial Certification_
- _Grace Ends_ is now _Grace Period Ends_

## 2026.09.13.02 (September 13, 2026)

This update fixes several typos and minor grammatical issues in the narrative text on the Consolidated
Rules site, and integrates several small readability and clarity tweaks in various FedRAMP Rules.

Several of these updates were contributed by members of the FedRAMP Community on GitHub, including:

- @AllanTaylor314: [Assessor page says listing is an endorsement, inverting the meaning (+ other spelling, grammar, and punctuation fixes)](https://github.com/FedRAMP/2026/issues/96)
- @ktalons: [Should these five rules carry timeframe_type/timeframe_num?](https://github.com/FedRAMP/community/discussions/164)
- @tnnrjmsn-eit: [incident-evaluation-and-communication](https://github.com/FedRAMP/2026/discussions/113#discussioncomment-18192379)
- @mgcas-roxanne: [agency-use](https://github.com/FedRAMP/2026/discussions/110#discussioncomment-18022928)


### Content Changes

- The force of the rule (`MUST`, `MUST NOT`, `SHOULD`, `SHOULD NOT`, `MAY`) now includes a link to the definition with an instant preview any time it appears in the main rule statement.
- [Using the Consolidated Rules](rules/#force-of-the-rule){ data-preview } Force of the Rule section was moved from a table into a series of h4 admonitions for readability; this is the same information that's now also in FedRAMP Definitions.
- Instant preview links no longer have the mouse-pointer icon :lucide-mouse-pointer-2: after them - this might make it a bit less obvious that there is an instant preview but removes a lot of visual clutter.

### Rules Changes

- `AGU-AGC-LIA`: Updates the Agency Liaison Program reference URL from `/preview/2026/agencies/support/liaisons` to `/2026/agencies/support/liaisons`.
- `AGU-USE-ABU`: Updates the authorization guidance reference URL to `https://www.fedramp.gov/2026/agencies/use`.
- `CCM-OCR-AVL`: Clarifies that listed Ongoing Certification Report contents are required “if applicable,” depending on certification type or class, and adds structured metadata for the existing 3-month reporting interval.
- `CCM-QTR-SAR`: Adds structured timeframe metadata for the existing recommendation to schedule Quarterly Reviews 3–10 business days after releasing an Ongoing Certification Report.
- `CPO-CSO-OVR`, `CPO-CSO-MTD`, `CPO-CSO-OSA`, and `CPO-CSF-CPM`: Moves the Rev5 default grace date from January 1 to July 1, 2027, at `FRR.CPO.info.rev5.effective.date.grace.default`, retaining `until_next_assessment: true`.
- `CPO-CSF-CPM`: Structurally narrows Rev5 subset applicability from classes A–D to B–D at `FRR.CPO.info.rev5.subsets.CSF.applicability.classes`.
- `FRC-CCL-UCC`, `FRC-CCL-DCC`, and `FRC-CCL-DNP`: Structurally narrows certification-class-change applicability from classes A–D to B–D at `FRR.FRC.info.subsets.CCL.applicability.classes`; upgrade and downgrade notes still mention transitions involving Class A.
- `IEC-CSO-OIR`: Removes the duplicated “the” from all four class-specific incident-reporting statements.
- `IVV-CSF-MCA`: Adds structured metadata for the existing requirement to include all applicable Rev5 controls in independent assessments every 3 years.
- `MKT-CAS-RFR`: Adds structured metadata for the existing requirement that advisors respond to FedRAMP or GSA requests within 5 business days.
- `MKT-IIP-DLA`: Adds structured metadata for the existing 2-year deadline to demonstrate a scheduled Class B, C, or D assessment after initial listing.
- `VDR-TFR-NMV`: Adds structured metadata for the existing requirement to verify and validate non-machine-based information resources at least every 3 months.
- Adds definition `FRD-MST` (MUST): an absolute requirement that must be met and documented, with failure potentially requiring corrective action or denial of initial or ongoing certification.
- Adds definition `FRD-MNT` (MUST NOT): an absolute prohibition that must be observed and documented, with the same potential consequences for failure.
- Adds definition `FRD-SHD` (SHOULD): departures may have valid reasons, but parties must carefully weigh the implications and document their decisions.
- Adds definition `FRD-SNT` (SHOULD NOT): the discouraged action may be justified in particular circumstances, but parties must carefully weigh the implications and document their decisions.
- Adds definition `FRD-MAY` (MAY): the rule is optional, and parties should explain their decisions in security documentation.

## 2026.07.14.01 (July 14, 2026)

This update clarifies some FedRAMP rules and corrects some issues in the FedRAMP JSON schemas.

### Rules Changes

- **FRD-PAI** (Potential Agency Impact): Added a `note` clarifying that Potential Agency Impact N-rating (PAIN) levels are defined in `VER-EVA-EPA` (Estimate Potential Agency Impact).
- **FRC-CSO-PKG** (FedRAMP Certification Package): Reworked bullets to point to `CPO-CSO-OVR` (Overview of the Cloud Service Offering) and `SDR-CSO-FRR` (FedRAMP Rules) making it easier for users to find more detailed related rules.
- **CPO-CSF-CPM** (Certification Package Maintenance for Rev5): Removed the Class A variant (annual persistent-maintenance obligation) from `varies_by_class`, since Class A certifications are now handled under 20x rather than Rev5.
- **FRC-CLA-MFR**: Clarified in `notes` that providers MUST address the included Key Security Indicators to receive a Class A certification even if they intend to pursue a Rev 5 Program Certification path in the future.
- `CTL.IA.IA-05` control guidance: Reworded class b/c/d guidance to cite "the most recent NIST Digital Identity Guidelines" instead of naming/linking `NIST SP 800-63-3`.
- Terminology rename (display text only, schema key/URL unchanged): `schema.name` for `FRC-CSO-PKG` renamed from "FedRAMP Certification Overview Package" to "FedRAMP Certification Package Overview" across six requirements — `FRC-CSO-PKG`, `CDS-CSO-PUB`, `CDS-CSO-SVC`, `CDS-CSO-UTC`, `MAS-CSO-TPR`, and `SCG-CSO-RSC`.

## 2026.07.06.01 (July 6, 2026)

This update applies some changes described in the 2026.06.25.01 release that were not previously reflected in the consolidated rules.

### Content Updates

- [Choosing a Certification Path](https://fedramp.gov/2026/providers/start/path/): Combined the separate Lost Sponsor and Ready Conversion sections
  into a single Lost Sponsor/Ready Conversion pipeline description and clarified the eligibility criteria for applicants.

## 2026.07.02.01 (July 2, 2026)

This update fixes several typos in the FedRAMP consolidated rules. No significant changes to requirements are included.

### General Updates

- Corrected a typo in the description of "significant change evaluation."
- Updated terminology across multiple definitions and statements, replacing "Response" with "Communication" in FedRAMP Incident Evaluation rules to enhance clarity and consistency.
- Many updates to key names in schema files to improve consistency and readability.

## 2026.07.01.01 (July 1, 2026)

This update contains minor enhancements and fixes to make the content more accurate and easier to understand. No significant changes to requirements are included.

### General Updates

- Rename assessor and advisor schema files from versioned format to date format.
- Rename certification overview package schema file to certification package overview, and update corresponding $id and title references.
- Fix typos in field names: correct "frrAssesment" to "frrAssessment" and "ksiAssesment" to "ksiAssessment" in `fedramp-security-decision-record-schema-2026-06-24.json`.

### Rule Changes

- `FRC-CLA-MFR` removed Independent Verification and Validation: IVV-CSF-AIA (Annual Independent Assessments for Rev5) from the class a requirements. All class a packages will use the 20x rules.
- `FRC-CSO-PKG` Fixed a typo which incorrectly referenced class b specifically.  This rule applies to all classes.
- `CDS-CSO-AVR` appeared in both Mandatory and Recommended FedRAMP Rules for Class A. Removed this rule from the Mandatory list.

### Content Updates

- Added tooltips to the PAIN timeframe table column headers in `VDR-TFR-PVR`, `IEC-CSO-IIR`, `IEC-CSO-OIR`, and `IEC-CSO-FIR`. Hovering over `PAIN`, `LEV + IRV`, `LEV + NIRV`, or `NLEV` now shows the full acronym expansion.
- [Choosing a Certification Path](https://fedramp.gov/2026/providers/start/path/): Fixed two instances of "Ready Conversation" to "Ready Conversion" — one in the introductory eligibility description and one in the FedRAMP help form link label.

## 2026.06.25.01 (June 25, 2026)

This update contains minor adjustments after initial release to clarify some content and fix some
inaccurate content in places.

### General Updates

- The grace period related to independent assessments has been changed from _"On the first FedRAMP independent assessment **completed** after..."_ to _"On the first FedRAMP independent assessment **started** after..."_; this change ensures the rules do not change during an assessment. Credit: @cbaerschellman

### Rules Changes

- `CPO-CSO-OSA` was added to require Class B, Class C, and Class D providers to include the assessor-supplied overall summary of assessment in the Certification Package Overview, while allowing Class A providers to include it optionally.
- `FRC.info.subsets.CLA` was narrowed from both 20x/Rev5 and Program/Agency applicability to 20x Program applicability only (this was already de facto but the schema was not updated previously).
- `FRC-CLA-MFR` fixed a wording typo from “Class Arules” to “Class A rules.”
- `FRC-CSO-PKG` was clarified to apply to all provider classes by removing the dangling “Class B” qualifier from the certification package requirement.
- `IEC-CSO-FIR`, `IEC-CSO-IIR`, and `IEC-CSO-OIR` renamed the FedRAMP notification contact display name from “FedRAMP Security Team” to `fedramp_security@fedramp.gov`; this ensures the email address is displayed in human-readable versions of the Consolidated Rules.
- The following duplicative agency rules were removed because they are addressed by `AGU-AGC-NAI` and `AGU-AGC-NAR` already: `CCM-AGM-NAR`, `CCM-AGM-NFA`, `VER-AGM-DRE`, `VER-AGM-NFR`

### Content Updates

- Updated [Choosing a Certification Path](https://fedramp.gov/2026/providers/start/path/) with direct FedRAMP help forms for Ready Conversion and Lost Sponsor eligibility confirmation.
- Fixed the [Getting Support](https://fedramp.gov/2026/support/) Source Data link so readers stay within the Consolidated Rules site.
- Corrected [Important Dates](https://fedramp.gov/2026/timeline/) to direct providers from FedRAMP Ready toward FedRAMP 20x Class A Certification and clarify that the August 3, 2026 Class A pipeline opens for FedRAMP 20x applications.
