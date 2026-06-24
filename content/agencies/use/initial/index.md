---
tags:
  - Federal Agencies
  - Guidance
picto:
  source: person
---

# Initial Agency Authorization

A FedRAMP Certification gives agencies reusable security evidence about a cloud service. The agency still decides whether and how to use that service in an agency information system.

Follow agency policy, [OMB Circular A-130](https://www.whitehouse.gov/wp-content/uploads/legacy_drupal_files/omb/circulars/A130/a130revised.pdf), and the [NIST Risk Management Framework](https://csrc.nist.gov/pubs/sp/800/37/r2/final). Start with the agency's needs. Then use FedRAMP Certification Packages to find a service that can meet them.

The resulting Authorization to Operate applies to the agency information system and its use of the cloud service.

!!! warning "Do not begin by copying a provider's security controls!"

    First decide what the agency needs to protect and how. Use the provider's package later, when comparing possible services.

## 1. Define the use and required protections

Describe the work the service will support, who will use it, and the federal information it will handle. Identify the expected features, data flows, integrations, and prohibited uses. Include legal, privacy, records, accessibility, and agency policy requirements.

Use this information to set the agency system boundary. The cloud service may be one service within that boundary. It does not automatically become a separate agency information system.

Confirm that the use is within the [scope of FedRAMP](../../../scope.md){ data-preview } and that the agency plans to use the FedRAMP Certified version of the service.

Categorize the agency information system under FIPS 199 and FIPS 200. Select and tailor the appropriate controls from [NIST SP 800-53B](https://csrc.nist.gov/pubs/sp/800/53/b/upd1/final). Assign the required organization-defined parameters.

[NIST SP 800-53](https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final) defines a security or privacy capability as a set of mutually reinforcing controls that achieve a common purpose. Use the selected controls to list the capabilities the agency system needs. Common examples include identity management, log export, data protection, recovery, incident response, and secure administration. Also identify the training and operating procedures the agency must provide.

## 2. Compare FedRAMP Certified services

Review the [FedRAMP Certification Packages](../packages/index.md){ data-preview } for services that could meet the business need. For each service, check:

- What services, features, deployment models, and third-party resources are inside the Certification boundary.
- Which security capabilities the provider demonstrates through Key Security Indicators or Rev5 Control information.
- What the agency must configure, operate, or monitor.
- Whether assessment results, known risks, and ongoing Certification Data fit the agency's use and risk tolerance.

[Certification Classes](../classes.md){ data-preview } describe the amount and frequency of assurance information available. They do not replace the agency's security categorization or risk decision.

Treat the package as presumptively adequate evidence for the provider's work. Ask clarifying questions when needed. If the agency has a demonstrable need for added information or requirements, follow the [Agency Use rules](../../rules/agency-use.md){ data-preview } and notify FedRAMP as required.

## 3. Confirm the agency can use the provider's capabilities

Read the provider's Secure Configuration Guide before choosing a service. Confirm that the service can support the agency's planned implementation.

For example:

- Can the agency connect its identity provider and enforce its account policies?
- Can the service send the required events to the agency SIEM?
- Can the agency protect administrative accounts and restrict unapproved features?
- Can the agency set the required sharing, retention, encryption, and data protection options?
- Can the agency get the information it needs for incident response and ongoing authorization?

The security team and business owner should review any restrictions or compensating controls together. The service must still perform the work the agency needs.

!!! tip "Use a limited pilot when it will reduce uncertainty."

    Agency policy may allow a short pilot using public or otherwise negligible-impact information. Set the users, data, duration, prohibited uses, and exit criteria before the pilot starts. A pilot does not waive authorization, privacy, acquisition, or records requirements.

    Agencies should not authorize a FedRAMP Class A Certified service for more than 12 months unless the provider is seeking a Class B, C, or D Certification.

## 4. Configure and assess the agency's use

Configure the service according to the approved design and the Secure Configuration Guide. Implement the agency controls, common controls, integrations, training, and procedures.

Test the agency's implementation. Confirm that identity integration works, required logs reach the SIEM, security settings remain in place, and agency staff can carry out incident and recovery procedures. Reuse the FedRAMP Certification Package for evidence about the provider's capabilities.

Document the implementation in the [agency System Security Plan](ssp.md){ data-preview }. Explain what the agency does and how it uses or relies on provider capabilities. Do not copy the provider's package into the SSP.

## 5. Authorize the agency system

Complete the assessment report, agency Plans of Action and Milestones, risk response, and other authorization material required by agency policy. Explain residual risk in terms the authorizing official and mission owner can use.

The authorization should identify the approved use, information, boundary, required configurations, restrictions, and conditions for continued use.

After issuing the ATO, [notify FedRAMP](https://help.fedramp.gov/hc/en-us/requests/new?ticket_form_id=51447926193691) and supply the required authorization information. Then begin [ongoing authorization](../ongoing/index.md){ data-preview } by monitoring the agency system, agency-responsible controls, and the provider's ongoing FedRAMP Certification Data.
