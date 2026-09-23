"use client";
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { mapPick, mapVertical } from '@/lib/supabase/mappers';
import { uploadToCloudinary } from '@/utils/cloudinaryUpload';
import { optimizeCloudinaryUrl } from '@/utils/optimizeCloudinaryUrl';
import LoadingSpinner from "@/components/shared/LoadingSpinner";

const PICK_LIST_SELECT = 'id, title, slug, status, hero_image, publish_date, created_at, updated_at, vertical:verticals!primary_vertical_id(id, name, slug)';
const PICK_FULL_SELECT = 'id, title, slug, excerpt, author, hero_image, disclosure, read_time, primary_vertical_id, intro, items, status, publish_date, created_at, updated_at, vertical:verticals!primary_vertical_id(id, name, slug)';

function slugify(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function emptyItem() {
  return { title: '', image: '', paragraphs: [''], proTip: null };
}

const inputCls = "w-full bg-white border border-[var(--line)] rounded-lg p-2.5 text-[var(--ink)] focus:outline-none focus:border-[var(--green)] focus:ring-1 focus:ring-[var(--green)] transition-colors";
const labelCls = "block mb-2 text-sm font-semibold text-[var(--ink-2)]";

export default function ManagePicks() {
  const [picks, setPicks] = useState([]);
  const [verticals, setVerticals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [existingPublishDate, setExistingPublishDate] = useState(null);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingItemImage, setUploadingItemImage] = useState(null); // index or null

  const defaultForm = {
    title: '',
    excerpt: '',
    author: 'WalletPickle Editorial',
    heroImage: '',
    disclosure: 'Advertiser Disclosure: WalletPickle may earn a commission from partner links on this page. Our editorial picks are not influenced by compensation.',
    readTime: 8,
    primaryVerticalId: '',
    intro: [''],
    items: [emptyItem()],
    status: 'draft',
  };

  const [formData, setFormData] = useState(defaultForm);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const [picksRes, vertsRes] = await Promise.all([
        supabase.from('picks').select(PICK_LIST_SELECT).order('created_at', { ascending: false }),
        supabase.from('verticals').select('*').order('featured_order').order('created_at', { ascending: false }),
      ]);
      if (picksRes.error) throw picksRes.error;
      if (vertsRes.error) throw vertsRes.error;
      setPicks((picksRes.data ?? []).map(mapPick));
      setVerticals((vertsRes.data ?? []).map(mapVertical));
    } catch (error) {
      console.error('Failed to load picks', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInitialData(); }, []);

  const handleHeroUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setUploadingHero(true);
      const url = await uploadToCloudinary(file);
      setFormData(prev => ({ ...prev, heroImage: url }));
    } catch (error) {
      alert(error.message);
    } finally {
      setUploadingHero(false);
    }
  };

  const handleItemImageUpload = async (e, index) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setUploadingItemImage(index);
      const url = await uploadToCloudinary(file);
      updateItem(index, { image: url });
    } catch (error) {
      alert(error.message);
    } finally {
      setUploadingItemImage(null);
    }
  };

  const handleEditClick = async (pick) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from('picks').select(PICK_FULL_SELECT).eq('id', pick._id).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Pick not found');

      const full = mapPick(data);
      setIsEditing(true);
      setEditingId(full._id);
      setExistingPublishDate(full.publishDate ?? null);
      setFormData({
        title: full.title,
        excerpt: full.excerpt || '',
        author: full.author || 'WalletPickle Editorial',
        heroImage: full.heroImage || '',
        disclosure: full.disclosure || '',
        readTime: full.readTime || 8,
        primaryVerticalId: full.primaryVerticalId || '',
        intro: full.intro?.length ? full.intro : [''],
        items: full.items?.length ? full.items.map(normalizeItem) : [emptyItem()],
        status: full.status,
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      alert(err.message || 'Failed to fetch pick');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this listicle? This action cannot be undone.')) return;
    try {
      const supabase = createClient();
      const { error } = await supabase.from('picks').delete().eq('id', id);
      if (error) throw error;
      fetchInitialData();
    } catch (err) {
      alert(err.message || 'Failed to delete pick');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingId(null);
    setExistingPublishDate(null);
    setFormData(defaultForm);
  };

  // --- intro helpers ---
  const updateIntroParagraph = (i, value) => {
    setFormData(prev => {
      const intro = [...prev.intro];
      intro[i] = value;
      return { ...prev, intro };
    });
  };
  const addIntroParagraph = () => setFormData(prev => ({ ...prev, intro: [...prev.intro, ''] }));
  const removeIntroParagraph = (i) => setFormData(prev => ({ ...prev, intro: prev.intro.filter((_, idx) => idx !== i) }));

  // --- item helpers ---
  const updateItem = (i, patch) => {
    setFormData(prev => {
      const items = [...prev.items];
      items[i] = { ...items[i], ...patch };
      return { ...prev, items };
    });
  };
  const updateItemParagraph = (itemIdx, paraIdx, value) => {
    setFormData(prev => {
      const items = [...prev.items];
      const paragraphs = [...(items[itemIdx].paragraphs || [])];
      paragraphs[paraIdx] = value;
      items[itemIdx] = { ...items[itemIdx], paragraphs };
      return { ...prev, items };
    });
  };
  const addItemParagraph = (itemIdx) => {
    setFormData(prev => {
      const items = [...prev.items];
      items[itemIdx] = { ...items[itemIdx], paragraphs: [...(items[itemIdx].paragraphs || []), ''] };
      return { ...prev, items };
    });
  };
  const removeItemParagraph = (itemIdx, paraIdx) => {
    setFormData(prev => {
      const items = [...prev.items];
      const paragraphs = (items[itemIdx].paragraphs || []).filter((_, idx) => idx !== paraIdx);
      items[itemIdx] = { ...items[itemIdx], paragraphs };
      return { ...prev, items };
    });
  };
  const addItem = () => setFormData(prev => ({ ...prev, items: [...prev.items, emptyItem()] }));
  const removeItem = (i) => setFormData(prev => ({ ...prev, items: prev.items.filter((_, idx) => idx !== i) }));
  const moveItem = (i, direction) => {
    setFormData(prev => {
      const items = [...prev.items];
      const target = i + direction;
      if (target < 0 || target >= items.length) return prev;
      [items[i], items[target]] = [items[target], items[i]];
      return { ...prev, items };
    });
  };
  const toggleProTip = (i, enabled) => {
    updateItem(i, { proTip: enabled ? { text: '', url: '' } : null });
  };
  const updateProTip = (i, patch) => {
    setFormData(prev => {
      const items = [...prev.items];
      items[i] = { ...items[i], proTip: { ...(items[i].proTip || {}), ...patch } };
      return { ...prev, items };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const supabase = createClient();
      const nowIso = new Date().toISOString();
      let publishDate = existingPublishDate;
      if (formData.status === 'published' && !publishDate) publishDate = nowIso;

      // Strip empty paragraphs; drop items whose title AND paragraphs are all empty.
      const cleanedItems = formData.items
        .map(item => ({
          title: (item.title || '').trim(),
          image: item.image || null,
          paragraphs: (item.paragraphs || []).map(p => p.trim()).filter(Boolean),
          proTip: item.proTip
            ? { text: (item.proTip.text || '').trim(), url: (item.proTip.url || '').trim() }
            : null,
        }))
        .filter(item => item.title || item.paragraphs.length);

      const cleanedIntro = formData.intro.map(p => p.trim()).filter(Boolean);

      const basePayload = {
        title: formData.title.trim(),
        excerpt: formData.excerpt || null,
        author: formData.author || null,
        hero_image: formData.heroImage || null,
        disclosure: formData.disclosure || null,
        read_time: Number(formData.readTime) || null,
        primary_vertical_id: formData.primaryVerticalId || null,
        intro: cleanedIntro,
        items: cleanedItems,
        status: formData.status,
        publish_date: publishDate,
      };

      if (editingId) {
        const { error } = await supabase.from('picks').update(basePayload).eq('id', editingId);
        if (error) throw error;
      } else {
        const insertPayload = { ...basePayload, slug: slugify(formData.title) };
        const { error } = await supabase.from('picks').insert(insertPayload);
        if (error) {
          if (error.code === '23505') throw new Error('A listicle with that title already exists — pick a different title.');
          throw error;
        }
      }

      alert('Listicle saved.');
      handleCancel();
      fetchInitialData();
    } catch (error) {
      alert(error.message || 'Failed to save listicle');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-5xl mx-auto py-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold font-heading text-[var(--ink)]">Manage Listicles</h1>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="bg-[var(--green)] px-5 py-2.5 rounded-lg text-white font-bold hover:bg-[var(--green-dark)] hover:-translate-y-0.5 transition-all shadow-sm"
          >
            Create New Listicle
          </button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-xl shadow-sm mb-8 border border-[var(--line)]">
          <h2 className="text-2xl font-bold mb-2 text-[var(--ink)] font-heading">
            {editingId ? `Editing: ${formData.title}` : 'Create New Listicle'}
          </h2>
          <p className="text-sm text-[var(--gray)]">
            Paragraphs support markdown: <code>[link text](url)</code> for links, <code>**bold**</code> for emphasis.
          </p>

          <div>
            <label className={labelCls}>Title</label>
            <input type="text" required className={inputCls} value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className={labelCls}>Primary Vertical</label>
              <select className={inputCls} value={formData.primaryVerticalId} onChange={e => setFormData({...formData, primaryVerticalId: e.target.value})}>
                <option value="">None</option>
                {verticals.map(v => <option key={v._id} value={v._id}>{v.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select className={inputCls} value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Author</label>
              <input type="text" className={inputCls} value={formData.author} onChange={e => setFormData({...formData, author: e.target.value})} />
            </div>
            <div>
              <label className={labelCls}>Read Time (minutes)</label>
              <input type="number" min="1" className={inputCls} value={formData.readTime} onChange={e => setFormData({...formData, readTime: e.target.value})} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Excerpt</label>
            <textarea className={`${inputCls} h-24`} value={formData.excerpt} onChange={e => setFormData({...formData, excerpt: e.target.value})} />
          </div>

          <div>
            <label className={labelCls}>Disclosure</label>
            <textarea className={`${inputCls} h-20`} value={formData.disclosure} onChange={e => setFormData({...formData, disclosure: e.target.value})} />
          </div>

          <div>
            <label className={labelCls}>Hero Image</label>
            <input
              type="file"
              accept="image/jpeg, image/png, image/webp"
              onChange={handleHeroUpload}
              className="mb-2 block w-full text-sm text-[var(--gray)] file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:bg-[var(--bg-2)] file:text-[var(--ink)] hover:file:bg-[var(--line)] file:font-semibold cursor-pointer border border-[var(--line)] rounded-lg"
            />
            {uploadingHero && <p className="text-sm text-[var(--gray)] font-medium">Uploading...</p>}
            {formData.heroImage && (
              <Image src={optimizeCloudinaryUrl(formData.heroImage, { width: 400, crop: 'fill' })} alt="Hero preview" width={400} height={128} className="h-32 object-cover rounded-lg mt-3 border border-[var(--line)] shadow-sm" />
            )}
          </div>

          {/* Intro paragraphs */}
          <div className="bg-[var(--bg)] p-4 rounded-lg border border-[var(--line)]">
            <div className="flex justify-between items-center mb-3">
              <label className="text-sm font-semibold text-[var(--ink-2)]">Intro Paragraphs</label>
              <button type="button" onClick={addIntroParagraph} className="text-sm font-bold text-[var(--green)] hover:text-[var(--green-dark)]">+ Add paragraph</button>
            </div>
            <div className="space-y-2">
              {formData.intro.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <textarea className={`${inputCls} h-20`} value={p} onChange={e => updateIntroParagraph(i, e.target.value)} placeholder={`Intro paragraph ${i + 1}`} />
                  {formData.intro.length > 1 && (
                    <button type="button" onClick={() => removeIntroParagraph(i)} className="text-[var(--red)] text-sm font-bold px-2">Remove</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Items */}
          <div className="bg-[var(--bg)] p-4 rounded-lg border border-[var(--line)]">
            <div className="flex justify-between items-center mb-3">
              <label className="text-sm font-semibold text-[var(--ink-2)]">List Items</label>
              <button type="button" onClick={addItem} className="text-sm font-bold text-[var(--green)] hover:text-[var(--green-dark)]">+ Add item</button>
            </div>
            <div className="space-y-4">
              {formData.items.map((item, i) => (
                <div key={i} className="bg-white p-4 rounded-lg border border-[var(--line)] space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-[var(--gray)]">Item #{i + 1}</span>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => moveItem(i, -1)} disabled={i === 0} className="text-xs font-bold px-2 py-1 rounded border border-[var(--line)] disabled:opacity-30 hover:bg-[var(--bg-2)]">↑</button>
                      <button type="button" onClick={() => moveItem(i, 1)} disabled={i === formData.items.length - 1} className="text-xs font-bold px-2 py-1 rounded border border-[var(--line)] disabled:opacity-30 hover:bg-[var(--bg-2)]">↓</button>
                      <button type="button" onClick={() => removeItem(i)} className="text-xs font-bold px-2 py-1 rounded border border-[var(--red)] text-[var(--red)] hover:bg-[var(--red)] hover:text-white ml-2">Remove</button>
                    </div>
                  </div>

                  <input type="text" className={inputCls} value={item.title || ''} onChange={e => updateItem(i, { title: e.target.value })} placeholder="Item title" />

                  <div>
                    <input
                      type="file"
                      accept="image/jpeg, image/png, image/webp"
                      onChange={e => handleItemImageUpload(e, i)}
                      className="block w-full text-sm text-[var(--gray)] file:mr-4 file:py-2 file:px-3 file:rounded file:border-0 file:bg-[var(--bg-2)] file:text-[var(--ink)] hover:file:bg-[var(--line)] file:font-semibold cursor-pointer border border-[var(--line)] rounded-lg"
                    />
                    {uploadingItemImage === i && <p className="text-xs text-[var(--gray)] mt-1">Uploading...</p>}
                    {item.image && (
                      <div className="flex items-start gap-3 mt-2">
                        <Image src={optimizeCloudinaryUrl(item.image, { width: 240, crop: 'fill' })} alt="Item preview" width={120} height={80} className="h-20 object-cover rounded border border-[var(--line)]" />
                        <button type="button" onClick={() => updateItem(i, { image: '' })} className="text-xs text-[var(--red)] font-bold">Clear image</button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-[var(--ink-2)]">Paragraphs</span>
                      <button type="button" onClick={() => addItemParagraph(i)} className="text-xs font-bold text-[var(--green)]">+ Add paragraph</button>
                    </div>
                    {(item.paragraphs || []).map((p, pi) => (
                      <div key={pi} className="flex gap-2">
                        <textarea className={`${inputCls} h-20`} value={p} onChange={e => updateItemParagraph(i, pi, e.target.value)} placeholder={`Paragraph ${pi + 1}`} />
                        {(item.paragraphs || []).length > 1 && (
                          <button type="button" onClick={() => removeItemParagraph(i, pi)} className="text-[var(--red)] text-xs font-bold px-2">Remove</button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-[var(--line)] pt-3">
                    <label className="flex items-center gap-2 text-sm font-semibold text-[var(--ink-2)] cursor-pointer">
                      <input type="checkbox" checked={!!item.proTip} onChange={e => toggleProTip(i, e.target.checked)} className="w-4 h-4 accent-[var(--green)]" />
                      Include Pro Tip callout
                    </label>
                    {item.proTip && (
                      <div className="mt-3 space-y-2 pl-6">
                        <textarea className={`${inputCls} h-16`} value={item.proTip.text || ''} onChange={e => updateProTip(i, { text: e.target.value })} placeholder="Pro tip text (markdown supported)" />
                        <input type="text" className={inputCls} value={item.proTip.url || ''} onChange={e => updateProTip(i, { url: e.target.value })} placeholder="Pro tip URL" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex space-x-4 pt-4 border-t border-[var(--line)] mt-8">
            <button type="submit" className="bg-[var(--green)] px-6 py-2.5 rounded-lg font-bold text-white hover:bg-[var(--green-dark)] hover:-translate-y-0.5 transition-all shadow-sm">
              {editingId ? 'Save Changes' : 'Create Listicle'}
            </button>
            <button type="button" onClick={handleCancel} className="bg-white border border-[var(--line)] text-[var(--ink)] px-6 py-2.5 rounded-lg font-bold hover:bg-[var(--bg-2)] transition-colors">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {picks.map(pick => (
            <div key={pick._id} className="bg-white border border-[var(--line)] p-5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group gap-4">
              <div className="flex items-center space-x-5 w-full sm:w-auto">
                {pick.heroImage ? (
                  <Image src={optimizeCloudinaryUrl(pick.heroImage, { width: 100, crop: 'fill' })} width={80} height={80} className="w-20 h-20 object-cover rounded-lg border border-[var(--line)] shadow-sm shrink-0" alt="Hero" />
                ) : (
                  <div className="w-20 h-20 bg-[var(--bg-2)] rounded-lg border border-[var(--line)] flex items-center justify-center text-[var(--gray)] text-xs font-medium shrink-0">No img</div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg text-[var(--ink)] font-heading group-hover:text-[var(--green)] transition-colors truncate">{pick.title}</h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${pick.status === 'published' ? 'bg-[var(--green)]/10 text-[var(--green-dark)]' : 'bg-[var(--gold)]/20 text-[var(--gold)]'}`}>
                      {pick.status.toUpperCase()}
                    </span>
                    {pick.vertical && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--bg-2)] text-[var(--ink-2)] border border-[var(--line)] font-bold">{pick.vertical.name}</span>
                    )}
                    <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--bg-2)] text-[var(--gray)] border border-[var(--line)] font-mono">{pick.slug}</span>
                  </div>
                </div>
              </div>
              <div className="flex space-x-4 sm:shrink-0 w-full sm:w-auto justify-end">
                <button onClick={() => handleEditClick(pick)} className="text-[var(--gray)] hover:text-[var(--green)] text-sm font-bold transition-colors">Edit</button>
                <button onClick={() => handleDelete(pick._id)} className="text-[var(--red)] opacity-80 hover:opacity-100 text-sm font-bold transition-colors">Delete</button>
              </div>
            </div>
          ))}
          {picks.length === 0 && (
            <div className="p-12 text-center text-[var(--gray)] border border-[var(--line)] rounded-xl bg-white shadow-sm font-medium">
              No listicles yet. Click &ldquo;Create New Listicle&rdquo; to write one.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function normalizeItem(item) {
  return {
    title: item.title || '',
    image: item.image || '',
    paragraphs: Array.isArray(item.paragraphs) && item.paragraphs.length ? item.paragraphs : [''],
    proTip: item.proTip && (item.proTip.text || item.proTip.url) ? item.proTip : null,
  };
}
