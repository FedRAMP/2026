---
description: "Explanations of Certification classes and their relevance to Security Categorization and why they are different."
purpose: "Agencies will understand why Certification classes aren't the same as Security Categorization Levels and how to leverage Certifications of different classes in different agency information systems that have various security categorization levels."
google_doc: "https://docs.google.com/document/d/1UdOIjketHNMeQrpmDVJdX8KrdKClvVQ7stp97KEYw9I/edit?tab=t.9414dt9x6r02"
picto:
  source: person
  status: placeholder
---

# FedRAMP Certification Classes

FedRAMP grants different classes of FedRAMP Certification based on the level of assurance the cloud service provider is willing to supply to government customers. In general,
services with a lower Certification Class will be cheaper to procure and operate due to a reduced commitment to assurance while higher Certification Class offerings will be
more expensive with a higher level of assurance for government customers.

For example, commercial cloud service providers rarely share detailed continuous monitoring information with their private-sector customers but agency customers expect to see
an unprecedented amount of information about how a cloud service provider is operating their service. Class C and Class D Certified cloud service offerings have made extraordinary
commitments to provide additional assurance information in a timely manner to federal agency customers, typically including information and timeframes that they would never share
with private-sector customers.

!!! bug "FedRAMP Certification Class are not aligned to how secure a cloud service offering is!"

    Certification Classes indicate the level of assurance provided, not the level of security or
    protection provided! Obtaining and maintaining a FedRAMP Certification is a heavy investment
    for cloud service providers and many cloud services with world-class security programs are
    only willing to invest in Class A or B FedRAMP Certifications to keep government pricing
    aligned with commercial pricing.


## Impact Levels vs. Certification Classes

Agencies are required by FIPS-199 and FIPS-200 to categorize their information systems based on the risk of a potential adverse impact to the confidentiality, integrity, or availability of the information they will put into that system; then agencies must categorize the information system itself with an overall impact level of low, moderate, or high.

FedRAMP Certification Classes are different. A [Certification Class](../../definitions/#certification-class){ data-preview } describes the level of assurance information a cloud service provider supplies through FedRAMP for a cloud service offering. Certification Classes are about the depth, frequency, and quality of FedRAMP Certification Data available to agencies; they are not a direct label for how sensitive an agency system is.

A simple way to think about it:

| Concept | Applies To | Answers |
| :--- | :--- | :--- |
| Security Category / Impact Level | The agency information system and agency information | What could happen to the agency if confidentiality, integrity, or availability is lost? |
| FedRAMP Certification Class | The cloud service offering and its FedRAMP package | How much assurance information has the provider committed to supplying? |

Agencies should not treat Certification Classes as one-for-one replacements for Low, Moderate, or High impact levels. A cloud service’s Certification Class can help an agency understand what evidence is available, but the agency still has to decide whether the service is appropriate for the agency’s specific use, configuration, integrations, data, mission, and risk tolerance.

In practice, agencies should categorize their own information system first, then review the FedRAMP Certification package to determine if the cloud service offering has sufficient protections in place. The agency authorization should document what the agency configures, what the agency operates, and any additional controls or compensating controls needed for the agency’s use case.

Certification classes may be used by agencies to quickly gauge the general level of investments into security capabilities that each service provider has made, however final agency risk determinations must take into account how the agency will use the cloud service. Federal information systems could be composed of components that separately process information at different security categorization levels. Agencies are encouraged to properly architect federal information systems to use cloud services that appropriately match the security categorization of the information

## Broad Considerations on Certification Classes

The following table may help agencies understand the likely level of assurance in a FedRAMP Certification Package for a specific class:

| Certification Class | Presumption of Adequacy |
| -- | -- |
| Class A | Adequate for use in pilots, during configuration and testing, or for extremely low or negligible risk use cases such as processing public information or getting started with very few users. |
| Class B | Adequate for use in most Low impact agency information systems and some Moderate or High impact agency information systems with appropriate compensating controls. |
| Class C | Adequate for use in most Low or Moderate impact agency information systems and some High impact agency information systems with appropriate compensating controls. |
| Class D | Adequate for use in most agency information systems regardless of the impact level, especially when deployed with appropriate compensating controls. |
