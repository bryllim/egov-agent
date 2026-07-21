import type { Metadata } from "next";
import { Noto_Sans } from "next/font/google";
import { ViberDemo } from "./viber-demo";

const viberSans = Noto_Sans({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "eGov Agent on Viber — Integration Demo",
  description:
    "A desktop Viber integration demo featuring the eGov Agent public account.",
};

export default function ViberPage() {
  return (
    <div className={viberSans.className}>
      <ViberDemo />
    </div>
  );
}
