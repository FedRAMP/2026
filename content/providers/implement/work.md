---
description: "An overview of the type of stuff you'll need to do to prepare, and why it's important to officially begin the preparation phase, along with ensuring they understand the scope of FedRAMP."
purpose: "Folks will understand that preparing is a big deal and they should make it official and work through it, but also not waste their time if they're in the CMMC game or something."
google_doc: "https://docs.google.com/document/d/16nRI1Sr3oAxriPB-y-6aOSG5BttCcxV4go3_NEQD7Mc/edit?tab=t.ezf9qps8sdix"
picto:
  source: person
  status: empty
---

# Do the Work

```mermaid
flowchart LR
  A["Preparation"] --> B[Initial Implementation] --> C[Ongoing Certification]

  classDef current fill:#dff5e1,stroke:#2f855a,stroke-width:2px,color:#123524;
  class B current;
```

It's going to take a significant amount of work to earn a FedRAMP Certification, no matter how
mature your information security and Governance, Risk, and Compliance (GRC) engineering is. There
are hundreds of FedRAMP rules that you will need to address and many of them will require organizational
change.

During this part of the Implementation phase you will be focused on Initial Certification requirements
but will also need to build all of the underlying infrastructure to meet Ongoing Certification requirements -
and for most cloud service providers the Ongoing Certification requirements will be completely new.

FedRAMP does not provide tools, guidance, advice, or support to help cloud service providers navigate
this phase. Those resources are all available from private companies to help providers through the
process so that FedRAMP can focus on efficiently using government resources.

!!! danger "The legacy FedRAMP Rev5 process is considerably more complex!"

    FedRAMP developed the new FedRAMP 20x process in response to directives from Congress and
    the White House to prioritize the adoption of standard commercial cloud services within
    government. It's still necessary to do things differently due to the unique expectations of
    government customers, but it's much better than FedRAMP Rev5. Most cloud service providers
    who have sought a FedRAMP Rev5 Certification in the past chose to build entirely separate
    government-specific products and organizations to support those products, which goes against
    everything modern FedRAMP has been directed to achieve.

## Do it Step by Step

You can work towards FedRAMP Certification following whatever flow works best for you, and
often different providers will benefit from different approaches. The steps below are
intended to be a general theory of approach to work from but be sure to work with your
advisory service to tailor them to your organization.

The following steps should be taken in strong coordination with your information security and
GRC engineering teams:

1. Review all applicable FedRAMP rules in the FedRAMP 20x or FedRAMP Rev5 Certification Rules
   sections, then map them against your current environment and processes
   to see where you need to change things versus where you just need to build new reports.

2. Ensure you have executive support to invest the considerable effort necessary in adapting your
   business.

3. Focus on building a strong Certification Package Overview first, working through the FedRAMP
   Rulesets that focus on Initial Certification first. These rulesets interconnect but can
   generally be approached in the following order:

    a. Initial FedRAMP Certification
    b. Minimum Assessment Scope
    c. Certification Package Overview
    d. Using Cryptographic Modules
    e. Certification Data Sharing

4. Then you'll move onto your Security Decision Record, which collects all the information about
   how you have decided to approach the remaining FedRAMP rules. This will take the most time
   and investment, so if building a Certification Package Overview was difficult then you will
   have a long journey ahead of you!

5. Finally, you'll need to work your way through the Ongoing FedRAMP Certification rules and
   ensure you have everything in place to meet those requirements. The foundation for those
   requirements will be addressed in final updates to your Certification Package Overivew
   and your Security Decision Record. You will need to prove you are ready to meet all
   Ongoing FedRAMP Certification requirements in order to obtain your initial FedRAMP
   Certification.

!!! tip "Next Steps"

    Once you've completed all of these steps, it's time to [find a FedRAMP Recognized
    Independent Assessment Service to help independently verify and validate your work](assessor.md).

