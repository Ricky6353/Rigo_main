'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Product } from '@/lib/catalog';
import styles from './Admin.module.css';
import { X, Download, BarChart3, Trash2 } from 'lucide-react';

import { isAdminEmail, normalizeEmail, resolveRole } from '@/lib/adminConfig';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

export default function AdminPortal() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const [productsList, setProductsList] = useState<Product[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    category: 'tees',
    price: '',
    description: '',
    sizes: 'S, M, L, XL',
    details: '',
  });

  const [files, setFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Gallery uploads state
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);

  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reportPeriod, setReportPeriod] = useState<'day' | 'week'>('week');
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(null);

  // Categories management
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [isAddingCat, setIsAddingCat] = useState(false);

  // Admin access: NextAuth session (works on Vercel) with localStorage fallback
  useEffect(() => {
    if (status === 'loading') return;

    const sessionEmail = session?.user?.email ? normalizeEmail(session.user.email) : '';
    // @ts-expect-error role on session user
    const sessionRole = session?.user?.role as string | undefined;
    const fromSession = sessionEmail && resolveRole(sessionEmail, sessionRole) === 'admin';

    let fromStorage = false;
    try {
      const storedUser = localStorage.getItem('embroyit_user');
      const parsedUser = storedUser ? JSON.parse(storedUser) : null;
      fromStorage = Boolean(parsedUser?.email && isAdminEmail(normalizeEmail(parsedUser.email)));
    } catch {
      fromStorage = false;
    }

    if (fromSession || fromStorage) {
      setIsAuthenticated(true);
      sessionStorage.setItem('adminAuth', 'true');
      fetchProducts();
      fetchCategories();
    } else {
      setIsAuthenticated(false);
      sessionStorage.removeItem('adminAuth');
      router.replace('/login?callbackUrl=/admin');
    }
  }, [session, status, router]);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (Array.isArray(data)) setProductsList(data);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (Array.isArray(data)) setCategories(data);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    
    setIsAddingCat(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCatName }),
      });
      const data = await res.json();
      if (data.success) {
        setCategories([...categories, data.category]);
        setNewCatName('');
      } else {
        alert(data.error || 'Failed to add category');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAddingCat(false);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Delete category "${name}"? Products in this category will still exist but the category filter will be removed.`)) return;
    
    try {
      const res = await fetch(`/api/categories?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCategories(categories.filter(c => c.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchOrders = async (date: string, period: 'day' | 'week') => {
    setOrdersLoading(true);
    try {
      const res = await fetch(`/api/orders?date=${date}&period=${period}`);
      const data = await res.json();
      if (res.ok) {
        setOrders(data.orders || []);
        setSpreadsheetUrl(data.spreadsheetUrl || null);
      } else {
        console.error('Order fetch failed', data.error);
        setOrders([]);
      }
    } catch (err) {
      console.error('Order fetch failed', err);
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(reportDate, reportPeriod);
  }, [reportDate, reportPeriod]);

  const formatCurrency = (value: number) => `£${value.toFixed(2)}`;

  const getOrderChartData = () => {
    const totals: Record<string, { quantity: number; revenue: number }> = {};
    orders.forEach((order) => {
      if (!Array.isArray(order.items)) return;
      order.items.forEach((item: any) => {
        const key = item.name || 'Unknown';
        if (!totals[key]) {
          totals[key] = { quantity: 0, revenue: 0 };
        }
        totals[key].quantity += item.quantity || 0;
        totals[key].revenue += (item.quantity || 0) * (item.price || 0);
      });
    });

    return Object.entries(totals)
      .map(([name, values]) => ({ name, ...values }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 6);
  };

  const handleGenerateReport = () => {
    if (!orders.length) {
      alert('No orders available for the selected date.');
      return;
    }

    const headers = ['Order ID', 'Order Date', 'Customer', 'Contact', 'Phone Number', 'Email', 'Email ID', 'Address', 'City', 'Postal Code', 'Transaction ID', 'Item Count', 'Total', 'Payment Method', 'Items'];
    const rows = orders.map((order) => [
      order.orderId,
      order.orderDate,
      order.customerName,
      order.contact,
      order.phoneNumber || order.contact,
      order.email,
      order.emailId || order.email,
      order.address,
      order.city,
      order.postalCode,
      order.transactionId || '',
      order.itemCount,
      order.total,
      order.paymentMethod,
      Array.isArray(order.items) ? order.items.map((item: any) => `${item.name}${item.size ? ` (${item.size})` : ''} x${item.quantity}`).join(' | ') : order.items,
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-orders-${reportDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const totalItems = orders.reduce((sum, order) => sum + Number(order.itemCount || 0), 0);
  const chartData = getOrderChartData();

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('adminAuth');
  };

  // Handle multiple file selection for products
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const maxFiles = 6;
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'video/mp4', 'video/webm', 'video/quicktime'];
    
    // Check for invalid file types
    const invalidFiles = selectedFiles.filter(file => !allowedTypes.includes(file.type));
    if (invalidFiles.length > 0) {
      alert('Only JPEG, PNG and common video formats (MP4, WebM) are allowed.');
      e.target.value = ''; // Reset input
      return;
    }

    // Check for file size
    const oversizedFiles = selectedFiles.filter(file => file.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      alert(`Some files are too large. Maximum allowed size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
      e.target.value = ''; // Reset input
      return;
    }

    if (selectedFiles.length > maxFiles) {
      alert(`Maximum ${maxFiles} images allowed per product`);
      return;
    }

    setFiles(selectedFiles);
    
    // Create previews
    const previews = selectedFiles.map(file => URL.createObjectURL(file));
    setFilePreviews(previews);
  };

  // Handle multiple file selection for gallery
  const handleGalleryFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const maxFiles = 6;
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'video/mp4', 'video/webm', 'video/quicktime'];

    const invalidFiles = selectedFiles.filter(file => !allowedTypes.includes(file.type));
    if (invalidFiles.length > 0) {
      alert('Only JPEG, PNG and common video formats (MP4, WebM) are allowed.');
      e.target.value = ''; // Reset input
      return;
    }

    // Check for file size
    const oversizedFiles = selectedFiles.filter(file => file.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      alert(`Some files are too large. Maximum allowed size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
      e.target.value = ''; // Reset input
      return;
    }
    
    if (selectedFiles.length + galleryFiles.length > maxFiles) {
      alert(`Maximum ${maxFiles} images allowed in gallery`);
      return;
    }

    const newGalleryFiles = [...galleryFiles, ...selectedFiles];
    setGalleryFiles(newGalleryFiles);
    
    // Create previews
    const previews = newGalleryFiles.map(file => URL.createObjectURL(file));
    setGalleryPreviews(previews);
  };

  // Remove file from product gallery
  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setFilePreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Remove file from standalone gallery
  const removeGalleryFile = (index: number) => {
    setGalleryFiles(prev => prev.filter((_, i) => i !== index));
    setGalleryPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const startEdit = (product: Product) => {
    setEditingId(product.id);
    setFormData({
      name: product.name,
      category: product.category,
      price: product.price.toString(),
      description: product.description,
      sizes: product.sizes?.join(', ') || '',
      details: product.details.join('\n'),
    });
    setFiles([]);
    setFilePreviews([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: '',
      category: 'tees',
      price: '',
      description: '',
      sizes: 'S, M, L, XL',
      details: '',
    });
    setFiles([]);
    setFilePreviews([]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    // Construct FormData to send files & fields
    const form = new FormData();
    if (editingId) form.append('id', editingId);

    form.append('name', formData.name);
    form.append('category', formData.category);
    form.append('price', formData.price);
    form.append('description', formData.description);
    form.append('sizes', formData.sizes);
    form.append('details', formData.details);

    // Append all files
    files.forEach((file, index) => {
      form.append(`file_${index}`, file);
    });
    form.append('fileCount', files.length.toString());

    if (files.length === 0 && editingId) {
      // Keep existing image if no new files are uploaded
      const existingProduct = productsList.find(p => p.id === editingId);
      if (existingProduct) {
        form.append('image', existingProduct.image);
      }
    }

    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        body: form,
      });
      const data = await res.json();

      if (res.ok && data.success) {
        alert('Product saved successfully! The shop will update automatically.');

        // Optimistically update local array
        if (editingId) {
          setProductsList(list => list.map(p => p.id === editingId ? data.product : p));
        } else {
          setProductsList(list => [...list, data.product]);
        }
        resetForm();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save product');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGalleryUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (galleryFiles.length === 0) {
      alert('Please select at least one image');
      return;
    }

    setIsUploadingGallery(true);

    const form = new FormData();
    galleryFiles.forEach((file, index) => {
      form.append(`gallery_${index}`, file);
    });
    form.append('galleryCount', galleryFiles.length.toString());

    try {
      const res = await fetch('/api/admin/gallery', {
        method: 'POST',
        body: form,
      });
      const data = await res.json();

      if (res.ok && data.success) {
        alert('Gallery images uploaded successfully!');
        setGalleryFiles([]);
        setGalleryPreviews([]);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to upload gallery images');
    } finally {
      setIsUploadingGallery(false);
    }
  };

  const handleToggleSoldOut = async (productId: string, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/admin/toggle-soldout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, soldOut: !currentStatus }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        // Update the local product list
        setProductsList(list =>
          list.map(p => p.id === productId ? { ...p, soldOut: !currentStatus } : p)
        );
        alert(data.message);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to toggle sold out status');
    }
  };

  const handleToggleSizeSoldOut = async (productId: string, size: string, isSoldOut: boolean) => {
    try {
      const res = await fetch('/api/admin/toggle-soldout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, size, soldOut: !isSoldOut }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setProductsList(list =>
          list.map(p => p.id === productId ? data.product : p)
        );
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to toggle size status');
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/products?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setProductsList(list => list.filter(p => p.id !== id));
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete product');
    }
  };

  if (isAuthenticated === null || status === 'loading') {
    return (
      <main className={styles.main}>
        <p style={{ textAlign: 'center', padding: '4rem' }}>Loading Command Center…</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className={styles.main}>
      <div className={styles.dashboard}>
        <header className={styles.header}>
          <h1 className={styles.title} style={{ marginBottom: 0 }}>Command Center</h1>
          <button onClick={handleLogout} className={styles.logoutBtn}>Logout</button>
        </header>

        <section>
          <h2 className={styles.sectionTitle}>{editingId ? 'Edit Product' : 'Add New Product'}</h2>
          <form onSubmit={handleSave} className={styles.formGrid}>
            <label className={styles.label}>
              Product Name
              <input type="text" className={styles.input} required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </label>
            <label className={styles.label}>
              Price (£)
              <input type="number" step="0.01" className={styles.input} required value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
            </label>
            <label className={styles.label}>
              Category
              <select className={styles.input} value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </label>
            <label className={styles.label}>
              Product Media (Images/Videos) ({files.length}/6)
              <input type="file" multiple accept="image/*,video/*" className={styles.fileInput} onChange={handleFileSelect} />
            </label>

            {/* Image Previews */}
            {filePreviews.length > 0 && (
              <div className={`${styles.label} ${styles.fullWidth}`}>
                <p>Selected Images:</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px', marginTop: '10px' }}>
                  {filePreviews.map((preview, index) => {
                    const isVideo = files[index]?.type.startsWith('video/');
                    return (
                      <div key={index} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                        {isVideo ? (
                          <video src={preview} style={{ width: '100%', height: '100px', objectFit: 'cover' }} muted />
                        ) : (
                          <img src={preview} alt={`Preview ${index}`} style={{ width: '100%', height: '100px', objectFit: 'cover' }} />
                        )}
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          style={{
                            position: 'absolute',
                            top: '5px',
                            right: '5px',
                            background: 'rgba(0,0,0,0.7)',
                            border: 'none',
                            color: 'white',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <label className={`${styles.label} ${styles.fullWidth}`}>
              Description
              <textarea className={`${styles.input} ${styles.textarea}`} required value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
            </label>
            <label className={`${styles.label} ${styles.fullWidth}`}>
              Sizes (comma separated)
              <input type="text" className={styles.input} value={formData.sizes} onChange={e => setFormData({ ...formData, sizes: e.target.value })} placeholder="S, M, L, XL" />
            </label>
            <label className={`${styles.label} ${styles.fullWidth}`}>
              Bullet Point Details (one per line)
              <textarea className={`${styles.input} ${styles.textarea}`} value={formData.details} onChange={e => setFormData({ ...formData, details: e.target.value })} placeholder="100% Cotton\nOversized Fit" />
            </label>

            <div className={styles.fullWidth} style={{ display: 'flex', gap: '15px' }}>
              <button type="submit" className={styles.btn} style={{ flex: 1 }} disabled={isSaving}>
                {isSaving ? 'Uploading...' : (editingId ? 'Update Product' : 'Add Product')}
              </button>
              {editingId && (
                <button type="button" onClick={resetForm} className={styles.btn} style={{ background: 'transparent', color: 'var(--color-fg)', border: '1px solid var(--color-fg)' }}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        {/* Category Management Section */}
        <section style={{ marginBottom: '40px' }}>
          <h2 className={styles.sectionTitle}>Manage Categories</h2>
          <div className={styles.formGrid} style={{ background: 'var(--color-bg-alt)', padding: '20px', borderRadius: '12px' }}>
            <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: '10px', gridColumn: '1 / -1' }}>
              <input 
                type="text" 
                className={styles.input} 
                placeholder="New Category Name (e.g. Beanies)" 
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                required
              />
              <button type="submit" className={styles.btn} disabled={isAddingCat}>
                {isAddingCat ? 'Adding...' : 'Add Category'}
              </button>
            </form>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '20px', gridColumn: '1 / -1' }}>
              {categories.map(cat => (
                <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 15px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '25px' }}>
                  <span>{cat.name}</span>
                  {!['tees', 'polos', 'hoodies'].includes(cat.id) && (
                    <button 
                      onClick={() => handleDeleteCategory(cat.id, cat.name)}
                      style={{ background: 'transparent', border: 'none', color: '#ff6b6b', cursor: 'pointer', padding: 0, display: 'flex' }}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Standalone Gallery Upload Section */}
        <section>
          <h2 className={styles.sectionTitle}>Upload Gallery Media ({galleryFiles.length}/6)</h2>
          <form onSubmit={handleGalleryUpload} className={styles.formGrid}>
            <label className={styles.label} style={{ gridColumn: '1 / -1' }}>
              Select Images or Videos for Gallery (Max 6)
              <input type="file" multiple accept="image/*,video/*" className={styles.fileInput} onChange={handleGalleryFileSelect} />
            </label>

            {/* Gallery Image Previews */}
            {galleryPreviews.length > 0 && (
              <div className={`${styles.label} ${styles.fullWidth}`}>
                <p>Selected Gallery Images:</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px', marginTop: '10px' }}>
                  {galleryPreviews.map((preview, index) => {
                    const isVideo = galleryFiles[index]?.type.startsWith('video/');
                    return (
                      <div key={index} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                        {isVideo ? (
                          <video src={preview} style={{ width: '100%', height: '100px', objectFit: 'cover' }} muted />
                        ) : (
                          <img src={preview} alt={`Gallery Preview ${index}`} style={{ width: '100%', height: '100px', objectFit: 'cover' }} />
                        )}
                        <button
                          type="button"
                          onClick={() => removeGalleryFile(index)}
                          style={{
                            position: 'absolute',
                            top: '5px',
                            right: '5px',
                            background: 'rgba(0,0,0,0.7)',
                            border: 'none',
                            color: 'white',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button type="submit" className={styles.btn} style={{ gridColumn: '1 / -1' }} disabled={isUploadingGallery || galleryFiles.length === 0}>
              {isUploadingGallery ? 'Uploading...' : 'Upload Gallery Media'}
            </button>
          </form>
        </section>

        <section>
          <h2 className={styles.sectionTitle}>Daily Orders Report</h2>
          <div className={styles.reportPanel}>
            <div className={styles.reportHeader}>
              <div style={{ display: 'grid', gap: '16px' }}>
              <div>
                <p className={styles.reportLabel}>Report period</p>
                <select
                  className={styles.input}
                  value={reportPeriod}
                  onChange={(e) => setReportPeriod(e.target.value as 'day' | 'week')}
                >
                  <option value="week">Current Week</option>
                  <option value="day">Single Day</option>
                </select>
              </div>
              <div>
                <p className={styles.reportLabel}>{reportPeriod === 'week' ? 'Week start' : 'Report date'}</p>
                <input
                  type="date"
                  className={styles.input}
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleGenerateReport}
                  className={styles.btn}
                  disabled={ordersLoading || orders.length === 0}
                >
                  <Download size={16} style={{ marginRight: '8px' }} />
                  Generate CSV
                </button>
                {spreadsheetUrl && (
                  <a
                    href={spreadsheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={`${styles.btn} ${styles.linkBtn}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  >
                    <BarChart3 size={16} /> Open Spreadsheet
                  </a>
                )}
              </div>
            </div>

            <div className={styles.reportStats}>
              <div className={styles.statCard}>
                <h3>{ordersLoading ? 'Loading...' : totalOrders}</h3>
                <p>Orders Today</p>
              </div>
              <div className={styles.statCard}>
                <h3>{ordersLoading ? 'Loading...' : formatCurrency(totalRevenue)}</h3>
                <p>Total Revenue</p>
              </div>
              <div className={styles.statCard}>
                <h3>{ordersLoading ? 'Loading...' : totalItems}</h3>
                <p>Items Sold</p>
              </div>
            </div>

            <div className={styles.chartGrid}>
              {chartData.length > 0 ? (
                chartData.map((item) => (
                  <div key={item.name} className={styles.chartBar}>
                    <div className={styles.chartBarLabel}>
                      <span>{item.name}</span>
                      <span>{item.quantity}</span>
                    </div>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barFill}
                        style={{ width: `${Math.min((item.quantity / Math.max(...chartData.map((d) => d.quantity))) * 100, 100)}%` }}
                      />
                    </div>
                    <p className={styles.barSubtext}>{formatCurrency(item.revenue)} revenue</p>
                  </div>
                ))
              ) : (
                <p style={{ color: 'var(--color-fg-muted)', margin: '0' }}>No ordered items to analyze for this date.</p>
              )}
            </div>
          </div>
        </section>

        <section>
          <h2 className={styles.sectionTitle}>Manage Catalog</h2>
          <div className={styles.productsList}>
            <AnimatePresence>
              {productsList.map((product) => (
                <motion.div
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  key={product.id}
                  className={styles.productRow}
                  style={{ flexDirection: 'column', alignItems: 'stretch', gap: '20px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className={styles.productInfo}>
                      <img src={product.image} alt={product.name} className={styles.productImage} />
                      <div>
                        <h3 className={styles.productName}>{product.name}</h3>
                        <p className={styles.productPrice}>£{product.price} - {product.category}</p>
                        {product.soldOut && <p style={{ color: '#ff6b6b', fontSize: '0.9rem', marginTop: '5px', fontWeight: 'bold' }}>🔴 SOLD OUT</p>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={() => handleToggleSoldOut(product.id, product.soldOut || false)} className={styles.editBtn} style={{ background: product.soldOut ? '#4CAF50' : '#ff6b6b', color: 'white', borderColor: 'transparent' }}>
                        {product.soldOut ? 'Mark In Stock' : 'Mark Sold Out'}
                      </button>
                      <button onClick={() => startEdit(product)} className={styles.editBtn}>Edit</button>
                      <button 
                        onClick={() => handleDeleteProduct(product.id, product.name)} 
                        className={styles.editBtn} 
                        style={{ 
                          borderColor: '#ff6b6b', 
                          color: '#ff6b6b', 
                          background: 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '8px' 
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#ff6b6b'; e.currentTarget.style.color = 'white'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#ff6b6b'; }}
                        title="Delete Product"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Size Toggles */}
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--color-fg-muted)', marginBottom: '10px' }}>Manage sizes inventory:</p>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {product.sizes?.map((size) => {
                        const isSoldOut = product.soldOutSizes?.includes(size);
                        return (
                          <button
                            key={size}
                            onClick={() => handleToggleSizeSoldOut(product.id, size, !!isSoldOut)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '4px',
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                              border: '1px solid',
                              backgroundColor: isSoldOut ? 'transparent' : 'rgba(76, 175, 80, 0.1)',
                              color: isSoldOut ? '#ff6b6b' : '#4CAF50',
                              borderColor: isSoldOut ? '#ff6b6b' : '#4CAF50',
                              transition: 'all 0.2s ease',
                              textDecoration: isSoldOut ? 'line-through' : 'none'
                            }}
                          >
                            {size} {isSoldOut ? '(Sold Out)' : '(Active)'}
                          </button>
                        );
                      })}
                      {(!product.sizes || product.sizes.length === 0) && (
                        <p style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--color-fg-muted)' }}>No sizes defined for this product.</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {productsList.length === 0 && <p style={{ color: 'var(--color-fg-muted)' }}>No products found in the catalog.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
