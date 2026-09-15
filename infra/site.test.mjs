import fs from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const template = fs.readFileSync(
	new URL('./site.yaml', import.meta.url),
	'utf8',
);
const source = template.match(
	/FunctionCode: !Sub\s+- \|\n([\s\S]*?)\n\s+- StagingAuthDigest:/,
)[1];
const credential =
	'Basic ' + Buffer.from('reviewer:example-test-password').toString('base64');
const digest = crypto.createHash('sha256').update(credential).digest('hex');

function handler(
	environment = 'staging',
	primaryDomain = '',
	authDigest = digest,
) {
	const code = source
		.replaceAll('${Environment}', environment)
		.replaceAll('${PrimaryDomainName}', primaryDomain)
		.replaceAll('${StagingAuthDigest}', authDigest);
	return vm.runInNewContext(code + '\nhandler;', { require: () => crypto });
}

function event(uri = '/', authorization, host = 'distribution.cloudfront.net') {
	return {
		request: {
			uri,
			headers: {
				host: { value: host },
				...(authorization
					? { authorization: { value: authorization } }
					: {}),
			},
			querystring: {},
		},
	};
}

describe('CloudFront staging password protection', () => {
	it.each([
		'/',
		'/index.html',
		'/about/',
		'/assets/app-abcdefgh.js',
		'/robots.txt',
		'/sitemap.xml',
		'/unknown',
	])('protects %s before rewriting or serving content', (uri) => {
		for (const auth of [
			undefined,
			'Basic d3Jvbmc6cGFzc3dvcmQ=',
			'Bearer token',
			'Basic ' + 'a'.repeat(2048),
		]) {
			const result = handler()(event(uri, auth));
			expect(result.statusCode).toBe(401);
			expect(result.headers['www-authenticate'].value).toBe(
				'Basic realm="Staging", charset="UTF-8"',
			);
			expect(result.headers['x-robots-tag'].value).toBe('noindex');
			expect(result.headers['cache-control'].value).toBe(
				'private, no-store',
			);
		}
	});

	it('accepts valid credentials, rewrites routes, and strips the authorization header', () => {
		for (const value of [
			credential,
			credential.replace('Basic', 'basic'),
		]) {
			const result = handler()(event('/about/', value));
			expect(result.uri).toBe('/about/index.html');
			expect(result.headers.authorization).toBeUndefined();
		}
		expect(
			handler()(event('/assets/app-abcdefgh.js', credential)).uri,
		).toBe('/assets/app-abcdefgh.js');
	});

	it('rejects duplicate headers and missing, unresolved, or malformed credential digests', () => {
		const duplicate = event('/', credential);
		duplicate.request.headers.authorization.multiValue = [
			{ value: credential },
			{ value: 'Basic invalid' },
		];
		expect(handler()(duplicate).statusCode).toBe(401);
		for (const invalid of [
			'',
			'not-a-digest',
			'{{resolve:secretsmanager:unresolved}}',
			'0'.repeat(64),
		]) {
			expect(
				handler('staging', '', invalid)(event('/', credential))
					.statusCode,
			).toBe(401);
		}
	});

	it('requires credentials before staging custom-domain redirects and marks those redirects noindex', () => {
		const run = handler('staging', 'staging.example.com');
		expect(run(event('/faq')).statusCode).toBe(401);
		const result = run(event('/faq', credential));
		expect(result.statusCode).toBe(301);
		expect(result.headers.location.value).toBe(
			'https://staging.example.com/faq',
		);
		expect(result.headers['x-robots-tag'].value).toBe('noindex');
	});

	it('preserves anonymous production access and canonical redirects with paths and repeated query parameters', () => {
		const run = handler('production', 'example.com', '');
		const input = event('/faq/');
		input.request.querystring = {
			q: { multiValue: [{ value: 'one' }, { value: 'two' }] },
		};
		const result = run(input);
		expect(result.statusCode).toBe(301);
		expect(result.headers.location.value).toBe(
			'https://example.com/faq/?q=one&q=two',
		);
		expect(result.headers['x-robots-tag']).toBeUndefined();
		expect(run(event('/faq', undefined, 'example.com')).uri).toBe(
			'/faq/index.html',
		);
		expect(handler('production')(event('/')).uri).toBe('/index.html');
	});

	it('scopes response restrictions to staging and attaches authentication to viewer requests', () => {
		expect(template).toMatch(
			/StagingResponseHeaders:\s+Type: AWS::CloudFront::ResponseHeadersPolicy\s+Condition: IsStaging/,
		);
		expect(template).toMatch(
			/ResponseHeadersPolicyId: !If\s+- IsStaging\s+- !Ref StagingResponseHeaders\s+- !Ref AWS::NoValue/,
		);
		expect(template).toMatch(
			/EventType: viewer-request\s+FunctionARN: !GetAtt PageRewrite.FunctionARN/,
		);
		expect(template).toContain('AutoPublish: true');
		expect(template).toContain(
			'authorizationSha256::${StagingAuthSecretVersionId}',
		);
		expect(template).not.toContain(credential);
	});
});
