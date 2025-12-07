'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface SparklineProps {
  data: Array<{ timestamp: string; value: number }>;
  width?: number;
  height?: number;
  showAxis?: boolean;
}

export default function Sparkline({ data, width, height = 40, showAxis = false }: SparklineProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(width || 400);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateWidth = () => {
      if (containerRef.current) {
        const newWidth = containerRef.current.clientWidth || 400;
        setContainerWidth(newWidth);
      }
    };

    updateWidth();
    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, [width]);

  useEffect(() => {
    if (!svgRef.current) return;

    const actualWidth = width || containerWidth;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', actualWidth);

    if (data.length === 0) return;

    const margin = showAxis 
      ? { top: 10, right: 10, bottom: 30, left: 40 }
      : { top: 2, right: 2, bottom: 2, left: 2 };
    const innerWidth = actualWidth - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Determine color based on trend - brighter, shinier green
    let isUp = true;
    let color = '#22c55e'; // Bright green
    let areaColor = 'rgba(34, 197, 94, 0.2)'; // Light green gradient
    
    if (data.length >= 2) {
      const last = data[data.length - 1].value;
      const prev = data[data.length - 2].value;
      isUp = last >= prev;
      if (!isUp) {
        color = '#ef4444'; // Red
        areaColor = 'rgba(239, 68, 68, 0.2)'; // Light red gradient
      }
    }

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Create scales
    const timeExtent = d3.extent(data, (d) => new Date(d.timestamp)) as [Date, Date];
    const valueExtent = d3.extent(data, (d) => d.value) as [number, number];
    
    // Handle edge case where all values are the same
    if (valueExtent[0] === valueExtent[1]) {
      valueExtent[1] = valueExtent[0] + 0.1;
    }

    const xScale = d3.scaleTime().domain(timeExtent).range([0, innerWidth]);
    const yScale = d3.scaleLinear().domain(valueExtent).nice().range([innerHeight, 0]);

    // Add grid lines
    if (showAxis) {
      // Horizontal grid lines
      const yTicks = yScale.ticks(5);
      g.selectAll('.grid-line-h')
        .data(yTicks)
        .enter()
        .append('line')
        .attr('class', 'grid-line-h')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', (d) => yScale(d))
        .attr('y2', (d) => yScale(d))
        .attr('stroke', '#e2e8f0')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '2,2');

      // Vertical grid lines
      const xTicks = xScale.ticks(5);
      g.selectAll('.grid-line-v')
        .data(xTicks)
        .enter()
        .append('line')
        .attr('class', 'grid-line-v')
        .attr('x1', (d) => xScale(d))
        .attr('x2', (d) => xScale(d))
        .attr('y1', 0)
        .attr('y2', innerHeight)
        .attr('stroke', '#e2e8f0')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '2,2');
    }

    // Create area generator for gradient fill
    const area = d3
      .area<{ timestamp: string; value: number }>()
      .x((d) => xScale(new Date(d.timestamp)))
      .y0(innerHeight) // Bottom of the chart
      .y1((d) => yScale(d.value))
      .curve(d3.curveMonotoneX);

    // Create line generator
    const line = d3
      .line<{ timestamp: string; value: number }>()
      .x((d) => xScale(new Date(d.timestamp)))
      .y((d) => yScale(d.value))
      .curve(d3.curveMonotoneX);

    // Add gradient definition
    const defs = svg.append('defs');
    const gradient = defs.append('linearGradient')
      .attr('id', `area-gradient-${isUp ? 'green' : 'red'}`)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    if (isUp) {
      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', 'rgba(34, 197, 94, 0.3)')
        .attr('stop-opacity', 1);
      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', 'rgba(34, 197, 94, 0.05)')
        .attr('stop-opacity', 1);
    } else {
      gradient.append('stop')
        .attr('offset', '0%')
        .attr('stop-color', 'rgba(239, 68, 68, 0.3)')
        .attr('stop-opacity', 1);
      gradient.append('stop')
        .attr('offset', '100%')
        .attr('stop-color', 'rgba(239, 68, 68, 0.05)')
        .attr('stop-opacity', 1);
    }

    // Draw area fill
    if (data.length > 1) {
      g.append('path')
        .datum(data)
        .attr('fill', `url(#area-gradient-${isUp ? 'green' : 'red'})`)
        .attr('d', area);
    }

    // Draw line
    if (data.length === 1) {
      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', yScale(data[0].value))
        .attr('y2', yScale(data[0].value))
        .attr('stroke', color)
        .attr('stroke-width', 2.5);
    } else {
      g.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 2.5)
        .attr('d', line);
    }

    // Add x-axis if showAxis is true
    if (showAxis) {
      const xAxis = d3.axisBottom(xScale)
        .ticks(5)
        .tickFormat(d3.timeFormat('%H:%M') as any);

      g.append('g')
        .attr('transform', `translate(0, ${innerHeight})`)
        .call(xAxis)
        .selectAll('text')
        .style('text-anchor', 'middle')
        .attr('fill', '#64748b')
        .attr('font-size', '11px');

      g.selectAll('.domain, .tick line')
        .attr('stroke', '#cbd5e1');
    }
  }, [data, width, containerWidth, height, showAxis]);

  return (
    <div ref={containerRef} className="w-full">
      <svg ref={svgRef} width={width || containerWidth} height={height} style={{ maxWidth: '100%', display: 'block' }} />
    </div>
  );
}
