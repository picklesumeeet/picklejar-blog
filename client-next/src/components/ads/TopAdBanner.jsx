import Image from 'next/image';

const HOUSE_AD_HREF = 'https://coverageprofessor.com/';

export default function TopAdBanner() {
  return (
    <div className="w-full bg-[var(--bg-2)] flex justify-center py-4 border-b border-[var(--line)]">
      <div className="w-full max-w-[728px] aspect-[1742/463]">
        <a href={HOUSE_AD_HREF} target="_blank" rel="noreferrer" className="block w-full h-full">
          <Image src="/ad.png" alt="Advertisement" width={1742} height={463} className="w-full h-full object-contain" priority />
        </a>
      </div>
    </div>
  );
}
