---
picto:
  source: person
  status: placeholder
---

# Initial Agency Authorization

A FedRAMP Certification gives an agency reusable security information about a cloud service offering but FedRAMP does not decide whether the agency's particular use of that service is acceptable.

Use the agency's normal authorization process under [OMB Circular A-130](https://www.whitehouse.gov/wp-content/uploads/legacy_drupal_files/omb/circulars/A130/a130revised.pdf) and the [NIST Risk Management Framework](https://csrc.nist.gov/pubs/sp/800/37/r2/final). Define the mission and information that need protection, select the necessary controls, determine the security capabilities those controls must provide, and then evaluate whether a FedRAMP Certified service can support them.

The resulting Authorization to Operate applies to the agency information system and its use of the cloud service.

!!! warning "Do not begin by copying a provider's security controls!"

    Begin with the agency use case and protection needs. The FedRAMP Certification Package is evidence used to evaluate possible services after the agency understands what they need.

## Initial Authorization At-A-Glance

1. Define the agency use case and the proposed system boundary.
2. Identify the information involved and categorize the system.
3. Select and tailor the controls needed for the agency system.
4. Translate the selected controls into security capabilities and other service requirements.
5. Compare FedRAMP Certification Packages and Secure Configuration Guides to see if they have the necessary security capabilities.
6. Configure the selected service and implement the agency-responsible controls.
7. Assess the agency implementation, document residual risk, and issue the agency authorization.

## 1. Define The Use Case

Describe what the agency intends to accomplish before evaluating a cloud service. At a minimum, identify:

- The mission or business functions the service will support.
- The authorized users, administrators, and affected organizations.
- The types of federal information the service will create, collect, process, store, transmit, or maintain.
- The intended data flows, integrations, and third-party information resources.
- The features and service components the agency expects to enable.
- Applicable legal, privacy, records management, accessibility, acquisition, and agency policy requirements.
- Uses that will be prohibited or restricted.

Use this information to establish the boundary of the agency information system. The FedRAMP Certified cloud service may be one external service or system element within that boundary; it does not automatically become a separate agency information system.

Confirm whether the proposed use is within the [scope of FedRAMP](../../../scope.md){ data-preview } and whether the agency will use the specific FedRAMP Certified offering, deployment model, and services described in the provider's package.

## 2. Categorize The System And Select Controls

Follow agency policy, FIPS 199, FIPS 200, and the NIST RMF to:

