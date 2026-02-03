import dotenv from 'dotenv';
dotenv.config();

console.log('Environment variables check:');
console.log('CHAIN_RPC_URL:', process.env.CHAIN_RPC_URL ? '✅ Set' : '❌ Missing');
console.log('WALLET_PRIVATE_KEY:', process.env.WALLET_PRIVATE_KEY ? '✅ Set' : '❌ Missing');
console.log('JOURNEY_WALLET_ADDRESS:', process.env.JOURNEY_WALLET_ADDRESS ? '✅ Set' : '❌ Missing');
console.log('\nActual values:');
console.log('CHAIN_RPC_URL:', process.env.CHAIN_RPC_URL);
console.log('WALLET_PRIVATE_KEY:', process.env.WALLET_PRIVATE_KEY);
console.log('JOURNEY_WALLET_ADDRESS:', process.env.JOURNEY_WALLET_ADDRESS);
