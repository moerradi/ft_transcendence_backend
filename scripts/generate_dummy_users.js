/* eslint-disable */
const { PrismaClient } = require('@prisma/client');
const faker = require('faker');

const prisma = new PrismaClient();

async function generateDummyUsers(count) {
  for (let i = 0; i < count; i++) {
    const tmpdata = {
      login: faker.internet.userName(),
      intra_id: faker.datatype.number({ min: 100000, max: 999999 }),
      first_name: faker.name.firstName(),
      last_name: faker.name.lastName(),
      two_factor_auth_enabled: faker.datatype.boolean(),
      created_at: faker.date.past(),
      updated_at: faker.date.recent(),
    };
    const user = await prisma.user.create({
      data: {
        ...tmpdata,
        avatar_url:
          'https://ui-avatars.com/api/?name=' +
          tmpdata.first_name +
          '+' +
          tmpdata.last_name,
      },
    });
    console.log(
      `Created user ${user.id}: ${user.first_name} ${user.last_name}`,
    );
  }
}

generateDummyUsers(10)
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
