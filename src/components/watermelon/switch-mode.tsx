"use client";

import { useEffect, useState, type FC } from "react";
import { motion } from "motion/react";
import { IoMoon, IoMoonOutline, IoSunny, IoSunnyOutline } from "react-icons/io5";
import { useTheme } from "@/hooks/useTheme";

/* --- Props --- */
interface SwitchModeProps {
    width?: number;
    height?: number;
    darkColor?: string;
    lightColor?: string;
    knobDarkColor?: string;
    knobLightColor?: string;
    borderDarkColor?: string;
    borderLightColor?: string;
}

export const SwitchMode: FC<SwitchModeProps> = ({
    width = 108,
    height = 54,
    darkColor = "var(--card)",
    lightColor = "var(--background)",
    knobDarkColor = "var(--muted)",
    knobLightColor = "var(--card)",
    borderDarkColor = "var(--border)",
    borderLightColor = "var(--border)",
}) => {
    const [mounted, setMounted] = useState(false);
    const { theme, toggleTheme } = useTheme();

    useEffect(() => {
        requestAnimationFrame(() => setMounted(true));
    }, []);

    if (!mounted) {
        return <div style={{ width, height }} className="rounded-full border-2 border-transparent" />;
    }

    const isDark = theme === "dark";
    const iconSize = height * 0.45;

    return (
        <motion.button
            onClick={toggleTheme}
            type="button"
            role="switch"
            aria-checked={isDark}
            aria-label="Toggle dark mode"
            title={isDark ? "Switch to light theme" : "Switch to dark theme"}
            className="text-foreground relative flex cursor-pointer items-center rounded-full border-2 transition-colors"
            style={{
                width,
                height,
                borderColor: isDark ? borderDarkColor : borderLightColor,
            }}
        >
            {/* TRACK */}
            <motion.div
                className="absolute inset-0 rounded-full"
                animate={{ backgroundColor: isDark ? darkColor : lightColor }}
                transition={{ duration: 0.4 }}
            />

            {/* SLIDING KNOB */}
            <motion.div
                layout
                layoutId="switch-knob"
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
                className="absolute rounded-full border-2 z-30"
                style={{
                    width: height,
                    height,
                    right: isDark ? -2 : undefined,
                    left: isDark ? undefined : -2,
                    backgroundColor: isDark ? knobDarkColor : knobLightColor,
                    borderColor: isDark ? borderDarkColor : borderLightColor,
                }}
            />

            {/* SUN */}
            <motion.div
                className="relative z-30 flex items-center justify-center"
                style={{ width: height, height }}
                animate={{ rotate: isDark ? 45 : 0 }}
                transition={{ stiffness: 20 }}
            >
                {isDark ? (
                    <IoSunnyOutline
                        color="currentColor"
                        fill="currentColor"
                        stroke="currentColor"
                        style={{ width: iconSize, height: iconSize }}
                        className="transition-colors duration-200"
                    />
                ) : (
                    <IoSunny
                        color="currentColor"
                        fill="currentColor"
                        style={{ width: iconSize, height: iconSize }}
                        className="transition-colors duration-200"
                    />
                )}
            </motion.div>

            {/* MOON */}
            <motion.div
                className="relative z-30 flex items-center justify-center"
                style={{ width: height, height }}
                animate={{ rotate: isDark ? 0 : 15 }}
                transition={{ stiffness: 20, damping: 14 }}
            >
                {isDark ? (
                    <IoMoon
                        color="currentColor"
                        fill="currentColor"
                        style={{ width: iconSize, height: iconSize }}
                        className="transition-colors duration-200"
                    />
                ) : (
                    <IoMoonOutline
                        color="currentColor"
                        fill="currentColor"
                        stroke="currentColor"
                        style={{ width: iconSize, height: iconSize }}
                        className="transition-colors duration-200"
                    />
                )}
            </motion.div>
        </motion.button>
    );
};


