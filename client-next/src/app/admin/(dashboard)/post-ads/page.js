"use client";
import { useState, useEffect, useContext } from 'react';
import { createClient } from '@/lib/supabase/client';
import { mapPost, mapAd, mapVertical } from '@/lib/supabase/mappers';
import { AuthContext } from "@/context/AuthContext";
import LoadingSpinner from "@/components/shared/LoadingSpinner";

const POST_SELECT = 'id, title, slug, status, ad_slot_1_id, ad_slot_2_id, vertical:verticals(id, name, slug)';

export default function ManagePostAds() {
  const { user: currentUser } = useContext(AuthContext);
  const [posts, setPosts] = useState([]);
  const [ads, setAds] = useState([]);
  const [verticals, setVerticals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPostId, setEditingPostId] = useState(null);

  const [adSlot1, setAdSlot1] = useState('');
  const [adSlot2, setAdSlot2] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const [postsRes, adsRes, vertsRes] = await Promise.all([
        supabase.from('posts').select(POST_SELECT).order('created_at', { ascending: false }).limit(1000),
        supabase.from('ads').select('*').eq('placement', 'in_article').order('created_at', { ascending: false }),
        supabase.from('verticals').select('*').order('featured_order').order('created_at', { ascending: false }),
      ]);
      if (postsRes.error) throw postsRes.error;
      if (adsRes.error) throw adsRes.error;
      if (vertsRes.error) throw vertsRes.error;

      // Posts here don't have adSlot objects populated (we only want IDs for the dropdowns).
      // Map manually to preserve the ad_slot_*_id → adSlot1/adSlot2 as strings.
      const mappedPosts = (postsRes.data ?? []).map(p => ({
        ...mapPost({ ...p, ad_slot_1: null, ad_slot_2: null }),
        adSlot1: p.ad_slot_1_id ?? null,
        adSlot2: p.ad_slot_2_id ?? null,
      }));

      setPosts(mappedPosts);
      setAds((adsRes.data ?? []).map(mapAd));
      setVerticals((vertsRes.data ?? []).map(mapVertical));
    } catch (error) {
      console.error('Failed to load data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (post) => {
    setEditingPostId(post._id);
    setAdSlot1(post.adSlot1 || '');
    setAdSlot2(post.adSlot2 || '');
  };

  const handleCancel = () => {
    setEditingPostId(null);
    setAdSlot1('');
    setAdSlot2('');
  };

  const handleSave = async (postId) => {
    try {
      const supabase = createClient();
      const payload = {
        ad_slot_1_id: adSlot1 || null,
        ad_slot_2_id: adSlot2 || null,
      };
      const { data, error } = await supabase
        .from('posts')
        .update(payload)
        .eq('id', postId)
        .select('ad_slot_1_id, ad_slot_2_id')
        .single();
      if (error) throw error;

      setPosts(posts.map(p => p._id === postId
        ? { ...p, adSlot1: data.ad_slot_1_id, adSlot2: data.ad_slot_2_id }
        : p
      ));
      setEditingPostId(null);
    } catch (error) {
      alert(error.message || 'Failed to save assignments');
    }
  };

  if (loading) return <LoadingSpinner />;

  if (currentUser?.role !== 'admin') {
    return (
      <div className="p-6 text-[var(--ink)] max-w-5xl mx-auto text-center mt-20">
        <h2 className="text-2xl font-bold text-[var(--red)] mb-2 font-heading">Access Restricted</h2>
        <p className="text-[var(--gray)]">This page is restricted to administrators only.</p>
      </div>
    );
  }

  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 text-[var(--ink)] max-w-5xl mx-auto py-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold font-heading text-[var(--ink)]">Manage Post Ads</h1>
          <p className="text-[var(--gray)] mt-2 font-medium">Assign specific ads to individual posts to override the rotation algorithm.</p>
        </div>
      </div>

      <div className="mb-8">
        <input
          type="text"
          placeholder="Search posts by title..."
          className="w-full bg-white border border-[var(--line)] rounded-full px-4 py-2.5 text-[var(--ink)] focus:outline-none focus:border-[var(--green)] focus:ring-1 focus:ring-[var(--green)] transition-colors text-sm font-medium"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredPosts.map(post => {
          const isEditing = editingPostId === post._id;
          const hasAssignments = post.adSlot1 || post.adSlot2;

          return (
            <div key={post._id} className="bg-white border border-[var(--line)] p-5 rounded-xl flex flex-col hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg text-[var(--ink)] font-heading group-hover:text-[var(--green)] transition-colors flex items-center gap-2">
                    {post.title}
                    {hasAssignments && !isEditing && (
                      <span className="text-xs bg-[var(--gold)]/20 text-[var(--gold)] px-2.5 py-1 rounded-full font-bold">Overrides Active</span>
                    )}
                  </h3>
                  <div className="flex space-x-2 mt-2">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${post.status === 'published' ? 'bg-[var(--green)]/10 text-[var(--green-dark)]' : 'bg-[var(--gold)]/20 text-[var(--gold)]'}`}>
                      {post.status.toUpperCase()}
                    </span>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--bg-2)] text-[var(--gray)] border border-[var(--line)] font-mono">
                      {post.vertical?.name || 'Unknown Vertical'}
                    </span>
                  </div>
                </div>

                {!isEditing && (
                  <button
                    onClick={() => handleEditClick(post)}
                    className="bg-white border border-[var(--line)] text-[var(--ink)] px-4 py-2 rounded-lg font-bold hover:bg-[var(--bg-2)] transition-colors text-sm"
                  >
                    Manage Ads
                  </button>
                )}
              </div>

              {isEditing && (
                <div className="mt-5 pt-5 border-t border-[var(--line)]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block mb-2 text-sm font-semibold text-[var(--ink-2)]">Ad Slot 1</label>
                      <select
                        className="w-full bg-white border border-[var(--line)] rounded-lg p-2.5 text-[var(--ink)] focus:outline-none focus:border-[var(--green)] focus:ring-1 focus:ring-[var(--green)] transition-colors"
                        value={adSlot1}
                        onChange={e => setAdSlot1(e.target.value)}
                      >
                        <option value="">None (use rotation)</option>
                        {ads.map(ad => (
                          <option key={ad._id} value={ad._id}>{ad.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block mb-2 text-sm font-semibold text-[var(--ink-2)]">Ad Slot 2</label>
                      <select
                        className="w-full bg-white border border-[var(--line)] rounded-lg p-2.5 text-[var(--ink)] focus:outline-none focus:border-[var(--green)] focus:ring-1 focus:ring-[var(--green)] transition-colors"
                        value={adSlot2}
                        onChange={e => setAdSlot2(e.target.value)}
                      >
                        <option value="">None (use rotation)</option>
                        {ads.map(ad => (
                          <option key={ad._id} value={ad._id}>{ad.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={() => handleSave(post._id)}
                      className="bg-[var(--green)] hover:bg-[var(--green-dark)] text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-all hover:-translate-y-0.5 shadow-sm"
                    >
                      Save Assignments
                    </button>
                    <button
                      onClick={handleCancel}
                      className="bg-white border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--bg-2)] px-5 py-2.5 rounded-lg text-sm font-bold transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filteredPosts.length === 0 && (
          <div className="p-12 text-center text-[var(--gray)] border border-[var(--line)] rounded-xl bg-white shadow-sm font-medium">
            No posts found matching your search.
          </div>
        )}
      </div>
    </div>
  );
}
