---
picto:
  source: person
  status: placeholder
---

# The Agency System Security Plan

An agency System Security Plan describes how an agency information system protects its information and supports its mission. When the system uses a FedRAMP Certified cloud service, the SSP should focus on the agency's use, configuration, integrations, procedures, and responsibilities.

The cloud service provider's FedRAMP Certification Package is reusable evidence about the provider's service. It is not the agency SSP, and the agency should not copy the provider's complete control implementation into its own plan.

!!! tip "Account for every selected control; detail only what the agency owns."

    OMB Circular A-130 and the NIST Risk Management Framework require the agency's selected controls to be documented in the system security plan.

    For controls implemented by the agency, describe the agency implementation. For inherited provider controls, identify the source of inheritance and reference the relevant FedRAMP Certification Package information.

## One SSP For The Agency Information System

Create an SSP for the agency information system, not a separate SSP for every external service it uses.

An agency system may use several cloud services, agency common controls, enterprise security services, and locally operated components. The SSP should explain how those pieces work together to protect the system. Conversely, the same cloud service may support several agency systems with different use cases, data, configurations, and risk decisions; each system's authorization materials should address its own use.

The agency authorizing official accepts the risk of operating the agency information system. FedRAMP does not accept that risk, and a FedRAMP Certification does not turn the provider's cloud service offering into a separately authorized agency system.

## Develop The SSP Throughout Authorization

Begin the SSP during control selection and system design by documenting planned control implementations. Update it as the agency selects a service, configures the tenant, tests integrations, assesses controls, and resolves findings. The version submitted for authorization should describe the system that will actually operate.

Before completing the SSP, the agency should know:

- The mission, business functions, users, and authorized use cases.
- The system boundary, information flows, integrations, and external services.
- The information types and approved security categorization.
- The selected and tailored NIST SP 800-53 controls and organization-defined parameters.
- The security capabilities needed to satisfy those controls.
- Which service and features the agency will use.
- The provider's customer responsibilities and Secure Configuration Guide.
- The allocation of controls among the agency, agency common control providers, and cloud service provider.
- The configuration and compensating controls the agency will implement.

Writing generic control statements before these decisions are made—and never revisiting them—produces a plan that does not describe the actual system.

## Build The Agency SSP

### 1. Describe The Authorized System

Document the system in terms that support the authorization decision:

- Mission and business purpose.
- System owner and accountable officials.
- Authorized users and administrators.
- Authorized and prohibited use cases.
- Information types and security categorization.
- Authorization boundary and environment of operation.
- Major components, cloud services, agency enterprise services, connections, and third-party information resources.
- Information flows into, within, and out of the system.
- Privacy, records management, and other applicable requirements.

Make clear which FedRAMP Certified offering, deployment model, service components, and features are included. A provider may sell services that are outside the boundary of its FedRAMP Certification.

### 2. Record The Selected And Tailored Controls

Start with the baseline associated with the system's approved security categorization. Apply tailoring, overlays, agency policy, privacy requirements, threat information, and mission-specific needs. Document the rationale for tailoring decisions and assign all organization-defined parameters.

The SSP should contain the resulting control set selected for the agency system. It should not contain every control in the provider's Certification Package merely because that package is available.

### 3. Allocate Responsibility

For each selected control and control enhancement, determine where it is implemented:

| Allocation | What The Agency SSP Should Say |
| :--- | :--- |
| Agency system-specific | Describe the agency implementation, responsible role, scope, frequency, parameters, dependencies, and evidence. |
| Agency common control | Identify the agency common control provider and authorization or evidence the system inherits. Document any system-specific dependency. |
| Provider-inherited | Identify the FedRAMP Certified service and the Certification Package information or demonstrated capability relied upon. Document the configuration or conditions required for inheritance. |
| Not applicable after tailoring | Record the approved tailoring rationale in accordance with agency policy. |

Allocation may occur below the control level. A provider may implement one part of a control while the agency implements another. Do not label a control inherited if the agency still has a configuration, procedural, integration, or monitoring responsibility necessary for the control to work.

### 4. Write Agency Implementation Statements

An agency implementation statement should be specific enough to implement, assess, and monitor. It should answer:

- **Who** performs or owns the activity?
- **What** technical, physical, or procedural mechanism is used?
- **Where** does it apply within the authorized system?
- **When** or how often does it occur?
- **Which parameters** or agency policy values apply?
- **What evidence** demonstrates that it is operating as intended?
- **What dependencies** must the provider, an agency common control, or another system satisfy?

Avoid statements that only repeat the NIST control text or say that the agency is "compliant." Describe what actually happens.

