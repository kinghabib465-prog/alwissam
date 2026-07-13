import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const adminRole = await prisma.role.findUnique({ where: { code: "ADMIN" } });
  if (!adminRole) throw new Error("ADMIN role missing");

  await prisma.user.updateMany({
    where: { email: "wakri@alwisam.dz" },
    data: { fullName: "الدكتور قعري أسامة" },
  });

  await prisma.user.updateMany({
    where: { email: "manana@alwisam.dz" },
    data: {
      fullName: "الدكتور منانة فؤاد",
      roleId: adminRole.id,
      status: "ACTIVE",
      deletedAt: null,
    },
  });

  await prisma.user.updateMany({
    where: { email: "admin@alwisam.dz" },
    data: { status: "INACTIVE" },
  });

  const users = await prisma.user.findMany({
    where: {
      email: {
        in: [
          "manana@alwisam.dz",
          "wakri@alwisam.dz",
          "samar@alwisam.dz",
          "admin@alwisam.dz",
        ],
      },
    },
    include: { role: true, doctor: true },
  });

  for (const u of users) {
    console.log(
      `${u.email} | ${u.fullName} | ${u.role.code} | doctor=${u.doctor?.type ?? "-"} | ${u.status}`,
    );
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
