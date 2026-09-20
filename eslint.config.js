module.exports = [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "artifacts/**",
      "cache/**",
      "typechain-types/**",
      "demo-log/**",
      "_outer_astro_backup/**",
      ".astro/**",
      "src/**",
      "memory-passport/**"
    ],
  },
  {
    files: ["backend/**/*.js", "scripts/**/*.js", "test/**/*.js", "attack-lab/**/*.js", "hardhat.config.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        console: "readonly",
        process: "readonly",
        require: "readonly",
        module: "readonly",
        __dirname: "readonly",
        Buffer: "readonly",
        BigInt: "readonly",
        describe: "readonly",
        it: "readonly",
        before: "readonly",
        beforeEach: "readonly",
        after: "readonly",
        afterEach: "readonly",
        fetch: "readonly",
        URL: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "no-undef": "error",
    },
  },
];
