import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_FILE = path.join("/tmp", "rats-statuses-v2.json");

// Shape: { [playerName]: { [YYYY-MM-DD]: { status, reason, updatedAt } } }
type DayStatus = { status: string; reason: string; updatedAt: string };
type AllData = Record<string, Record<string, DayStatus>>;

async function readData(): Promise<AllData> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeData(data: AllData) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

export async function GET() {
  const statuses = await readData();
  return NextResponse.json({ statuses });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { playerName, day, status, reason } = body;

  if (!playerName || !day || !status) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const data = await readData();
  if (!data[playerName]) data[playerName] = {};
  data[playerName][day] = {
    status,
    reason: reason || "",
    updatedAt: new Date().toISOString(),
  };

  await writeData(data);
  return NextResponse.json({ success: true, statuses: data });
}
