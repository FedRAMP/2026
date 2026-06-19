---
picto:
  source: person
  status: stable
---

# Using FedRAMP Rev5 Certification Packages

FedRAMP Rev5 Certification packages contain reusable security information about a FedRAMP Certified cloud service offering. Agencies use this information to support an agency authorization for a federal information system that includes the cloud service offering.

Rev5 packages may look more familiar than 20x packages because they are based on the traditional FedRAMP control framework, assessment materials, and supporting documentation. Even so, agencies should treat the package as evidence about the cloud service provider's responsibilities, not as an agency authorization package that can be copied into agency documents.

!!! warning "Do not copy and paste provider controls into the agency System Security Plan."

    A FedRAMP Rev5 package explains how the cloud service provider protects the cloud service offering. The agency System Security Plan should explain how the agency uses, configures, integrates, monitors, and authorizes that service within the agency information system.

    Agencies should document what they configure, what they operate, and what additional agency controls or compensating controls are needed for the agency use case.

## What to Expect in a Rev5 Package

A Rev5 Certification package should help agencies understand the cloud service offering, the provider's implementation of applicable Rev5 controls, independent assessment results, and ongoing certification information.

Agencies should generally expect these kinds of materials:

1. **Certification Package Overview:** A clear overview of the cloud service offering, including what is included in the FedRAMP Certification and how the package is organized.

2. **Security Decision Record:** A maintained record of the provider's security decisions, including how applicable Rev5 controls are addressed, verified, validated, and independently assessed.

3. **Rev5 Controls:** Provider documentation about applicable controls, implementation status, organization-defined parameters, inheritance, validation, assessment results, and control-specific artifacts.

4. **Secure Configuration Guide:** Instructions that help agencies configure the service securely, especially for administrative accounts, privileged accounts, and security-related settings.

5. **Independent Assessment:** Materials from the FedRAMP Recognized independent assessment service that support the quality and completeness of the provider's Rev5 implementation.

6. **Ongoing Certification Data:** Current information that supports ongoing agency authorization decisions, including Ongoing Certification Reports, vulnerability information, significant change information, incident-related information, and other required updates.

## How Agencies Should Use a Rev5 Package

A Rev5 package is meant to reduce duplicate assessment work across government. Agencies should rely on the package for the common provider assessment work, then focus agency effort on the actual agency decision: whether this service, used this way, with these configurations and integrations, is acceptable for the agency mission.

In practice, agencies should:

1. Confirm that the agency use case is within the [scope of FedRAMP](../../../scope.md){ data-preview } and that the agency is using the FedRAMP Certified version of the cloud service offering.

2. Review the package to understand the service boundary, included services, inherited controls, customer responsibilities, information flows, third-party information resources, and secure configuration expectations.

3. Review the Rev5 control information to understand how the cloud service provider is protecting federal information.

4. Review the Secure Configuration Guide and configure relevant settings for the agency tenant, accounts, integrations, logging, data flows, and other agency-managed parts of the service.

5. Create agency authorization materials that describe the agency system, not the provider's system.

6. Maintain agency POA&Ms only for risks, weaknesses, decisions, and actions the agency is responsible for managing or accepting. Provider vulnerabilities and provider corrective actions should be reviewed as part of the package, but they should not be blindly copied into agency POA&Ms.

7. Continue reviewing ongoing Rev5 Certification Data after authorization. A Rev5 package is still part of ongoing authorization, not a one-time artifact.

## When Agencies Need More Information

Agencies may ask clarifying questions and may require additional information when there is a demonstrable agency need. Agencies should be careful not to turn routine reuse of a Rev5 Certification package into a new provider assessment.

If the package appears incomplete, conflicts with the agency's security determination, or creates serious concerns for the authorizing official, the agency should work with the provider and coordinate with FedRAMP. The [Agency Use rules](../../rules/agency-use.md){ data-preview } explain when agencies must notify FedRAMP about additional information requests, package conflicts, monitoring concerns, and other issues.

The goal is reuse with judgment: use the Rev5 package as the shared provider evidence, then write agency authorization materials that clearly explain the agency's own use, configuration, responsibilities, and risk decision.
