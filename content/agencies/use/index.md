---
picto:
  source: person
  status: stable
---

# Using a FedRAMP Certified Cloud Service

Agencies use FedRAMP Certifications as reusable security evidence, but each agency still authorizes its own federal information systems. FedRAMP certifies the cloud service offering; the agency authorizing official accepts risk for the agency’s specific use of that service, including the information processed, the configuration selected, the integrations enabled, and the controls the agency is responsible for operating.

This is the core of the [FedRAMP shared responsibility model](../../shared-responsibilities.md){ data-preview }: FedRAMP establishes the government-wide process, cloud service providers maintain their certifications, and agencies decide how a certified service fits into an agency system. Agencies should reuse FedRAMP Certification materials to the greatest extent possible instead of recreating the provider’s assessment.

!!! warning "Do not simply ATO a cloud service offering itself!"

    An agency should never create a standalone authorization to operate for a cloud service offering; instead you should ATO a federal information system that _leverages_ the cloud service offering as an external service. Document the controls and expectations for the agency itself to securely operate the federal information system that will use the cloud service offering.

## Agency Use In Practice

In practice, agencies should:

1. Confirm that the planned use is within the [scope of FedRAMP](../../scope.md){ data-preview } and that the agency is using the FedRAMP Certified version of the cloud service offering.

2. Review the cloud service offering’s [FedRAMP Certification Package](packages/index.md){ data-preview }, including the certification type, certification class, inherited controls, provider responsibilities, secure configuration guidance, and ongoing certification data.

3. Determine whether the service is appropriate for the agency’s information, mission, integrations, and risk tolerance. [Certification classes](classes.md){ data-preview } help agencies understand the amount and rigor of certification information available, but they do not replace the agency’s own security categorization or risk decision.

4. Document the agency’s use of the cloud service in the agency information system authorization. The agency SSP should focus on what the agency implements, configures, operates, or inherits. It should not copy the cloud service provider’s full package as if the provider’s service has become the agency system.

5. Configure and integrate the service securely, including identity, logging, monitoring, data protection, incident response, records, privacy, and any other agency-specific requirements that apply to the agency’s use.

6. Complete the agency authorization before use, then notify FedRAMP when required. Agencies remain responsible for issuing their own ATO or ATU even when they rely on a FedRAMP Certification.

7. Monitor the service over time by reviewing ongoing certification reports, vulnerability information, quarterly reviews, and other FedRAMP Certification Data at intervals appropriate to the agency system’s risk. Agencies should maintain their own POA&Ms only for issues they are responsible for managing or accepting.

8. Coordinate with FedRAMP when there are serious concerns, package conflicts, requests for additional provider information, or agency-specific needs that go beyond normal FedRAMP requirements. Agencies should not create contract terms that prevent a provider from meeting FedRAMP obligations to other agencies.

Agencies should treat FedRAMP as a reuse system, not a paperwork substitution. The goal is to rely on the common assessment work already performed through FedRAMP, then spend agency effort on the actual agency decision: whether this cloud service, used this way, in this system, with these configurations and agency controls, is acceptable for the mission.
