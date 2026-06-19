---
picto:
  source: person
  status: stable
---

# What's Changing in 2026

Many cloud service providers have gotten used to doing things for FedRAMP in the same way for years and years. This is all changing in the Consolidated Rules for 2026.

## Terminology Shifts

FedRAMP is intended to be a bridge between industry and the federal government, and is expected to thoughtfully navigate situations where unthinking
adherence to standard agency practices in a commercial cloud environment could lead to unexpected or undesirable outcomes.

Historically, FedRAMP took common terminology and restrictions that applied by design to federal information systems and reused them to apply to
commercial cloud services. This has led to significant confusion in many areas, including far too many people both inside and outside government
believing that a "FedRAMP authorization" was a blanket risk acceptance that applied across the entire federal government (it is not).

To combat this long-standing confusion, FedRAMP has shifted many of the terms that it commonly uses to align with private sector definitions
or plain language as appropriate. [FedRAMP's Definitions](../../definitions.md) play a significant role in clarifying many terms, and should be referred to at all times.

Other significant terminology shifts include:

| Historical Term | Modern Term | Reasoning |
| -- | -- | -- |
| FedRAMP authorization | FedRAMP Certification | The law defines a "FedRAMP authorization" as "a certification that a cloud computing product or service has completed a FedRAMP authorization process." Using FedRAMP Certification avoids conflating a FedRAMP authorization with an agency authorization to operate (which has a separate meaning as defined by OMB Circular A-130) |
| Impact Levels / Low, Moderate, High | Certification Class / A, B, C, D | Agencies use FedRAMP Certified cloud services as a third-party information resource within a federal information system and are required by FIPS 200 to separately and unique identify the target Impact Level and control baselines for each federal information system. Switching to a Certification Class system ensures both cloud service providers and agencies understand how agencies must implement Circular A-130 requirements (vis-à-vis FISMA) in their use of cloud services that are not operated by the agency. |
| System Security Plan & Appendices | Certification Package Overview and Security Decision Record | FedRAMP Certification is intended to be based on the actual outcomes of decisions made by a cloud service provider - their plans are not particularly relevant. The cloud service provider does not provide a system security plan to be implemented by the agency, they provide a record of security decisions for a risk assessment by the agency. |
| Continuous Monitoring | Ongoing Certification | The term "continuous monitoring" has unfortunately become synonymous with "vulnerability scans" for most FedRAMP stakeholders, and has generally been replaced with "Ongoing Certification" to indicate that these requirements are far broader than before and failing to perform them will result in a loss of FedRAMP Certification. Agencies must still perform Continuous Monitoring following the requirements in Circular A-130, therefore generally "continuous monitoring" is now used only to refer to Collaborative Continuous Monitoring with agencies. |

## FedRAMP 20x will replace FedRAMP Rev5

FedRAMP will stop accepting any new FedRAMP Rev5 Certifications on June 11, 2027.

Existing FedRAMP Rev5 Certifications will remain active until at least December 31, 2028, unless FedRAMP is otherwise directed. All
cloud service providers with a FedRAMP Rev5 Certification should begin planning now to transition to FedRAMP 20x as quickly as
possible.

!!! tip "Monitor [fedramp.gov/20x](https://fedramp.gov/20x) for the latest status on the implementation of FedRAMP 20x."

## FedRAMP Rev5 Evolves with 20x

The Consolidated Rules for 2026 require significant changes in many areas of FedRAMP Rev5 to ensure that providers
begin transitioning to a more modern approach that aligns with FedRAMP 20x. This will eventually make the full
transition to FedRAMP 20x simpler for all providers.

At a high level, the mandatory changes for Rev5 include:

- Large adjustments to Ongoing Certification requirements that require changes to methodology and approach.
  Every cloud service provider must adopt these changes within the required timelines.
- Large adjustments to the FedRAMP Certification Package itself, including a transition away from Word and Excel-based
  templates to simplified JSON documents or (in some cases) optional OSCAL. Cloud service providers will need to
  acquire or build modern GRC capabilities to collaborate on these materials and populate them using automation based
  on real-world data where possible, rather than maintaining artisanal hand-crafted documents.
- FedRAMP has removed most of the FedRAMP-defined "organizational requirements" within the SP 800-53 baselines, and
  instead expects cloud service providers to define these on their own. Providers are encouraged to compete based on
  quality and customer experience instead of simply choosing the maximum supplied by FedRAMP.
- FIPS-140 encryption is only expected to protect sensitive data and FedRAMP no longer assumes all federal customer
  data and metadata is sensitive. Instead providers are expected to document their use of FIPS-140 encryption so that
  agencies can determine how it aligns with their intended use of the system.
- Vulnerability Detection and Response has been scaled widely beyond traditional monthly vulnerability scanning, and
  requires meaningful investment in the detection and response of all potential weaknesses. Plans of Action &
  Milestones (POA&Ms) have been eliminated entirely and replaced with a list of Accepted Weaknesses, as POA&Ms were
  mostly used to accept weakness for an extended period of time anyway.
- Cloud service providers have considerably more flexibility in how they follow FedRAMP rules, and in many cases
  are explicitly encouraged by FedRAMP to compete on quality and customer experience instead of using a generic process.

## Phased Mandatory Adoption

The Consolidated Rules for 2026 take effect on July 4, 2026, and are immediately applicable to all cloud
service offerings seeking to obtain or maintain a FedRAMP Certification. There is an extended early adoption
phase for FedRAMP Rev5, however - only a few rulesets are mandatory prior to January 1, 2027.

After January 1, 2027, enforcement of the Consolidated Rules for 2026 will begin and cloud service providers
should plan well in advance to adopt these rules. FedRAMP has provided more than a year of warning in most
circumstances, with extended grace periods.

!!! tip "Next Steps"

    Review the [Important Deadlines](deadlines/index.md) section to understand how all of the many
    different deadlines interact and begin planning your phased adoption now!
