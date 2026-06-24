---
tags:
  - Federal Agencies
  - Guidance
picto:
  source: person
---

# The Agency System Security Plan

The [initial authorization process](index.md){ data-preview } leads to one System Security Plan for the agency information system. When the system uses a FedRAMP Certified cloud service, the SSP should explain how the agency uses that service and its security capabilities.

Create one SSP for the agency information system. Do not create a separate agency SSP for each cloud service it uses.

!!! tip "Account for every selected control; detail only what the agency owns."

    Include every control selected for the agency system. Describe the agency's implementation in detail. When the agency uses or relies on a provider capability, reference the FedRAMP Certification Package instead of copying the provider's implementation.

## What belongs in the SSP

The SSP should identify:

- The authorized use, users, information, and system boundary.
- The FedRAMP Certified offering, services, and features the agency will use.
- The selected and tailored controls, including organization-defined parameters.
- The agency's configuration, integrations, training, and operating procedures.
- The provider capabilities the agency uses or relies on.
- Agency common controls and other outside dependencies.

The provider's FedRAMP Certification Package contains evidence about the cloud service. Keep that evidence in the package. The agency SSP should point to it and describe the agency's own use.

## Document each selected control

For each selected control or control enhancement, record how the agency system addresses it:

| How the control is addressed | What to document |
| :--- | :--- |
| The agency implements it | Describe what the agency does, who is responsible, where the control applies, how often it runs, and what evidence it produces. |
| The agency uses a provider capability | Describe how the agency configures or uses the capability. Reference the provider's Secure Configuration Guide and relevant FedRAMP Certification Data. |
| The agency relies on a provider capability without configuring it | Reference the package evidence and record any assumptions or limits on that reliance. |
| The system inherits an agency common control | Identify the common control provider and the authorization or evidence being inherited. |
| The control was tailored out | Record the approved rationale required by agency policy. |

## Write the agency implementation

An implementation statement should describe the work, not repeat the control text. Answer the questions an assessor will need:

- Who owns the activity?
- What does the agency configure or operate?
- Where does it apply?
- When does it occur?
- What provider capability or common control does it depend on?
- What evidence shows that it works?

Start with the agency action, then name the provider capability that makes the action possible.

For identity and access management, the SSP might explain that the agency configures the tenant to use its identity provider, manages agency groups and privileges, protects administrative accounts, and reviews access. The statement should reference the provider's federation, session, and authorization capabilities.

For logging, the SSP might explain that the agency enables the required events, sends them to the agency SIEM, configures alerts, reviews activity, and investigates incidents. The statement should reference the provider's event generation, protection, retention, and export capabilities.

Agency training is an agency implementation. The provider's workforce training does not replace training for agency users and administrators.

## Assess and maintain the SSP

Assess the controls the agency implements and verify that its configuration works with the provider capabilities. Reuse the FedRAMP Certification Package as evidence for the provider's work.

Keep agency Plans of Action and Milestones for weaknesses and actions the agency owns or accepts. Do not copy provider vulnerabilities into the agency POA&M unless they create an agency action, such as restricting use, adding a safeguard, or moving to another service.

Update the SSP when:

- The agency changes the use case, information, boundary, integrations, or configuration.
- The provider changes a capability the agency uses or changes its Secure Configuration Guide.
- Agency common controls or enterprise services change.
- Assessment or monitoring shows that an implementation statement is wrong or incomplete.

A concise SSP still accounts for every selected control and makes agency responsibilities clear.
