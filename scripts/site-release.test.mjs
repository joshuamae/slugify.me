import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
	fileMetadata,
	nextState,
	packageRelease,
	parseOptions,
	retentionPlan,
	safePath,
	sha256,
	validateArchiveEntries,
	validateManifest,
	verifyResponse,
	withOperation,
} from './site-release.mjs';

const temporaryDirectories = [];
const commit = 'a'.repeat(40);
const releaseId = `${commit.slice(0, 12)}-123-1`;

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
	it('records the full commit, archive hash, every deployable file and explicit metadata', () => {
		const { source, destination } = fixture();
		const manifest = packageRelease(source, destination, releaseId, commit);
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
		const manifest = packageRelease(source, destination, releaseId, commit);
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
			packageRelease(source, destination, releaseId, commit),
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