1. Identify the information types involved in the use case.
2. Determine the potential adverse impact of a loss of confidentiality, integrity, or availability.
3. Approve the security categorization for the agency information system.
4. Select the corresponding baseline from [NIST SP 800-53B](https://csrc.nist.gov/pubs/sp/800/53/b/upd1/final).
5. Tailor and supplement the baseline for the agency's mission, threats, laws, policies, architecture, and risk tolerance.
6. Assign organization-defined parameters.

Do this work for the agency system, not for a generic version of the cloud service. Two agencies can use the same FedRAMP Certified service for different information, missions, integrations, and configurations and therefore make different control selections and risk decisions.

## 3. Identify The Needed Security Capabilities

[NIST SP 800-53](https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final) defines a capability as a combination of mutually reinforcing security or privacy controls implemented by technical, physical, and procedural means to achieve a common purpose.

Use the selected controls to identify the capabilities that the agency system needs. This keeps the evaluation focused on security outcomes rather than a control-by-control paperwork comparison.

Depending on the use case, needed capabilities may include:

- **Identity and access management:** Integration with the agency identity provider, phishing-resistant authentication, account lifecycle management, privileged access, access reviews, and separation of duties.
- **Logging and monitoring:** Security event generation, log export, time synchronization, retention, integration with the agency security information and event management service, alerting, and investigation support.
- **Cybersecurity education:** Agency rules of behavior, role-based training, administrator training, and instruction on the secure use of the service.
- **Data protection:** Encryption, key management, data loss prevention, retention, disposal, records management, privacy protections, and restrictions on data location or use.
- **Incident response:** Detection, reporting, evidence preservation, agency-provider coordination, and support for required federal notifications.
- **Resilience and recovery:** Availability, backups, recovery objectives, continuity arrangements, and the ability to retrieve federal information.
- **Secure administration:** Tenant configuration, top-level administrative account protection, configuration monitoring, change management, and separation between agency customers.

Also decide which controls or control portions the agency expects to:

- Implement as system-specific controls.
- Inherit from agency common controls.
- Inherit from the FedRAMP Certified cloud service.

This allocation becomes the basis for evaluating products and beginning the [agency System Security Plan](ssp.md){ data-preview }. Treat the SSP as a living design record: document planned implementations during selection, then update the plan as the service is configured, assessed, and authorized.

## 4. Compare FedRAMP Certified Services

Review the [FedRAMP Certification Packages](../packages/index.md){ data-preview } for multiple services that could meet the business need. Certification Classes describe the amount and frequency of assurance information available; they do not replace the agency's security categorization or determine that a service is secure enough for a particular use.

For each candidate, review:

- The services, features, deployment models, and third-party information resources included in the Certification boundary.
- The information flows and security categories addressed by the provider.
- The provider's demonstrated security capabilities, including relevant Key Security Indicators or Rev5 Control information.
- Independent assessment results, identified weaknesses, accepted risks, and other information relevant to the agency use case.
- Customer responsibilities, shared or hybrid controls, and dependencies on agency actions.
- Available logs, security signals, reports, APIs, and ongoing Certification Data.
- The provider's history of changes, incidents, vulnerabilities, availability, and corrective action, when available.

Treat the FedRAMP Certification Package as presumptively adequate evidence for the provider's implementation.

If the package is unclear, ask the provider clarifying questions. If the agency determines that additional information or requirements are necessary because of a demonstrable agency need, follow the [Agency Use rules](../../rules/agency-use.md){ data-preview }, including required notification to FedRAMP. Collaborate with FedRAMP when the agency's security determination conflicts with the baseline Certification Package.

## 5. Review Secure Configuration And Integration

Review the provider's Secure Configuration Guide before making a final selection. Confirm that the service can be configured and integrated to support the agency controls identified earlier.

The review should answer practical questions such as:

- Can the service integrate with the agency identity provider and enforce the agency's authentication and account policies?
- Can the agency protect and monitor top-level administrative and other privileged accounts?
- Can the service generate the required events and send them to the agency SIEM in a usable format and timeframe?
- Can the agency configure sharing, retention, encryption, session, network, and data protection settings as required?
- Can the agency meet records management, privacy, discovery, and information disposal obligations?
- Can the agency obtain the information needed for incident response and ongoing authorization?
- Can the agency restrict or disable features that are outside the authorized use case?

The business owner and security team should reconcile any proposed restrictions or compensating controls. A service that meets the technical requirements but cannot accomplish the mission is not a workable choice; neither is a service that accomplishes the mission but cannot support the required protections.

!!! tip "Use a limited pilot when it will reduce uncertainty."

    Agency policy may allow a time-limited pilot using public or otherwise negligible-impact information. Define the pilot boundary, users, data, duration, cost, prohibited uses, and exit criteria in advance. A pilot does not waive applicable authorization, privacy, acquisition, or records requirements.

    Agencies should not authorize a FedRAMP Class A Certified service for more than 12 months unless the provider is actively seeking a Class B, C, or D Certification. See [Certification Classes](../classes.md){ data-preview }.

## 6. Implement And Assess The Agency Controls

Configure the selected service according to the approved design and the provider's Secure Configuration Guide. Implement the controls assigned to the agency, including relevant common controls and integrations.

Collect evidence that the agency implementation works as intended. For example:

- Test identity provider integration, account provisioning, authentication, and privileged access.
- Confirm required logs reach the agency SIEM and produce usable alerts.
- Verify security settings, data flows, retention, encryption, backup, and recovery behavior.
- Complete required training and communicate rules of behavior.
- Exercise incident communication and evidence collection procedures.
- Assess hybrid controls across the agency-provider responsibility boundary.

The assessment should focus on the agency's implementation and on whether the dependencies for inherited provider controls are satisfied. Reuse the FedRAMP Certification Package for the provider's implementation and assessment evidence.

## 7. Document Risk And Authorize The Agency System

Finalize the agency System Security Plan for the information system. The SSP should document the selected controls and clearly distinguish:

- Controls implemented by the agency.
- Agency common controls inherited by the system.
- Controls inherited from the FedRAMP Certified cloud service.
- Hybrid controls with responsibilities divided between the agency and provider.

Do not copy the provider's full package into the agency SSP. Reference the provider's Certification Package and demonstrated capabilities for inherited controls, then document the agency configuration, integrations, procedures, dependencies, and control portions for which the agency is responsible.

Complete the remaining RMF authorization activities required by agency policy, including the assessment report, agency Plans of Action and Milestones, risk response, and authorization package. Present residual risk in language the authorizing official and mission owner can understand.

The authorization decision should clearly identify:

- The authorized use cases and system boundary.
- The approved information types and security categorization.
- Required configurations, integrations, operating procedures, and compensating controls.
- Prohibited or restricted uses.
- Conditions for ongoing authorization and events that require review.

After issuing the ATO, [notify FedRAMP](https://help.fedramp.gov/hc/en-us/requests/new?ticket_form_id=51447926193691) and supply the required authorization information. Then begin [ongoing authorization](../ongoing/index.md){ data-preview } by monitoring the agency system, agency-responsible controls, and the provider's ongoing FedRAMP Certification Data.
