---
tags:
  - Independent Assessors
  - Guidance
picto:
  source: person
---

# What's Changing in 2026

## Independent Verification and Validation

!!! tip "The [Independent Verification and Validation](../rules/independent-verification-and-validation.md) Ruleset applies to all independent assessments!"

## The Legacy Agency Certification Process

Agency authorizing officials following the legacy FedRAMP Rev5 process during the sponsorship of
a FedRAMP Certification via the Agency Certification path still rely on independent assessment
services to make complete recommendations and oversee the assessment on the agency's behalf in
most cases.

During an Agency Certification, independent assessment services and cloud service providers
should work with the agency to ensure that the authorizing official's expectations are fully
met in addition to FedRAMP's expectations.

!!! warning "In the event of a conflict, both expectations must be met!"

    If an agency authorizing official requests additional assessment, specific documents
    (such as the traditional Security Assessment Plan and Report), or detailed traditional
    static evidence (screenshots, etc.) then these should be provided to the agency sponsor
    so they can complete the agency authorization... however FedRAMP will still require
    an assessment and materials that follow FedRAMP rules in order to grant a FedRAMP
    Certification.

## The Program Certification Process

FedRAMP has created updated guidance and methodology for FedRAMP independent assessments
for FedRAMP 20x and Rev5 where FedRAMP itself is completing the official assessment via
Program Certification.

This approach is different from the traditional approach:

- Assessors are expected to verify and validate the FedRAMP Practices employed by the
  cloud service provider instead of just determining if they meet the control.
- Assessors will provide their independent assessment to the cloud service provider to
  maintain in the cloud service provider's Security Decision Record.
- There is no more Security Assessment Plan or separate Security Assessment Report.
- Assessors no longer make overall recommendations for Certification.
- Assessors may provide general advice and guidance during the assessment process as
  long as it does not improperly influence the process (that is, the assessor cannot
  do things like "if you implement it like this then you will pass")
- In general, cloud service providers are fully responsible for maintaining proper
  plans, procedures, Certification Packages, etc. and are required to be the primary
  responsible party interacting with FedRAMP.
- FedRAMP will expect the independent assessment service to participate in FedRAMP's
  assessment alongside the cloud service provider and explain their process, findings,
  concerns, etc.

## Other Major Changes

There are three other major changes that independent assessment services need to be
aware of as FedRAMP modernizes:

1. FedRAMP no longer provides templates; instead we specify the required information
   and provide some minimal JSON schemas. All providers and assessors are expected to
   use modern tools to maintain their Certification Package and a considerable amount
   of flexibility is granted.

2. The FedRAMP rules create a new set of items that must be verified and validated.
   Every single rule must be verified and validated during each FedRAMP independent
   assessment.

3. There are no more ghost rules. If you cannot point to a specific written requirement
   on fedramp.gov that says to do a specific thing then the requirement does not exist.
   Do not enforce ghost rules during assessment.

## Minimal Changes to FedRAMP Recognition

The requirements for [FedRAMP Recognition](../rules/fedramp-recognition.md) have been
moved from narrative into a modern FedRAMP rules format with minimal changes to the
actual requirements.

The single significant change is in
[REC-IAS-ADA (Actually Do Assessments)](../rules/fedramp-recognition/#actually-do-assessments){data-preview}
which requires independent assessment services to actually do independent assessments if
they wish to retain FedRAMP Recognition.

!!! danger "If you haven't done any assessments, you have 2 years to actually do them!"


## Definitions

Please ensure you are familiar with all [FedRAMP Definitions](../../definitions.md) or at least how to
reference them when a FedRAMP Practice uses a specific term that is defined by FedRAMP.

