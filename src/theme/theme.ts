import { createTheme } from '@mantine/core';

const theme = createTheme({
  fontFamily: 'Euclid Circular B',
  headings: { fontFamily: 'Euclid Circular B' },
  primaryColor: 'blue',
  black: '#050505',
  components: {
    Container: {
      vars: () => ({
        root: {
          '--container-size-xs': '300px',
          '--container-size-sm': '720px',
          '--container-size-md': '960px',
          '--container-size-lg': '1140px',
          '--container-size-xl': '1320px',
        },
      }),
    },
    Modal: {
      styles: (theme: any) => ({
        content: {
          backgroundColor: 'light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-7))',
        },
      }),
    },
    Drawer: {
      styles: () => ({
        content: {
          backgroundColor: 'light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-7))',
          height: '100%',
          minHeight: '100%',
          maxHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
        },
        header: {
          borderBottom:
            '1px solid light-dark(var(--mantine-color-gray-4), var(--mantine-color-dark-5))',
          marginBottom: 0,
          padding: 'var(--mantine-spacing-xl)',
          flex: '0 0 auto',
        },
        body: {
          flex: '1 1 auto',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
        },
      }),
    },
  },
});

export default theme;
