---
picto:
  source: person
  status: stable
---

Agencies are responsible for monitoring the federal information systems they authorize, including any FedRAMP Certified cloud service offerings used by those systems. FedRAMP Certification gives agencies reusable security information about the cloud service offering, but it does not replace the agency's own information security continuous monitoring program.

Agencies should be active participants in Collaborative Continuous Monitoring. That means reviewing ongoing FedRAMP Certification Data, staying responsive to provider communications, and maintaining durable agency contact paths that keep working through personnel changes. Agency security teams should build practical working relationships with cloud service provider security teams, grounded in mutual trust, clear expectations, and timely communication.

If an agency information system uses a cloud service offering that inherits controls from another FedRAMP package, the agency is also responsible for understanding and monitoring the inherited FedRAMP package where it affects the agency's use.

!!! danger "Do not expect FedRAMP or other agencies to monitor these systems for you!"

    Agencies are fully responsible for understanding how the FedRAMP Certified cloud service offerings they use protect federal information. If an agency does not monitor the cloud service offering in alignment with FedRAMP rules and the agency's own continuous monitoring program, the agency must accept the risk of not doing so.

    FedRAMP commonly sees Inspectors General and the Government Accountability Office create findings for agencies that do not properly monitor their cloud services.

## Ongoing Authorization in Practice

During ongoing authorization, agencies should:

1. Review Ongoing Certification Reports and other FedRAMP Certification Data to understand whether changes to the cloud service offering affect the risk tolerance documented in the agency Authorization to Operate.

2. Review vulnerability information at intervals appropriate for the agency system's risk and use automated processing when possible.

3. Maintain agency [Plans of Action and Milestones](poams.md){ data-preview } only for risks, decisions, and actions the agency is responsible for managing or accepting.

4. Review provider Secure Configuration Guides and keep agency-managed settings aligned with the agency's authorization.

5. Notify the provider and FedRAMP when ongoing certification information creates significant concerns for the agency authorizing official.

6. Avoid requesting additional information or placing additional security requirements on the cloud service provider unless the agency has a demonstrable need and follows the required FedRAMP notification process.

The [Collaborative Continuous Monitoring rules](../../rules/collaborative-continuous-monitoring.md){ data-preview }, [Vulnerability Evaluation and Reporting rules](../../rules/vulnerability-evaluation-and-reporting.md){ data-preview }, and [Agency Use rules](../../rules/agency-use.md){ data-preview } contain the explicit agency expectations.

## Goals for Ongoing Monitoring

While conducting ongoing authorization activities, agencies should support the goals outlined in OMB Memorandum M-24-15:

- Prioritize development and deployment agility by cloud service providers, including automation, rapid security improvements, and broader development, security, and operations practices.

- Monitor the provider's change process instead of trying to approve every individual change to a cloud service offering. Once a cloud service offering is authorized, the FedRAMP process should generally allow providers to deploy changes and fixes without advance approval from FedRAMP or an agency authorizing official.

- Avoid pushing providers toward separate government-only instances when the same commercial infrastructure can securely support federal agency use. In general, using the same infrastructure relied on by commercial customers can support both security and agility.

!!! warning "Continuous monitoring of the agency information system is still necessary!"

    The ongoing assurance provided by FedRAMP Certified cloud service providers helps agencies monitor their own federal information systems. It does not replace agency responsibilities for monitoring agency-managed configurations, reviewing logs, managing agency accounts, maintaining agency POA&Ms, and ensuring the authorized system continues to operate within the agency's risk tolerance.

## FedRAMP's Standard Continuous Monitoring

FedRAMP provides a minimum standard level of continuous monitoring focused on whether the cloud service provider continues to meet the requirements needed to maintain FedRAMP Certification. This is not a complete substitute for agency monitoring.

Agencies should treat FedRAMP's monitoring as shared provider evidence. The agency still needs to decide how that evidence affects the agency authorization, whether additional agency action is needed, and whether the cloud service offering remains appropriate for the agency's use.
