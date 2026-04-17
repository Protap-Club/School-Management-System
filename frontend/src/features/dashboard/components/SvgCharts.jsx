import React from 'react';
import { motion } from 'framer-motion';

/**
 * A simple, elegant circular progress chart for percentages.
 */
export const CircularProgress = ({
  value = 0,
  size = 120,
  strokeWidth = 10,
  color = '#4f46e5',
  label = 'Attendance'
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(0,0,0,0.05)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress Circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-black text-gray-900 leading-none">{value}%</span>
        {label && <span className="text-[10px] uppercase tracking-tighter font-bold text-gray-400 mt-1">{label}</span>}
      </div>
    </div>
  );
};

/**
 * A minimalistic sparkline for trends.
 */
export const Sparkline = ({
  data = [30, 40, 35, 50, 49, 60, 70, 91, 125],
  width = 100,
  height = 40,
  color = '#4f46e5'
}) => {
  if (!data || data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);

  const points = data.map((val, i) => {
    const x = i * stepX;
    const y = height - ((val - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <motion.polyline
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 2, ease: "easeInOut" }}
      />
    </svg>
  );
};

/**
 * A clean bar chart for simple comparisons.
 */
export const MiniBarChart = ({
  data = [],
  width = '100%',
  height = 160,
  barColor = 'rgba(79, 70, 229, 0.8)'
}) => {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data.map(d => d.value));

  return (
    <div className="flex items-end justify-between gap-1 w-full" style={{ height }}>
      {data.map((item, i) => {
        const barHeight = (item.value / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
            <div className="relative w-full flex flex-col items-center justify-end h-full">
              {/* Tooltip-like value */}
              <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-gray-900 text-white text-[10px] px-2 py-1 rounded pointer-events-none font-bold">
                {item.value}
              </div>

              <motion.div
                className="w-full rounded-t-sm"
                style={{ backgroundColor: item.color || barColor }}
                initial={{ height: 0 }}
                animate={{ height: `${barHeight}%` }}
                transition={{ duration: 1, delay: i * 0.05 }}
              />
            </div>
            {item.label && <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter truncate w-full text-center">{item.label}</span>}
          </div>
        );
      })}
    </div>
  );
};
