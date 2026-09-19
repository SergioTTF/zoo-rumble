import tseslint from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', '.cache/**'] },
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': hooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
  {
    files: ['src/{simulation,content,run}/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'react',
                'react/*',
                'react-dom',
                'react-dom/*',
                'phaser',
                'phaser/*',
                'zustand',
                'zustand/*',
                '**/app/**',
                '**/game/**',
                '**/stores/**',
              ],
              message:
                'Content and simulation must remain headless and presentation-independent.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        'window',
        'document',
        'navigator',
        'performance',
        'requestAnimationFrame',
        'localStorage',
        'sessionStorage',
        'fetch',
        'setTimeout',
        'setInterval',
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Use SeededRandom.' },
        { object: 'Date', property: 'now', message: 'Use simulation time.' },
      ],
    },
  },
);
