import Image from "next/image";

export default function Logo() {
  return (
    <Image
      src="/logo.png"
      alt="TradeBishi"
      width={180}
      height={60}
      priority
    />
  );
}