### 5. Reference Provider Capabilities For Inherited Controls

NIST defines a security or privacy capability as a combination of mutually reinforcing controls implemented through technical, physical, and procedural means to achieve a common purpose. A FedRAMP Certification Package may demonstrate a provider capability through multiple controls, Key Security Indicators, policies, architecture information, assessment results, and ongoing evidence.

For a provider-inherited control, the agency SSP can:

1. Identify the selected control or control portion.
2. Identify the FedRAMP Certified cloud service and package version or maintained source.
3. Reference the relevant provider capability and supporting Certification Package information.
4. State the assumptions, dependencies, and agency configuration required to inherit it.
5. Explain how the agency will monitor changes to the provider capability over time.

Do not paste provider implementation statements into the agency SSP. A durable reference to maintained FedRAMP Certification Data is more accurate and easier to keep current than a static copy.

## Example Control Allocations

The exact allocation depends on the service and agency architecture, but these examples show the intended level of documentation.

### Awareness And Training

The provider's training program for its workforce does not train agency users to use the service securely. For a selected awareness and training control, the agency SSP should describe the agency's training, rules of behavior, role-based instruction, completion frequency, and evidence.

The SSP may reference provider training evidence only where the agency system specifically inherits a provider-operated portion of the control.

### Identification And Authentication

Identity and authentication capabilities are provided by the service but implemented by the agency:

- The provider supplies and maintains the authentication, federation, session, and authorization capabilities described in the FedRAMP package.
- The agency configures the tenant to use the agency identity provider, manages agency identities and groups, assigns privileges, protects administrative accounts, and performs access reviews.

The agency SSP should reference the provider capabilities and describe the agency identity provider integration and account management procedures.

### Audit Logging And SIEM Integration

Logging and monitoring control capabilities are provided by the service but implemented by the agency:

- The provider generates, protects, retains, and makes specified service events available.
- The agency enables the necessary event categories, exports or ingests the events into the agency SIEM, configures alerts, reviews activity, investigates events, and retains agency copies as required.

The SSP should document the agency configuration and monitoring process and reference the provider capabilities.

### Data Protection

The provider may protect stored and transmitted data inside the certified service, while the agency decides what information may enter the service, configures sharing and retention, manages agency-held keys when applicable, and controls data exported to other systems.

The SSP should describe those agency decisions and dependencies rather than reproduce the provider's cryptographic or infrastructure implementation.

## Assessment And Evidence

Assess the controls and control portions implemented by the agency. Assess that the agency implementation works with the provider capabilities and that all conditions for inheritance are satisfied.

Examples of agency evidence include:

- Approved configuration exports or automated configuration results.
- Identity provider, account lifecycle, and privileged access records.
- SIEM ingestion tests, alerts, review records, and incident tickets.
- Training completion and rules-of-behavior acknowledgments.
- Data flow tests, retention settings, backup tests, and recovery exercises.
- Procedures, approvals, access reviews, and change records.

Use the FedRAMP Certification Package and ongoing Certification Data as evidence for provider-implemented controls. If the agency finds a package conflict or believes additional information is necessary, follow the [Agency Use rules](../../rules/agency-use.md){ data-preview } rather than creating an uncoordinated reassessment of the provider.

## Document Risk And Authorization Conditions

The SSP should make the responsibility boundary understandable to the authorizing official. The larger authorization package should clearly identify:

- Weaknesses in agency-responsible controls.
- Provider risks that materially affect the agency use case.
- Compensating controls and use restrictions.
- Assumptions and dependencies required to inherit controls.
- Residual risk accepted by the authorizing official.
- Conditions that would require reassessment, reauthorization, suspension, or termination of use.

Maintain agency Plans of Action and Milestones for weaknesses, decisions, and corrective actions the agency owns or accepts. Do not copy every provider vulnerability or provider corrective action into the agency POA&M unless the agency has a Plan of Action and Milestones as a result of those vulnerabilities (such as a plan to move to a different cloud service offering).

## Maintain The SSP Over Time

Keep the SSP aligned with the operating information system, not the configuration that existed on authorization day. Update it when:

- The agency changes the use case, information, boundary, integrations, or configuration.
- The provider changes relevant capabilities, customer responsibilities, or Secure Configuration Guidance.
- Ongoing FedRAMP Certification Data changes the agency's understanding of risk.
- Agency common controls or enterprise services change.
- Assessment or monitoring identifies an inaccurate implementation statement or an unmet dependency.

Reuse standard agency control implementations, common controls, configuration profiles, and machine-readable components when possible. The agency SSP should be concise because it references authoritative sources—not because it omits selected controls or obscures responsibility.
