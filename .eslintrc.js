module.exports = {
  extends: 'next/core-web-vitals',
  rules: {
    '@typescript-eslint/no-unused-vars': 'warn', // Kullanılmayan değişkenler için sadece uyarı ver, hata değil
    'no-unused-vars': 'warn'
  }
}; 