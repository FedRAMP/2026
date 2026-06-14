---
tags:
  - 20x
description: "Introduction to the philosophy and approach for Key Security Indicators and how to work through them and verify/validate them with metrics etc."
purpose: "Folks will understand how the KSI approach works."
google_doc: ""
picto:
  source: person
  status: stable
---

# Key Security Indicators

FedRAMP 20x works differently than a traditional compliance approach by asking cloud service providers to demonstrate
desired security capabilities instead of telling them to meet specific security requirements. Key Security Indicators
are designed to be helpful to cloud service providers by ensuring their business has access to meaningful metrics
about the real outcomes of their security decisions. Every Key Security Indicator should be measuring things your business
cares about.

Security controls define required protections, but Key Security Indicators provide measurable validation that those
protections are functioning properly within operational environments. Therefore, you should focus on mapping the Key
Security Indicators directly to the desired security outcomes. This way, you can demonstrate that you've adhered to
the underlying security controls by showing the effectiveness of your implementation through active protection.

## Encouraging Improvement

Cloud environments evolve continuously through infrastructure updates, deployments, configuration changes, and scaling activities — so too should your security! Key Security Indicators aren’t one-time requirements. You should design and build your processes that fulfill Key Security Indicators to:

- Continuously collect evidence
- Detect configuration drift
- Monitor control effectiveness over time
- Alert on deviations from security baselines
- Provide measurable trends and operational insights

This continuous validation model supports stronger security assurance and aligns closely with modern cloud-native operational practices.

## Getting Started

FedRAMP expects a minimum set of information and artifacts for each Key Security Indicator to be documented in your
Security Decision Record. We are intentionally vague about the actual activities expected for each Key Security
Indicator because these vary considerably by cloud service offering depending on many diverse factors.

!!! danger "Do not attempt to approach Key Security Indicators from a traditional compliance standpoint!"

    GRC and Assurance Engineering is critical for approaching Key Security Indicators. You MUST work
    with hands-on software, infrastructure, and security engineers as well as many other disciplines
    throughout your organization to get value out of Key Security Indicators.

    In fact, the most successful organizations in the FedRAMP 20x pilots were entirely lead by
    experienced engineering and product teams that approached FedRAMP Certification like any other
    product.

The initial approach to each Key Security Indicator is simple:

- How are the activities that produce this outcome performed?
- Where in the tech or policy stack do they exist?
- What is currently measured or reported on related to these activities, or what do people want to measure or report on?
- Why are there gaps if no activities or metrics are relevant to this?
- When do the activities and measurements occur?
- Where are the sources of data for monitoring and measuring these activities?

Sometimes this information will be in a silo in the organization far away from security and
compliance - that's okay! Building that connection will benefit your business. Get to it!

## Expectations for Assurance

In general, FedRAMP expects cloud service providers to supply _as much information as possible_
related to Key Security Indicators that will assure federal customers that you are protecting
your data. We do not mandate specific numbers or implementations in most cases, but measurements
and metrics tied to these Key Security Indicators are how you're proving that your business
knows what it's doing - and as a bonus this information is often really useful to you internally
too!

!!! tip "It's about the customer experience, not compliance!"

    Don't think of it as trying to implement the minimum to obtain a FedRAMP Certification because
    that's not all it is. You're actually competing with every other cloud service provider to
    demonstrate that your measurements and metrics are better than theirs and that you can share
    information about them in a better way so federal agencies will choose you over everyone
    else.

