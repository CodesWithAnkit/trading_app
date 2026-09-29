import { z } from "zod";

export const CandleSchema = z.object({
  symbol: z.string().min(1, "Symbol is required"),
  exchange: z.literal("NSE"),
  timeframe: z.enum(["1m", "5m"]),
  timestamp: z.string().datetime(),
  open: z.number().positive(),
  high: z.number().positive(),
  low: z.number().positive(),
  close: z.number().positive(),
  volume: z.number().min(0, "Volume cannot be negative"),
  isComplete: z.boolean(),
}).superRefine((data, ctx) => {
  const maxBody = Math.max(data.open, data.close);
  const minBody = Math.min(data.open, data.close);

  if (data.high < maxBody) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `High (${data.high}) cannot be less than max(open, close) (${maxBody})`,
      path: ["high"],
    });
  }

  if (data.low > minBody) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Low (${data.low}) cannot be greater than min(open, close) (${minBody})`,
      path: ["low"],
    });
  }
});

export type Candle = z.infer<typeof CandleSchema>;
