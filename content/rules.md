---
description: "Using the FedRAMP Consolidated Rules."
purpose: "Explains the structure of the FedRAMP Consolidated Rules, how to read through them, how they apply, and how to use them."
google_doc: ""
picto:
  source: person
  status: stable
---

# Using the FedRAMP Consolidated Rules

!!! tip "FedRAMP Consolidated Rules provide a standardized approach to agency security assessment and authorization."

    Federal agencies are expected to meet **extensive** statutory and policy responsibilities to protect
    federal information systems. These responsibilities are placed upon agencies by Congress, the President,
    the Office of Management and Budget, the Department of Commerce (usually via the National Institute of
    Standards and Technology), and the Department of Homeland Security (usually via the Cybersecurity and
    Infrastructure Security Agency).

    Think of FedRAMP Consolidated Rules as a standardized translation layer that allows private sector companies to share
    information with and make standardized commitments about their information security to federal
    agencies so that these companies don't need to navigate each individual agency's bespoke information
    security process.

FedRAMP Consolidated Rules replace long narrative documents with concise, declarative, plain-language statements
that explain FedRAMP's expectations for:

- **FedRAMP**: The Federal Risk and Authorization Management Program itself.
- **Providers**: Cloud service providers seeking to obtain or maintain a FedRAMP Certification for their cloud service offering.
- **Assessors**: Independent assessment services seeking to obtain or maintain FedRAMP Recognition and to participate in independent verification and validation on behalf of FedRAMP.
- **Agencies**: Executive branch federal agencies seeking to meet statutory and policy requirements for information security while using cloud services within the scope of FedRAMP.
- **Advisors**: Advisory services that wish to be listed on the FedRAMP Marketplace.

FedRAMP Rules are structured as follows:

1. **Consolidated Rules** are the combined unified explanations of how things should be done with FedRAMP.
2. **Rulesets** are the top-level collections of rules within the Consolidated Rules, grouped by process or subject.
3. **Subsets** are smaller groups in a FedRAMP Ruleset based on responsibilities or tasks.
4. **Rules** are individual guidelines or instructions that must be addressed.

## Following the Consolidated Rules

This website is designed for high-level human-readable reference of the FedRAMP Consolidated Rules, including narrative background
information about FedRAMP and the rules (like this page). It is **only** intended as a human-readable reference; it is
not designed for actual direct use in the implementation of an information security program that seeks to obtain and
maintain FedRAMP Certification.

The original consolidated rules, with rich metadata designed for use in modern tools, is maintained in a structured machine-readable
JSON format. Once a stakeholder is ready to move past reviewing the human-readable reference and into the actual
implementation of the FedRAMP Consolidated Rules, they should rely on the original machine-readable rules instead of this website.

