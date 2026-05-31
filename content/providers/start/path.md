---
description: "Overview of the Certification paths and how to choose one, including depending on the type and class expectations."
purpose: "Folks know they should aim for Program Certification on 20x unless they need a Class D before early 2027."
google_doc: ""
picto:
  source: person
  status: stable
---

# Choosing a Certification Path

There are two FedRAMP Certification Paths:

- **Program Certification** is provided directly by FedRAMP and does not require a federal agency to "sponsor" the service for FedRAMP Certification; this path is mostly only available for the 20x Certification Type.
- **Agency Certification** requires a federal agency to authorize the service in advance, following the legacy FedRAMP process, then "sponsor" the service for FedRAMP Certification; this path is only available for the Rev5 Certification Type.

!!! tip "You may combine FedRAMP Certification Paths for Rev5."

    Cloud service providers may obtain a FedRAMP Rev5 Class A Certification via the Program Certification Path
    then later use the Agency Certification Path to upgrade to a different FedRAMP Rev5 Certification Class.

## Choice is a Misnomer

In general, you do not get to choose a Certification Path because it is the outcome of your other choices. This section
is more about awareness than choice.

| Type | Class | Program Certification | Agency Certification |
| -- | -- | -- | -- |
| 20x | Class A | :lucide-badge-check:{ .xl .middle .stable } Required | :lucide-circle-slash:{ .xl .middle .empty } Unavailable|
| 20x | Class B |  :lucide-badge-check:{ .xl .middle .stable } Required | :lucide-circle-slash:{ .xl .middle .empty } Unavailable|
| 20x | Class C |  :lucide-badge-check:{ .xl .middle .stable } Required | :lucide-circle-slash:{ .xl .middle .empty } Unavailable|
| 20x | Class D |  :lucide-badge-check:{ .xl .middle .stable } Required | :lucide-circle-slash:{ .xl .middle .empty } Unavailable|
| Rev5 | Class A | :lucide-badge-check:{ .xl .middle .stable } Required | :lucide-circle-slash:{ .xl .middle .empty } Unavailable|
| Rev5 | Class B | :lucide-circle-dashed:{ .xl .middle .placeholder } Limited| :lucide-badge-check:{ .xl .middle .stable } Expected|
| Rev5 | Class C | :lucide-circle-dashed:{ .xl .middle .placeholder } Limited| :lucide-badge-check:{ .xl .middle .stable } Expected|
| Rev5 | Class D | :lucide-circle-slash:{ .xl .middle .empty } Unavailable | :lucide-badge-check:{ .xl .middle .stable } Required|

!!! danger "Program Certifications are limited to one type, either 20x or Rev5."

    FedRAMP will not provide Program Certifications for both 20x and Rev5 as this is an inefficient use of FedRAMP's limited resources.
