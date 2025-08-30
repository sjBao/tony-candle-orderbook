
"use client";

import { createChart, ColorType, IChartApi, ISeriesApi, SeriesType, SeriesOptionsMap, SeriesDefinition, LineSeries } from 'lightweight-charts';
import React, { createContext, forwardRef, useContext, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';

export const ChartContext = createContext<IChartApi | null>(null);

const ChartComponent = forwardRef((props: any, ref) => {
    const { children, ...rest } = props;
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const [chart, setChart] = useState<IChartApi | null>(null);

    useLayoutEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: 300,
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
    const [series, setSeries] = useState<ISeriesApi<T> | null>(null);


    useEffect(() => {
        if (!chart) return;
        const newSeries = chart?.addSeries(LineSeries);
        setSeries(newSeries);
        return () => chart.removeSeries(newSeries);
    }, [chart]);

    // Todo: Replace this with simulated live data once ready
    useEffect(() => {
        if (!series) return;

        const interval = setInterval(() => {
            const lastBar = series.data()[series.data().length - 1];
            const nextTime = lastBar ? lastBar.time + 60 : Math.floor(Date.now() / 1000);
            const nextValue = lastBar ? lastBar.value + (Math.random() - 0.5) * 2 : 100;

            series.update({ time: nextTime, value: nextValue });
        }, 100);

        return () => clearInterval(interval);
    }, [series]);

    return null;
}

export default function LightweightChart() {
    const chartRef = useRef<IChartApi>(null);

    useEffect(() => {
        if (chartRef.current) {
            const timeScale = chartRef.current.timeScale();
            console.log(timeScale.getVisibleRange());
        }
    }, []);

    return (
        <ChartComponent className="w-full" ref={chartRef}>
            <SeriesComponent />
        </ChartComponent>
    );
}
