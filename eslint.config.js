// @ts-check

import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const codeFiles = ['**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}'];

export default defineConfig(
	globalIgnores(['.react-router/**', 'build/**']),
	{
		files: codeFiles,
		extends: [js.configs.recommended, tseslint.configs.recommended],
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
			},
		},
		linterOptions: {
			reportUnusedDisableDirectives: 'error',
		},
		rules: {
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_' },
			],
		},
	},
	{
		files: ['app/**/*.{js,jsx,ts,tsx}'],
		extends: [reactHooks.configs.flat.recommended],
	},
	// Keep this last so Prettier owns formatting decisions.
	eslintConfigPrettier,
);
