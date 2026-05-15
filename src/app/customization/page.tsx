'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import styles from './Customization.module.css';

export default function CustomizationPage() {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+44');
  const [phone, setPhone] = useState('');
  const [instructions, setInstructions] = useState('');
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
  const ALLOWED_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!ALLOWED_TYPES.includes(selectedFile.type)) {
      setErrorMsg('Only PDF and DOCX files are allowed.');
      setFile(null);
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setErrorMsg('File size exceeds 20MB limit.');
      setFile(null);
      return;
    }

    setErrorMsg('');
    setFile(selectedFile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !name || !email || !phone) {
      setErrorMsg('Please fill in all required fields and select a file.');
      return;
    }

    setStatus('uploading');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    formData.append('email', email);
    formData.append('phone', `${countryCode} ${phone}`);
    formData.append('instructions', instructions);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setStatus('success');
        setFile(null);
        setName('');
        setEmail('');
        setPhone('');
        setInstructions('');
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
            Upload your design specs and custom instructions. We'll bring your vision to life.
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
                        <option value="+44">UK (+44)</option>
                        <option value="+1">USA (+1)</option>
                        <option value="+91">IND (+91)</option>
                        <option value="+971">UAE (+971)</option>
                        <option value="+61">AUS (+61)</option>
                        <option value="+33">FRA (+33)</option>
                        <option value="+49">GER (+49)</option>
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
                  <label>Design File (PDF or DOCX, max 20MB)</label>
                  <div className={`${styles.dropzone} ${file ? styles.hasFile : ''}`}>
                    <input 
                      type="file" 
                      accept=".pdf,.docx"
                      onChange={handleFileChange}
                      className={styles.fileInput}
                      id="file-upload"
                      disabled={status === 'uploading'}
                    />
                    <label htmlFor="file-upload" className={styles.dropzoneLabel}>
                      {file ? (
                        <div className={styles.fileInfo}>
                          <FileText size={32} />
                          <span>{file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                        </div>
                      ) : (
                        <div className={styles.uploadPrompt}>
                          <Upload size={32} />
                          <span>Click to upload or drag and drop</span>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="instructions">Custom Instructions / Specifications</label>
                  <textarea 
                    id="instructions"
                    rows={4}
                    placeholder="Describe your requirements in detail..."
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
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
                  disabled={status === 'uploading' || !file || !name}
                >
                  {status === 'uploading' ? (
                    <>
                      <Loader2 size={18} className={styles.spinner} />
                      Uploading...
                    </>
                  ) : 'Submit Customization'}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </section>
    </main>
  );
}
