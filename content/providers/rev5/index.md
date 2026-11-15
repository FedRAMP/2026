---
tags:
  - Rev5
  - Cloud Service Providers
  - Rules
picto:
  source: person
---

# FedRAMP Rev5 Certification Rules

!!! danger "FedRAMP will stop accepting applications for new FedRAMP Rev5 Certifications on June 11, 2027!"

    Cloud service providers may wish to consider carefully before investing in a legacy process that
    FedRAMP is actively working to replace.

FedRAMP Rev5 Certification Rules replace long traditional narrative descriptions and web pages with simple
declarative statements that are intended to be easy to follow and address one by one. All applicable
rules must be followed to obtain and maintain a FedRAMP Certification.

## Rules by Certification Class

Choose your certification class to see the rules that affect Providers.

| Class | Ruleset Reference | Rev5 Control Reference |
| --- | --- | --- |
| Class B | [Rev5 Class B Rules](../../reference/rev5/b/index.md) | [Rev5 Control Reference](../../reference/rev5/b/controls/index.md) |
| Class C | [Rev5 Class C Rules](../../reference/rev5/c/index.md) | [Rev5 Control Reference](../../reference/rev5/c/controls/index.md) |
| Class D | [Rev5 Class D Rules](../../reference/rev5/d/index.md) | [Rev5 Control Reference](../../reference/rev5/d/controls/index.md) |

The class references include the applicable Marketplace Listing, FedRAMP Certification, Boundary, Assurance, and Package rules. The [Complete Rulesets](../../reference/complete-rulesets/index.md) contain the full rules for all stakeholders.

## Legacy Designation and Balance Improvement Releases

FedRAMP Rev5 is a legacy FedRAMP Certification process that is being replaced entirely by FedRAMP 20x. The Consolidated Rules for 2026 include
many integrated Balance Improvement Releases and other changes to modernize the FedRAMP Rev5 process and ensure that cloud service providers
with a FedRAMP Rev5 Certification will maintain a high level of assurance consistent with FedRAMP 20x. This means that cloud service providers
are expected to follow new rules and adopt new FedRAMP Practices from FedRAMP 20x into their FedRAMP Rev5 Certified cloud service offerings.

FedRAMP no longer provides templates in traditional documents for cloud service providers who are seeking to obtain or maintain a FedRAMP
Rev5 Certification. We expect all cloud service offerings to migrate to semi-structured text data that is compatible with basic JSON schemas
provided by FedRAMP using modern tools and capabilities. This will be a significant shift for many compliance organizations that traditionally
approach FedRAMP Certification as a documentation exercise based around Word documents and spreadsheets.

## Rev5 Control Guidance

FedRAMP Rev5 uses controls from [NIST Special Publication 800-53 Revision 5](https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final)
as the detailed security and privacy requirements for cloud service offerings. A control is a named safeguard or
requirement that describes an outcome an organization must implement, assess, and maintain to protect systems,
information, people, and organizational operations.

Controls are grouped into families such as Access Control, Configuration Management, Incident Response, Risk
Assessment, and System and Information Integrity. Each control may also have related control enhancements that add
more specific expectations for systems with greater risk or more demanding assurance needs. FedRAMP baselines select
and tailor these controls and enhancements for FedRAMP Certification, including FedRAMP-specific parameters,
implementation expectations, and assessment expectations.

### How to Approach Controls

Controls are not meant to be approached as paperwork. They should be connected directly to how your cloud service
offering is designed, operated, monitored, and improved. A strong control implementation should be understandable to
the teams who build and run the system, not just to the teams who maintain the certification package.

When working through each control, start with the intent of the requirement and then connect it to real system
behavior:

- What security or privacy risk is this control addressing?
- Where does this activity happen in the cloud service offering?
- What technical, procedural, or organizational safeguards implement the control?
- Who owns the control during normal operations?
- What evidence demonstrates that the control is implemented and operating?
- How will the control continue to work when the system, organization, or threat environment changes?

!!! tip "Start with how the system actually works"

    The best control narratives usually come from real engineering and operations practices. Use architecture,
    configuration, automation, tickets, monitoring, reviews, and incident records to explain how the control works
    in practice.

### Expectations for Assurance

FedRAMP and agency customers need confidence that controls are implemented, operating, and producing evidence over
time. That means a control should not only be described once in a document. It should be supported by repeatable
processes, assigned responsibilities, current evidence, and a way to identify when the implementation no longer
matches the certified system.

!!! danger "Do not treat controls as a static checklist!"

    A checkbox approach usually misses the point of Rev5 controls. The goal is to show that the cloud service offering
    has real safeguards in place, that the right teams understand and maintain them, and that assessors and federal
    customers can verify those safeguards with useful evidence.
