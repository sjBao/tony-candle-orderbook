"use client";

import { CandlestickData, CandlestickSeries, ColorType, createChart, IChartApi, UTCTimestamp } from 'lightweight-charts';
import { createContext, forwardRef, PropsWithChildren, useContext, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { useWebSocketSubscription, CandleMsg } from './WebSocketProvider';

export const ChartContext = createContext<IChartApi | null>(null);

const ChartComponent = forwardRef((props: PropsWithChildren<{className: string}>, ref) => {
  const { children, ...rest } = props;
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chart, setChart] = useState<IChartApi | null>(null);

  useLayoutEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      timeScale: {
        timeVisible: true,
        secondsVisible: true,
      },
      width: chartContainerRef.current.clientWidth,
      height: 1000,
      layout: {
        background: { type: ColorType.Solid, color: '#0F0F0F' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: {
          color: 'rgba(42, 46, 57, 0)',
        },
        horzLines: {
          color: 'rgba(42, 46, 57, 0.6)',
        },
      },
    });

    chart.timeScale().fitContent();
    setChart(chart);

    return () => {
      chart.remove();
    };
  }, []);

  useImperativeHandle(ref, () => chart, [chart]);

  useEffect(() => {
    if (!chart) return;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [chart]);

  return (
    <ChartContext.Provider value={chart}>
      <div ref={chartContainerRef} {...rest} />
      {children}
    </ChartContext.Provider>
  );
});

ChartComponent.displayName = 'ChartComponent';

export function SeriesComponent() {
  const chart = useContext(ChartContext);
  const [series, setSeries] = useState<ReturnType<IChartApi['addSeries']> | null>(null);
  const [candles, setCandles] = useState<CandlestickData[]>([]);

  useEffect(() => {
    if (!chart) return;
    const newSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderDownColor: "#ef5350",
      borderUpColor: "#26a69a",
      wickDownColor: "#ef5350",
      wickUpColor: "#26a69a",
      title: "BTC/USD",
    });
    setSeries(newSeries);
    return () => chart.removeSeries(newSeries);
  }, [chart]);

  useEffect(() => {
    if (!series) return;
    series.setData(candles);
  }, [series, candles]);

  useWebSocketSubscription<CandleMsg>('candle', (msg) => {
    if (msg.candle) {
      setCandles(prev => [
        ...prev,
        {
          time: Math.floor(msg.candle.time / 1000) as UTCTimestamp,
          open: msg.candle.open,
          high: msg.candle.high,
          low: msg.candle.low,
          close: msg.candle.close,
        }
      ]);
    }
  });

  return null;
}

export default function LightweightChart() {
  const chartRef = useRef<IChartApi>(null);

  return (
    <ChartComponent ref={chartRef} className="w-full">
      <SeriesComponent />
    </ChartComponent>
  );
}
