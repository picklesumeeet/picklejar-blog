import Link from 'next/link';
import Image from 'next/image';
import { optimizeCloudinaryUrl } from '../../utils/optimizeCloudinaryUrl';

// Sticky "On This Page" sidebar — shows editor-flagged posts across all
// verticals. Sticks within whatever parent flex container wraps it; naturally
// stops when the parent ends (so place the parent above the sections you want
// it to live alongside).
export default function EditorsPickSidebar({ posts = [] }) {
  if (posts.length === 0) return null;

  return (
    <aside className="hidden lg:block w-full lg:w-[300px] shrink-0">
      <div className="sticky top-20">
        <div className="bg-white border border-[var(--line)] rounded-lg p-5 shadow-sm">
          <h3 className="text-sm font-bold tracking-widest text-[var(--green)] uppercase font-sans mb-4 pb-3 border-b border-[var(--line)]">
            On This Page
          </h3>
          <div className="flex flex-col gap-4">
            {posts.map(post => (
              <Link
                key={post._id}
                href={`/${post.vertical?.slug ?? ''}/${post.slug}`}
                className="group flex gap-3 items-start transition-colors hover:bg-[var(--bg-2)]/40 -mx-2 px-2 py-2 rounded-md"
              >
                {post.bannerImage ? (
                  <Image
                    src={optimizeCloudinaryUrl(post.bannerImage, { width: 140, crop: 'fill' })}
                    alt={post.title}
                    width={70}
                    height={70}
                    className="w-[70px] h-[70px] object-cover rounded-sm shrink-0"
                  />
                ) : (
                  <div className="w-[70px] h-[70px] bg-[var(--bg-2)] border border-[var(--line)] rounded-sm shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  {post.vertical && (
                    <div className="text-[10px] tracking-wider text-[var(--green)] font-bold uppercase mb-1">
                      {post.vertical.name}
                    </div>
                  )}
                  <div className="font-[var(--font-heading)] font-bold text-[var(--ink)] text-sm leading-snug group-hover:text-[var(--green)] transition-colors">
                    {post.title}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
