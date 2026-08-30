import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
	index('routes/Home.tsx'),
	route('about', 'routes/About.tsx'),
	route('privacy-policy', 'routes/PrivacyPolicy.tsx'),
	route('faq', 'routes/FAQ.tsx'),
] satisfies RouteConfig;
