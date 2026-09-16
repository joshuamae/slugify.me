import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '~/components/ui/card';
import { Separator } from '~/components/ui/separator';

const pageTitle = 'Privacy Policy | slugify.me';
const pageDescription =
	'Learn how slugify.me handles text, AWS hosting requests, and browser storage';
const canonicalUrl = 'https://slugify.me/privacy-policy';

export default function PrivacyPolicy() {
	return (
		<main className="flex flex-1 px-4 py-10 sm:px-6 sm:py-18">
			<title>{pageTitle}</title>
			<meta name="description" content={pageDescription} />
			<link rel="canonical" href={canonicalUrl} />
			<meta property="og:title" content={pageTitle} />
			<meta property="og:description" content={pageDescription} />
			<meta property="og:url" content={canonicalUrl} />
			<meta name="twitter:title" content={pageTitle} />
			<meta name="twitter:description" content={pageDescription} />

			<article className="mx-auto flex min-w-0 w-full max-w-3xl flex-col gap-8 text-sm leading-7 text-muted-foreground sm:text-base">
				<Card role="region" aria-labelledby="privacy-tldr">
					<CardHeader>
						<CardTitle id="privacy-tldr">TL;DR</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						<p>
							Your text and generated slugs stay in your browser.
							The app does not upload or save them, and its code
							is open source.
						</p>
						<p>
							The site runs on Amazon Web Services (AWS). Amazon
							S3 stores the website files, and Amazon CloudFront
							delivers them. To serve pages, AWS processes your IP
							address and normal web request details, such as the
							requested URL and browser headers.
						</p>
						<p>
							CloudFront and S3 visitor access logs are disabled.
							Amazon CloudWatch monitors aggregate traffic and
							errors. AWS may retain separate service and security
							records.
						</p>
						<p>
							I haven't added any ads or tracking analytics to
							this project.
						</p>
					</CardContent>
				</Card>

				<Card aria-labelledby="privacy-heading">
					<CardHeader>
						<CardTitle>
							<h1 id="privacy-heading">Privacy Policy</h1>
						</CardTitle>
						<CardDescription className="flex flex-col gap-2">
							<p>
								This page explains how the site handles text,
								web requests, and browser storage.
							</p>
							<p>
								Last updated{' '}
								<time dateTime="2026-09-16">
									September 16, 2026
								</time>
							</p>
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-6">
						<section
							aria-labelledby="text-heading"
							className="flex flex-col gap-2"
						>
							<h2
								id="text-heading"
								className="font-heading font-medium"
							>
								Text you enter
							</h2>
							<p>
								Text is converted into slugs in your browser.
								The app does not upload or save your text or
								generated slugs. Selecting{' '}
								<strong>Copy generated slug</strong> writes the
								result to your clipboard.
							</p>
						</section>

						<Separator />

						<section
							aria-labelledby="hosting-heading"
							className="flex flex-col gap-2"
						>
							<h2
								id="hosting-heading"
								className="font-heading font-medium"
							>
								Hosting and monitoring
							</h2>
							<p>
								Amazon S3 stores the website files, and Amazon
								CloudFront delivers them. AWS processes your IP
								address, requested URL, and browser headers to
								serve requests.
							</p>
							<p>
								CloudFront and S3 visitor access logs and Route
								53 query logs are disabled. CloudWatch monitors
								aggregate traffic and errors. AWS may retain
								separate service and security records.
							</p>
						</section>

						<Separator />

						<section
							aria-labelledby="storage-heading"
							className="flex flex-col gap-2"
						>
							<h2
								id="storage-heading"
								className="font-heading font-medium"
							>
								Browser storage
							</h2>
							<p>
								The site uses browser session storage to
								remember scroll positions during navigation.
								That storage does not save your text or slugs.
								The site includes no ads or tracking analytics.
							</p>
						</section>
					</CardContent>
					<CardFooter>
						<section
							aria-labelledby="contact-heading"
							className="flex min-w-0 flex-col gap-2"
						>
							<h2
								id="contact-heading"
								className="font-heading font-medium"
							>
								Privacy questions
							</h2>
							<p>
								For privacy questions, email{' '}
								<a
									href="mailto:privacy@slugify.me"
									className="font-medium text-primary underline underline-offset-4 [overflow-wrap:anywhere]"
								>
									privacy@slugify.me
								</a>
								.
							</p>
						</section>
					</CardFooter>
				</Card>
			</article>
		</main>
	);
}
