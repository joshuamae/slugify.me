import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';
import {
	fileMetadata,
	findGnuTar,
	nextState,
	packageRelease,
	parseOptions,
	prune,
	request,
	retentionPlan,
	safePath,
	sha256,
	stagingAuthorization,
	validateArchiveEntries,
	validateManifest,
	verifyResponse,
	verifyPublished,
	verifyStagingAccess,
	withOperation,
} from './site-release.mjs';

const temporaryDirectories = [];
const commit = 'a'.repeat(40);
const releaseId = `${commit.slice(0, 12)}-123-1`;
const createdAt = '2026-09-15T12:00:00.000Z';

describe('staging access verification', () => {
	const credentials = 'reviewer:example-test-password';
	const authorization =
		'Basic ' + Buffer.from(credentials).toString('base64');

	it('checks access before deployment, allowing an empty origin but rejecting redirects, outages, or missing restrictions', () => {
		const cfg = {
			environment: 'staging',
			url: 'https://staging.example.com',
			authorization,
		};
		const headers = {
			'x-robots-tag': 'noindex',
			'cache-control': 'private, no-store',
		};
		for (const status of [200, 403, 404]) {
			expect(() =>
				verifyStagingAccess(cfg, '', (_url, _directory, auth) => ({
					status: auth ? status : 401,
					headers,
				})),
			).not.toThrow();
		}
		for (const status of [301, 401, 500, 503]) {
			expect(() =>
				verifyStagingAccess(cfg, '', (_url, _directory, auth) => ({
					status: auth ? status : 401,
					headers,
				})),
			).toThrow('rejected or the site is unavailable');
		}
		expect(() =>
			verifyStagingAccess(cfg, '', () => ({ status: 200, headers })),
		).toThrow('require authentication');
		expect(() =>
			verifyStagingAccess(cfg, '', (_url, _directory, auth) => ({
				status: auth ? 200 : 401,
				headers: {},
			})),
		).toThrow('disable indexing');
	});

	it('requires staging credentials and never enables them for production', () => {
		expect(stagingAuthorization('staging', credentials)).toBe(
			authorization,
		);
		expect(stagingAuthorization('production', credentials)).toBeUndefined();
		for (const invalid of [
			'',
			':unique-test-secret',
			'reviewer:',
			'unique-test-secret',
			'user:secret\n',
			'user:' + 'x'.repeat(2048),
		]) {
			let message;
			try {
				stagingAuthorization('staging', invalid);
			} catch (error) {
				message = error.message;
			}
			expect(message).toMatch(/STAGING_BASIC_AUTH/);
			if (invalid) expect(message).not.toContain(invalid);
		}
	});

	it('passes authorization over stdin, disables curlrc, and refuses redirects and header injection', () => {
		const directory = path.dirname(fixture().source);
		const run = (program, args, options) => {
			expect(program).toBe('curl');
			expect(args[0]).toBe('--disable');
			expect(args).toContain('=https');
			expect(args).not.toContain('--location');
			expect(args.join(' ')).not.toContain(authorization);
			expect(options.input).toBe(
				`header = "Authorization: ${authorization}"\n`,
			);
			fs.writeFileSync(
				path.join(directory, 'headers'),
				'HTTP/2 200\r\ncontent-type: text/plain\r\n\r\n',
			);
			fs.writeFileSync(path.join(directory, 'body'), 'ok');
			return '200';
		};
		expect(
			request(
				'https://staging.example.com/',
				directory,
				authorization,
				run,
			).status,
		).toBe(200);
		expect(() =>
			request(
				'https://staging.example.com/',
				directory,
				'Basic bad\nurl = "https://other.example.com"',
				run,
			),
		).toThrow('Invalid Basic');
	});

	function verificationFixture(
		environment = 'staging',
		override = () => undefined,
	) {
		const { source, destination } = fixture();
		const manifest = packageRelease(
			source,
			destination,
			releaseId,
			commit,
			createdAt,
		);
		const cfg = {
			environment,
			authorization,
			url: 'https://staging.example.com',
			bucket: 'example-bucket',
			region: 'us-east-1',
		};
		const calls = [];
		const fetch = (url, _directory, auth) => {
			calls.push({ url, auth });
			const replaced = override(url, auth);
			if (replaced) return replaced;
			if (url.includes('.s3.')) return { status: 403 };
			if (environment === 'staging' && auth !== authorization)
				return {
					status: 401,
					headers: {
						'www-authenticate':
							'Basic realm="Staging", charset="UTF-8"',
						'cache-control': 'private, no-store',
						'x-robots-tag': 'noindex',
					},
				};
			let filename = new URL(url).pathname
				.replace(/^\//, '')
				.replace(/\/$/, '');
			if (!filename) filename = 'index.html';
			else if (['about', 'faq', 'privacy-policy'].includes(filename))
				filename += '/index.html';
			const file = manifest.files.find((item) => item.path === filename);
			if (!file) return { status: 404 };
			return {
				status: 200,
				body: fs.readFileSync(path.join(source, filename)),
				headers: {
					'content-type': file.contentType,
					'cache-control':
						environment === 'staging'
							? 'private, no-store'
							: file.cacheControl,
					...(environment === 'staging'
						? { 'x-robots-tag': 'noindex' }
						: {}),
				},
			};
		};
		return { cfg, manifest, fetch, calls };
	}

	it('checks anonymous and incorrect credentials after every authorized file/route, without sending credentials to S3', () => {
		const { cfg, manifest, fetch, calls } = verificationFixture();
		const evidence = verifyPublished(cfg, manifest, '', fetch);
		for (const item of evidence) {
			expect(item.anonymousStatus).toBe(401);
			expect(item.incorrectCredentialsStatus).toBe(401);
			const index = calls.findIndex(
				(call) => call.url === cfg.url + item.path,
			);
			expect(calls[index].auth).toBe(authorization);
			expect(calls[index + 1].auth).toBeUndefined();
			expect(calls[index + 2].auth).not.toBe(authorization);
		}
		expect(calls.at(-1).url).toContain('.s3.');
		expect(calls.at(-1).auth).toBeUndefined();
		expect(JSON.stringify(evidence)).not.toContain(authorization);
	});

	it('fails verification if a warmed asset becomes accessible without credentials', () => {
		const { cfg, manifest, fetch } = verificationFixture(
			'staging',
			(url, auth) =>
				url.includes('/assets/') && !auth ? { status: 200 } : undefined,
		);
		expect(() => verifyPublished(cfg, manifest, '', fetch)).toThrow(
			'unauthorized access must fail',
		);
	});

	it('keeps production verification anonymous even if credentials were supplied', () => {
		const { cfg, manifest, fetch, calls } =
			verificationFixture('production');
		verifyPublished(cfg, manifest, '', fetch);
		expect(calls.every((call) => call.auth === undefined)).toBe(true);
	});

	it('rejects missing staging noindex and accidental production noindex without weakening byte checks', () => {
		const body = Buffer.from('page');
		const file = {
			path: 'index.html',
			size: body.length,
			sha256: sha256(body),
			...fileMetadata('index.html'),
		};
		const response = {
			status: 200,
			body,
			headers: {
				'content-type': file.contentType,
				'cache-control': 'private, no-store',
				'x-robots-tag': 'noindex',
			},
		};
		expect(() => verifyResponse(response, file, 'staging')).not.toThrow();
		expect(() =>
			verifyResponse(
				{ ...response, body: Buffer.from('evil') },
				file,
				'staging',
			),
		).toThrow('contents');
		delete response.headers['x-robots-tag'];
		expect(() => verifyResponse(response, file, 'staging')).toThrow(
			'indexing',
		);
		response.headers['cache-control'] = file.cacheControl;
		response.headers['x-robots-tag'] = 'noindex';
		expect(() => verifyResponse(response, file, 'production')).toThrow(
			'production must remain indexable',
		);
	});
});

it('parses checksum options and refuses misspelled, duplicate or misplaced flags', () => {
	expect(
		parseOptions('publish', ['--manifest-sha256', 'a'.repeat(64)]),
	).toEqual({ 'manifest-sha256': 'a'.repeat(64) });
	expect(
		parseOptions('import-legacy', ['--archive-sha256', 'b'.repeat(64)]),
	).toEqual({ 'archive-sha256': 'b'.repeat(64) });
	expect(() => parseOptions('rollback', ['--apply'])).toThrow();
	expect(() =>
		parseOptions('verify', ['--release-id', '--output', 'x']),
	).toThrow();
	expect(() =>
		parseOptions('verify', ['--release-id', 'a', '--release-id', 'b']),
	).toThrow();
});

/** Create an isolated build tree with deployable files and excluded local metadata. */
function fixture() {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'release-test-'));
	temporaryDirectories.push(root);
	const source = path.join(root, 'source');
	const destination = path.join(root, 'release');
	for (const file of [
		'index.html',
		'about/index.html',
		'faq/index.html',
		'privacy-policy/index.html',
		'robots.txt',
		'sitemap.xml',
		'assets/app-abcdefgh.js',
		'.vite/manifest.json',
		'.DS_Store',
		'assets/.DS_Store',
	]) {
		fs.mkdirSync(path.dirname(path.join(source, file)), {
			recursive: true,
		});
		fs.writeFileSync(path.join(source, file), `Contents of ${file}`);
	}
	return { source, destination };
}

