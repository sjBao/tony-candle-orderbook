import { UTCTimestamp } from "lightweight-charts";
import { CandleMsg } from "../components/WebSocketProvider";

export function getMockHistoricalCandleData(): CandleMsg['candle'][] {
  const now = Date.now()
  return Array.from({ length: 40 }, (_, i) => ({
    // interval 1 minute apart
    time: (now - (i + 1 * 60 * 1000)) / 1000 as UTCTimestamp,
    open: 100 + Math.random() * 1,
    high: 101 + Math.random() * 1,
    low: 99 + Math.random() * 1,
    close: 100 + Math.random() * 1,
  })).toReversed();
}
