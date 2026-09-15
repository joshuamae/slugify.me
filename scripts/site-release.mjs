import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const releasePattern = /^[a-f0-9]{12}-(?:[0-9]+-[0-9]+|[0-9]{8}T[0-9]{6}Z)$/;
const shaPattern = /^[a-f0-9]{64}$/;
const prefix = 'releases/v1/';
const stateKey = 'releases/state.json';
const fresh = 'no-cache,max-age=0,must-revalidate';
const immutable = 'public,max-age=31536000,immutable';
const pages = {
	'/': 'index.html',
	'/about': 'about/index.html',
	'/faq': 'faq/index.html',
	'/privacy-policy': 'privacy-policy/index.html',
};

/** Return the lowercase SHA-256 digest used to compare artifact and file bytes. */
export const sha256 = (value) =>
	createHash('sha256').update(value).digest('hex');

/** Run a tool without a shell and throw on launch failure or nonzero exit. */
function command(program, args, options = {}) {
	const result = spawnSync(program, args, {
		encoding: 'utf8',
		maxBuffer: 16 * 1024 * 1024,
		env: { ...process.env, AWS_PAGER: '', COPYFILE_DISABLE: '1' },
		...options,
	});
	if (result.error) throw result.error;
	if (result.status !== 0) {
		throw new Error(`${program} failed: ${result.stderr || result.stdout}`);
	}
	return result.stdout;
}

/** Run synchronous work in an isolated directory and remove it even on failure. */
function temporary(callback) {
	const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'site-release-'));
	try {
		return callback(directory);
	} finally {
		fs.rmSync(directory, { recursive: true, force: true });
	}
}

/** Reject absolute paths, traversal and unsupported characters before filesystem or S3 use. */
export function safePath(value) {
	assert.equal(typeof value, 'string');
	assert.match(value, /^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/);
	assert.ok(value.split('/').every((part) => part !== '.' && part !== '..'));
	return value;
}

/** Assign explicit MIME/cache metadata and require fingerprinted names under assets/. */
export function fileMetadata(filename) {
	safePath(filename);
	const types = {
		'.html': 'text/html; charset=utf-8',
		'.js': 'text/javascript; charset=utf-8',
		'.css': 'text/css; charset=utf-8',
		'.json': 'application/json',
		'.txt': 'text/plain; charset=utf-8',
		'.xml': 'application/xml',
		'.svg': 'image/svg+xml',
		'.png': 'image/png',
		'.ico': 'image/vnd.microsoft.icon',
		'.jpg': 'image/jpeg',
		'.jpeg': 'image/jpeg',
		'.webp': 'image/webp',
		'.woff': 'font/woff',
		'.woff2': 'font/woff2',
	};
	const contentType = types[path.extname(filename)];
	assert.ok(contentType, `Define a content type for ${filename}`);
	const hashed = filename.startsWith('assets/');
	if (hashed) assert.match(filename, /-[A-Za-z0-9_-]{8,}\.[a-z0-9]+$/);
	return { contentType, cacheControl: hashed ? immutable : fresh };
}

/** List deployable regular files in order; reject links and omit local build metadata. */
function listFiles(directory, parent = '') {
	return fs
		.readdirSync(directory, { withFileTypes: true })
		.flatMap((entry) => {
			const name = parent + entry.name;
			if (name === '.vite' || entry.name === '.DS_Store') return [];
			safePath(name);
			assert.ok(!entry.isSymbolicLink(), `Symlink rejected: ${name}`);
			if (entry.isDirectory()) {
				return listFiles(path.join(directory, entry.name), name + '/');
			}
			assert.ok(entry.isFile(), `Not a regular file: ${name}`);
			return [name];
		})
		.sort();
}