/** Simulate S3 state revisions so locking tests detect stale conditional writes. */
function memoryStore(value) {
	let state = structuredClone(value);
	let revision = 1;
	return {
		getState: () => ({
			value: structuredClone(state),
			etag: String(revision),
		}),
		putState(next, etag) {
			if (etag !== String(revision))
				throw new Error('Concurrent modification');
			state = structuredClone(next);
			revision++;
			return String(revision);
		},
	};
}

afterEach(() => {
	for (const directory of temporaryDirectories.splice(0)) {
		fs.rmSync(directory, { recursive: true, force: true });
	}
});

describe('release package integrity', () => {
	it('requires supported GNU tar and reports a clear missing-toolchain error', () => {
		expect(
			findGnuTar((program) =>
				program === 'gtar' ? 'tar (GNU tar) 1.35' : 'bsdtar 3.5',
			),
		).toBe('gtar');
		expect(
			findGnuTar((program) =>
				program === 'gtar' ? 'bsdtar 3.5' : 'tar (GNU tar) 1.28',
			),
		).toBe('tar');
		expect(() => findGnuTar(() => 'tar (GNU tar) 1.27')).toThrow(
			'GNU tar 1.28',
		);
		expect(() => findGnuTar(() => 'bsdtar 3.5')).toThrow('GNU tar 1.28');
		expect(() =>
			findGnuTar(() => {
				throw new Error('ENOENT');
			}),
		).toThrow('brew install gnu-tar');
	});

	it('produces identical archives and manifests despite changed mtimes, permissions and creation order', () => {
		const first = fixture();
		const second = fixture();
		const files = ['robots.txt', 'sitemap.xml', 'index.html'];
		for (const file of files.reverse()) {
			const filename = path.join(second.source, file);
			const contents = fs.readFileSync(filename);
			fs.unlinkSync(filename);
			fs.writeFileSync(filename, contents, { mode: 0o700 });
			fs.utimesSync(
				filename,
				new Date('2001-01-01'),
				new Date('2001-01-01'),
			);
		}
		packageRelease(
			first.source,
			first.destination,
			releaseId,
			commit,
			createdAt,
		);
		packageRelease(
			second.source,
			second.destination,
			releaseId,
			commit,
			createdAt,
		);
		for (const file of ['site.tar.gz', 'manifest.json', 'SHA256SUMS']) {
			expect(fs.readFileSync(path.join(first.destination, file))).toEqual(
				fs.readFileSync(path.join(second.destination, file)),
			);
		}
		const manifest = JSON.parse(
			fs.readFileSync(
				path.join(first.destination, 'manifest.json'),
				'utf8',
			),
		);
		expect(manifest.createdAt).toBe(createdAt);
		fs.writeFileSync(
			path.join(second.source, 'index.html'),
			'Changed content',
		);
		packageRelease(
			second.source,
			second.destination,
			releaseId,
			commit,
			createdAt,
		);
		expect(
			fs.readFileSync(path.join(first.destination, 'site.tar.gz')),
		).not.toEqual(
			fs.readFileSync(path.join(second.destination, 'site.tar.gz')),
		);
	});

	it('rejects an absent or ambiguous creation time before writing the package', () => {
		const { source, destination } = fixture();
		for (const timestamp of [undefined, 'invalid', '2026-09-15T12:00:00']) {
			expect(() =>
				packageRelease(
					source,
					destination,
					releaseId,
					commit,
					timestamp,
				),
			).toThrow();
			expect(fs.existsSync(destination)).toBe(false);
		}
	});

	it('records the full commit, archive hash, every deployable file and explicit metadata', () => {
		const { source, destination } = fixture();
		const manifest = packageRelease(
			source,
			destination,
			releaseId,
			commit,
			createdAt,
		);
		expect(manifest.files).toHaveLength(7);
		expect(
			manifest.files.some((file) => file.path.startsWith('.vite/')),
		).toBe(false);
		expect(manifest.archiveSha256).toBe(
			sha256(fs.readFileSync(path.join(destination, 'site.tar.gz'))),
		);
		for (const file of manifest.files) {
			expect(file.sha256).toBe(
				sha256(fs.readFileSync(path.join(source, file.path))),
			);
		}
		expect(manifest.commitSha).toBe(commit);
	});

	it('rejects duplicate files, incomplete pages, wrong commit identity and altered metadata', () => {
		const { source, destination } = fixture();
		const manifest = packageRelease(
			source,
			destination,
			releaseId,
			commit,
			createdAt,
		);
		const duplicate = structuredClone(manifest);
		duplicate.files.push(duplicate.files[0]);
		expect(() => validateManifest(duplicate)).toThrow();
		expect(() =>
			validateManifest({
				...manifest,
				files: manifest.files.filter(
					(file) => file.path !== 'faq/index.html',
				),
			}),
		).toThrow();
		expect(() =>
			validateManifest({ ...manifest, commitSha: 'b'.repeat(40) }),
		).toThrow();
		const stale = structuredClone(manifest);
		stale.files.find((file) => file.path === 'index.html').cacheControl =
			'public,max-age=31536000,immutable';
		expect(() => validateManifest(stale)).toThrow();
	});

	it('rejects symlinks in build output', () => {
		const { source, destination } = fixture();
		fs.symlinkSync(
			path.join(source, 'index.html'),
			path.join(source, 'link.html'),
		);
		expect(() =>
			packageRelease(source, destination, releaseId, commit, createdAt),
		).toThrow(/Symlink/);
	});

	it.each([
		'../index.html',
		'/index.html',
		'about/../../outside',
		'a\\b',
		'a\nb',
		'a/./b',
		'a//b',
	])('rejects unsafe path %s', (value) => {
		expect(() => safePath(value)).toThrow();
	});

	it('rejects archive traversal and links before extraction', () => {
		expect(() =>
			validateArchiveEntries(
				'./\n./about/\n./about/index.html\n',
				'drwxr-xr-x directory\n-rw-r--r-- file',
			),
		).not.toThrow();
		expect(() =>
			validateArchiveEntries('../outside\n', '-rw-r--r-- file'),
		).toThrow();
		expect(() =>
			validateArchiveEntries(
				'./file\n',
				'lrwxrwxrwx file -> /tmp/outside',
			),
		).toThrow();
		expect(() =>
			validateArchiveEntries(
				'./file\n',
				'hrw-r--r-- file link to outside',
			),
		).toThrow();
	});
});

