---
tags:
  - Federal Agencies
  - Guidance
picto:
  source: person
---

# Agency Plans of Action and Milestones

Agencies should create Plans of Action and Milestones (POA&Ms) only when there are actions the agency needs to take, track, fund, manage, or accept for the agency information system that uses FedRAMP Certified cloud services.

A FedRAMP Certified cloud service provider is responsible for detecting, evaluating, reporting, mitigating, and remediating vulnerabilities in its cloud service offering. Under the [Vulnerability Detection and Response](../../../providers/20x/rules/vulnerability-detection-and-response.md){ data-preview } and [Vulnerability Evaluation and Reporting](../../rules/vulnerability-evaluation-and-reporting.md){ data-preview } rules, the provider should maintain vulnerability information for agency review, including accepted vulnerabilities or other accepted weaknesses when those are relevant to agency risk decisions.

That provider-maintained vulnerability information is not automatically an agency POA&M.

!!! warning "Do not ask cloud service providers to create agency POA&Ms"

    Cloud service providers should not be expected to convert their vulnerability lists, product security roadmaps, accepted vulnerability records, or internal risk tracking into agency POA&Ms.

    Agencies may use provider-reported information to inform agency POA&Ms when the agency has an action to take or a risk to accept. The POA&M belongs to the agency when the action belongs to the agency.

## Why This Matters

POA&Ms started as an agency planning and oversight tool. Early OMB guidance treated POA&Ms as a way for agencies to identify weaknesses, assign responsibility, estimate resources, set milestones, and track corrective action for agency programs and systems. Over time, older FedRAMP processes applied that agency-oriented spreadsheet model to commercial cloud services too, which created a lot of manual tracking work without always improving risk decisions.

FedRAMP's modern approach separates those concerns more clearly:

- Cloud service providers maintain current vulnerability and risk information for the cloud service offering.

- Agencies review that information to support ongoing authorization decisions.

- Agencies create POA&Ms only for agency-owned actions, agency-managed weaknesses, agency compensating controls, or agency acceptance of risk.

## When an Agency POA&M Makes Sense

An agency POA&M may be appropriate when:

1. The agency needs to change its configuration of the cloud service.

2. The agency needs to implement or improve an agency-managed control.

3. The agency accepts continued use of the service while provider-reported vulnerabilities affect the agency's risk posture.

4. The agency needs to track a compensating control, contract action, monitoring activity, or other agency-owned response.

5. The agency authorizing official identifies an agency action needed to keep the system within the agency's risk tolerance.

Agencies should not copy every provider-reported vulnerability into an agency POA&M. Review the provider information, decide whether the agency has anything to do, and create agency POA&M entries only when the answer is yes.
