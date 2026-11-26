import base from '@tstack/eslint-config';
import astro from 'eslint-plugin-astro';

export default [...base, ...astro.configs.recommended];
