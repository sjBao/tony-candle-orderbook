
"use client";

import { CandlestickData, CandlestickSeries, ColorType, createChart, IChartApi, UTCTimestamp } from 'lightweight-charts';
import { createContext, forwardRef, useContext, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';

export const ChartContext = createContext<IChartApi | null>(null);

const ChartComponent = forwardRef((props: any, ref) => {
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

    // Todo:  Replace this with simulated live data once ready
    useEffect(() => {
        if (!series) return;
        // Start with 5 candles, beginning at the current time, 1 minute apart
        const now = new Date();
        let data: CandlestickData[] = [];
        let base = 100;
        for (let i = 0; i < 5; i++) {
            const candleTime = new Date(now.getTime() + i * 60000); // 1 minute increments
            const open = base + (Math.random() - 0.5) * 4;
            const close = open + (Math.random() - 0.5) * 4;
            const high = Math.max(open, close) + Math.random() * 2;
            const low = Math.min(open, close) - Math.random() * 2;
            data.push({
                time: candleTime.getTime() as UTCTimestamp,
                open,
                high,
                low,
                close,
            });
            base = close;
        }
        series.setData(data);

        // Simulate real-time updates every 60 seconds (standard 1m interval)
        let lastTime = new Date(now.getTime() + 4 * 60000); // last candle's time
        let lastClose = data[data.length - 1].close;
        const interval = setInterval(() => {
            lastTime = new Date(lastTime.getTime() + 60000); // increment by 1 minute
            const time = lastTime.getTime() as UTCTimestamp;
            const open = lastClose;
            const close = open + (Math.random() - 0.5) * 4;
            const high = Math.max(open, close) + Math.random() * 2;
            const low = Math.min(open, close) - Math.random() * 2;
            const newCandle: CandlestickData = {
                time,
                open,
                high,
                low,
                close,
            };
            series.update(newCandle);
            lastClose = close;
        }, 60000);
        return () => clearInterval(interval);
    }, [series]);

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