describe('cache and content verification', () => {
	it('gives only hashed assets a long cache lifetime and rejects unrecognized types', () => {
		expect(fileMetadata('assets/app-abcdefgh.js').cacheControl).toContain(
			'immutable',
		);
		expect(fileMetadata('index.html').cacheControl).toBe(
			'no-cache,max-age=0,must-revalidate',
		);
		expect(fileMetadata('favicon.ico').contentType).toBe(
			'image/vnd.microsoft.icon',
		);
		expect(() => fileMetadata('assets/app.js')).toThrow();
		expect(() => fileMetadata('file.unknown')).toThrow();
	});

	it('detects stale content, wrong MIME types, wrong cache headers and successful HTML errors', () => {
		const body = Buffer.from('correct release');
		const file = {
			path: 'index.html',
			size: body.length,
			sha256: sha256(body),
			...fileMetadata('index.html'),
		};
		const response = {
			status: 200,
			body,
			headers: {
				'content-type': 'text/html; charset=utf-8',
				'cache-control': file.cacheControl,
			},
		};
		expect(() => verifyResponse(response, file)).not.toThrow();
		expect(() =>
			verifyResponse(
				{ ...response, body: Buffer.from('another release') },
				file,
			),
		).toThrow();
		expect(() =>
			verifyResponse({ ...response, status: 404 }, file),
		).toThrow();
		expect(() =>
			verifyResponse(
				{
					...response,
					headers: {
						...response.headers,
						'content-type': 'application/json',
					},
				},
				file,
			),
		).toThrow();
		expect(() =>
			verifyResponse(
				{
					...response,
					headers: {
						...response.headers,
						'cache-control': 'public,max-age=86400',
					},
				},
				file,
			),
		).toThrow();
	});
});

