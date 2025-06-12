/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: ["/node_modules/","/dist/"],
  transformIgnorePatterns: [
    "node_modules/(?!(@ton|axios)/)"
  ],
  moduleNameMapper: {
    '^axios$': require.resolve('axios')
  }
};