/** Validate release identity, complete routes, unique safe paths and expected HTTP metadata. */
export function validateManifest(manifest) {
	assert.equal(manifest.schemaVersion, 1);
	assert.match(manifest.releaseId, releasePattern);
	assert.match(manifest.commitSha, /^[a-f0-9]{40}$/);
	assert.ok(
		manifest.releaseId.startsWith(manifest.commitSha.slice(0, 12) + '-'),
	);
	assert.match(manifest.archiveSha256, shaPattern);
	assert.ok(Number.isFinite(Date.parse(manifest.createdAt)));
	assert.ok(Array.isArray(manifest.files) && manifest.files.length > 0);
	const paths = new Set();
	for (const file of manifest.files) {
		safePath(file.path);
		assert.ok(!file.path.startsWith('.vite/'));
		assert.ok(!paths.has(file.path), `Duplicate path: ${file.path}`);
		paths.add(file.path);
		assert.match(file.sha256, shaPattern);
		assert.ok(Number.isSafeInteger(file.size) && file.size >= 0);
		assert.deepEqual(
			{ contentType: file.contentType, cacheControl: file.cacheControl },
			fileMetadata(file.path),
		);
	}
	for (const required of [
		...Object.values(pages),
		'robots.txt',
		'sitemap.xml',
	]) {
		assert.ok(paths.has(required), `Missing required file: ${required}`);
		assert.ok(
			manifest.files.find((file) => file.path === required).size > 0,
		);
	}
	assert.ok(manifest.files.some((file) => file.path.startsWith('assets/')));
	return manifest;
}

/** Hash files from the packaged snapshot and bind them to the release identity and creation time. */
function createManifest(directory, releaseId, commitSha, archive, createdAt) {
	return validateManifest({
		schemaVersion: 1,
		releaseId,
		commitSha,
		createdAt,
		archiveSha256: sha256(fs.readFileSync(archive)),
		files: listFiles(directory).map((filename) => {
			const body = fs.readFileSync(path.join(directory, filename));
			return {
				path: filename,
				size: body.length,
				sha256: sha256(body),
				...fileMetadata(filename),
			};
		}),
	});
}

/** Write the manifest and the exact archive-checksum line consumed during publication. */
function saveManifest(manifest, directory) {
	fs.writeFileSync(
		path.join(directory, 'manifest.json'),
		JSON.stringify(manifest, null, 2) + '\n',
	);
	fs.writeFileSync(
		path.join(directory, 'SHA256SUMS'),
		`${manifest.archiveSha256}  site.tar.gz\n`,
	);
}

/** Select GNU tar 1.28+ before creating files; macOS installations use gtar. */
export function findGnuTar(run = command) {
	for (const program of ['gtar', 'tar']) {
		let version;
		try {
			version = run(program, ['--version']);
		} catch {
			continue;
		}
		const match = version.match(/\(GNU tar\) (\d+)\.(\d+)/);
		if (
			match &&
			(Number(match[1]) > 1 ||
				(Number(match[1]) === 1 && Number(match[2]) >= 28))
		)
			return program;
	}
	throw new Error(
		'Packaging requires GNU tar 1.28 or newer (gtar or tar on PATH); on macOS run brew install gnu-tar',
	);
}

/** Package stable release inputs with normalized tar metadata and a caller-owned creation time. */
export function packageRelease(
	source,
	destination,
	releaseId,
	commitSha,
	createdAt,
) {
	assert.match(releaseId, releasePattern);
	assert.match(commitSha, /^[a-f0-9]{40}$/);
	assert.ok(releaseId.startsWith(commitSha.slice(0, 12) + '-'));
	assert.equal(
		typeof createdAt,
		'string',
		'Provide a stable --created-at timestamp',
	);
	assert.match(
		createdAt,
		/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/,
		'Use a UTC ISO timestamp for --created-at',
	);
	assert.ok(
		Number.isFinite(Date.parse(createdAt)),
		'Invalid --created-at timestamp',
	);
	const timestamp = new Date(createdAt).toISOString();
	const tar = findGnuTar();
	fs.mkdirSync(destination, { recursive: true });
	const archive = path.join(destination, 'site.tar.gz');
	const manifest = temporary((clean) => {
		for (const filename of listFiles(source)) {
			fileMetadata(filename);
			fs.mkdirSync(path.dirname(path.join(clean, filename)), {
				recursive: true,
			});
			fs.copyFileSync(
				path.join(source, filename),
				path.join(clean, filename),
			);
			fs.chmodSync(path.join(clean, filename), 0o644);
		}
		command(
			tar,
			[
				'--format=ustar',
				'--sort=name',
				'--mtime=@0',
				'--owner=0',
				'--group=0',
				'--numeric-owner',
				'--mode=u=rwX,go=rX',
				'--use-compress-program=gzip -n',
				'-cf',
				path.resolve(archive),
				'-C',
				clean,
				'.',
			],
			{
				env: {
					...process.env,
					LC_ALL: 'C',
					TZ: 'UTC',
					TAR_OPTIONS: '',
					GZIP: '',
					COPYFILE_DISABLE: '1',
				},
			},
		);
		return createManifest(clean, releaseId, commitSha, archive, timestamp);
	});
	saveManifest(manifest, destination);
	return manifest;
}

