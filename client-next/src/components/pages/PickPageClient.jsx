"use client";

import Link from 'next/link';
import Image from 'next/image';

import ArticleAdCard from '@/components/shared/ArticleAdCard';
import PostTitle from '@/components/shared/Typography/PostTitle';
import { optimizeCloudinaryUrl } from '@/utils/optimizeCloudinaryUrl';
import { renderInlineMarkdown } from '@/utils/renderInlineMarkdown';

export default function PickPageClient({ vertical, pick, morePosts, ads, formattedDate }) {

  return (
    <div className="bg-white min-h-screen pb-20">

      {/* HEADER */}
      <div className="max-w-4xl mx-auto px-6 pt-16 pb-10 text-center flex flex-col items-center">
        {vertical ? (
          <Link
            href={`/${vertical.slug}`}
            className="inline-block bg-[var(--green)] text-white px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-6 hover:bg-green-700 transition-colors"
          >
            {vertical.name}
          </Link>
        ) : (
          <span className="inline-block bg-[var(--green)] text-white px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-6">
            Editor&rsquo;s Pick
          </span>
        )}

        <h1 className="text-5xl md:text-6xl lg:text-[4rem] leading-[1.1] font-bold font-serif text-[var(--ink)] mb-6 max-w-3xl">
          {pick.title}
        </h1>

        {pick.excerpt && (
          <p className="text-xl md:text-2xl text-gray-600 italic font-serif max-w-2xl mb-8">
            {pick.excerpt}
          </p>
        )}

        <div className="w-full border-t border-b border-gray-300 py-4 flex justify-center items-center gap-3 text-xs font-bold tracking-widest text-gray-500 uppercase font-sans">
          <span>By {pick.author}</span>
          <span className="text-gray-300">·</span>
          <span>{formattedDate}</span>
          <span className="text-gray-300">·</span>
          <Link href="#disclosure" className="text-[var(--green)] hover:text-[var(--green-dark)] normal-case tracking-normal">
            Advertising Disclosure
          </Link>
        </div>
      </div>

      {/* HERO IMAGE */}
      {pick.heroImage && (
        <div className="max-w-6xl mx-auto px-6 mb-12">
          <Image
            src={optimizeCloudinaryUrl(pick.heroImage, { width: 1200, crop: 'fill' })}
            alt={pick.title}
            width={1200}
            height={514}
            className="w-full aspect-[21/9] object-cover object-center"
            priority
          />
        </div>
      )}

      {/* TWO COLUMN: PICK BODY + STICKY SIDEBAR */}
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-16">

        <article className="lg:col-span-8 lg:pr-8">
          {/* INTRO */}
          <div className="text-lg md:text-xl font-serif text-gray-800 leading-relaxed mb-12">
            {pick.intro.map((p, i) => (
              <p key={i} className="mb-6">{renderInlineMarkdown(p)}</p>
            ))}
          </div>

          {/* NUMBERED ITEMS */}
          <ol className="list-none p-0 m-0">
            {pick.items.map((item, i) => (
              <li key={i} className="mb-14">
                <h2 className="font-sans font-bold text-3xl md:text-4xl text-[var(--ink)] mb-6 leading-tight">
                  <span className="text-[var(--green)] mr-2">{i + 1}.</span>
                  {item.title}
                </h2>

                {item.image ? (
                  <div className="w-full aspect-[16/9] mb-6 overflow-hidden rounded-sm border border-[var(--line)] bg-gray-100">
                    <Image
                      src={optimizeCloudinaryUrl(item.image, { width: 900, crop: 'fill' })}
                      alt={item.title}
                      width={900}
                      height={506}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full aspect-[16/9] mb-6 rounded-sm border-2 border-dashed border-[var(--gray-2)] bg-[var(--bg)] flex items-center justify-center text-[var(--gray-2)] font-bold text-xs tracking-widest uppercase">
                    Image Placeholder — Item {i + 1}
                  </div>
                )}

                <div className="text-lg md:text-xl font-serif text-gray-800 leading-relaxed">
                  {item.paragraphs.map((p, j) => (
                    <p key={j} className="mb-6">{renderInlineMarkdown(p)}</p>
                  ))}
                </div>

                {item.proTip && (() => {
                  const hasInlineLink = /\[[^\]]+\]\([^)]+\)/.test(item.proTip.text || '');
                  const body = hasInlineLink || !item.proTip.url
                    ? renderInlineMarkdown(item.proTip.text)
                    : (
                      <a
                        href={item.proTip.url}
                        target="_blank"
                        rel="sponsored noreferrer"
                        className="text-[var(--green)] font-semibold underline underline-offset-2 hover:text-[var(--green-dark)]"
                      >
                        {item.proTip.text}
                      </a>
                    );
                  return (
                    <p className="text-lg md:text-xl font-serif text-gray-800 leading-relaxed">
                      <strong className="font-sans font-bold not-italic">Pro Tip:</strong>{' '}
                      {body}
                    </p>
                  );
                })()}
              </li>
            ))}
          </ol>

          {/* DISCLOSURE */}
          <div id="disclosure" className="mt-16 pt-8 border-t border-[var(--line)]">
            <p className="text-xs text-gray-500 font-sans leading-relaxed">
              {pick.disclosure}
            </p>
          </div>
        </article>

        {/* STICKY SIDEBAR */}
        <aside className="lg:col-span-4 relative">
          <div className="sticky top-4 flex flex-col">
            <div className="min-h-[400px]">
              <ArticleAdCard ad={ads[0]} />
            </div>
            <div className="min-h-[400px]">
              <ArticleAdCard ad={ads[1]} />
            </div>
          </div>
        </aside>

      </div>

      {/* MORE FROM VERTICAL */}
      {vertical && morePosts.length > 0 && (
        <div className="max-w-6xl mx-auto px-6 mt-20 pt-16 border-t-[3px] border-[var(--ink)]">
          <div className="flex items-center gap-2 mb-8 justify-center">
            <div className="w-1.5 h-4 bg-[var(--green)]"></div>
            <h2 className="text-xl font-bold tracking-widest text-[var(--ink)] uppercase font-sans">
              More From {vertical.name}
            </h2>
            <div className="w-1.5 h-4 bg-[var(--green)]"></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            {morePosts.map(post => (
              <Link
                key={post._id}
                href={`/${vertical.slug}/${post.slug}`}
                className="group flex flex-col transition-all duration-200 ease-in-out hover:bg-gray-50 hover:shadow-md hover:scale-[1.01] rounded-xl p-4 -mx-4 -my-4"
              >
                {post.bannerImage ? (
                  <Image
                    src={optimizeCloudinaryUrl(post.bannerImage, { width: 400, crop: 'fill' })}
                    alt={post.title}
                    width={400}
                    height={300}
                    className="w-full aspect-[4/3] object-cover mb-4 rounded-sm"
                  />
                ) : (
                  <div className="w-full aspect-[4/3] bg-gray-100 border border-[var(--line)] mb-4 flex items-center justify-center text-gray-400 text-xs rounded-sm">
                    No Image
                  </div>
                )}
                <div className="flex flex-col flex-1">
                  <PostTitle title={post.title} size="small" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
