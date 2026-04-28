# The Shared Responsibility Model

The FedRAMP process relies on shared responsibility throughout various stages of the initial and ongoing FedRAMP Certification process, however each stakeholder also has sole responsibility for specific parts of the process itself.

!!! danger "Private companies are ***entirely*** responsible for the accuracy and completeness of the information they provide to FedRAMP and agencies throughout initial and ongoing FedRAMP Certification (and agency use)."

    Submitting, or causing to submit,  false or fraudulent claims or related statements to the government is a crime, as is lying to or misleading federal auditors. Any indications of such will result in referral to the Department of Justice for investigation.

## FedRAMP Responsibilities

FedRAMP has considerable responsibility throughout the FedRAMP process, outlined in both the FedRAMP Authorization Act and OMB Memorandum M-24-15. Broadly, for cloud services within the scope of FedRAMP, it is responsible for establishing a government-wide approach to the initial and ongoing assessment of cloud services and their use by agencies in federal information systems. This includes:

1. Establishing the rules that cloud service providers, independent assessors, and agencies will follow to obtain, maintain, and/or use a FedRAMP Certification.
2. Providing instructions to agencies on the use of FedRAMP Certification materials and their integration into agency information systems.
3. Ensuring secure mechanisms are in place for sharing initial and ongoing FedRAMP Certification information and related materials between cloud service providers and agencies.
4. Granting FedRAMP Certifications and maintaining a public record of these Certifications and their progress.
5. Providing a minimum level of continuous monitoring and requesting corrective action as necessary to ensure cloud service providers meet their ongoing certification obligations.
6. Recognizing independent assessment companies that follow FedRAMP rules and relying on such independent assessors to analyze, validate, and attest to the quality and compliance of security assessment materials provided by cloud services.
7. Engaging with companies and the public to gather feedback on proposed changes to guidance and requirements.
8. Owning government-wide outreach and information gathering from cloud services.

Notably, FedRAMP does not enter into any legal agreements or contracts with cloud service providers, and has no legal enforcement authority or responsibility. FedRAMP can request corrective action by a cloud service provider or independent assessor and companies may choose to take action in such cases, but FedRAMP can not force them to do so. In cases where a company chooses not to take effective correction action, their FedRAMP Certification may be revoked by FedRAMP for some time but no other punitive action is available.

In short, FedRAMP grants or revokes FedRAMP Certification while companies choose whether or not to maintain their FedRAMP Certification by following FedRAMP rules.

!!! warning "FedRAMP does not determine if a cloud service provider is “secure enough” for government use and does not issue government-wide authorizations to operate."

    The primary purpose of a FedRAMP Certification is to supply sufficient information, following FedRAMP rules, so that agencies can effectively and consistently apply this information to make decisions as they manage federal information systems following all relevant federal requirements.

[Learn more about FedRAMP](responsibilities/index.md){ .md-button }

## Cloud Service Provider Responsibilities

FedRAMP does not regulate private companies; agencies must only use cloud services with FedRAMP Certification if their use case is within the scope of FedRAMP, so cloud service providers are not subject to any FedRAMP rules unless they wish to provide services to agencies.

To obtain and maintain a FedRAMP Certification, cloud service providers must follow all FedRAMP rules. Cloud service providers are solely and entirely responsible for ensuring that the rules are followed properly, ongoing activities are performed as expected, and that any changes to the FedRAMP rules are adopted as necessary. All costs associated with obtaining and maintaining a FedRAMP Certification, including the use of an independent assessment service as needed, are the responsibility of the cloud service provider.

In general, the responsibilities to obtain and maintain a FedRAMP Certification for cloud service providers include:

1. Creating and maintaining certification materials following the FedRAMP process.
2. Storing and sharing certification materials with independent assessors, FedRAMP, CISA, and federal agencies as expected.
3. Operating ongoing certification activities on a persistent cadence and sharing much more information with the government that companies typically share with private-sector customers.
4. Partnering with an independent assessment service for initial and ongoing assessment to ensure adequate quality of the cloud service provider’s certification program.
5. Following and responding to changes to FedRAMP rules in alignment with published deadlines and expectations.
6. Engaging with FedRAMP and responding to data calls, emergency notifications, and other such activities as needed.
7. Ensuring that any contract agreement with agencies does not restrict the cloud service provider from meeting FedRAMP Certification rules.

Agencies may require cloud service providers to provide additional materials, implement additional capabilities, or otherwise modify their cloud service offering or operational procedures as part of a contract agreement with the cloud service provider based on specific agency requirements. This is expected and acceptable, however, cloud service providers must avoid any contractual obligation that prevents them from meeting ongoing FedRAMP Certification rules unless they are willing to lose their FedRAMP Certification.

[Learn more about Providers](providers/index.md){ .md-button }

## Agency Responsibilities

Federal agencies must ensure that any cloud service they use has a FedRAMP Certification if their use is within the scope of FedRAMP. Furthermore, agencies must follow FedRAMP rules for assessment and use of a cloud service within a federal information system; this includes the process for using a FedRAMP Certification package. FedRAMP has the responsibility and authority in law and policy for the use of cloud services by agencies and provides instructions to ensure agencies meet their statutory obligations under both FISMA and the FedRAMP Authorization Act.

