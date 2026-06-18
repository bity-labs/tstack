/* eslint-disable @next/next/no-head-element, @next/next/no-img-element */
import type { CSSProperties, ReactNode } from "react";

interface BaseProps {
  children?: ReactNode;
  style?: CSSProperties;
}

interface ButtonProps extends BaseProps {
  href: string;
}

interface ImgProps {
  alt: string;
  height?: string | number;
  src: string;
  style?: CSSProperties;
  width?: string | number;
}

export function Html({ children }: BaseProps) {
  return <html lang="en">{children}</html>;
}

export function Head() {
  return <head />;
}

export function Preview({ children }: BaseProps) {
  return <div style={previewStyle}>{children}</div>;
}

export function Body({ children, style }: BaseProps) {
  return <body style={style}>{children}</body>;
}

export function Container({ children, style }: BaseProps) {
  return <div style={style}>{children}</div>;
}

export function Section({ children, style }: BaseProps) {
  return <div style={style}>{children}</div>;
}

export function Text({ children, style }: BaseProps) {
  return <p style={style}>{children}</p>;
}

export function Button({ children, href, style }: ButtonProps) {
  return (
    <a href={href} style={style} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

export function Img({ alt, height, src, style, width }: ImgProps) {
  return <img alt={alt} height={height} src={src} style={style} width={width} />;
}

const previewStyle: CSSProperties = {
  display: "none",
  maxHeight: 0,
  maxWidth: 0,
  opacity: 0,
  overflow: "hidden",
};
