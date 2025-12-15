const jwt = require('jsonwebtoken');

const payload = {
  userId: '123e4567-e89b-12d3-a456-426614174000',
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'pedro.seara@scriptumai.com',
  role: 'ADMIN',
  organizationId: '00000000-0000-0000-0000-000000000000'
};

const SECRET = 'change-this-secret-key';
const token = jwt.sign(payload, SECRET, { expiresIn: '24h' });

console.log('=================================');
console.log('JWT TOKEN (válido por 24h):');
console.log('=================================');
console.log(token);
console.log('=================================');
