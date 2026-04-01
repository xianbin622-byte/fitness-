const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

function dayFromOffset(offset) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  d.setUTCHours(12, 0, 0, 0);
  return d;
}

async function main() {
  const hash = await bcrypt.hash("123456", 10);

  const coach = await prisma.user.upsert({
    where: { phone: "13800000001" },
    update: {},
    create: {
      phone: "13800000001",
      nickname: "演示教练",
      role: "COACH",
      passwordHash: hash,
    },
  });

  const member = await prisma.user.upsert({
    where: { phone: "13800000002" },
    update: {},
    create: {
      phone: "13800000002",
      nickname: "演示会员",
      role: "MEMBER",
      passwordHash: hash,
    },
  });

  await prisma.coachMemberRelation.upsert({
    where: { coachId_memberId: { coachId: coach.id, memberId: member.id } },
    update: { status: "active" },
    create: { coachId: coach.id, memberId: member.id, status: "active" },
  });

  const d1 = dayFromOffset(1);
  const d2 = dayFromOffset(2);
  const slots = [
    { date: d1, startTime: "07:30", endTime: "08:30" },
    { date: d1, startTime: "08:30", endTime: "09:30" },
    { date: d1, startTime: "09:30", endTime: "10:30" },
    { date: d2, startTime: "10:00", endTime: "11:00" },
  ];

  for (const s of slots) {
    const exists = await prisma.coachSchedule.findFirst({
      where: {
        coachId: coach.id,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
      },
    });
    if (!exists) {
      await prisma.coachSchedule.create({
        data: {
          coachId: coach.id,
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime,
        },
      });
    }
  }

  await prisma.bodyMeasurement.create({
    data: {
      memberId: member.id,
      coachId: coach.id,
      gender: "男",
      age: 28,
      height: 175,
      weight: 78,
      bodyFat: 18.5,
      waist: 82,
      hip: 95,
      thigh: 58,
      chest: 98,
      arm: 32,
      skeletalMuscle: 33,
      recordDate: dayFromOffset(-7),
      notes: "种子数据：基线",
    },
  });

  await prisma.bodyMeasurement.create({
    data: {
      memberId: member.id,
      coachId: coach.id,
      gender: "男",
      age: 28,
      height: 175,
      weight: 76.5,
      bodyFat: 17.2,
      waist: 80,
      hip: 94,
      thigh: 57,
      chest: 98,
      arm: 32,
      skeletalMuscle: 33.5,
      recordDate: dayFromOffset(0),
      notes: "种子数据：最近",
    },
  });

  console.log("Seed 完成。测试账号：");
  console.log("  教练 13800000001 / 123456");
  console.log("  会员 13800000002 / 123456");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
