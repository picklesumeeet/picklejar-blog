import Image from 'next/image';

const HOUSE_AD_HREF = 'https://coverageprofessor.com/';

export default function SectionDividerAd() {
  return (
    <div className="w-full my-12 flex justify-center">
      <div className="w-full max-w-[900px] aspect-[1742/463]">
        <a href={HOUSE_AD_HREF} target="_blank" rel="noreferrer" className="block w-full h-full">
          <Image src="/ad.png" alt="Advertisement" width={1742} height={463} className="w-full h-full object-contain border border-[var(--line)] rounded-sm" />
        </a>
      </div>
    </div>
  );
}