The [FedRAMP Rules repository on GitHub](https://github.com/FedRAMP/rules) is the machine-readable source of truth for these rules.

## FedRAMP Rulesets

In general, FedRAMP Consolidated Rules are collected by a related process or subject called a **ruleset**. Each of these FedRAMP
Rulesets has a purpose that is explained in the introduction, followed by subsets of the rules.

FedRAMP Rulesets include:

| Acronym | Title                                |
| ------- | ------------------------------------ |
| **AGU** | Agency Use of Cloud Services         |
| **CCM** | Collaborative Continuous Monitoring  |
| **CDS** | Certification Data Sharing           |
| **FRC** | FedRAMP Certification                |
| **FSI** | FedRAMP Security Inbox               |
| **ICP** | Incident Communications Procedures   |
| **MAS** | Minimum Assessment Scope             |
| **MKT** | FedRAMP Marketplace Listing          |
| **SCG** | Secure Configuration Guide           |
| **SCN** | Significant Change Notifications     |
| **UCM** | Using Cryptographic Modules          |
| **VDR** | Vulnerability Detection and Response |

### Applicability

There are hundreds of FedRAMP Rules that apply to different stakeholders in different ways; not all rules apply
to everyone at every time. Applicability varies by FedRAMP Ruleset, subset, and individual rules.

The primary applicability indicators are:

- **Rev5** vs **20x** applicability is defined at the top-level within each ruleset and within subsets.
- **Stakeholder** applicability is defined within each rule, though rulesets and subsets are often grouped by stakeholder as well.
- **Task** or **process** applicability is often applied to a specific subset of rules.
- **Class** applicability is universal by default, but may be defined in specific rules or occasionally in a subset of rules when expectations vary by class.

### Definitions

The [FedRAMP Definitions](definitions.md){ data-preview } play a **vital** role in the FedRAMP Consolidated Ruleset.
These terms act as a function or subroutine that keeps rules simple through the use of a clearly defined term. In
many cases the definitions provide considerable clarity and specificity that is necessary to understand and apply the
rule.

Terms that are used in a rule are displayed after each rule for quick reference, and included in an array in the
underlying machine-readable rules. It is impossible to properly address a FedRAMP Rule that uses a defined term
without also applying the specific FedRAMP Definition for the term.

## FedRAMP Subsets

Inside each process are labeled groupings of rules with specific applicability called **subsets**. Each FedRAMP Subset
also has a purpose that is explained in the introduction, followed by the specific rules. Subsets are typically based on
**responsibilities** or **tasks**.

Common subsets based on responsibilities include:

- **General Provider Responsibilities** typically apply to all providers regardless of their FedRAMP Certification Type.
- **20x-Specific Provider Responsibilities** typically apply to all providers for FedRAMP 20x Certification.
- **Rev5-Specific Provider Responsibilities** typically apply to all providers for FedRAMP Rev5 Certification.
- **General Independent Assessor Responsibilities** typically apply to all independent assessment services.
- **20x-Specific Independent Assessor Responsibilities** typically apply to independent assessment services during the performance of a FedRAMP 20x assessment.
- **Rev5-Specific Independent Assessor Responsibilities** typically apply to independent assessment services during the performance of a FedRAMP Rev5 assessment.

Other subsets will be based on tasks and the applicability will vary.

## FedRAMP Rules

FedRAMP Rules are organized statements that describe who it applies to, the force of the rule, and what action or condition is expected.
They are designed to be applied within context of the entire FedRAMP Consolidated Rules, including the FedRAMP Definitions and
other rules.

Even apparently simple and straightforward rules often require application within the full context.

!!! example "Example 1: A Simple Rule"

    Providers MUST supply current certification data to all necessary parties

    [_Providers_] [**MUST**] [_**supply current certification data**_] [to all necessary parties].

    [_Responsible party_] + [**rule force**] + [_**action or condition**_] + [when, where, or how it applies]

    This means the provider is responsible, the action is required, and the rule explains what must be supplied and to whom.

    - This rule does not explain how providers will "supply" the certification data because that is subject to other rules.
    - ""[Certification data](definitions.md#certification-data){ data-preview }" and "[all necessary parties](definitions.md#all-necessary-parties){ data-preview }" are official FedRAMP terms with a specific definition that add
    intent to this example rule
    - "Current" is a plain-language word that is meant to convey something that is the most up to date, based on common usage and definitions

### Force of the Rule

FedRAMP uses capitalized key words for the force of each rule based on [IETF RFC-2119 Key words for use in RFCs to Indicate Requirement Levels](https://datatracker.ietf.org/doc/html/rfc2119).

| Key Word | Force |
| -- | -- |
| MUST | The rule is an absolute requirement.<br><br>Parties MUST meet such rules and address them in their security documentation. Not meeting such a rule may lead to corrective action and the denial of initial or ongoing FedRAMP Certification.|
| MUST NOT | The rule is an absolute prohibition.<br><br>Parties MUST meet such rules and address them in their security documentation. Not meeting such a rule may lead to corrective action and the denial of initial or ongoing FedRAMP Certification.|
| SHOULD | There may exist valid reasons in particular circumstances to ignore this rule, but the full implications must be understood and carefully weighed.<br><br>Parties MUST address such rules in their security documentation by explaining their decisions about how they handle such rules.|
| SHOULD NOT | There may exist valid reasons in particular circumstances when the particular action is acceptable or even useful, but the full implications must be understand and carefully weighed.<br><br>Parties MUST address such rules in their security documentation by explaining their decisions about how they handle such rules. |
| MAY | The rule is truly optional.<br><br>Parties SHOULD address such rules in their security documentation by explaining their decisions about how they handle such rules.|

### Identifiers

Each FedRAMP Rule is identified by a triplet of 3 letter identifiers: the ruleset, the subset, and an individual rule key based on a human-readable name. Together, these form a stable rule identifier in the format `SET-SUBSET-KEY`.
Rules should always be referred to by their stable rule identifier in code or writing, but should also include their name in discussions or writings for humans. Humans should be careful using the name or rule key themselves, as these are often
duplicated across rulesets and subsets. To avoid any confusion, always ensure that other folks know what set and subset you are discussing before providing the key or name by itself.

!!! example "Example rule identifiers and names"

    **`MAS-CSO-TPR`**: `Third-Party Information Resources`

    - `MAS` = Minimum Assessment Scope (Ruleset)
    - `CSO` = General Provider Responsibilities (Subset)
    - `TPR` = Rule key aligned to the name of the rule

    **`VDR-RPT-VDT`**: `Vulnerability Details`

    - `VDR` = Vulnerability Detection and Response (Ruleset)
    - `RPT` = Reporting (Subset)
    - `VDT` = Rule key aligned to the name of the rule

    **`CCM-QTR-NRD`**: `Next Review Date`

    - `CCM` = Collaborative Continuous Monitoring (Ruleset)
    - `QTR` = Quarterly Reviews (Subset)
    - `NRD` = Rule key aligned to the name of the rule

### It's Not a Trap!

FedRAMP Rules are intentionally crafted to encourage flexibility and avoid opinionated implementations unless absolutely necessary.
Folks with traditional compliance backgrounds are often skeptical of this approach due to historical conflicts with reviewers and
independent assessors who expected to see specific implementations... but it's not a trap.

Cloud service providers are truly expected to implement innovative solutions to meet FedRAMP rules, and to compete with each other
to provide the best experience for FedRAMP, agencies, and the provider's customers in doing so. You may be expected to explain how
a particular implementation addresses a rule but as long as it's applied consistently and makes sense then it's fine.

This is most common in rules where FedRAMP indicates that a report, notification, or other type of thing should be supplied to
customers as part of ongoing security communications. Most of these requirements, especially those for both human-readable and
machine-readable reports, can be met by sending something as simple as a spreadsheet - or you could build something amazing
that impresses your customers and drives industry forward.

In other cases we specify maximum timeframes or keep something very general like requesting that it be done persistently. In the
first case, doing something in the maximum timeframe is the absolute worst case lazy approach and you should always be striving
to exceed those timeframes considerably. In the second case it's an opportunity to show what's really important to you and how
seriously you take the rule - one provider might do something once a year and that's okay, but they'll look bad next to a provider
who automates the same thing to happen every 3 hours.
