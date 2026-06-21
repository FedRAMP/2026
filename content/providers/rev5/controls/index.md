---
tags:
  - Rev5
  - Cloud Service Providers
  - Controls
picto:
  source: person
  status: stable
---

# Rev5 Controls

FedRAMP Rev5 uses controls from [NIST Special Publication 800-53 Revision 5](https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final)
as the detailed security and privacy requirements for cloud service offerings. A control is a named safeguard or
requirement that describes an outcome an organization must implement, assess, and maintain to protect systems,
information, people, and organizational operations.

Controls are grouped into families such as Access Control, Configuration Management, Incident Response, Risk
Assessment, and System and Information Integrity. Each control may also have related control enhancements that add
more specific expectations for systems with greater risk or more demanding assurance needs. FedRAMP baselines select
and tailor these controls and enhancements for FedRAMP Certification, including FedRAMP-specific parameters,
implementation expectations, and assessment expectations.

## How to Approach Controls

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

## Expectations for Assurance

FedRAMP and agency customers need confidence that controls are implemented, operating, and producing evidence over
time. That means a control should not only be described once in a document. It should be supported by repeatable
processes, assigned responsibilities, current evidence, and a way to identify when the implementation no longer
matches the certified system.

!!! danger "Do not treat controls as a static checklist!"

    A checkbox approach usually misses the point of Rev5 controls. The goal is to show that the cloud service offering
    has real safeguards in place, that the right teams understand and maintain them, and that assessors and federal
    customers can verify those safeguards with useful evidence.