describe('release state and operation serialization', () => {
	const initial = {
		active: { releaseId: 'current' },
		previous: { releaseId: 'previous' },
		pending: null,
	};

	it('advances active and previous only after the operation succeeds', () => {
		const store = memoryStore(initial);
		withOperation(store, { id: 'publish-1' }, (state) => {
			expect(store.getState().value.active.releaseId).toBe('current');
			return {
				state: nextState(
					state,
					{ releaseId: 'next' },
					{ verified: true },
				),
				result: {},
			};
		});
		expect(store.getState().value.active.releaseId).toBe('next');
		expect(store.getState().value.previous.releaseId).toBe('current');
		expect(store.getState().value.pending).toBeNull();
	});

	it('retains both known-good references and records a failed partial upload', () => {
		const store = memoryStore(initial);
		expect(() =>
			withOperation(store, { id: 'failure' }, () => {
				throw new Error('Verification failed');
			}),
		).toThrow('Verification failed');
		expect(store.getState().value.active).toEqual(initial.active);
		expect(store.getState().value.previous).toEqual(initial.previous);
		expect(store.getState().value.pending).toMatchObject({
			id: 'failure',
			status: 'failed',
		});
		withOperation(store, { id: 'recovery' }, (state) => ({
			state: nextState(state, initial.previous, {}),
			result: {},
		}));
		expect(store.getState().value.active).toEqual(initial.previous);
	});

	it('blocks another operation after interruption unless the exact recovery ID is supplied', () => {
		const store = memoryStore({
			...initial,
			pending: { id: 'interrupted', status: 'running' },
		});
		let uploads = 0;
		const callback = (state) => {
			uploads++;
			return { state: { ...state, pending: null }, result: {} };
		};
		expect(() => withOperation(store, { id: 'other' }, callback)).toThrow();
		expect(() =>
			withOperation(store, { id: 'other' }, callback, 'wrong'),
		).toThrow();
		expect(uploads).toBe(0);
		withOperation(store, { id: 'other' }, callback, 'interrupted');
		expect(uploads).toBe(1);
	});

	it('does not start uploads when the conditional lock loses a race', () => {
		const store = memoryStore(initial);
		store.putState = () => {
			throw new Error('Concurrent modification');
		};
		let called = false;
		expect(() =>
			withOperation(store, { id: 'race' }, () => {
				called = true;
			}),
		).toThrow('Concurrent modification');
		expect(called).toBe(false);
	});

	it('keeps the previous release when retrying the already active release', () => {
		expect(nextState(initial, initial.active, {}).previous).toEqual(
			initial.previous,
		);
	});
});

