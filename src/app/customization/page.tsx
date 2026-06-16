'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Download } from 'lucide-react';
import styles from './Customization.module.css';

const REFERENCE_PDF = '/references/reference.pdf';
const REFERENCE_PDF_NAME = 'Reference.pdf';

type Category = { id: string; name: string };

export default function CustomizationPage() {
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontPlacement, setFrontPlacement] = useState('Front Left Chest');
  const [backPlacement, setBackPlacement] = useState('Back Center');
  const [categories, setCategories] = useState<Category[]>([]);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+44');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetch('/api/categories', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data: Category[]) => {
        if (!Array.isArray(data) || data.length === 0) return;
        setCategories(data);
        setCategory((prev) => (prev && data.some((c) => c.id === prev) ? prev : data[0].id));
      })
      .catch((err) => console.error('Error loading categories:', err));
  }, []);

  const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
  const isAllowedFile = (selectedFile: File) => {
    const fileName = selectedFile.name.toLowerCase();
    const isPdf = selectedFile.type === 'application/pdf' || fileName.endsWith('.pdf');
    const isJpeg =
      selectedFile.type === 'image/jpeg' || fileName.endsWith('.jpeg') || fileName.endsWith('.jpg');
    return isPdf || isJpeg;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, side: 'front' | 'back') => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!isAllowedFile(selectedFile)) {
      setErrorMsg('Only PDF or JPEG files are allowed.');
      if (side === 'front') setFrontFile(null);
      if (side === 'back') setBackFile(null);
      return;
    }

    if (selectedFile.size >= MAX_FILE_SIZE) {
      setErrorMsg('File must be smaller than 20MB.');
      if (side === 'front') setFrontFile(null);
      if (side === 'back') setBackFile(null);
      return;
    }

    setErrorMsg('');
    if (side === 'front') setFrontFile(selectedFile);
    if (side === 'back') setBackFile(selectedFile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!frontFile || !backFile || !name || !email || !phone || !category) {
      setErrorMsg('Please fill all required fields and upload both front and back design files.');
      return;
    }

    if (!isAllowedFile(frontFile) || !isAllowedFile(backFile)) {
      setErrorMsg('Only PDF or JPEG files are allowed.');
      return;
    }

    if (frontFile.size >= MAX_FILE_SIZE || backFile.size >= MAX_FILE_SIZE) {
      setErrorMsg('Each file must be smaller than 20MB.');
      return;
    }

    setStatus('uploading');
    const formData = new FormData();
    formData.append('frontFile', frontFile);
    formData.append('backFile', backFile);
    formData.append('frontPlacement', frontPlacement);
    formData.append('backPlacement', backPlacement);
    formData.append('category', category);
    const categoryName = categories.find((c) => c.id === category)?.name || category;
    formData.append('categoryName', categoryName);
    formData.append('description', description);
    formData.append('name', name);
    formData.append('email', email);
    formData.append('phone', `${countryCode} ${phone}`);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setStatus('success');
        setFrontFile(null);
        setBackFile(null);
        setFrontPlacement('Front Left Chest');
        setBackPlacement('Back Center');
        setCategory(categories[0]?.id || '');
        setDescription('');
        setName('');
        setEmail('');
        setPhone('');
      } else {
        setStatus('error');
        setErrorMsg(data.error || 'Upload failed. Please try again.');
      }
    } catch (error) {
      setStatus('error');
      setErrorMsg('An unexpected error occurred.');
    }
  };

  return (
    <main className={styles.main}>
      <section className={styles.hero}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={styles.container}
        >
          <h1 className={styles.title}>Custom Design Upload</h1>
          <p className={styles.subtitle}>
            Review our reference template, then upload front and back design files. We&apos;ll bring your vision to life.
          </p>

          <div className={styles.card}>
            {status === 'success' ? (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={styles.successState}
              >
                <CheckCircle size={64} className={styles.successIcon} />
                <h2>Upload Successful!</h2>
                <p>Our team will get back to you in the next 24 hours.</p>
                <button 
                  onClick={() => setStatus('idle')} 
                  className={styles.resetBtn}
                >
                  Upload Another
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.inputGroup}>
                  <label htmlFor="name">Customer Name</label>
                  <input 
                    type="text" 
                    id="name"
                    required
                    placeholder="Your Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={status === 'uploading'}
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.inputGroup}>
                    <label htmlFor="email">Email Address</label>
                    <input 
                      type="email" 
                      id="email"
                      required
                      placeholder="email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={status === 'uploading'}
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <label htmlFor="phone">Contact Number</label>
                    <div className={styles.phoneInputWrapper}>
                      <select 
                        className={styles.countrySelect}
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        disabled={status === 'uploading'}
                      >
                        <option value="+44">+44 UK</option>
                        <option value="+1">+1 USA</option>
                        <option value="+91">+91 IND</option>
                        <option value="+971">+971 UAE</option>
                        <option value="+61">+61 AUS</option>
                        <option value="+33">+33 FRA</option>
                        <option value="+49">+49 GER</option>
                      </select>
                      <input 
                        type="tel" 
                        id="phone"
                        required
                        placeholder="7400 123456"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={status === 'uploading'}
                      />
                    </div>
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label>Reference Template</label>
                  <p className={styles.referenceHint}>
                    Use this PDF as a guide for layout and details. Upload your own file below in the same format.
                  </p>
                  <div className={`${styles.dropzone} ${styles.referenceDropzone}`}>
                    <div className={styles.referenceContent}>
                      <FileText size={32} />
                      <span className={styles.referenceFileName}>{REFERENCE_PDF_NAME}</span>
                      <div className={styles.referenceActions}>
                        <a
                          href={REFERENCE_PDF}
                          download={REFERENCE_PDF_NAME}
                          className={styles.referenceBtn}
                        >
                          <Download size={16} />
                          Download PDF
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="category">Category</label>
                  <select
                    id="category"
                    className={styles.placementSelect}
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    disabled={status === 'uploading' || categories.length === 0}
                    required
                  >
                    {categories.length === 0 ? (
                      <option value="">Loading categories...</option>
                    ) : (
                      categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label>1. Front Design Upload (PDF/JPEG, max 20MB)</label>
                  <select
                    className={styles.placementSelect}
                    value={frontPlacement}
                    onChange={(e) => setFrontPlacement(e.target.value)}
                    disabled={status === 'uploading'}
                  >
                    <option value="Front Left Chest">Front Left Chest</option>
                    <option value="Front Right Chest">Front Right Chest</option>
                    <option value="Front Center">Front Center</option>
                    <option value="Define in description">Define in description</option>
                  </select>
                  <div className={`${styles.dropzone} ${frontFile ? styles.hasFile : ''}`}>
                    <input
                      type="file"
                      accept=".pdf,.jpeg,.jpg,application/pdf,image/jpeg"
                      onChange={(e) => handleFileChange(e, 'front')}
                      className={styles.fileInput}
                      id="front-file-upload"
                      disabled={status === 'uploading'}
                    />
                    <label htmlFor="front-file-upload" className={styles.dropzoneLabel}>
                      {frontFile ? (
                        <div className={styles.fileInfo}>
                          <FileText size={32} />
                          <span>{frontFile.name} ({(frontFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
                        </div>
                      ) : (
                        <div className={styles.uploadPrompt}>
                          <Upload size={32} />
                          <span>Upload front design file</span>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label>2. Back Design Upload (PDF/JPEG, max 20MB)</label>
                  <select
                    className={styles.placementSelect}
                    value={backPlacement}
                    onChange={(e) => setBackPlacement(e.target.value)}
                    disabled={status === 'uploading'}
                  >
                    <option value="Back Center">Back Center</option>
                    <option value="Define in description">Define in description</option>
                  </select>
                  <div className={`${styles.dropzone} ${backFile ? styles.hasFile : ''}`}>
                    <input
                      type="file"
                      accept=".pdf,.jpeg,.jpg,application/pdf,image/jpeg"
                      onChange={(e) => handleFileChange(e, 'back')}
                      className={styles.fileInput}
                      id="back-file-upload"
                      disabled={status === 'uploading'}
                    />
                    <label htmlFor="back-file-upload" className={styles.dropzoneLabel}>
                      {backFile ? (
                        <div className={styles.fileInfo}>
                          <FileText size={32} />
                          <span>{backFile.name} ({(backFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
                        </div>
                      ) : (
                        <div className={styles.uploadPrompt}>
                          <Upload size={32} />
                          <span>Upload back design file</span>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="description">Description (common for front and back)</label>
                  <textarea
                    id="description"
                    rows={4}
                    placeholder="Add notes for both front and back design placements, colors, sizing, and all requirements here."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={status === 'uploading'}
                  />
                </div>

                <AnimatePresence>
                  {errorMsg && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={styles.errorMessage}
                    >
                      <AlertCircle size={18} />
                      <span>{errorMsg}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button 
                  type="submit" 
                  className={styles.submitBtn}
                  disabled={status === 'uploading' || !frontFile || !backFile || !name || !category}
                >
                  {status === 'uploading' ? (
                    <>
                      <Loader2 size={18} className={styles.spinner} />
                      Uploading...
                    </>
                  ) : 'Get Quote'}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </section>
    </main>
  );
}
