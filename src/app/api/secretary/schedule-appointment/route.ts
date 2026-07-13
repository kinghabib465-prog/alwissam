import { NextResponse } from "next/server";

/** تحديد الموعد من حساب منانة فقط — تجنّب تناقض الصلاحيات */
export async function POST() {
  return NextResponse.json(
    { error: "تحديد الموعد من حساب الطبيبة منانة فقط" },
    { status: 403 },
  );
}

export async function PATCH() {
  return NextResponse.json(
    { error: "تعديل الموعد من حساب الطبيبة منانة فقط" },
    { status: 403 },
  );
}