In their use of cloud services that are within the scope of FedRAMP, agencies are responsible for:

1. Following the NIST Risk Management Framework, beginning with identifying the types of information an agency plans to use with a cloud service, categorizing the potential adverse impacts to that information, and selecting and documenting the necessary controls to protect that information to determine organizational security expectations for use of a cloud service.
2. Reviewing FedRAMP Certification materials for cloud services to determine if the cloud service provides sufficient protection to meet the specific objectives for its use within an agency information system.
3. Implementing and assessing the integration of FedRAMP Certified cloud services within the agency information system to ensure it has been securely configured and integrated into all necessary agency services in alignment with the required protections, including compensating controls as necessary. The resulting System Security Plan should ***only*** contain information that the agency is responsible for and should completely address each control identified in the selection step as either implemented by the agency or inherited from the cloud service provider.
4. Authorizing the operation of the information system and notifying FedRAMP of such.
5. Monitoring the information system and all agency-responsible controls in alignment with agency policy, and monitoring the cloud service used within the information system in alignment with FedRAMP policy.


### Requiring Additional Capabilities

Agencies may require cloud service providers to provide additional materials, implement additional capabilities, or otherwise modify their cloud service offering or operational procedures as part of a contract agreement with the cloud service provider based on specific agency requirements. This is expected and acceptable, however, agencies must avoid any contractual obligation that prevents the cloud service provider from meeting ongoing FedRAMP Certification rules.

!!! success "Example 1: Acceptable Additional Requirements"

    An agency using a cloud service in a critical system may desire Ongoing Authorization Reports reports monthly instead of quarterly and might establish this requirement in a contract agreement with the cloud service provider.

    This is an additional agency-specific requirement that both parties may agree to and poses no conflict with FedRAMP policies or procedures. Agencies and cloud service providers are encouraged to enter into contract agreements for additional stuff like this, especially if it benefits other agencies.

!!! danger "Example 2: Unacceptable Additional Requirements"

    An agency using a cloud service in a critical system requests to be the sole recipient of continuous monitoring information. The agency may feel their information system is so critical that they must limit the potential risk of information about flaws in that service spreading, and might want to establish a contract agreement that prevents the cloud service provider from sharing Ongoing Authorization Reports with other agencies.

    This additional agency-specific requirement would prevent other agencies from accessing critical continuous monitoring information and the cloud service provider would not be able to meet ongoing FedRAMP Certification requirements. If an agency and a cloud service provider were to enter into a contract agreement like this, FedRAMP would be forced to revoke the cloud service offering’s FedRAMP Certification and refer the issue to the agency Inspector General for review.

[Learn more about Agencies](agencies/index.md){ .md-button }

## Independent Assessment Service Responsibilities

FedRAMP relies on independent assessment services (also known as independent assessors, formerly referred to as Third-Party Assessment Organizations or 3PAOs) to analyze, validate, and attest to the quality and compliance of security assessment materials provided by cloud service providers seeking to obtain or maintain FedRAMP Certification. Independent assessors are contracted by cloud service providers to perform the bulk of the verification and validation necessary for FedRAMP to complete the assessment.

Throughout the lifecycle of a FedRAMP Certification for a cloud service provider, independent assessors are responsible for:

1. Verifying that the security materials provided by a cloud service provider meet the rules set by FedRAMP.
2. Validating that the operation of the cloud service offering aligns with the security materials provided by a cloud service provider.
3. Attesting to the general quality and completeness of the security materials after verification and validation.
4. Providing credible and meaningful inputs to the cloud service provider by documenting gaps, inconsistencies, or deficiencies in the operation of the cloud service or their security materials and identifying potential risks.
5. Document, summarize, and provide evidence of the above activities to the cloud service provider and FedRAMP following rules set by FedRAMP.
6. In the case of an agency sponsored FedRAMP Rev5 Certification, providing all materials to the sponsoring agency along with a recommendation or determination as required by the sponsoring agency.

To be used in a FedRAMP Certification, independent assessors must be FedRAMP Recognized. It is the responsibility of FedRAMP Recognized independent assessment services to meet all necessary requirements to maintain FedRAMP Recognition.

[Learn more about Assessors](assessors/index.md){ .md-button }

## Advisory Service Responsibilities

It can be incredibly difficult for companies to navigate the federal marketplace, and FedRAMP is just one small thing that makes providing services to the government different from private sector. Advisory services can help companies navigate these complexities and stay up to date - but be careful, as not all advisory services are created equal and tracking all of the modernization changes in government requires a lot of continuous effort.

Advisory services are optional within the FedRAMP shared responsibility model. FedRAMP does not certify, review, recommend, or officially recognize advisory services, but any advisory service may be listed in the FedRAMP Marketplace by meeting a few simple requirements.

!!! danger "Advisory services are not vetted by FedRAMP!"

    The FedRAMP Marketplace lists advisory services for the convenience of the public and does not
    review, endorse, or take any responsibility for advisory services or their use.

    Advisory services who indicate that a listing in the FedRAMP Marketplace is any special
    badge or certification from FedRAMP is sending an strong red flag.

[Learn more about Advisors](advisors/index.md){ .md-button }

