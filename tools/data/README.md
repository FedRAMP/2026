# Vendored source data

## NIST SP 800-53 Revision 5 OSCAL catalog

`NIST_SP-800-53_rev5_catalog.xml` is the local authoritative source for NIST control family names, control and enhancement titles, control statements, and organization-assigned parameter metadata used by generated Rev5 Control Guidance and rule-level control lists.

- Upstream repository: <https://github.com/usnistgov/oscal-content>
- OSCAL Content release: `v1.5.0`, published May 13, 2026
- Source URL: <https://raw.githubusercontent.com/usnistgov/oscal-content/refs/tags/v1.5.0/src/nist.gov/SP800-53/rev5/xml/NIST_SP-800-53_rev5_catalog.xml>
- NIST catalog version: `5.2.0`
- OSCAL version: `1.2.2`
- SHA-256: `a9e23b09116d5e651461d61777c2e7dc1f3454ab3f9e1e8fdf8af01c37dc01be`

The build must read this file locally and must not fetch OSCAL content at runtime. When updating it, use a tagged official NIST OSCAL Content release and update this provenance block, the checksum, tests, and any version-specific generated-page expectations in the same change.
