
"use client";

import React, { useState } from "react";

import { motion } from "framer-motion";

import { cn } from "../../lib/utils";

// Color palette
const colors = [

  "rgb(125 211 252)", // sky-300

  "rgb(249 168 212)", // pink-300

  "rgb(134 239 172)", // green-300

  "rgb(253 224 71)",  // yellow-300

  "rgb(252 165 165)", // red-300

  "rgb(216 180 254)", // purple-300

  "rgb(147 197 253)", // blue-300

  "rgb(165 180 252)", // indigo-300

  "rgb(196 181 253)", // violet-300

];

const getRandomColor = () => {

  return colors[Math.floor(Math.random() * colors.length)];

};

// Individual Box component that can use hooks
const Box = ({ rowIndex, colIndex }: { rowIndex: number; colIndex: number }) => {

  const [hoverColor, setHoverColor] = useState<string | null>(null);

  return (

    <motion.div

      initial={{

        backgroundColor: "transparent",

      }}

      animate={{

        backgroundColor: hoverColor || "transparent",

        transition: { duration: 0.2 },

      }}

      whileHover={{

        scale: 1.02,

        transition: { duration: 0.15 },

      }}

      onMouseEnter={() => {

        setHoverColor(getRandomColor());

      }}

      onMouseLeave={() => {

        setHoverColor(null);

      }}

      className="w-16 h-8 border-r border-t border-slate-700 relative cursor-pointer"

    >

      {colIndex % 2 === 0 && rowIndex % 2 === 0 ? (

        <svg

          xmlns="http://www.w3.org/2000/svg"

          fill="none"

          viewBox="0 0 24 24"

          strokeWidth="1.5"

          stroke="currentColor"

          className="absolute h-6 w-10 -top-[14px] -left-[22px] text-slate-700 stroke-[1px] pointer-events-none"

        >

          <path

            strokeLinecap="round"

            strokeLinejoin="round"

            d="M12 6v12m6-6H6"

          />

        </svg>

      ) : null}

    </motion.div>

  );

};

export const BoxesCore = ({ className, ...rest }: { className?: string }) => {

  const rows = new Array(150).fill(1);

  const cols = new Array(100).fill(1);

  return (

    <div

      style={{

        transform: `translate(-40%,-60%) skewX(-48deg) skewY(14deg) scale(0.675) rotate(0deg) translateZ(0)`,

      }}

      className={cn(

        "absolute left-1/4 p-4 -top-1/4 flex -translate-x-1/2 -translate-y-1/2 w-full h-full",

        className

      )}

      {...rest}

    >

      {rows.map((_, i) => (

        <motion.div

          key={`row` + i}

          className="w-16 h-8 border-l border-slate-700 relative"

        >

          {cols.map((_, j) => (

            <Box key={`col-${i}-${j}`} rowIndex={i} colIndex={j} />

          ))}

        </motion.div>

      ))}

    </div>

  );

};

export const Boxes = React.memo(BoxesCore);
