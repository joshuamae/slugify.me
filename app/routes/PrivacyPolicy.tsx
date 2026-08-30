import type { ComponentProps, ReactNode } from 'react';
import { Link } from 'react-router';

import type { Route } from './+types/PrivacyPolicy';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '~/components/ui/card';
import { Separator } from '~/components/ui/separator';

const dataSubjectAccessRequestUrl =
	'https://app.termly.io/dsar/def1acb5-162c-4db9-9154-7e83d330b36a';

const tableOfContents = [
	{ id: 'infocollect', title: 'What information do we collect?' },
	{ id: 'infouse', title: 'How do we process your information?' },
	{
		id: 'legalbases',
		title: 'What legal bases do we rely on to process your personal information?',
	},
	{
		id: 'whoshare',
		title: 'When and with whom do we share your personal information?',
	},
	{ id: 'inforetain', title: 'How long do we keep your information?' },
	{ id: 'infosafe', title: 'How do we keep your information safe?' },
	{ id: 'infominors', title: 'Do we collect information from minors?' },
	{ id: 'privacyrights', title: 'What are your privacy rights?' },
	{ id: 'DNT', title: 'Controls for Do-Not-Track features' },
	{
		id: 'uslaws',
		title: 'Do United States residents have specific privacy rights?',
	},
	{
		id: 'otherlaws',
		title: 'Do other regions have specific privacy rights?',
	},
	{ id: 'policyupdates', title: 'Do we make updates to this notice?' },
	{ id: 'contact', title: 'How can you contact us about this notice?' },
	{
		id: 'request',
		title: 'How can you review, update, or delete the data we collect from you?',
	},
];

const personalInformationCategories = [
	{
		category: 'A. Identifiers',
		examples:
			'Contact details, such as real name, alias, postal address, telephone or mobile contact number, unique personal identifier, online identifier, Internet Protocol address, email address, and account name',
		collected: 'Yes',
	},
	{
		category:
			'B. Personal information as defined in the California Customer Records statute',
		examples:
			'Name, contact information, education, employment, employment history, and financial information',
		collected: 'No',
	},
	{
		category:
			'C. Protected classification characteristics under state or federal law',
		examples:
			'Gender, age, date of birth, race and ethnicity, national origin, marital status, and other demographic data',
		collected: 'No',
	},
	{
		category: 'D. Commercial information',
		examples:
			'Transaction information, purchase history, financial details, and payment information',
		collected: 'No',
	},
	{
		category: 'E. Biometric information',
		examples: 'Fingerprints and voiceprints',
		collected: 'No',
	},
	{
		category: 'F. Internet or other similar network activity',
		examples:
			'Browsing history, search history, online behavior, interest data, and interactions with our and other websites, applications, systems, and advertisements',
		collected: 'No',
	},
	{
		category: 'G. Geolocation data',
		examples: 'Device location',
		collected: 'Yes',
	},
	{
		category: 'H. Audio, electronic, sensory, or similar information',
		examples:
			'Images and audio, video or call recordings created in connection with our business activities',
		collected: 'No',
	},
	{
		category: 'I. Professional or employment-related information',
		examples:
			'Business contact details in order to provide you our Services at a business level or job title, work history, and professional qualifications if you apply for a job with us',
		collected: 'No',
	},
	{
		category: 'J. Education information',
		examples: 'Student records and directory information',
		collected: 'No',
	},
	{
		category: 'K. Inferences drawn from collected personal information',
		examples:
			'Inferences drawn from any of the collected personal information listed above to create a profile or summary about, for example, an individual’s preferences and characteristics',
		collected: 'No',
	},
	{
		category: 'L. Sensitive personal information',
		examples: '—',
		collected: 'No',
	},
];

export function meta(_args: Route.MetaArgs) {
	return [
		{ title: 'Privacy Policy | slugify.me' },
		{
			name: 'description',
			content:
				'Read the slugify.me privacy policy and learn how personal information is collected, processed, retained, and protected',
		},
	];
}

function PolicyLink({ href, children, ...props }: ComponentProps<'a'>) {
	const opensInNewTab = href?.startsWith('http');
	const className =
		'font-medium text-primary underline underline-offset-4 [overflow-wrap:anywhere]';

	if (href?.startsWith('#')) {
		return (
			<Link to={href} className={className} {...props}>
				{children}
			</Link>
		);
	}

	return (
		<a
			href={href}
			className={className}
			target={opensInNewTab ? '_blank' : undefined}
			rel={opensInNewTab ? 'noreferrer' : undefined}
			{...props}
		>
			{children}
		</a>
	);
}

type PolicySectionProps = {
	id: string;
	number: number;
	title: string;
	children: ReactNode;
};

function PolicySection({ id, number, title, children }: PolicySectionProps) {
	return (
		<>
			<Separator />
			<section
				id={id}
				aria-labelledby={`${id}-heading`}
				className="flex scroll-mt-24 flex-col gap-5"
			>
				<h2
					id={`${id}-heading`}
					className="font-heading text-2xl font-semibold tracking-tight text-foreground"
				>
					{number}. {title}
				</h2>
				{children}
			</section>
		</>
	);
}

function PolicySubsection({
	children,
	id,
}: {
	children: ReactNode;
	id?: string;
}) {
	return (
		<h3
			id={id}
			className="font-heading scroll-mt-24 text-lg font-semibold text-foreground"
		>
			{children}
		</h3>
	);
}

