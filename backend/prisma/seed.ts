import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean existing data
  await prisma.dispute.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.ledgerEntry.deleteMany({});
  await prisma.matchMember.deleteMany({});
  await prisma.match.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.skillOffer.deleteMany({});
  await prisma.skillWant.deleteMany({});
  await prisma.skill.deleteMany({});
  await prisma.user.deleteMany({});

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Create Core Skills
  const reactSkill = await prisma.skill.create({
    data: { name: 'React Development', category: 'Technology' },
  });
  const frenchSkill = await prisma.skill.create({
    data: { name: 'French Tutoring', category: 'Languages' },
  });
  const guitarSkill = await prisma.skill.create({
    data: { name: 'Guitar Lessons', category: 'Music' },
  });
  const uiuxSkill = await prisma.skill.create({
    data: { name: 'UI/UX Design', category: 'Design' },
  });
  const yogaSkill = await prisma.skill.create({
    data: { name: 'Yoga Coaching', category: 'Fitness' },
  });
  const gardeningSkill = await prisma.skill.create({
    data: { name: 'Gardening Advice', category: 'Lifestyle' },
  });

  console.log('Skills seeded.');

  // 2. Create Users
  const alice = await prisma.user.create({
    data: {
      email: 'alice@timetrade.com',
      passwordHash,
      name: 'Alice',
      bio: 'Senior frontend developer who loves teaching coding and wants to learn French.',
      location: 'New York, USA',
      availability: JSON.stringify({
        monday: ['17:00-19:00'],
        wednesday: ['17:00-19:00'],
        saturday: ['10:00-14:00']
      }),
      timeBalance: 5.0, // starts with some extra credits
    },
  });

  const bob = await prisma.user.create({
    data: {
      email: 'bob@timetrade.com',
      passwordHash,
      name: 'Bob',
      bio: 'Native French speaker who enjoys sharing language skills and wants to learn guitar.',
      location: 'Paris, France',
      availability: JSON.stringify({
        tuesday: ['18:00-20:00'],
        thursday: ['18:00-20:00'],
        saturday: ['14:00-18:00']
      }),
      timeBalance: 0.0,
    },
  });

  const charlie = await prisma.user.create({
    data: {
      email: 'charlie@timetrade.com',
      passwordHash,
      name: 'Charlie',
      bio: 'Guitar instructor who wants to build a web application in React.',
      location: 'London, UK',
      availability: JSON.stringify({
        friday: ['16:00-20:00'],
        saturday: ['09:00-13:00'],
        sunday: ['10:00-12:00']
      }),
      timeBalance: -2.0, // negative balance is okay
    },
  });

  const dave = await prisma.user.create({
    data: {
      email: 'dave@timetrade.com',
      passwordHash,
      name: 'Dave',
      bio: 'Product designer wanting to practice French conversation.',
      location: 'San Francisco, USA',
      availability: JSON.stringify({
        monday: ['12:00-14:00'],
        thursday: ['15:00-18:00']
      }),
      timeBalance: 1.0,
    },
  });

  const emma = await prisma.user.create({
    data: {
      email: 'emma@timetrade.com',
      passwordHash,
      name: 'Emma',
      bio: 'Bilingual language specialist looking for a modern UI redesign of her blog.',
      location: 'Montreal, Canada',
      availability: JSON.stringify({
        tuesday: ['10:00-12:00'],
        wednesday: ['14:00-16:00']
      }),
      timeBalance: 3.0,
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: 'admin@timetrade.com',
      passwordHash,
      name: 'Admin User',
      bio: 'TimeTrade Platform Moderator.',
      location: 'Global',
      availability: '{}',
      timeBalance: 100.0,
    },
  });

  console.log('Users seeded.');

  // 3. Seed Skill Offers & Wants
  
  // Alice offers React, wants French
  await prisma.skillOffer.create({
    data: {
      userId: alice.id,
      skillId: reactSkill.id,
      description: 'I can teach React basics, hooks, state management, and TypeScript integration.',
      estimatedDuration: 2
    }
  });
  await prisma.skillWant.create({
    data: {
      userId: alice.id,
      skillId: frenchSkill.id,
      description: 'Looking to practice conversational French.'
    }
  });

  // Bob offers French, wants Guitar
  await prisma.skillOffer.create({
    data: {
      userId: bob.id,
      skillId: frenchSkill.id,
      description: 'Conversational French and grammar coaching from a native speaker.',
      estimatedDuration: 1
    }
  });
  await prisma.skillWant.create({
    data: {
      userId: bob.id,
      skillId: guitarSkill.id,
      description: 'Want to learn acoustic guitar chords.'
    }
  });

  // Charlie offers Guitar, wants React
  await prisma.skillOffer.create({
    data: {
      userId: charlie.id,
      skillId: guitarSkill.id,
      description: 'Learn acoustic or electric guitar from scratch. I teach chords, fingerstyle, and basic theory.',
      estimatedDuration: 1
    }
  });
  await prisma.skillWant.create({
    data: {
      userId: charlie.id,
      skillId: reactSkill.id,
      description: 'Need help building my personal portfolio site in React.'
    }
  });

  // Dave offers UI/UX Design, wants French
  await prisma.skillOffer.create({
    data: {
      userId: dave.id,
      skillId: uiuxSkill.id,
      description: 'Figma wireframing, component libraries, and user research reviews.',
      estimatedDuration: 1
    }
  });
  await prisma.skillWant.create({
    data: {
      userId: dave.id,
      skillId: frenchSkill.id,
      description: 'Basic French travel conversation training.'
    }
  });

  // Emma offers French, wants UI/UX Design
  await prisma.skillOffer.create({
    data: {
      userId: emma.id,
      skillId: frenchSkill.id,
      description: 'French language classes, writing correction, and oral exercises.',
      estimatedDuration: 1
    }
  });
  await prisma.skillWant.create({
    data: {
      userId: emma.id,
      skillId: uiuxSkill.id,
      description: 'Design mockups for a new language learning blog.'
    }
  });

  console.log('Skill offers and wants seeded.');
  console.log('Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
