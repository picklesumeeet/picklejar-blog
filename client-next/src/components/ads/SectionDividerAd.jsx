import Image from 'next/image';

const HOUSE_AD_HREF = 'https://coverageprofessor.com/';

export default function SectionDividerAd() {
  return (
    <div className="w-full my-12 h-[150px] lg:h-[200px]">
      <a href={HOUSE_AD_HREF} target="_blank" rel="noreferrer" className="block w-full h-full">
        <Image src="/ad.png" alt="Advertisement" width={1200} height={200} className="w-full h-full object-cover border border-[var(--line)] rounded-sm" />
      </a>
    </div>
  );
}
