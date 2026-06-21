---
tags:
  - Rev5
  - Cloud Service Providers
  - Rules
picto:
  source: person
  status: stable
---

# FedRAMP Rev5 Certification Rules

!!! danger "FedRAMP will stop accepting applications for new FedRAMP Rev5 Certifications on June 11, 2027!"

    Cloud service providers may wish to consider carefully before investing in a legacy process that
    FedRAMP is actively working to replace.

FedRAMP Rev5 Certification Rules replace long traditional narrative descriptions and web pages with simple
declarative statements that are intended to be easy to follow and address one by one. All applicable
rules must be followed to obtain and maintain a FedRAMP Certification.

In general, most cloud service providers will approach the FedRAMP Rev5 Certification Rules as follows:

1. [Marketplace Listing](rules/marketplace-listing) helps you get listed on the FedRAMP Marketplace.

2. [FedRAMP Certification](rules/fedramp-certification) explains the high level requirements for FedRAMP Certification.

3. [Boundary Rulesets](boundary) tell you how to establish, maintain, and protect the information resources that will be within the scope of your FedRAMP Certification.

4. [Assurance Rulesets](assurance) list of all of the special expectations that are necessary for assuring government customers that you are protecting their information.

    !!! tip "Assurance Rulesets will require new engineering and product work!"

        Government customers expect a significant amount of additional ongoing assurance
        about the confidentiality, integrity, and availability of federal information
        than private sector companies do. You will almost certainly need to design and
        build new capabilities to provide this assurance.

        FedRAMP has established a minimum set of assurance that should be adequate for
        federal agencies, but specific customers may require additional assurance due to
        risk and complexity of their use case.

5. [Package Rulesets](package) outline how all of this information should be supplied for FedRAMP.

6. [Rev5 Controls](controls/) are named requirements from the NIST SP 800-53 Revision 5 that identifies specific detailed items that must be implemented to safeguard an information system.

## Legacy Designation and Balance Improvement Releases

FedRAMP Rev5 is a legacy FedRAMP Certification process that is being replaced entirely by FedRAMP 20x. The Consolidated Rules for 2026 include
many integrated Balance Improvement Releases and other changes to modernize the FedRAMP Rev5 process and ensure that cloud service providers
with a FedRAMP Rev5 Certification will maintain a high level of assurance consistent with FedRAMP 20x. This means that cloud service providers
are expected to follow new rules and adopt new FedRAMP Practices from FedRAMP 20x into their FedRAMP Rev5 Certified cloud service offerings.

FedRAMP no longer provides templates in traditional documents for cloud service providers who are seeking to obtain or maintain a FedRAMP
Rev5 Certification. We expect all cloud service offerings to migrate to semi-structured text data that is compatible with basic JSON schemas
provided by FedRAMP using modern tools and capabilities. This will be a significant shift for many compliance organizations that traditionally
approach FedRAMP Certification as a documentation exercise based around Word documents and spreadsheets.


