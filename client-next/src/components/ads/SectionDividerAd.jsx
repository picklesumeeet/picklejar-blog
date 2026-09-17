"use client";

import Image from 'next/image';
import { optimizeCloudinaryUrl } from '../../utils/optimizeCloudinaryUrl';

const HOUSE_AD_HREF = 'https://coverageprofessor.com/';

export default function SectionDividerAd({ data: ad }) {

  return (
    <div className="w-full my-12 h-[150px] lg:h-[200px]">
      {ad ? (
        <a href={ad.ctaUrl || '#'} target="_blank" rel="noreferrer" className="block w-full h-full">
          {ad.image ? (
            <Image src={optimizeCloudinaryUrl(ad.image, { width: 1200, crop: 'fill' })} alt={ad.ctaText || 'Advertisement'} width={1200} height={200} className="w-full h-full object-cover border border-[var(--line)] rounded-sm" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-blue-900 to-indigo-800 flex items-center justify-center text-white text-2xl font-bold rounded-sm border border-[var(--line)]">
              {ad.ctaText || 'Advertisement'}
            </div>
          )}
        </a>
      ) : (
        <a href={HOUSE_AD_HREF} target="_blank" rel="noreferrer" className="block w-full h-full">
          <Image src="/ad.png" alt="Advertisement" width={1200} height={200} className="w-full h-full object-cover border border-[var(--line)] rounded-sm" />
        </a>
      )}
    </div>
  );
}
