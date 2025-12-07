'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface OutcomeData {
  name: string;
  color: string;
  data: Array<{ timestamp: string; value: number }>;
}

interface MultiOutcomeSparklineProps {
  outcomes: OutcomeData[];
  width?: number;
  height?: number;
  showAxis?: boolean;
}

export default function MultiOutcomeSparkline({ outcomes, width, height = 150, showAxis = true }: MultiOutcomeSparklineProps) {
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
    if (!svgRef.current || outcomes.length === 0) return;

    const actualWidth = width || containerWidth;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', actualWidth);

    // Combine all timestamps
    const allTimestamps = new Set<string>();
    outcomes.forEach((outcome) => {
      outcome.data.forEach((d) => allTimestamps.add(d.timestamp));
    });
    const sortedTimestamps = Array.from(allTimestamps).sort();

    const margin = showAxis 
      ? { top: 10, right: 10, bottom: 30, left: 40 }
      : { top: 2, right: 2, bottom: 2, left: 2 };
    const innerWidth = actualWidth - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create defs and g after clearing
    const defs = svg.append('defs');
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Create scales
    const timeExtent = sortedTimestamps.length > 0
      ? [new Date(sortedTimestamps[0]), new Date(sortedTimestamps[sortedTimestamps.length - 1])] as [Date, Date]
      : [new Date(), new Date()];
    
    const maxValue = Math.max(
      ...outcomes.flatMap(o => o.data.map(d => d.value)),
      0.1
    );
    const valueExtent: [number, number] = [0, maxValue];

    const xScale = d3.scaleTime().domain(timeExtent).range([0, innerWidth]);
    const yScale = d3.scaleLinear().domain(valueExtent).nice().range([innerHeight, 0]);

    // Add grid lines
    if (showAxis) {
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


    // Third pass: Draw all lines on top
    outcomes.forEach((outcome, index) => {
      const line = d3
        .line<{ timestamp: string; value: number }>()
        .x((d) => xScale(new Date(d.timestamp)))
        .y((d) => yScale(d.value))
        .curve(d3.curveMonotoneX);

      if (outcome.data.length === 1) {
        g.append('line')
          .attr('x1', 0)
          .attr('x2', innerWidth)
          .attr('y1', yScale(outcome.data[0].value))
          .attr('y2', yScale(outcome.data[0].value))
          .attr('stroke', outcome.color)
          .attr('stroke-width', 2.5);
      } else if (outcome.data.length > 1) {
        g.append('path')
          .datum(outcome.data)
          .attr('fill', 'none')
          .attr('stroke', outcome.color)
          .attr('stroke-width', 2.5)
          .attr('d', line);
      }
    });

    // Add x-axis
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
  }, [outcomes, width, containerWidth, height, showAxis]);

  return (
    <div ref={containerRef} className="w-full">
      <svg ref={svgRef} width={width || containerWidth} height={height} style={{ maxWidth: '100%', display: 'block' }} />
    </div>
  );
}

