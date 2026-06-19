---
description: "An overview of Certification packages, what type of information is in them, what they are used for, and why it's important for agencies to leverage them, with some information about machine-readability for ongoing authorization."
purpose: "Agencies understand the value and use of a certification package, especially that it's more than a one-time thing they just look at once, ATO, and move on."
google_doc: ""
picto:
  source: person
  status: placeholder
---

# Accessing FedRAMP Certification Packages

A FedRAMP Certification Package contains security information about the FedRAMP Certified cloud service offering. The information in the FedRAMP Certification Package is about how the cloud service provider maintains their cloud service offering. Federal agencies typically do not have control over the configuration choices reported in the FedRAMP Certification Package, since these are controlled by the cloud service provider.

Historically, FedRAMP collected all Certification Package information into a single file sharing repository operated by OMB (OMB MAX) and then USDA (USDA Connect); however, collection of this information within
legacy file-sharing folders in a single platform creates considerable risk and burden. All cloud service providers are currently transitioning to the use of FedRAMP-compatible Trust Centers (with a deadline of
August 2027) to ensure that Certification Package information can be made available directly to agencies via modern services.

!!! tip "GRC automation tools will bridge the gap!"

    FedRAMP-compatible Trust Centers must make Certification Data available via API so that an agency GRC automation tool can continuously receive appropriately formatted data without humans needed to manually copy or download files.

The FedRAMP Marketplace identifies how a package is available, whether it is in a trust center or still in the legacy USDA connect.  When looking at the vendors listing in the marketplace, the package location will be listed on the top right.  For those packages that are self hosted, you will be directed to the CDS compliant trust center directly, or directed to contact the vendor through the contacts listed in the marketplace. For those vendors that are still leveraging a FedRAMP managed through USDA Connect, the same location will direct you to a package access request form, which must be signed by your agency’s Authorizing Official.

## Using FedRAMP-Compatible Trust Centers

![Trust Center Example](../../../assets/accessing-packages-trust-center.png)

The new process for accessing FedRAMP data will be managed completely by CSPs, by following the new FedRAMP  Certification Data Sharing ruleset.  FedRAMP will no longer play middle man between CSP information and Federal Agencies, nor will we dictate how commercial data that does not affect federal information be protected and disseminated.  This change will ensure agencies have access to the data they need faster, while giving CSPs the flexibility to control access to what matters most.

It is important to remember that security information for a commercial entity is owned by that corporate entity.  Decisions around ownership, maintenance, and dissemination should be made by the CSP, not made by the government.  If a CSP does not want to do business with a specific agency, they have the ability to deny access requests.  FedRAMP must be notified, but this is a business decision.

Most trust centers that adhere to the  Certification Data Sharing ruleset have the ability to be compliant with most Governance, Risk, and Compliance (GRC) Tools on the market.  GRC tools can simplify an agency’s view into enterprise level risk in near real time when integrated into the multitude of CSP trust centers.  FedRAMP does not endorse a specific tool and does not provide funding for agency GRC tooling.

## Using USDA Connect

![Legacy Example](../../../assets/accessing-packages-legacy.png)

For legacy Rev5 packages, FedRAMP has traditionally hosted and managed access control for CSPs in the FedRAMP Repository in connect.gov for all Low and Moderate CSPs. This has allowed us to ensure consistency in structure and access across the federal government.

The initial steps to access FR hosted packages requires a .mil or .gov email address and an OMB MAX.gov account. The requesters submit the FedRAMP Package Access Request Form, which is manually reviewed by the FedRAMP PMO and grants access to the Secure Repository (SR), with access limits (time/folders) based on role and functions.

All packages within the connect.gov portal will have the same folder structure to provide a consistent experience for CSPs, 3PAOs, and Agencies alike.

“CSP NAME” Archive
“CSP NAME” ATO Letters
“CSP NAME” Continuous Monitoring
“CSP NAME” Annual Assessments
“CSP NAME” AA YYYY
“CSP NAME” AA YYYY - POA&M
“CSP NAME” AA YYYY - SAP
“CSP NAME” AA YYYY - SAR
“CSP NAME” AA YYYY - SSP
“CSP NAME” AA YYYY - SSP Attachments
“CSP NAME” Incident Information & Forms
“CSP NAME” POA&M & Inventory
“CSP NAME” Deviation Requests
“CSP NAME” Significant Changes
“CSP NAME” Vulnerability Scans
“CSP NAME” Container Scans
“CSP NAME” DB Scans
“CSP NAME” OS Scans
“CSP NAME” Web Scans
“CSP NAME” Initial ATO Assessment
“CSP NAME” POA&M
“CSP NAME” SAP
“CSP NAME” SAR
“CSP NAME” SSP
“CSP NAME” SSP Attachments
“CSP NAME” PMO Review

Please note, with the inception of CR26, no new packages will be created in the connect.gov repository starting on Dec 1, 2026.  It is expected that CSPs will transition to their own Certification Data Sharing complaint trust center as the expected shutdown date of all FedRAMP managed repositories is Feb 2, 2028.

### Legacy Class D (High) Repositories

Legacy Rev 5 Class D (High) certification packages have always been managed independently by CSPs, based on previous guidance.  The only requirements levied were that the environment must be Class D Authorized, access must be controlled based on need to know by CSPs, and FedRAMP must be provided access on an as needed basis.  This approach was inefficient, costly for CSPs, and not in line with best practices.  Current self managed Rev 5 Class D Repositories have until Aug 1, 2027 to transition to a Certification Data Sharing complaint trust center.