function PersonalInformationTable() {
	return (
		<div
			role="region"
			aria-labelledby="categories-heading"
			tabIndex={0}
			className="overflow-x-auto rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
		>
			<table className="w-full min-w-2xl border-collapse text-left text-sm">
				<caption className="sr-only">
					Categories of personal information collected in the past
					twelve months
				</caption>
				<thead>
					<tr className="border-b text-foreground">
						<th scope="col" className="px-3 py-2 font-semibold">
							Category
						</th>
						<th scope="col" className="px-3 py-2 font-semibold">
							Examples
						</th>
						<th scope="col" className="px-3 py-2 font-semibold">
							Collected
						</th>
					</tr>
				</thead>
				<tbody>
					{personalInformationCategories.map(
						({ category, examples, collected }) => (
							<tr
								key={category}
								className="border-b last:border-0"
							>
								<th
									scope="row"
									className="px-3 py-3 align-top font-medium text-foreground"
								>
									{category}
								</th>
								<td className="px-3 py-3 align-top">
									{examples}
								</td>
								<td className="px-3 py-3 align-top font-medium text-foreground">
									{collected}
								</td>
							</tr>
						),
					)}
				</tbody>
			</table>
		</div>
	);
}

function ShortSummary({ children }: { children: ReactNode }) {
	return (
		<p className="italic">
			<strong className="text-foreground">In Short: </strong>
			{children}
		</p>
	);
}

