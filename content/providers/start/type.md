---
description: "Overview of the certification types and how to choose one, with a focus on choosing since there's a lot more information in the Overview section on types."
purpose: "Folks will know they should go 20x unless they want Class D before early 2027 or they run their own infrastructure."
google_doc: ""
picto:
  source: person
  status: stable
---

# Choosing a Certification Type

```mermaid
flowchart LR
  A["Preparation"] --> B[Initial Implementation] --> C[Ongoing Certification]

  classDef current stroke:#00A86B,stroke-width:3px;
  class A current;
```

There are two FedRAMP Certification Types:

- **20x** is a modern cloud-native approach that is new in 2026.
- **Rev5** is a modified version of the legacy approach that will be retired in the future.

## FedRAMP 20x vs Rev5

In general, cloud service offerings that are built on FedRAMP Certified infrastructure or platforms should choose FedRAMP 20x; this is the fastest, cheapest,
and best way to bring an existing commercial cloud service into the federal market. It's new in 2026, but is designed to be the future of FedRAMP Certification
and will be the only option for most cloud services soon. FedRAMP 20x Certifications are processed directly by FedRAMP and do not require an active agency
contract or sponsor.

FedRAMP Rev5 is a modified version of the legacy FedRAMP Certification process that encouraged companies to build and operate government-specific services. It
requires significant additional investment in time and effort compared to FedRAMP 20x, but is currently the only option for cloud services that run their own
infrastructure or require a FedRAMP Class D Certification. FedRAMP Rev5 Certifications typically require an active agency contract or sponsor in advance.

!!! tip "FedRAMP 20x Class D Certifications will be available in 2027"

    FedRAMP anticipates piloting 20x Class D Certifications in late 2026 and making them available
    as a formal option in early 2027. In most cases, a cloud service provider entering the federal
    market from zero today will be able to obtain a FedRAMP 20x Class C Certification then upgrade
    to a FedRAMP 20x Class D Certification faster than obtaining a FedRAMP Rev5 Class D Certification.

| FedRAMP 20x | FedRAMP Rev5 |
| -- | -- |
| **Modern** Certification Type | **Legacy** Certification Type |
| Intended for cloud-native services built on FedRAMP Certified infrastructure or platforms. | Intended for standalone services entirely owned and operated by the cloud service provider. |
| Designed for use over the next decade with continuous improvement. | Will be retired by FedRAMP as a new Certification Type by mid-2027 and may be retired as an ongoing Certification Type in the future. |
| Encourages government adoption of commercial cloud service offerings and discourages separate government-only versions. | Typically implemented with a separate government-only version of the cloud service. |
| Program Certification available for Class A, Class B, and Class C. | Program Certification only available for Class A; all others typically require an agency sponsor. |

!!! danger "FedRAMP Rev5 will be retired."

    Consider carefully before investing in a FedRAMP Certification Type that FedRAMP is actively working to replace and retire over the next few years.
