'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { SizeChart } from '@/lib/sizeCharts';
import styles from './SizeChartModal.module.css';

type SizeChartModalProps = {
  chart: SizeChart;
  open: boolean;
  onClose: () => void;
};

export default function SizeChartModal({ chart, open, onClose }: SizeChartModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="size-chart-title"
        >
          <motion.div
            className={styles.modal}
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close size chart">
              <X size={18} />
            </button>

            <header className={styles.modalHeader}>
              <p className={styles.title} id="size-chart-title">
                {chart.title}
              </p>
              <h2 className={styles.subtitle}>{chart.subtitle}</h2>
            </header>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col" className={styles.cornerCell} />
                    {chart.sizes.map((size) => (
                      <th key={size} scope="col">
                        {size}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {chart.rows.map((row) => (
                    <tr key={row.label}>
                      <th scope="row">{row.label}</th>
                      {chart.sizes.map((size) => (
                        <td key={size}>{row.values[size] ?? '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className={styles.unit}>{chart.unit}</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