describe('retention safeguards', () => {
	it('reports requested apply mode when no archives are eligible without attempting deletion', () => {
		const calls = [];
		const store = {
			aws(args) {
				calls.push(args);
				return {};
			},
			getState: () => ({
				value: {
					active: { releaseId: 'current' },
					previous: null,
					pending: null,
				},
			}),
		};
		for (const apply of [false, true]) {
			const result = prune({ bucket: 'test-bucket' }, store, apply);
			expect(result.dryRun).toBe(!apply);
			expect(result.candidates).toEqual([]);
			expect(result.preserved).toContain('active');
		}
		expect(calls).toEqual(
			Array(2).fill([
				's3api',
				'list-objects-v2',
				'--bucket',
				'test-bucket',
				'--prefix',
				'releases/v1/',
			]),
		);
	});
	const now = Date.parse('2026-09-15T12:00:00Z');
	const manifests = Array.from({ length: 15 }, (_, index) => ({
		releaseId: `release-${index}`,
		createdAt: new Date(now - (40 + index) * 86400000).toISOString(),
	}));

	it('protects active, previous, newest ten and every release younger than thirty days', () => {
		const state = {
			active: { releaseId: 'release-14' },
			previous: { releaseId: 'release-13' },
			pending: null,
		};
		const recent = {
			releaseId: 'recent',
			createdAt: new Date(now).toISOString(),
		};
		const plan = retentionPlan([...manifests, recent], state, now);
		expect(plan).toEqual([
			'release-9',
			'release-10',
			'release-11',
			'release-12',
		]);
		expect(
			retentionPlan(
				manifests.map((item) => ({
					...item,
					createdAt: new Date(now).toISOString(),
				})),
				state,
				now,
			),
		).toEqual([]);
	});

	it('refuses cleanup without verified state or during a pending operation', () => {
		expect(() => retentionPlan(manifests, { active: null }, now)).toThrow();
		expect(() =>
			retentionPlan(
				manifests,
				{
					active: { releaseId: 'current' },
					pending: { status: 'running' },
				},
				now,
			),
		).toThrow();
	});
});

