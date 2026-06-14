import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const existing = await prisma.questionPack.findFirst({ where: { name: 'Sample Pack' } });
  if (existing) { console.log('Seed already present'); return; }

  await prisma.questionPack.create({
    data: {
      name: 'Sample Pack',
      description: 'A demo question pack',
      authorName: 'Admin',
      isPublic: true,
      timerDuration: 5,
      categories: {
        create: [
          {
            name: 'Science',
            order: 0,
            questions: {
              create: [
                { text: 'What planet is closest to the Sun?', answer: 'Mercury', points: 100, order: 0 },
                { text: 'What gas do plants absorb?', answer: 'Carbon dioxide', points: 200, order: 1 },
                { text: 'How many bones in the human body?', answer: '206', points: 300, order: 2 },
                { text: 'What is the chemical symbol for gold?', answer: 'Au', points: 400, order: 3 },
                { text: 'What is the speed of light in km/s?', answer: '299,792 km/s', points: 500, order: 4 },
              ],
            },
          },
          {
            name: 'History',
            order: 1,
            questions: {
              create: [
                { text: 'In what year did WW2 end?', answer: '1945', points: 100, order: 0 },
                { text: 'Who was the first US president?', answer: 'George Washington', points: 200, order: 1 },
                { text: 'What ancient wonder was in Alexandria?', answer: 'The Lighthouse', points: 300, order: 2 },
                { text: 'In what year did the Berlin Wall fall?', answer: '1989', points: 400, order: 3 },
                { text: 'Who wrote the Communist Manifesto?', answer: 'Marx and Engels', points: 500, order: 4 },
              ],
            },
          },
          {
            name: 'Geography',
            order: 2,
            questions: {
              create: [
                { text: 'What is the capital of Australia?', answer: 'Canberra', points: 100, order: 0 },
                { text: 'Which is the longest river in the world?', answer: 'The Nile', points: 200, order: 1 },
                { text: 'How many continents are there?', answer: '7', points: 300, order: 2 },
                { text: 'What country has the most natural lakes?', answer: 'Canada', points: 400, order: 3 },
                { text: 'What is the smallest country in the world?', answer: 'Vatican City', points: 500, order: 4 },
              ],
            },
          },
        ],
      },
    },
  });

  console.log('Seeded sample pack');
}

main().catch(console.error).finally(() => prisma.$disconnect());
