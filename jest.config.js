module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/?(*.)+(spec|test).ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  roots: ['<rootDir>/src', '<rootDir>/test'],
  moduleNameMapper: {
    '^@prisma/client$': '<rootDir>/test/mocks/prisma-client',
  },
};