describe('workflow output integrity', () => {
	it('writes both hashes only after successful extraction and validation', () => {
		const workflow = fs.readFileSync(
			new URL(
				'../.github/workflows/deploy-staging.yaml',
				import.meta.url,
			),
			'utf8',
		);
		const start = workflow.indexOf('          archive_sha256=');
		const end = workflow.indexOf("          printf 'release-id=", start);
		expect(start).toBeGreaterThan(0);
		expect(end).toBeGreaterThan(start);
		const script = workflow.slice(start, end);
		const { destination } = fixture();
		fs.mkdirSync(destination);
		const output = path.join(destination, 'outputs');
		for (const contents of [
			'{',
			'{}',
			JSON.stringify({ archiveSha256: 'a'.repeat(64) }),
			JSON.stringify({
				archiveSha256: 'invalid',
				manifestSha256: 'b'.repeat(64),
			}),
			JSON.stringify({
				archiveSha256: 'a'.repeat(64),
				manifestSha256: 'b'.repeat(64),
			}),
		]) {
			fs.writeFileSync(
				path.join(destination, 'release-info.json'),
				contents,
			);
			fs.writeFileSync(output, '');
			const result = spawnSync('bash', ['-c', script], {
				encoding: 'utf8',
				env: {
					...process.env,
					RUNNER_TEMP: destination,
					GITHUB_OUTPUT: output,
				},
			});
			if (
				contents.includes('"manifestSha256":"' + 'b'.repeat(64)) &&
				contents.includes('"archiveSha256":"' + 'a'.repeat(64))
			) {
				expect(result.status, result.stderr).toBe(0);
				expect(fs.readFileSync(output, 'utf8')).toBe(
					`archive-sha256=${'a'.repeat(64)}\nmanifest-sha256=${'b'.repeat(64)}\n`,
				);
			} else {
				expect(result.status).not.toBe(0);
				expect(fs.readFileSync(output, 'utf8')).toBe('');
			}
		}
	});
});
