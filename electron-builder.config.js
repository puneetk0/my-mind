module.exports = {
  appId: 'com.puneet.pond',
  productName: 'Pond',
  mac: {
    category: 'public.app-category.productivity',
    target: [{ target: 'dmg', arch: ['universal'] }],
  },
  files: [
    'main/**',
    'dist/renderer/**',
    'assets/**',
  ],
  directories: {
    output: 'release',
  },
};
