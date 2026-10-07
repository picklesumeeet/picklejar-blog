import Link from 'next/link';
import Image from 'next/image';
import PostTitle from '../shared/Typography/PostTitle';
import { optimizeCloudinaryUrl } from '../../utils/optimizeCloudinaryUrl';

// Light-themed sibling of SportsSection — surfaces the "Money" umbrella
// (Make / Save / Budget) as one block on the homepage. Posts come in already
// mixed and sorted by publish_date in page.js.
export default function FinanceSection({ data }) {
  if (!data) return null;
  const { posts = [] } = data;
  if (posts.length === 0) return null;

  const heroPost = posts[0];
  const listPosts = posts.slice(1, 7);
  const secondaryPosts = posts.slice(7, 11);

  return (
    <section className="w-full mb-12 font-[var(--font-ui)]">
      <div className="bg-white rounded-lg p-8 shadow-sm border border-[var(--line)]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold tracking-widest text-[var(--green)] uppercase font-sans">Money</h2>
          <Link
            href="/finance"
            className="text-xs font-bold tracking-widest uppercase text-[var(--ink)] hover:text-[var(--green)] transition-colors"
          >
            View all →
          </Link>
        </div>

        <div className="flex flex-col lg:flex-row items-stretch gap-8 border-t border-[var(--line)] pt-8">

          {/* LEFT: Hero Post */}
          <div className="w-full lg:w-[45%] flex flex-col lg:pr-8 lg:border-r border-[var(--line)]">
            <Link
              href={`/${heroPost.vertical?.slug ?? ''}/${heroPost.slug}`}
              className="group block mb-6 transition-all duration-200 ease-in-out hover:bg-[var(--bg-2)]/50 hover:shadow-md rounded-xl p-4 -mx-4 -mt-4"
            >
              {heroPost.bannerImage ? (
                <Image
                  src={optimizeCloudinaryUrl(heroPost.bannerImage, { width: 600, crop: 'fill' })}
                  alt={heroPost.title}
                  width={600}
                  height={337}
                  className="w-full aspect-[16/9] object-cover mb-4 rounded-sm"
                />
              ) : (
                <div className="w-full aspect-[16/9] bg-[var(--bg-2)] border border-[var(--line)] mb-4 flex items-center justify-center text-[var(--gray-2)] rounded-sm">No Image</div>
              )}
              {heroPost.vertical && (
                <div className="mb-3">
                  <span className="inline-block bg-[var(--green)] text-white px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase">
                    {heroPost.vertical.name}
                  </span>
                </div>
              )}
              <PostTitle title={heroPost.title} size="hero" className="mb-3 text-3xl leading-tight !text-[var(--ink)] group-hover:!text-[var(--green)]" />
              {heroPost.excerpt && (
                <p className="text-[var(--gray)] text-sm leading-relaxed">
                  {heroPost.excerpt}
                </p>
              )}
            </Link>
          </div>

          {/* MIDDLE: List Posts */}
          <div className="w-full lg:w-[30%] flex flex-col lg:pr-8 lg:border-r border-[var(--line)]">
            <div className="flex flex-col">
              {listPosts.map((post, idx) => (
                <div key={post._id} className={idx !== 0 ? 'border-t border-[var(--line)] py-2' : 'pb-2 pt-0'}>
                  <Link
                    href={`/${post.vertical?.slug ?? ''}/${post.slug}`}
                    className="group block transition-all duration-200 ease-in-out hover:bg-[var(--bg-2)]/50 hover:shadow-sm rounded-xl p-3 -mx-3"
                  >
                    {post.vertical && (
                      <div className="text-[10px] tracking-[1px] text-[var(--green)] font-bold mb-1 uppercase">
                        {post.vertical.name}
                      </div>
                    )}
                    <PostTitle title={post.title} size="medium" className="!text-[var(--ink)] group-hover:!text-[var(--green)] leading-snug" />
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: Secondary post list (compact) */}
          <div className="w-full lg:w-[25%] flex flex-col">
            {secondaryPosts.length > 0 && (
              <div className="bg-[var(--bg-2)]/50 border-t-[3px] border-t-[var(--green)] border border-[var(--line)] rounded-sm py-4 px-5">
                <div className="text-lg font-bold tracking-widest text-[var(--green)] mb-4 uppercase font-sans">More Money</div>
                <div className="flex flex-col">
                  {secondaryPosts.map((post, idx) => (
                    <div key={post._id} className={idx !== 0 ? 'border-t border-[var(--line)] py-2' : 'pb-2 pt-0'}>
                      <Link
                        href={`/${post.vertical?.slug ?? ''}/${post.slug}`}
                        className="group block transition-all duration-200 ease-in-out hover:bg-white hover:shadow-sm rounded-xl p-2 -mx-2"
                      >
                        <PostTitle title={post.title} size="small" className="!text-[var(--ink)] group-hover:!text-[var(--green)] leading-snug" />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}
