module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/?(*.)+(spec|test).ts?(x)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  roots: ['<rootDir>/src', '<rootDir>/test'],
  globals: {
    'ts-jest': {
      isolatedModules: true,
      diagnostics: false,
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/frontend/src/$1',
    '^@prisma/client$': '<rootDir>/test/mocks/prisma-client',
    '^next/server$': '<rootDir>/test/mocks/next-server',
    '^next/headers$': '<rootDir>/test/mocks/next-headers',
    '^tailwind-merge$': '<rootDir>/test/mocks/tailwind-merge',
    '^react$': '<rootDir>/node_modules/react',
    '^react-dom$': '<rootDir>/node_modules/react-dom',
  },
};
