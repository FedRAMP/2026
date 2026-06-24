---
tags:
  - Federal Agencies
  - Guidance
picto:
  source: person
  status: stable
---

# Agency Responsibilities

Federal agencies must ensure that any cloud service they use has a FedRAMP Certification if their use is within the scope of FedRAMP. Furthermore, agencies must follow FedRAMP rules for assessment and use of a cloud service within a federal information system; this includes the process for using a FedRAMP Certification Package. FedRAMP has the responsibility and authority in law and policy for the use of cloud services by agencies and provides instructions to ensure agencies meet their statutory obligations.

In their use of cloud services that are within the scope of FedRAMP, agencies are responsible for:

1. Following the NIST Risk Management Framework, beginning with identifying the types of information an agency plans to use with a cloud service, categorizing the potential adverse impacts to that information, and selecting and documenting the necessary controls to protect that information to determine organizational security expectations for use of a cloud service.

2. Reviewing FedRAMP Certification materials for cloud services to determine if the cloud service provides sufficient protection to meet the specific objectives for its use within an agency information system.

3. Implementing and assessing the integration of FedRAMP Certified cloud services within the agency information system to ensure it has been securely configured and integrated into all necessary agency services in alignment with the required protections, including compensating controls as necessary. The resulting System Security Plan should **only** contain information that the agency is responsible for and should completely address each control identified in the selection step as either implemented by the agency or inherited from the cloud service provider.

4. Authorizing the operation of the information system and notifying FedRAMP of such.

5. Monitoring the information system and all agency-responsible controls in alignment with agency policy, and monitoring the cloud service used within the information system in alignment with FedRAMP policy.

## Requiring Additional Capabilities

Agencies may require cloud service providers to provide additional materials, implement additional capabilities, or otherwise modify their cloud service offering or operational procedures as part of a contract agreement with the cloud service provider based on specific agency requirements. This is expected and acceptable, however, agencies must avoid any contractual obligation that prevents the cloud service provider from meeting ongoing FedRAMP Certification rules.

!!! success "Example 1: Acceptable Additional Requirements"

    An agency using a cloud service in a critical system may desire Ongoing Authorization Reports reports monthly instead of quarterly and might establish this requirement in a contract agreement with the cloud service provider.

    This is an additional agency-specific requirement that both parties may agree to and poses no conflict with FedRAMP policies or procedures. Agencies and cloud service providers are encouraged to enter into contract agreements for additional stuff like this, especially if it benefits other agencies.

!!! danger "Example 2: Unacceptable Additional Requirements"

    An agency using a cloud service in a critical system requests to be the sole recipient of continuous monitoring information. The agency may feel their information system is so critical that they must limit the potential risk of information about flaws in that service spreading, and might want to establish a contract agreement that prevents the cloud service provider from sharing Ongoing Authorization Reports with other agencies.

    This additional agency-specific requirement would prevent other agencies from accessing critical continuous monitoring information and the cloud service provider would not be able to meet ongoing FedRAMP Certification requirements. If an agency and a cloud service provider were to enter into a contract agreement like this, FedRAMP would be forced to revoke the cloud service offering’s FedRAMP Certification and refer the issue to the agency Inspector General for review.

---

[Learn more about Agencies :fontawesome-solid-paper-plane:](../agencies/index.md){ .md-button .md-button--primary}
