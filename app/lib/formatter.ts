export type NumberFormatter = (value: number | string) => string;

export const PRESETS = {
  "$0,0.00": {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  },
  "0,0.00": {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  },
  "0.00": {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: false,
  },
  "$0.00": {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: false,
  },
  "0%": {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  },
  "0.00%": {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  },
};

export type Preset = keyof typeof PRESETS;

export interface FormatterOptions extends Intl.NumberFormatOptions {
  preset?: Preset;
}

export function createFormatter(options: FormatterOptions): NumberFormatter {
  return (value: number | string) => {
    const presetOptions = options.preset ? PRESETS[options.preset] : {};
    const resolvedOptions: Intl.NumberFormatOptions = { ...presetOptions, ...options };

    const numberValue = typeof value === 'string' ? parseFloat(value) : value;

    return new Intl.NumberFormat('en-US', resolvedOptions).format(numberValue);
  };
}