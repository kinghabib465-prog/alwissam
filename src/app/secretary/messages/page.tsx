import { requireUser } from "@/lib/auth/current-user";
import { DashboardShell, TopHeader } from "@/components/layout/DashboardShell";
import { Card, EmptyState } from "@/components/ui/Card";
import { navSecretaryAr } from "@/i18n/ar";
import { prisma } from "@/lib/db/prisma";
import { roleLabelAr } from "@/lib/staff-chat";
import { DeleteVoiceButton } from "@/components/staff/DeleteVoiceButton";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await requireUser(["SECRETARY", "ADMIN"]);

  const messages = await prisma.message.findMany({
    where: {
      patientId: null,
      subject: { in: ["STAFF_CHAT", "STAFF_CHAT_VOICE"] },
      OR: [{ receiverId: user.id }, { senderId: user.id }],
    },
    include: {
      sender: { include: { role: true } },
      receiver: { include: { role: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const bySender = new Map<
    string,
    {
      name: string;
      role: string;
      items: typeof messages;
    }
  >();

  for (const m of messages) {
    const sender = m.sender;
    if (!sender || sender.id === user.id) continue;
    if (!bySender.has(sender.id)) {
      bySender.set(sender.id, {
        name: sender.fullName,
        role: roleLabelAr(sender.role.code),
        items: [],
      });
    }
    bySender.get(sender.id)!.items.push(m);
  }

  const groups = Array.from(bySender.values());

  return (
    <DashboardShell items={navSecretaryAr as never} userName={user.fullName}>
      <TopHeader
        title="رسائل الطاقم"
        subtitle="مرتبة حسب المرسل — استخدم الفقاعة العائمة للرد نصاً أو صوتياً"
      />
      {groups.length === 0 ? (
        <Card>
          <EmptyState
            title="لا توجد رسائل من الأطباء بعد"
            description="ستظهر هنا الرسائل النصية والصوتية مرتبة باسم المرسل ودوره."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <Card key={g.name + g.role}>
              <div className="mb-3 border-b border-border pb-2">
                <p className="font-bold text-navy">{g.name}</p>
                <p className="text-xs text-muted">{g.role}</p>
              </div>
              <ul className="space-y-3">
                {g.items.map((m) => (
                  <li
                    key={m.id}
                    className="rounded-xl bg-[#F7FAFC] px-3 py-2 text-sm"
                  >
                    <p className="text-[11px] text-muted font-latin" dir="ltr">
                      {m.createdAt.toLocaleString("en-GB")}
                    </p>
                    {m.kind === "VOICE" && m.audioUrl ? (
                      <div className="mt-2 space-y-2">
                        <audio
                          controls
                          src={m.audioUrl}
                          className="w-full max-w-md"
                        />
                        <DeleteVoiceButton
                          messageId={m.id}
                          csrfToken={user.csrfToken}
                        />
                      </div>
                    ) : (
                      <p className="mt-1 whitespace-pre-wrap text-navy">
                        {m.body}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
