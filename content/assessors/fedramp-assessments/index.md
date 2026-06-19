---
picto:
  source: person
  status: stable
---

# Performing FedRAMP Assessments

FedRAMP assessors establish whether a cloud service provider is actually doing what they think they are doing and producing outcomes that they intend to produce. This requires more than checking that the right words appear in a package.

The [Independent Verification and Validation rules](../rules/independent-verification-and-validation.md){ data-preview } divide the work into two questions:

1. **Verification:** Did the provider implement what it documented?
2. **Validation:** Does that implementation produce the intended results?

Answer both questions against the operating cloud service. Documentation explains what to inspect, but it cannot prove that a measure exists or works. Assessors should inspect the technical implementation, observe live processes, test results, and trace important claims to reliable sources.

## Use evidence and judgment

Some findings come from direct measurement. Others require technical judgment.

Assessors should use quantitative evidence where it answers the question: configuration data, event records, source data, metrics, test results, or a complete population of automated checks. Representative sampling remains useful when full review adds little value or cannot be performed.

Qualitative work still matters. Speak with the provider's engineers and other experts to understand design choices, operating limits, and failure modes. Then test those explanations through independent research and technical review.

Collaboration does not weaken independence. Assessors may identify unclear evidence, discuss better testing methods, and offer advice that improves security or reporting. They must keep enough distance to challenge the provider's claims and report disagreements plainly.

!!! warning "The Consolidated Rules for 2026 expects assessment of each FedRAMP rule!"

    Every single applicable FedRAMP rule provides important information about a provider's
    security program and approach; each applicable FedRAMP rule must be assessed. The addition
    of hundreds of FedRAMP rules expands the scope of a FedRAMP independent assessment
    considerably, but in general these assessments should be quick and simple unless the
    particular FedRAMP rule is a gnarly one.

## Report what the assessment found

Assessment summaries should tell FedRAMP and agency customers:

- What the assessor examined and how.
- What evidence supported the result.
- Where the implementation worked as described.
- Where it failed, lacked support, or remained disputed.
- What risks or limits matter to a potential customer.

The provider includes these summaries in its Security Decision Record and Certification Package Overview. The assessor must verify that the provider did not change their meaning.

FedRAMP does not require a separate Security Assessment Plan or Security Assessment Report for Program Certification. The assessment record belongs with the maintained Certification Package, close to the security decisions and evidence it evaluates.

The specific method for assessing FedRAMP Practices changes by Certification Type:

- [FedRAMP 20x assessments](20x.md){ data-preview } examine outcome-based Key Security Indicators and their validation systems.
- [FedRAMP Rev5 assessments](rev5.md){ data-preview } examine Rev5 Controls and must also account for the differences between Program Certification and legacy agency-sponsored assessments.
