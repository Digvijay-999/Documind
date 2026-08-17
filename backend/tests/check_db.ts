import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking users in db...');
  const users = await prisma.user.findMany();
  console.log('Users:');
  console.log(users.map(u => ({ id: u.id, email: u.email, passwordHash: u.passwordHash.substring(0, 10) + '...', role: u.role })));
  console.log('Total users:', users.length);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
