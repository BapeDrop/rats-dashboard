import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();
const REDIS_KEY = "rats-dashboard:statuses";

// Shape: { [playerName]: { [YYYY-MM-DD]: { status, reason, updatedAt } } }
type DayStatus = { status: string; reason: string; updatedAt: string };
type AllData = Record<string, Record<string, DayStatus>>;

async function readData(): Promise<AllData> {
  try {
    const data = await redis.get<AllData>(REDIS_KEY);
    return data || {};
  } catch {
    return {};
  }
}

async function writeData(data: AllData) {
  await redis.set(REDIS_KEY, data);
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

  const validPlayers = ["WoolyLobster", "JohnnySins", "SpeedyLlama", "D00m5hr00m"];
  if (!validPlayers.includes(playerName)) {
    return NextResponse.json({ error: "Unknown player" }, { status: 400 });
  }

  const validStatuses = ["ACTIVE", "PROBABLE", "QUESTIONABLE", "OUT"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
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
