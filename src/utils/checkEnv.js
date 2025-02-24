// src/utils/checkEnv.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

console.log('Verificando variáveis de ambiente:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Presente' : '❌ Ausente');
console.log('SUPABASE_KEY:', process.env.SUPABASE_KEY ? '✅ Presente' : '❌ Ausente');
console.log('CLIENT_ID:', process.env.CLIENT_ID ? '✅ Presente' : '❌ Ausente');
console.log('CLIENT_SECRET:', process.env.CLIENT_SECRET ? '✅ Presente' : '❌ Ausente');