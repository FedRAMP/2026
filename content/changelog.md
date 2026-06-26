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
