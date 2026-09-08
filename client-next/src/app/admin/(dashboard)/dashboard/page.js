"use client";
import Link from "next/link";
import { useContext, useEffect, useState } from 'react';
import { AuthContext } from "@/context/AuthContext";
import { createClient } from '@/lib/supabase/client';

export default function AdminDashboard() {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState({ posts: 0, petitions: 0, ads: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'editor' || !user) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const [postsRes, petitionsRes, adsRes] = await Promise.all([
        supabase.from('posts').select('*', { count: 'exact', head: true }),
        supabase.from('petitions').select('*', { count: 'exact', head: true }).eq('active', true),
        supabase.from('ads').select('*', { count: 'exact', head: true }),
      ]);
      if (cancelled) return;
      setStats({
        posts: postsRes.count ?? 0,
        petitions: petitionsRes.count ?? 0,
        ads: adsRes.count ?? 0,
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const allLinks = [
    { title: 'Manage Posts', path: '/admin/posts', description: 'Create, edit, and publish articles' },
    { title: 'Manage Verticals', path: '/admin/verticals', description: 'Manage content categories and slugs' },
    { title: 'Manage Petitions', path: '/admin/petitions', description: 'Manage trending petitions and goals' },
    { title: 'Manage Ads', path: '/admin/ads', description: 'Configure banner and sponsored placements' },
    { title: 'Manage Post Ads', path: '/admin/post-ads', description: 'Assign specific ads to individual posts' },
    { title: 'Manage Users', path: '/admin/users', description: 'Control access and roles' },
    { title: 'Manage Subscribers', path: '/admin/subscribers', description: 'View and manage newsletter subscribers' },
  ];

  const adminLinks = user?.role === 'editor'
    ? allLinks.filter(link => link.path === '/admin/posts')
    : allLinks;

  return (
    <div className="max-w-5xl mx-auto py-8">
      <h1 className="text-4xl font-bold mb-2 font-heading text-[var(--ink)]">
        {user?.role === 'editor' ? 'Editor Dashboard' : 'Welcome, Admin'}
      </h1>
      <p className="text-[var(--gray)] mb-8 font-medium">
        {user?.role === 'editor'
          ? 'Welcome back. Access your assigned publishing tools below.'
          : 'Welcome back. Select a module to manage your site content.'}
      </p>

      {user?.role !== 'editor' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {[
            { label: 'Total Posts', value: loading ? '...' : stats.posts },
            { label: 'Active Petitions', value: loading ? '...' : stats.petitions },
            { label: 'Total Ads', value: loading ? '...' : stats.ads }
          ].map((stat, i) => (
            <div key={i} className="bg-white border border-[var(--line)] rounded-xl p-6 shadow-sm flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-[var(--green)] mb-1 font-heading">{stat.value}</span>
              <span className="text-sm font-bold text-[var(--gray)] uppercase tracking-wider">{stat.label}</span>
            </div>
          ))}
        </div>
      )}

      <div className={`grid grid-cols-1 ${user?.role === 'editor' ? 'md:grid-cols-1 max-w-xl' : 'md:grid-cols-2 md:grid-cols-3'} gap-6`}>
        {adminLinks.map((link) => (
          <Link
            key={link.path}
            href={link.path}
            className="block p-6 bg-[var(--bg-2)] border border-[var(--line)] rounded-xl shadow-sm hover:shadow-md hover:-translate-y-1 hover:border-[var(--green)] transition-all duration-200 group"
          >
            <h2 className="text-xl font-bold mb-2 text-[var(--ink)] group-hover:text-[var(--green)] transition-colors font-heading">{link.title}</h2>
            <p className="text-[var(--gray)] text-sm font-medium">{link.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
