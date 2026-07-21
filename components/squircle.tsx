"use client";

import {
  Squircle as SquirclePrimitive,
  SquircleNoScript,
  type SquircleProps as PrimitiveSquircleProps,
} from "@squircle-js/react";
import type { ComponentPropsWithoutRef } from "react";

const DEFAULT_CORNER_RADIUS = 12;
const FULL_CORNER_SMOOTHING = 1;

type ShapeProps = Pick<
  PrimitiveSquircleProps,
  | "cornerRadius"
  | "cornerSmoothing"
  | "width"
  | "height"
  | "defaultWidth"
  | "defaultHeight"
>;

type SquircleProps = ComponentPropsWithoutRef<typeof SquirclePrimitive>;

export function Squircle({
  cornerRadius = DEFAULT_CORNER_RADIUS,
  cornerSmoothing = FULL_CORNER_SMOOTHING,
  ...props
}: SquircleProps) {
  return (
    <SquirclePrimitive
      cornerRadius={cornerRadius}
      cornerSmoothing={cornerSmoothing}
      {...props}
    />
  );
}

type SquircleButtonProps = ComponentPropsWithoutRef<"button"> & ShapeProps;

export function SquircleButton({
  cornerRadius = DEFAULT_CORNER_RADIUS,
  cornerSmoothing = FULL_CORNER_SMOOTHING,
  width,
  height,
  defaultWidth,
  defaultHeight,
  ...buttonProps
}: SquircleButtonProps) {
  return (
    <SquirclePrimitive
      asChild
      cornerRadius={cornerRadius}
      cornerSmoothing={cornerSmoothing}
      width={width}
      height={height}
      defaultWidth={defaultWidth}
      defaultHeight={defaultHeight}
    >
      <button {...buttonProps} />
    </SquirclePrimitive>
  );
}

export { SquircleNoScript };
