import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';

export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			borderWidth: {
				3: '3px',
				4: '4px',
			},
			borderColor: {
				brutal: '#000000',
			},
			boxShadow: {
				brutal: '4px 4px 0 0 #000000',
				'brutal-sm': '2px 2px 0 0 #000000',
				'brutal-lg': '6px 6px 0 0 #000000',
				'brutal-xl': '8px 8px 0 0 #000000',
			},
			colors: {
				brutal: {
					yellow: '#FFEB3A',
					pink: '#FF7AB6',
					lime: '#B5E853',
					sky: '#5BC8FF',
					coral: '#FF6F61',
					violet: '#B69CFF',
					cream: '#FFF8E1',
					paper: '#FFFFFF',
					ink: '#111111',
				},
			},
			fontFamily: {
				display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
				body: ['"Inter"', 'system-ui', 'sans-serif'],
				mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
			},
			transitionTimingFunction: {
				brutal: 'cubic-bezier(0.25, 1, 0.5, 1)',
			},
			keyframes: {
				wiggle: {
					'0%, 100%': { transform: 'rotate(-1deg)' },
					'50%': { transform: 'rotate(1deg)' },
				},
				pop: {
					'0%': { transform: 'scale(0.85)', opacity: '0' },
					'60%': { transform: 'scale(1.04)', opacity: '1' },
					'100%': { transform: 'scale(1)', opacity: '1' },
				},
			},
			animation: {
				wiggle: 'wiggle 0.6s ease-in-out',
				pop: 'pop 200ms cubic-bezier(0.25, 1, 0.5, 1)',
			},
		},
	},
	plugins: [forms, typography],
} satisfies Config;