/** Reject unsafe archive paths and non-file/non-directory entries before extraction. */
export function validateArchiveEntries(names, types) {
	for (const name of names.trim().split('\n')) {
		const normalized = name.replace(/^\.\//, '').replace(/\/$/, '');
		if (normalized && normalized !== '.') safePath(normalized);
	}
	for (const entry of types.trim().split('\n')) {
		assert.ok(
			entry.startsWith('-') || entry.startsWith('d'),
			'Archive links and special files are not allowed',
		);
	}
}

/** Inspect archive entries before extracting them into an isolated directory. */
function unpack(archive, directory) {
	validateArchiveEntries(
		command('tar', ['-tzf', archive]),
		command('tar', ['-tvzf', archive]),
	);
	fs.mkdirSync(directory, { recursive: true });
	command('tar', ['-xzf', archive, '-C', directory]);
}

/** Require extracted file names, sizes and checksums to match the selected manifest. */
function verifyDirectory(directory, manifest) {
	assert.deepEqual(
		listFiles(directory),
		manifest.files.map((file) => file.path).sort(),
	);
	for (const file of manifest.files) {
		const body = fs.readFileSync(path.join(directory, file.path));
		assert.equal(body.length, file.size, file.path);
		assert.equal(sha256(body), file.sha256, file.path);
	}
}

/** Validate the explicitly selected environment and its AWS/public destinations. */
function config() {
	const cfg = {
		bucket: process.env.S3_BUCKET,
		distribution: process.env.CLOUDFRONT_DISTRIBUTION_ID,
		url: process.env.SITE_URL?.replace(/\/$/, ''),
		environment: process.env.SITE_ENVIRONMENT,
		region: process.env.AWS_REGION,
	};
	assert.ok(['staging', 'production'].includes(cfg.environment));
	assert.match(cfg.bucket || '', /^[a-z0-9][a-z0-9.-]+$/);
	assert.match(cfg.distribution || '', /^[A-Z0-9]+$/);
	assert.match(cfg.region || '', /^[a-z]{2}(?:-[a-z]+)+-[0-9]+$/);
	const url = new URL(cfg.url);
	assert.equal(url.protocol, 'https:');
	assert.equal(url.pathname, '/');
	assert.ok(!url.search && !url.hash && !url.username && !url.password);
	return cfg;
}

/** Create S3 helpers that require conditional writes for release records and immutable archives. */
function storeFor(cfg, temp) {
	const aws = (args) =>
		JSON.parse(
			command('aws', [
				...args,
				'--region',
				cfg.region,
				'--output',
				'json',
			]) || '{}',
		);
	const get = (key, destination, optional = false) => {
		try {
			return aws([
				's3api',
				'get-object',
				'--bucket',
				cfg.bucket,
				'--key',
				key,
				destination,
			]);
		} catch (error) {
			if (optional && /\(NoSuchKey\)|\(404\)/.test(error.message))
				return null;
			throw error;
		}
	};
	const jsonFile = (name, value) => {
		const filename = path.join(temp, name);
		fs.writeFileSync(filename, JSON.stringify(value, null, 2) + '\n');
		return filename;
	};
	return {
		aws,
		get,
		jsonFile,
		getState() {
			const filename = path.join(temp, 'state-read.json');
			// Prefix-scoped ListBucket permission can make a missing GetObject return
			// 403. Explicitly list the permitted prefix instead of treating 403 as absence.
			const listing = aws([
				's3api',
				'list-objects-v2',
				'--bucket',
				cfg.bucket,
				'--prefix',
				stateKey,
			]);
			if (
				!(listing.Contents || []).some(
					(entry) => entry.Key === stateKey,
				)
			)
				return {
					value: {
						schemaVersion: 1,
						environment: cfg.environment,
						active: null,
						previous: null,
						pending: null,
					},
					etag: null,
				};
			const result = get(stateKey, filename);
			const value = JSON.parse(fs.readFileSync(filename, 'utf8'));
			assert.equal(value.schemaVersion, 1);
			assert.equal(value.environment, cfg.environment);
			return { value, etag: result.ETag };
		},
		putState(value, etag) {
			return aws([
				's3api',
				'put-object',
				'--bucket',
				cfg.bucket,
				'--key',
				stateKey,
				'--body',
				jsonFile('state-write.json', value),
				'--content-type',
				'application/json',
				...(etag ? ['--if-match', etag] : ['--if-none-match', '*']),
			]).ETag;
		},
		putImmutable(key, filename, contentType) {
			try {
				aws([
					's3api',
					'put-object',
					'--bucket',
					cfg.bucket,
					'--key',
					key,
					'--body',
					filename,
					'--content-type',
					contentType,
					'--if-none-match',
					'*',
				]);
			} catch (error) {
				if (!/\(PreconditionFailed\)|\(412\)/.test(error.message))
					throw error;
				const existing = path.join(temp, 'existing-object');
				get(key, existing);
				assert.equal(
					sha256(fs.readFileSync(existing)),
					sha256(fs.readFileSync(filename)),
					`Immutable release conflict: ${key}`,
				);
			}
		},
	};
}

/** Advance verified state, retaining the prior active release and preserving previous on retries. */
export function nextState(state, reference, evidence) {
	return {
		...state,
		active: reference,
		previous:
			state.active?.releaseId === reference.releaseId
				? state.previous
				: state.active,
		pending: null,
		lastSuccess: evidence,
	};
}

// A conditional state write serializes CLI and workflow operations in each bucket.
// An interrupted process leaves a lock; taking it over requires its exact ID.
/** Acquire a conditional state lock; record caught failures without advancing known-good releases. */
export function withOperation(store, operation, callback, recoverOperation) {
	const snapshot = store.getState();
	const pending = snapshot.value.pending;
	if (pending && pending.status !== 'failed') {
		assert.equal(
			recoverOperation,
			pending.id,
			`Operation ${pending.id} is still pending; confirm it has stopped before recovery`,
		);
	}
	const locked = {
		...snapshot.value,
		pending: { ...operation, status: 'running' },
	};
	let etag = store.putState(locked, snapshot.etag);
	try {
		const outcome = callback(snapshot.value);
		etag = store.putState(outcome.state, etag);
		return { ...outcome.result, stateETag: etag };
	} catch (error) {
		try {
			store.putState(
				{
					...locked,
					pending: {
						...locked.pending,
						status: 'failed',
						error: error.message.slice(0, 1000),
					},
				},
				etag,
			);
		} catch {
			console.error(
				`State recovery required for operation ${operation.id}`,
			);
		}
		throw error;
	}
}

/** Validate checksum metadata and store the three release objects using conditional creation. */
function archiveRelease(store, manifest, directory) {
	assert.equal(
		fs.readFileSync(path.join(directory, 'SHA256SUMS'), 'utf8'),
		`${manifest.archiveSha256}  site.tar.gz\n`,
		'Archive checksum file disagrees with manifest',
	);
	for (const [filename, contentType] of [
		['site.tar.gz', 'application/gzip'],
		['SHA256SUMS', 'text/plain'],
		['manifest.json', 'application/json'],
	]) {
		store.putImmutable(
			`${prefix}${manifest.releaseId}/${filename}`,
			path.join(directory, filename),
			contentType,
		);
	}
}

/** Download and validate a selected archive, optionally enforcing a trusted manifest checksum. */
function readRelease(store, releaseId, directory, expectedManifestHash) {
	assert.match(releaseId, releasePattern);
	fs.mkdirSync(directory, { recursive: true });
	const manifestFile = path.join(directory, 'manifest.json');
	store.get(`${prefix}${releaseId}/manifest.json`, manifestFile);
	const manifestBody = fs.readFileSync(manifestFile);
	if (expectedManifestHash)
		assert.equal(sha256(manifestBody), expectedManifestHash);
	const manifest = validateManifest(JSON.parse(manifestBody));
	assert.equal(manifest.releaseId, releaseId);
	const archive = path.join(directory, 'site.tar.gz');
	store.get(`${prefix}${releaseId}/site.tar.gz`, archive);
	assert.equal(sha256(fs.readFileSync(archive)), manifest.archiveSha256);
	const site = path.join(directory, 'site');
	unpack(archive, site);
	verifyDirectory(site, manifest);
	return { manifest, site, manifestSha256: sha256(manifestBody) };
}

/** Fetch decoded HTTP bytes and final response headers with bounded network retries. */
function request(url, directory) {
	const headerFile = path.join(directory, 'headers');
	const bodyFile = path.join(directory, 'body');
	const status = Number(
		command('curl', [
			'--compressed',
			'--silent',
			'--show-error',
			'--retry',
			'3',
			'--max-time',
			'30',
			'--dump-header',
			headerFile,
			'--output',
			bodyFile,
			'--write-out',
			'%{http_code}',
			url,
		]),
	);
	const raw = fs
		.readFileSync(headerFile, 'utf8')
		.replaceAll('\r', '')
		.trim()
		.split(/\n\n/)
		.at(-1);
	const headers = Object.fromEntries(
		raw
			.split('\n')
			.slice(1)
			.map((line) => {
				const separator = line.indexOf(':');
				return [
					line.slice(0, separator).toLowerCase(),
					line.slice(separator + 1).trim(),
				];
			}),
	);
	return { status, headers, body: fs.readFileSync(bodyFile) };
}

/** Require successful status, expected MIME/cache metadata, size and exact content digest. */
export function verifyResponse(response, file) {
	assert.equal(response.status, 200, file.path);
	assert.equal(
		response.headers['content-type']?.split(';')[0].trim(),
		file.contentType.split(';')[0],
		`${file.path}: content type`,
	);
	assert.equal(
		response.headers['cache-control'],
		file.cacheControl,
		`${file.path}: cache control`,
	);
	assert.equal(response.body.length, file.size, `${file.path}: size`);
	assert.equal(sha256(response.body), file.sha256, `${file.path}: contents`);
}

/** Verify every manifest file and public route, missing-resource errors and anonymous S3 denial. */
function verifyPublished(cfg, manifest, directory) {
	const results = [];
	const checks = manifest.files.map((file) => ({
		urlPath: '/' + file.path,
		file,
	}));
	for (const [route, filename] of Object.entries(pages)) {
		const file = manifest.files.find((entry) => entry.path === filename);
		checks.push({ urlPath: route, file });
		if (route !== '/') checks.push({ urlPath: route + '/', file });
	}
	for (const { urlPath, file } of checks) {
		const response = request(cfg.url + urlPath, directory);
		verifyResponse(response, file);
		results.push({
			path: urlPath,
			status: response.status,
			contentType: response.headers['content-type'],
			cacheControl: response.headers['cache-control'],
			cache: response.headers['x-cache'],
		});
		console.log(`Verified ${urlPath}`);
	}
	for (const missing of [
		`/assets/missing-${manifest.releaseId}.js`,
		`/missing-${manifest.releaseId}`,
	]) {
		assert.ok(
			[403, 404].includes(request(cfg.url + missing, directory).status),
			`Missing resource returned successful HTML: ${missing}`,
		);
	}
	assert.equal(
		request(
			`https://${cfg.bucket}.s3.${cfg.region}.amazonaws.com/site/index.html`,
			directory,
		).status,
		403,
		'Anonymous S3 access must be denied',
	);
	return results;
}

/** Upload assets before HTML, invalidate CloudFront, verify public content, then advance state. */
function publish(
	cfg,
	store,
	release,
	mode,
	recoverOperation,
	archiveDirectory,
) {
	const started = Date.now();
	const operation = {
		id: randomUUID(),
		kind: mode,
		releaseId: release.manifest.releaseId,
		startedAt: new Date(started).toISOString(),
	};
	console.log(`Operation: ${operation.id}`);
	return withOperation(
		store,
		operation,
		(initial) => {
			if (mode === 'adopt')
				assert.equal(
					initial.active,
					null,
					'State is already initialized',
				);
			if (archiveDirectory)
				archiveRelease(store, release.manifest, archiveDirectory);
			if (mode !== 'adopt') {
				const uploadOrder = [...release.manifest.files].sort((a, b) => {
					const phase = (file) =>
						file.path.startsWith('assets/')
							? 0
							: file.path.endsWith('.html')
								? 2
								: 1;
					return phase(a) - phase(b) || a.path.localeCompare(b.path);
				});
				for (const file of uploadOrder) {
					store.aws([
						's3api',
						'put-object',
						'--bucket',
						cfg.bucket,
						'--key',
						'site/' + file.path,
						'--body',
						path.join(release.site, file.path),
						'--content-type',
						file.contentType,
						'--cache-control',
						file.cacheControl,
					]);
				}
			}
			const invalidation =
				mode === 'adopt'
					? null
					: store.aws([
							'cloudfront',
							'create-invalidation',
							'--distribution-id',
							cfg.distribution,
							'--paths',
							'/*',
						]).Invalidation.Id;
			if (invalidation) {
				console.log(`CloudFront invalidation: ${invalidation}`);
				store.aws([
					'cloudfront',
					'wait',
					'invalidation-completed',
					'--distribution-id',
					cfg.distribution,
					'--id',
					invalidation,
				]);
			}
			const files = temporary((directory) =>
				verifyPublished(cfg, release.manifest, directory),
			);
			const reference = {
				releaseId: release.manifest.releaseId,
				commitSha: release.manifest.commitSha,
				archiveSha256: release.manifest.archiveSha256,
				manifestSha256: release.manifestSha256,
			};
			const evidence = {
				operation: mode,
				operationId: operation.id,
				environment: cfg.environment,
				release: reference,
				previous: initial.active,
				invalidation,
				verifiedAt: new Date().toISOString(),
				elapsedSeconds: Math.round((Date.now() - started) / 1000),
				files,
			};
			return {
				state: nextState(initial, reference, evidence),
				result: evidence,
			};
		},
		recoverOperation,
	);
}

/** Select archives older than thirty days while protecting active, previous and newest ten releases. */
export function retentionPlan(manifests, state, now = Date.now()) {
	assert.ok(
		state.active,
		'Adopt or publish a verified release before cleanup',
	);
	assert.ok(!state.pending, 'Resolve the pending operation before cleanup');
	const sorted = [...manifests].sort(
		(a, b) =>
			Date.parse(b.createdAt) - Date.parse(a.createdAt) ||
			b.releaseId.localeCompare(a.releaseId),
	);
	const protectedIds = new Set([
		state.active.releaseId,
		state.previous?.releaseId,
		...sorted.slice(0, 10).map((item) => item.releaseId),
	]);
	return sorted
		.filter(
			(item) =>
				!protectedIds.has(item.releaseId) &&
				now - Date.parse(item.createdAt) >= 30 * 86400000,
		)
		.map((item) => item.releaseId);
}

/** Preview or remove eligible archive versions while holding the release operation lock. */
export function prune(cfg, store, apply = false) {
	const manifests = [];
	const objects =
		store.aws([
			's3api',
			'list-objects-v2',
			'--bucket',
			cfg.bucket,
			'--prefix',
			prefix,
		]).Contents || [];
	for (const object of objects.filter((item) =>
		item.Key.endsWith('/manifest.json'),
	)) {
		const filename = store.jsonFile('retention-manifest.json', {});
		store.get(object.Key, filename);
		const manifest = validateManifest(
			JSON.parse(fs.readFileSync(filename, 'utf8')),
		);
		assert.equal(
			object.Key,
			`${prefix}${manifest.releaseId}/manifest.json`,
		);
		manifests.push(manifest);
	}
	const snapshot = store.getState();
	const candidates = retentionPlan(manifests, snapshot.value);
	if (!apply || candidates.length === 0)
		return {
			dryRun: !apply,
			candidates,
			preserved: [
				'active',
				'previous',
				'newest 10',
				'younger than 30 days',
				'legacy archives',
				'all published assets',
			],
		};
	return withOperation(
		store,
		{
			id: randomUUID(),
			kind: 'prune',
			startedAt: new Date().toISOString(),
		},
		(state) => {
			const currentCandidates = retentionPlan(manifests, state);
			assert.deepEqual(
				currentCandidates,
				candidates,
				'Release state changed; review a new cleanup plan',
			);
			for (const releaseId of candidates) {
				const root = `${prefix}${releaseId}/`;
				const listing = store.aws([
					's3api',
					'list-object-versions',
					'--bucket',
					cfg.bucket,
					'--prefix',
					root,
				]);
				for (const version of [
					...(listing.Versions || []),
					...(listing.DeleteMarkers || []),
				]) {
					assert.ok(version.Key.startsWith(root));
					store.aws([
						's3api',
						'delete-object',
						'--bucket',
						cfg.bucket,
						'--key',
						version.Key,
						'--version-id',
						version.VersionId,
					]);
				}
			}
			return {
				state: { ...state, pending: null },
				result: { dryRun: false, removed: candidates },
			};
		},
	);
}

/** Save successful operation evidence to the requested file and GitHub step summary. */
function summary(result, output) {
	if (output)
		fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
	console.log(JSON.stringify(result, null, 2));
	if (process.env.GITHUB_STEP_SUMMARY) {
		fs.appendFileSync(
			process.env.GITHUB_STEP_SUMMARY,
			`## Release operation\n\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\`\n`,
		);
	}
}

/** Parse an action-specific CLI allowlist and reject duplicate, missing or misplaced options. */
export function parseOptions(action, args) {
	const allowed = {
		package: [
			'source',
			'directory',
			'release-id',
			'commit-sha',
			'created-at',
			'output',
		],
		publish: [
			'directory',
			'release-id',
			'manifest-sha256',
			'recover-operation',
			'output',
		],
		'import-legacy': [
			'release-id',
			'commit-sha',
			'archive-sha256',
			'recover-operation',
			'output',
		],
		rollback: [
			'release-id',
			'manifest-sha256',
			'recover-operation',
			'output',
		],
		adopt: ['release-id', 'manifest-sha256', 'recover-operation', 'output'],
		verify: ['release-id', 'manifest-sha256', 'output'],
		state: ['output'],
		prune: ['apply', 'output'],
	};
	assert.ok(
		allowed[action],
		'Use package, publish, import-legacy, adopt, rollback, verify, state, or prune',
	);
	const options = {};
	while (args.length) {
		const name = args.shift();
		assert.match(name, /^--[a-z][a-z0-9-]*$/);
		assert.ok(
			allowed[action].includes(name.slice(2)),
			`Unsupported option: ${name}`,
		);
		assert.ok(!(name.slice(2) in options), `Duplicate option: ${name}`);
		if (name === '--apply') options.apply = true;
		else {
			assert.ok(
				args.length && !args[0].startsWith('--'),
				`Missing value: ${name}`,
			);
			options[name.slice(2)] = args.shift();
		}
	}
	return options;
}

/** Dispatch validated CLI commands; AWS operations use an isolated temporary workspace. */
export function main(args = process.argv.slice(2)) {
	const action = args.shift();
	const options = parseOptions(action, args);
	const required = (name) => {
		assert.ok(options[name], `Provide --${name}`);
		return options[name];
	};
	if (action === 'package') {
		const manifest = packageRelease(
			required('source'),
			required('directory'),
			required('release-id'),
			required('commit-sha'),
			required('created-at'),
		);
		summary(
			{
				releaseId: manifest.releaseId,
				archiveSha256: manifest.archiveSha256,
				manifestSha256: sha256(
					fs.readFileSync(
						path.join(options.directory, 'manifest.json'),
					),
				),
			},
			options.output,
		);
		return;
	}
	const cfg = config();
	temporary((temp) => {
		const store = storeFor(cfg, temp);
		let result;
		if (action === 'state') result = store.getState().value;
		else if (action === 'prune') result = prune(cfg, store, options.apply);
		else if (action === 'import-legacy') {
			const releaseId = required('release-id');
			assert.match(releaseId, releasePattern);
			const expected = required('archive-sha256');
			assert.match(expected, shaPattern);
			const archive = path.join(temp, 'site.tar.gz');
			const original = store.get(
				`releases/${releaseId}/site.tar.gz`,
				archive,
			);
			assert.equal(sha256(fs.readFileSync(archive)), expected);
			const site = path.join(temp, 'site');
			unpack(archive, site);
			const manifest = createManifest(
				site,
				releaseId,
				required('commit-sha'),
				archive,
				original.LastModified,
			);
			saveManifest(manifest, temp);
			result = withOperation(
				store,
				{
					id: randomUUID(),
					kind: 'import-legacy',
					releaseId,
					startedAt: new Date().toISOString(),
				},
				(state) => {
					archiveRelease(store, manifest, temp);
					return {
						state: { ...state, pending: null },
						result: {
							imported: releaseId,
							archiveSha256: expected,
							manifestSha256: sha256(
								fs.readFileSync(
									path.join(temp, 'manifest.json'),
								),
							),
						},
					};
				},
				options['recover-operation'],
			);
		} else if (action === 'publish') {
			const directory = required('directory');
			const manifestBody = fs.readFileSync(
				path.join(directory, 'manifest.json'),
			);
			assert.equal(sha256(manifestBody), required('manifest-sha256'));
			const manifest = validateManifest(JSON.parse(manifestBody));
			assert.equal(manifest.releaseId, required('release-id'));
			const archive = path.join(directory, 'site.tar.gz');
			assert.equal(
				sha256(fs.readFileSync(archive)),
				manifest.archiveSha256,
			);
			const site = path.join(temp, 'site');
			unpack(archive, site);
			verifyDirectory(site, manifest);
			result = publish(
				cfg,
				store,
				{ manifest, site, manifestSha256: sha256(manifestBody) },
				action,
				options['recover-operation'],
				directory,
			);
		} else if (['rollback', 'adopt', 'verify'].includes(action)) {
			const release = readRelease(
				store,
				required('release-id'),
				path.join(temp, 'release'),
				options['manifest-sha256'],
			);
			if (action === 'verify')
				result = {
					releaseId: release.manifest.releaseId,
					files: verifyPublished(cfg, release.manifest, temp),
				};
			else {
				if (action === 'adopt')
					assert.equal(
						store.getState().value.active,
						null,
						'State is already initialized',
					);
				result = publish(
					cfg,
					store,
					release,
					action,
					options['recover-operation'],
				);
			}
		} else
			throw new Error(
				'Use package, publish, import-legacy, adopt, rollback, verify, state, or prune',
			);
		summary(result, options.output);
	});
}

if (
	process.argv[1] &&
	path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	try {
		main();
	} catch (error) {
		console.error(error.message);
		process.exitCode = 1;
	}
}