export default function PrivacyPolicy() {
	return (
		<main className="flex flex-1 px-4 py-10 sm:px-6 sm:py-18">
			<article className="mx-auto flex min-w-0 w-full max-w-3xl flex-col gap-8 text-sm leading-7 text-muted-foreground sm:text-base">
				<header className="flex flex-col gap-3">
					<h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
						Privacy Policy
					</h1>
					<p className="font-medium">
						Last updated{' '}
						<time dateTime="2026-08-30">August 30, 2026</time>
					</p>
				</header>

				<Card>
					<CardHeader>
						<CardTitle>
							<h2>TL;DR</h2>
						</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col gap-3">
						<p>
							I don't collect or send any data to a server when
							you generate your slugs. The code can be verified
							and there is no server side processing involved.
						</p>
						<p>
							However, Netlify captures your IP address and User
							agent details with their Observability feature. I
							have no way of turning this off.
						</p>
						<p>There are no ads or tracking in this project.</p>
					</CardContent>
				</Card>

				<div className="flex flex-col gap-4">
					<p>
						This Privacy Notice for __________ (&quot;
						<strong className="text-foreground">we</strong>,&quot;
						&quot;<strong className="text-foreground">us</strong>
						,&quot; or &quot;
						<strong className="text-foreground">our</strong>&quot;),
						describes how and why we might access, collect, store,
						use, and/or share (&quot;
						<strong className="text-foreground">process</strong>
						&quot;) your personal information when you use our
						services (&quot;
						<strong className="text-foreground">Services</strong>
						&quot;), including when you:
					</p>
					<ul className="flex list-disc flex-col gap-2 pl-6">
						<li>
							Visit our website at{' '}
							<PolicyLink href="https://slugify.me/">
								https://slugify.me/
							</PolicyLink>{' '}
							or any website of ours that links to this Privacy
							Notice
						</li>
						<li>
							Engage with us in other related ways, including any
							marketing or events
						</li>
					</ul>
					<p>
						<strong className="text-foreground">
							Questions or concerns?{' '}
						</strong>
						Reading this Privacy Notice will help you understand
						your privacy rights and choices. We are responsible for
						making decisions about how your personal information is
						processed. If you do not agree with our policies and
						practices, please do not use our Services.
					</p>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>
							<h2>Summary of key points</h2>
						</CardTitle>
						<CardDescription>
							This summary provides key points from our Privacy
							Notice, but you can find out more details about any
							of these topics by clicking the link following each
							key point or by using our{' '}
							<PolicyLink href="#toc">
								table of contents
							</PolicyLink>{' '}
							below to find the section you are looking for.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						<p>
							<strong>
								What personal information do we process?{' '}
							</strong>
							When you visit, use, or navigate our Services, we
							may process personal information depending on how
							you interact with us and the Services, the choices
							you make, and the products and features you use.
							Learn more about{' '}
							<PolicyLink href="#personalinfo">
								personal information you disclose to us
							</PolicyLink>
							.
						</p>
						<p>
							<strong>
								Do we process any sensitive personal
								information?{' '}
							</strong>
							Some of the information may be considered
							&quot;special&quot; or &quot;sensitive&quot; in
							certain jurisdictions, for example your racial or
							ethnic origins, sexual orientation, and religious
							beliefs. We do not process sensitive personal
							information.
						</p>
						<p>
							<strong>
								Do we collect any information from third
								parties?{' '}
							</strong>
							We do not collect any information from third
							parties.
						</p>
						<p>
							<strong>
								How do we process your information?{' '}
							</strong>
							We process your information to provide, improve, and
							administer our Services, communicate with you, for
							security and fraud prevention, and to comply with
							law. We may also process your information for other
							purposes with your consent. We process your
							information only when we have a valid legal reason
							to do so. Learn more about{' '}
							<PolicyLink href="#infouse">
								how we process your information
							</PolicyLink>
							.
						</p>
						<p>
							<strong>
								In what situations and with which parties do we
								share personal information?{' '}
							</strong>
							We may share information in specific situations and
							with specific third parties. Learn more about{' '}
							<PolicyLink href="#whoshare">
								when and with whom we share your personal
								information
							</PolicyLink>
							.
						</p>
						<p>
							<strong>
								How do we keep your information safe?{' '}
							</strong>
							We have adequate organizational and technical
							processes and procedures in place to protect your
							personal information. However, no electronic
							transmission over the internet or information
							storage technology can be guaranteed to be 100%
							secure, so we cannot promise or guarantee that
							hackers, cybercriminals, or other unauthorized third
							parties will not be able to defeat our security and
							improperly collect, access, steal, or modify your
							information. Learn more about{' '}
							<PolicyLink href="#infosafe">
								how we keep your information safe
							</PolicyLink>
							.
						</p>
						<p>
							<strong>What are your rights? </strong>Depending on
							where you are located geographically, the applicable
							privacy law may mean you have certain rights
							regarding your personal information. Learn more
							about{' '}
							<PolicyLink href="#privacyrights">
								your privacy rights
							</PolicyLink>
							.
						</p>
						<p>
							<strong>How do you exercise your rights? </strong>
							The easiest way to exercise your rights is by
							submitting a{' '}
							<PolicyLink href={dataSubjectAccessRequestUrl}>
								data subject access request
							</PolicyLink>
							, or by contacting us. We will consider and act upon
							any request in accordance with applicable data
							protection laws.
						</p>
						<p>
							<strong>
								Want to learn more about what we do with any
								information we collect?{' '}
							</strong>
							<PolicyLink href="#toc">
								Review the Privacy Notice in full
							</PolicyLink>
							.
						</p>
					</CardContent>
				</Card>

				<Card id="toc" className="scroll-mt-24">
					<CardHeader>
						<CardTitle>
							<h2>Table of contents</h2>
						</CardTitle>
						<CardDescription>
							Jump to a section of this Privacy Notice
						</CardDescription>
					</CardHeader>
					<CardContent>
						<nav aria-label="Privacy policy sections">
							<ol className="grid gap-x-8 gap-y-2 pl-5 sm:grid-cols-2">
								{tableOfContents.map(({ id, title }) => (
									<li
										key={id}
										className="list-decimal marker:text-foreground"
									>
										<PolicyLink href={`#${id}`}>
											{title}
										</PolicyLink>
									</li>
								))}
							</ol>
						</nav>
					</CardContent>
				</Card>

				<PolicySection
					id="infocollect"
					number={1}
					title="What information do we collect?"
				>
					<div
						id="personalinfo"
						className="flex scroll-mt-24 flex-col gap-4"
					>
						<PolicySubsection>
							Personal information you disclose to us
						</PolicySubsection>
						<ShortSummary>
							We collect personal information that you provide to
							us.
						</ShortSummary>
						<p>
							We collect personal information that you voluntarily
							provide to us when you express an interest in
							obtaining information about us or our products and
							Services, when you participate in activities on the
							Services, or otherwise when you contact us.
						</p>
						<p>
							<strong className="text-foreground">
								Sensitive Information.{' '}
							</strong>
							We do not process sensitive information.
						</p>
						<p>
							All personal information that you provide to us must
							be true, complete, and accurate, and you must notify
							us of any changes to such personal information.
						</p>
					</div>
					<div className="flex flex-col gap-4">
						<PolicySubsection>
							Information automatically collected
						</PolicySubsection>
						<ShortSummary>
							Some information — such as your Internet Protocol
							(IP) address and/or browser and device
							characteristics — is collected automatically when
							you visit our Services.
						</ShortSummary>
						<p>
							We automatically collect certain information when
							you visit, use, or navigate the Services. This
							information does not reveal your specific identity
							(like your name or contact information) but may
							include device and usage information, such as your
							IP address, browser and device characteristics,
							operating system, language preferences, referring
							URLs, device name, country, location, information
							about how and when you use our Services, and other
							technical information. This information is primarily
							needed to maintain the security and operation of our
							Services, and for our internal analytics and
							reporting purposes.
						</p>
						<p>The information we collect includes:</p>
						<ul className="flex list-disc flex-col gap-3 pl-6">
							<li>
								<strong className="text-foreground">
									Log and Usage Data.{' '}
								</strong>
								Log and usage data is service-related,
								diagnostic, usage, and performance information
								our servers automatically collect when you
								access or use our Services and which we record
								in log files. Depending on how you interact with
								us, this log data may include your IP address,
								device information, browser type, and settings
								and information about your activity in the
								Services (such as the date/time stamps
								associated with your usage, pages and files
								viewed, searches, and other actions you take
								such as which features you use), device event
								information (such as system activity, error
								reports (sometimes called &quot;crash
								dumps&quot;), and hardware settings).
							</li>
							<li>
								<strong className="text-foreground">
									Location Data.{' '}
								</strong>
								We collect location data such as information
								about your device&apos;s location, which can be
								either precise or imprecise. How much
								information we collect depends on the type and
								settings of the device you use to access the
								Services. For example, we may use GPS and other
								technologies to collect geolocation data that
								tells us your current location (based on your IP
								address). You can opt out of allowing us to
								collect this information either by refusing
								access to the information or by disabling your
								Location setting on your device. However, if you
								choose to opt out, you may not be able to use
								certain aspects of the Services.
							</li>
						</ul>
					</div>
				</PolicySection>

				<PolicySection
					id="infouse"
					number={2}
					title="How do we process your information?"
				>
					<ShortSummary>
						We process your information to provide, improve, and
						administer our Services, communicate with you, for
						security and fraud prevention, and to comply with law.
						We process the personal information for the following
						purposes listed below. We may also process your
						information for other purposes only with your prior
						explicit consent.
					</ShortSummary>
					<p>
						We process your personal information for a variety of
						reasons, depending on how you interact with our
						Services, including:
					</p>
					<ul className="list-disc pl-6">
						<li>
							<strong className="text-foreground">
								To save or protect an individual&apos;s vital
								interest.{' '}
							</strong>
							We may process your information when necessary to
							save or protect an individual’s vital interest, such
							as to prevent harm.
						</li>
					</ul>
				</PolicySection>

				<PolicySection
					id="legalbases"
					number={3}
					title="What legal bases do we rely on to process your information?"
				>
					<ShortSummary>
						We only process your personal information when we
						believe it is necessary and we have a valid legal reason
						(i.e., legal basis) to do so under applicable law, like
						with your consent, to comply with laws, to provide you
						with services to enter into or fulfill our contractual
						obligations, to protect your rights, or to fulfill our
						legitimate business interests.
					</ShortSummary>
					<div className="flex flex-col gap-4">
						<PolicySubsection>
							If you are located in the EU or UK, this section
							applies to you
						</PolicySubsection>
						<p>
							The General Data Protection Regulation (GDPR) and UK
							GDPR require us to explain the valid legal bases we
							rely on in order to process your personal
							information. As such, we may rely on the following
							legal bases to process your personal information:
						</p>
						<ul className="flex list-disc flex-col gap-3 pl-6">
							<li>
								<strong className="text-foreground">
									Consent.{' '}
								</strong>
								We may process your information if you have
								given us permission (i.e., consent) to use your
								personal information for a specific purpose. You
								can withdraw your consent at any time. Learn
								more about{' '}
								<PolicyLink href="#withdrawconsent">
									withdrawing your consent
								</PolicyLink>
								.
							</li>
							<li>
								<strong className="text-foreground">
									Legal Obligations.{' '}
								</strong>
								We may process your information where we believe
								it is necessary for compliance with our legal
								obligations, such as to cooperate with a law
								enforcement body or regulatory agency, exercise
								or defend our legal rights, or disclose your
								information as evidence in litigation in which
								we are involved.
							</li>
							<li>
								<strong className="text-foreground">
									Vital Interests.{' '}
								</strong>
								We may process your information where we believe
								it is necessary to protect your vital interests
								or the vital interests of a third party, such as
								situations involving potential threats to the
								safety of any person.
							</li>
						</ul>
					</div>
					<div className="flex flex-col gap-4">
						<PolicySubsection>
							If you are located in Canada, this section applies
							to you
						</PolicySubsection>
						<p>
							We may process your information if you have given us
							specific permission (i.e., express consent) to use
							your personal information for a specific purpose, or
							in situations where your permission can be inferred
							(i.e., implied consent). You can{' '}
							<PolicyLink href="#withdrawconsent">
								withdraw your consent
							</PolicyLink>{' '}
							at any time.
						</p>
						<p>
							In some exceptional cases, we may be legally
							permitted under applicable law to process your
							information without your consent, including, for
							example:
						</p>
						<ul className="flex list-disc flex-col gap-2 pl-6">
							<li>
								If collection is clearly in the interests of an
								individual and consent cannot be obtained in a
								timely way
							</li>
							<li>
								For investigations and fraud detection and
								prevention
							</li>
							<li>
								For business transactions provided certain
								conditions are met
							</li>
							<li>
								If it is contained in a witness statement and
								the collection is necessary to assess, process,
								or settle an insurance claim
							</li>
							<li>
								For identifying injured, ill, or deceased
								persons and communicating with next of kin
							</li>
							<li>
								If we have reasonable grounds to believe an
								individual has been, is, or may be victim of
								financial abuse
							</li>
							<li>
								If it is reasonable to expect collection and use
								with consent would compromise the availability
								or the accuracy of the information and the
								collection is reasonable for purposes related to
								investigating a breach of an agreement or a
								contravention of the laws of Canada or a
								province
							</li>
							<li>
								If disclosure is required to comply with a
								subpoena, warrant, court order, or rules of the
								court relating to the production of records
							</li>
							<li>
								If it was produced by an individual in the
								course of their employment, business, or
								profession and the collection is consistent with
								the purposes for which the information was
								produced
							</li>
							<li>
								If the collection is solely for journalistic,
								artistic, or literary purposes
							</li>
							<li>
								If the information is publicly available and is
								specified by the regulations
							</li>
							<li>
								We may disclose de-identified information for
								approved research or statistics projects,
								subject to ethics oversight and confidentiality
								commitments
							</li>
						</ul>
					</div>
				</PolicySection>

				<PolicySection
					id="whoshare"
					number={4}
					title="When and with whom do we share your personal information?"
				>
					<ShortSummary>
						We may share information in specific situations
						described in this section and/or with the following
						third parties.
					</ShortSummary>
					<p>
						We may need to share your personal information in the
						following situations:
					</p>
					<ul className="list-disc pl-6">
						<li>
							<strong className="text-foreground">
								Business Transfers.{' '}
							</strong>
							We may share or transfer your information in
							connection with, or during negotiations of, any
							merger, sale of company assets, financing, or
							acquisition of all or a portion of our business to
							another company.
						</li>
					</ul>
				</PolicySection>

				<PolicySection
					id="inforetain"
					number={5}
					title="How long do we keep your information?"
				>
					<ShortSummary>
						We keep your information for as long as necessary to
						fulfill the purposes outlined in this Privacy Notice
						unless otherwise required by law.
					</ShortSummary>
					<p>
						We will only keep your personal information for as long
						as it is necessary for the purposes set out in this
						Privacy Notice, unless a longer retention period is
						required or permitted by law (such as tax, accounting,
						or other legal requirements).
					</p>
					<p>
						When we have no ongoing legitimate business need to
						process your personal information, we will either delete
						or anonymize such information, or, if this is not
						possible (for example, because your personal information
						has been stored in backup archives), then we will
						securely store your personal information and isolate it
						from any further processing until deletion is possible.
					</p>
				</PolicySection>

				<PolicySection
					id="infosafe"
					number={6}
					title="How do we keep your information safe?"
				>
					<ShortSummary>
						We aim to protect your personal information through a
						system of organizational and technical security
						measures.
					</ShortSummary>
					<p>
						We have implemented appropriate and reasonable technical
						and organizational security measures designed to protect
						the security of any personal information we process.
						However, despite our safeguards and efforts to secure
						your information, no electronic transmission over the
						Internet or information storage technology can be
						guaranteed to be 100% secure, so we cannot promise or
						guarantee that hackers, cybercriminals, or other
						unauthorized third parties will not be able to defeat
						our security and improperly collect, access, steal, or
						modify your information. Although we will do our best to
						protect your personal information, transmission of
						personal information to and from our Services is at your
						own risk. You should only access the Services within a
						secure environment.
					</p>
				</PolicySection>

				<PolicySection
					id="infominors"
					number={7}
					title="Do we collect information from minors?"
				>
					<ShortSummary>
						We do not knowingly collect data from or market to
						children under 18 years of age or the equivalent age as
						specified by law in your jurisdiction.
					</ShortSummary>
					<p>
						We do not knowingly collect, solicit data from, or
						market to children under 18 years of age or the
						equivalent age as specified by law in your jurisdiction,
						nor do we knowingly sell such personal information. By
						using the Services, you represent that you are at least
						18 or the equivalent age as specified by law in your
						jurisdiction or that you are the parent or guardian of
						such a minor and consent to such minor dependent’s use
						of the Services. If we learn that personal information
						from users less than 18 years of age or the equivalent
						age as specified by law in your jurisdiction has been
						collected, we will deactivate the account and take
						reasonable measures to promptly delete such data from
						our records. If you become aware of any data we may have
						collected from children under age 18 or the equivalent
						age as specified by law in your jurisdiction, please
						contact us at __________.
					</p>
				</PolicySection>

				<PolicySection
					id="privacyrights"
					number={8}
					title="What are your privacy rights?"
				>
					<ShortSummary>
						Depending on your state of residence in the US or in
						some regions, such as the European Economic Area (EEA),
						United Kingdom (UK), Switzerland, and Canada, you have
						rights that allow you greater access to and control over
						your personal information. You may review, change, or
						terminate your account at any time, depending on your
						country, province, or state of residence.
					</ShortSummary>
					<p>
						In some regions (like the EEA, UK, Switzerland, and
						Canada), you have certain rights under applicable data
						protection laws. These may include the right (i) to
						request access and obtain a copy of your personal
						information, (ii) to request rectification or erasure;
						(iii) to restrict the processing of your personal
						information; (iv) if applicable, to data portability;
						and (v) not to be subject to automated decision-making.
						If a decision that produces legal or similarly
						significant effects is made solely by automated means,
						we will inform you, explain the main factors, and offer
						a simple way to request human review. In certain
						circumstances, you may also have the right to object to
						the processing of your personal information. You can
						make such a request by contacting us by using the
						contact details provided in the section &quot;
						<PolicyLink href="#contact">
							How can you contact us about this notice?
						</PolicyLink>
						&quot; below.
					</p>
					<p>
						We will consider and act upon any request in accordance
						with applicable data protection laws.
					</p>
					<p>
						If you are located in the UK and are unhappy with how we
						have handled your personal information, you can make a
						complaint directly to us. This is in addition to the
						rights you have under the UK General Data Protection
						Regulation and the Data Protection Act 2018.
					</p>
					<p>
						<strong className="text-foreground">
							How to contact us:
						</strong>
					</p>
					<PolicySubsection>
						What happens after you complain
					</PolicySubsection>
					<ul className="flex list-disc flex-col gap-2 pl-6">
						<li>
							We will acknowledge your complaint within 30 days of
							receiving it.
						</li>{' '}
						<li>
							We will investigate without unjustifiable or
							excessive delay.
						</li>{' '}
						<li>
							We will keep you informed of progress and explain
							the outcome.
						</li>
					</ul>
					<p>
						If you are not happy with our final response, you can
						refer your complaint to the Information Commissioner's
						Office, the UK supervisory authority.
					</p>
					<ul className="flex list-disc flex-col gap-2 pl-6">
						<li>
							<strong className="text-foreground">
								Website:
							</strong>{' '}
							<PolicyLink href="http://ico.org.uk/make-a-complaint">
								ico.org.uk/make-a-complaint
							</PolicyLink>
						</li>{' '}
						<li>
							<strong className="text-foreground">
								Helpline:
							</strong>{' '}
							0303 123 1113
						</li>{' '}
						<li>
							<strong className="text-foreground">Post:</strong>{' '}
							Information Commissioner's Office, Wycliffe House,
							Water Lane, Wilmslow, Cheshire, SK9 5AF
						</li>
					</ul>
					<p>
						If you are located in the EEA or UK and you believe we
						are unlawfully processing your personal information, you
						also have the right to complain to your{' '}
						<PolicyLink href="https://ec.europa.eu/justice/data-protection/bodies/authorities/index_en.htm">
							Member State data protection authority
						</PolicyLink>{' '}
						or{' '}
						<PolicyLink href="https://ico.org.uk/make-a-complaint/data-protection-complaints/data-protection-complaints/">
							UK data protection authority
						</PolicyLink>
						.
					</p>
					<p>
						If you are located in Switzerland, you may contact the{' '}
						<PolicyLink href="https://www.edoeb.admin.ch/edoeb/en/home.html">
							Federal Data Protection and Information Commissioner
						</PolicyLink>
						.
					</p>
					<p id="withdrawconsent" className="scroll-mt-24">
						<strong className="text-foreground">
							Withdrawing your consent:
						</strong>{' '}
						If we are relying on your consent to process your
						personal information, which may be express and/or
						implied consent depending on the applicable law, you
						have the right to withdraw your consent at any time. You
						can withdraw your consent at any time by contacting us
						by using the contact details provided in the section
						&quot;
						<PolicyLink href="#contact">
							How can you contact us about this notice?
						</PolicyLink>
						&quot; below.
					</p>
					<p>
						However, please note that this will not affect the
						lawfulness of the processing before its withdrawal nor,
						when applicable law allows, will it affect the
						processing of your personal information conducted in
						reliance on lawful processing grounds other than
						consent.
					</p>
				</PolicySection>

				<PolicySection
					id="DNT"
					number={9}
					title="Controls for Do-Not-Track features"
				>
					<p>
						Most web browsers and some mobile operating systems and
						mobile applications include a Do-Not-Track
						(&quot;DNT&quot;) feature or setting you can activate to
						signal your privacy preference not to have data about
						your online browsing activities monitored and collected.
						At this stage, no uniform technology standard for
						recognizing and implementing DNT signals has been
						finalized. As such, we do not currently respond to DNT
						browser signals or any other mechanism that
						automatically communicates your choice not to be tracked
						online. If a standard for online tracking is adopted
						that we must follow in the future, we will inform you
						about that practice in a revised version of this Privacy
						Notice.
					</p>
					<p>
						California law requires us to let you know how we
						respond to web browser DNT signals. Because there
						currently is not an industry or legal standard for
						recognizing or honoring DNT signals, we do not respond
						to them at this time.
					</p>
				</PolicySection>

				<PolicySection
					id="uslaws"
					number={10}
					title="Do United States residents have specific privacy rights?"
				>
					<ShortSummary>
						If you are a resident of California, Colorado,
						Connecticut, Delaware, Florida, Indiana, Iowa, Kentucky,
						Maryland, Minnesota, Montana, Nebraska, New Hampshire,
						New Jersey, Oregon, Rhode Island, Tennessee, Texas,
						Utah, or Virginia, you may have the right to request
						access to and receive details about the personal
						information we maintain about you and how we have
						processed it, correct inaccuracies, get a copy of, or
						delete your personal information. You may also have the
						right to withdraw your consent to our processing of your
						personal information. These rights may be limited in
						some circumstances by applicable law. More information
						is provided below.
					</ShortSummary>
					<PolicySubsection id="categories-heading">
						Categories of personal information we collect
					</PolicySubsection>
					<p>
						The table below shows the categories of personal
						information we have collected in the past twelve (12)
						months. The table includes illustrative examples of each
						category and does not reflect the personal information
						we collect from you. For a comprehensive inventory of
						all personal information we process, please refer to the
						section &quot;
						<PolicyLink href="#infocollect">
							What information do we collect?
						</PolicyLink>
						&quot;
					</p>
					<PersonalInformationTable />
					<p>
						We may also collect other personal information outside
						of these categories through instances where you interact
						with us in person, online, or by phone or mail in the
						context of:
					</p>
					<ul className="flex list-disc flex-col gap-2 pl-6">
						<li>
							Receiving help through our customer support
							channels;
						</li>
						<li>
							Participation in customer surveys or contests; and
						</li>
						<li>
							Facilitation in the delivery of our Services and to
							respond to your inquiries.
						</li>
					</ul>
					<p>
						We will use and retain the collected personal
						information as needed to provide the Services or for:
					</p>
					<ul className="flex list-disc flex-col gap-2 pl-6">
						<li>Category A - 1 Day</li>
						<li>Category G - 1 Day</li>
					</ul>
					<PolicySubsection>
						Sources of Personal Information
					</PolicySubsection>
					<p>
						Learn more about the sources of personal information we
						collect in &quot;
						<PolicyLink href="#infocollect">
							What information do we collect?
						</PolicyLink>
						&quot;
					</p>
					<PolicySubsection>
						How We Use and Share Personal Information
					</PolicySubsection>
					<p>
						Learn more about how we use your personal information in
						the section, &quot;
						<PolicyLink href="#infouse">
							How do we process your information?
						</PolicyLink>
						&quot;
					</p>
					<p>
						<strong className="text-foreground">
							Will your information be shared with anyone else?
						</strong>
					</p>
					<p>
						We may disclose your personal information with our
						service providers pursuant to a written contract between
						us and each service provider. Learn more about how we
						disclose personal information to in the section, &quot;
						<PolicyLink href="#whoshare">
							When and with whom do we share your personal
							information?
						</PolicyLink>
						&quot;
					</p>
					<p>
						We may use your personal information for our own
						business purposes, such as for undertaking internal
						research for technological development and
						demonstration. This is not considered to be
						&quot;selling&quot; of your personal information.
					</p>
					<p>
						We have not disclosed, sold, or shared any personal
						information to third parties for a business or
						commercial purpose in the preceding twelve (12) months.
						We will not sell or share personal information in the
						future belonging to website visitors, users, and other
						consumers.
					</p>
					<PolicySubsection>Your Rights</PolicySubsection>
					<p>
						You have rights under certain US state data protection
						laws. However, these rights are not absolute, and in
						certain cases, we may decline your request as permitted
						by law. These rights include:
					</p>
					<ul className="flex list-disc flex-col gap-2 pl-6">
						<li>
							<strong className="text-foreground">
								Right to know
							</strong>{' '}
							whether or not we are processing your personal data
						</li>
						<li>
							<strong className="text-foreground">
								Right to access{' '}
							</strong>
							your personal data
						</li>
						<li>
							<strong className="text-foreground">
								Right to correct{' '}
							</strong>
							inaccuracies in your personal data
						</li>
						<li>
							<strong className="text-foreground">
								Right to request
							</strong>{' '}
							the deletion of your personal data
						</li>
						<li>
							<strong className="text-foreground">
								Right to obtain a copy{' '}
							</strong>
							of the personal data you previously shared with us
						</li>
						<li>
							<strong className="text-foreground">
								Right to non-discrimination
							</strong>{' '}
							for exercising your rights
						</li>
						<li>
							<strong className="text-foreground">
								Right to opt out
							</strong>{' '}
							of the processing of your personal data if it is
							used for targeted advertising (or sharing as defined
							under California’s privacy law), the sale of
							personal data, or profiling in furtherance of
							decisions that produce legal or similarly
							significant effects (&quot;profiling&quot;)
						</li>
					</ul>
					<p>
						Depending upon the state where you live, you may also
						have the following rights:
					</p>
					<ul className="flex list-disc flex-col gap-2 pl-6">
						<li>
							Right to access the categories of personal data
							being processed (as permitted by applicable law,
							including the privacy law in Minnesota)
						</li>
						<li>
							Right to obtain a list of the categories of third
							parties to which we have disclosed personal data (as
							permitted by applicable law, including the privacy
							law in California, Delaware, and Maryland)
						</li>
						<li>
							Right to obtain a list of specific third parties to
							which we have disclosed personal data (as permitted
							by applicable law, including the privacy law in
							Minnesota and Oregon)
						</li>
						<li>
							Right to obtain a list of third parties to which we
							have sold personal data (as permitted by applicable
							law, including the privacy law in Connecticut)
						</li>
						<li>
							Right to review, understand, question, and depending
							on where you live, correct how personal data has
							been profiled (as permitted by applicable law,
							including the privacy law in Connecticut and
							Minnesota)
						</li>
						<li>
							Right to limit use and disclosure of sensitive
							personal data (as permitted by applicable law,
							including the privacy law in California)
						</li>
						<li>
							Right to opt out of the collection of sensitive data
							and personal data collected through the operation of
							a voice or facial recognition feature (as permitted
							by applicable law, including the privacy law in
							Florida)
						</li>
					</ul>
					<PolicySubsection>
						How to Exercise Your Rights
					</PolicySubsection>
					<p>
						To exercise these rights, you can contact us by
						submitting a{' '}
						<PolicyLink href={dataSubjectAccessRequestUrl}>
							data subject access request
						</PolicyLink>
						, by visiting{' '}
						<PolicyLink href="https://github.com/joshuamae/slugify.me/issues">
							https://github.com/joshuamae/slugify.me/issues
						</PolicyLink>
						, or by referring to the contact details at the bottom
						of this document.
					</p>
					<p>
						Under certain US state data protection laws, you can
						designate an authorized agent to make a request on your
						behalf. We may deny a request from an authorized agent
						that does not submit proof that they have been validly
						authorized to act on your behalf in accordance with
						applicable laws.
					</p>
					<PolicySubsection>Request Verification</PolicySubsection>
					<p>
						Upon receiving your request, we will need to verify your
						identity to determine you are the same person about whom
						we have the information in our system. We will only use
						personal information provided in your request to verify
						your identity or authority to make the request. However,
						if we cannot verify your identity from the information
						already maintained by us, we may request that you
						provide additional information for the purposes of
						verifying your identity and for security or
						fraud-prevention purposes.
					</p>
					<p>
						If you submit the request through an authorized agent,
						we may need to collect additional information to verify
						your identity before processing your request and the
						agent will need to provide a written and signed
						permission from you to submit such request on your
						behalf.
					</p>
					<PolicySubsection>Appeals</PolicySubsection>
					<p>
						Under certain US state data protection laws, if we
						decline to take action regarding your request, you may
						appeal our decision by emailing us at __________. We
						will inform you in writing of any action taken or not
						taken in response to the appeal, including a written
						explanation of the reasons for the decisions. If your
						appeal is denied, you may submit a complaint to your
						state attorney general.
					</p>
					<PolicySubsection>
						California &quot;Shine The Light&quot; Law
					</PolicySubsection>
					<p>
						California Civil Code Section 1798.83, also known as the
						&quot;Shine The Light&quot; law, permits our users who
						are California residents to request and obtain from us,
						once a year and free of charge, information about
						categories of personal information (if any) we disclosed
						to third parties for direct marketing purposes and the
						names and addresses of all third parties with which we
						shared personal information in the immediately preceding
						calendar year. If you are a California resident and
						would like to make such a request, please submit your
						request in writing to us by using the contact details
						provided in the section &quot;
						<PolicyLink href="#contact">
							How can you contact us about this notice?
						</PolicyLink>
						&quot;
					</p>
				</PolicySection>

				<PolicySection
					id="otherlaws"
					number={11}
					title="Do other regions have specific privacy rights?"
				>
					<ShortSummary>
						You may have additional rights based on the country you
						reside in.
					</ShortSummary>
					<PolicySubsection>
						Australia and New Zealand
					</PolicySubsection>
					<p>
						We collect and process your personal information under
						the obligations and conditions set by Australia's
						Privacy Act 1988 and New Zealand's Privacy Act 2020
						(Privacy Act).
					</p>
					<p>
						This Privacy Notice satisfies the notice requirements
						defined in both Privacy Acts, in particular: what
						personal information we collect from you, from which
						sources, for which purposes, and other recipients of
						your personal information.
					</p>
					<p>
						If you do not wish to provide the personal information
						necessary to fulfill their applicable purpose, it may
						affect our ability to provide our services, in
						particular:
					</p>
					<ul className="flex list-disc flex-col gap-2 pl-6">
						<li>
							offer you the products or services that you want
						</li>
						<li>respond to or help with your requests</li>
					</ul>
					<p>
						At any time, you have the right to request access to or
						correction of your personal information. You can make
						such a request by contacting us by using the contact
						details provided in the section &quot;
						<PolicyLink href="#request">
							How can you review, update, or delete the data we
							collect from you?
						</PolicyLink>
						&quot;
					</p>
					<p>
						If you believe we are unlawfully processing your
						personal information, you have the right to submit a
						complaint about a breach of the Australian Privacy
						Principles to the{' '}
						<PolicyLink href="https://www.oaic.gov.au/privacy/privacy-complaints/lodge-a-privacy-complaint-with-us">
							Office of the Australian Information Commissioner
						</PolicyLink>{' '}
						and a breach of New Zealand's Privacy Principles to the{' '}
						<PolicyLink href="https://www.privacy.org.nz/your-rights/making-a-complaint/">
							Office of New Zealand Privacy Commissioner
						</PolicyLink>
						.
					</p>
					<PolicySubsection>
						Republic of South Africa
					</PolicySubsection>
					<p>
						At any time, you have the right to request access to or
						correction of your personal information. You can make
						such a request by contacting us by using the contact
						details provided in the section &quot;
						<PolicyLink href="#request">
							How can you review, update, or delete the data we
							collect from you?
						</PolicyLink>
						&quot;
					</p>
					<p>
						If you are unsatisfied with the manner in which we
						address any complaint with regard to our processing of
						personal information, you can contact the office of the
						regulator, the details of which are:
					</p>
					<p>
						<PolicyLink href="https://inforegulator.org.za/">
							The Information Regulator (South Africa)
						</PolicyLink>
					</p>
					<p>
						General enquiries:{' '}
						<PolicyLink href="mailto:enquiries@inforegulator.org.za">
							enquiries@inforegulator.org.za
						</PolicyLink>
					</p>
					<p>
						Complaints (complete POPIA/PAIA form 5):{' '}
						<PolicyLink href="mailto:PAIAComplaints@inforegulator.org.za">
							PAIAComplaints@inforegulator.org.za
						</PolicyLink>{' '}
						&amp;{' '}
						<PolicyLink href="mailto:POPIAComplaints@inforegulator.org.za">
							POPIAComplaints@inforegulator.org.za
						</PolicyLink>
					</p>
				</PolicySection>

				<PolicySection
					id="policyupdates"
					number={12}
					title="Do we make updates to this notice?"
				>
					<ShortSummary>
						Yes, we will update this notice as necessary to stay
						compliant with relevant laws.
					</ShortSummary>
					<p>
						We may update this Privacy Notice from time to time. The
						updated version will be indicated by an updated
						&quot;Revised&quot; date at the top of this Privacy
						Notice. If we make material changes to this Privacy
						Notice, we may notify you either by prominently posting
						a notice of such changes or by directly sending you a
						notification. We encourage you to review this Privacy
						Notice frequently to be informed of how we are
						protecting your information.
					</p>
				</PolicySection>

				<PolicySection
					id="contact"
					number={13}
					title="How can you contact us about this notice?"
				>
					<p>
						If you have questions or comments about this notice, you
						may contact us by post at:
					</p>
					<address className="flex flex-col not-italic">
						<span>__________</span>
						<span>__________</span>
					</address>
				</PolicySection>

				<PolicySection
					id="request"
					number={14}
					title="How can you review, update, or delete the data we collect from you?"
				>
					<p>
						Based on the applicable laws of your country or state of
						residence in the US, you may have the right to request
						access to the personal information we collect from you,
						details about how we have processed it, correct
						inaccuracies, or delete your personal information. You
						may also have the right to withdraw your consent to our
						processing of your personal information. These rights
						may be limited in some circumstances by applicable law.
						To request to review, update, or delete your personal
						information, please fill out and submit a{' '}
						<PolicyLink href={dataSubjectAccessRequestUrl}>
							data subject access request
						</PolicyLink>
						.
					</p>
				</PolicySection>

				<p className="text-xs">
					This Privacy Policy was created using Termly&apos;s{' '}
					<PolicyLink href="https://termly.io/products/privacy-policy-generator/">
						Privacy Policy Generator
					</PolicyLink>
					.
				</p>
			</article>
		</main>
	);
}
