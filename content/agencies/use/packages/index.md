---
tags:
  - Federal Agencies
  - Guidance
picto:
  source: person
  status: stable
---

# Accessing FedRAMP Certification Packages

A FedRAMP Certification Package contains security information about a FedRAMP Certified cloud service offering and how the provider maintains it. Federal agencies typically cannot change the provider-controlled configurations described in the package.

FedRAMP historically collected Certification Package information in a single file-sharing repository operated first by OMB through OMB MAX, then by USDA through USDA Connect. Keeping this information in legacy folders on one platform creates risk and administrative burden. Cloud service providers are transitioning to FedRAMP-compatible trust centers by August 2027 so they can make Certification Package information available directly to agencies.

!!! tip "GRC automation tools will bridge the gap!"

    FedRAMP-compatible trust centers must make Certification Data available through APIs. Agency GRC automation tools can then receive properly formatted data without staff manually copying or downloading files.

The FedRAMP Marketplace shows how to access each package in the upper-right corner of the provider's listing. For self-hosted packages, it links to a trust center or provides contacts for requesting access. For packages still in the FedRAMP-managed USDA Connect repository, it links to a package access request form that the agency's authorizing official must sign.

## Using FedRAMP-Compatible trust centers

![ trust center Example](../../../assets/accessing-packages-trust-center.png)

Cloud service providers will manage package access under the FedRAMP Certification Data Sharing rules. FedRAMP will no longer act as an intermediary or dictate how providers protect and distribute commercial data that does not affect federal information. Agencies will receive needed data faster, while providers retain control over sensitive commercial information.

Commercial security information belongs to the company that produces it. The cloud service provider decides how to maintain and distribute that information. A provider may deny an access request if it does not want to do business with an agency. The provider must notify FedRAMP, but the decision remains a business matter.

Most trust centers that follow the Certification Data Sharing rules can integrate with common Governance, Risk, and Compliance (GRC) tools. These integrations can give agencies a near-real-time view of enterprise risk across multiple cloud services. FedRAMP does not endorse a specific tool or fund agency GRC tooling.

## Using USDA Connect

![Legacy Example](../../../assets/accessing-packages-legacy.png)

For legacy Rev5 Low and Moderate packages, FedRAMP has traditionally hosted the FedRAMP Repository in connect.gov and managed access on behalf of cloud service providers. This gave the federal government a consistent package structure and access process.

Access to FedRAMP-hosted packages requires a `.mil` or `.gov` email address and an OMB MAX.gov account. The requester submits the FedRAMP Package Access Request Form. The FedRAMP PMO reviews the form and grants time- and folder-limited access to the Secure Repository based on the requester's role and duties.

### Legacy Class D (High) Repositories

Cloud service providers have always managed legacy Rev5 Class D (High) Certification Packages under previous guidance. The repository had to be Class D Authorized, the provider had to restrict access based on need to know, and FedRAMP had to receive access as needed. This approach was costly and inefficient.

Existing self-managed Rev5 Class D repositories must transition to a FedRAMP-compatible trust center by August 1, 2027.
