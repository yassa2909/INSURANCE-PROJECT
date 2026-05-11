import { useState } from 'react';
import api, { uploadQuoteDocuments } from '../services/api';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

const DocumentUpload = ({ quote, onSuccess, onCancel }) => {
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const onFileChange = (e) => {
    setError('');
    const list = Array.from(e.target.files || []);
    const invalid = list.find((f) => !ALLOWED_TYPES.includes(f.type) || f.size > MAX_FILE_SIZE);
    if (invalid) {
      setError('Only PDF/JPEG/PNG under 10MB are allowed.');
      return;
    }
    setFiles(list);
  };

  const handleUpload = async () => {
    if (!quote || !quote.quoteId) return setError('Missing quote context');
    if (!files.length) return setError('Please select at least one file to upload.');

    setUploading(true);
    setError('');
    setProgress(0);

    try {
      const form = new FormData();
      files.forEach((f) => form.append('files', f));

      const response = await api.post(
        `/quotes/${quote.quoteId}/documents`,
        form,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (evt) => {
            if (evt.total) setProgress(Math.round((evt.loaded / evt.total) * 100));
          },
        }
      );

      if (response?.data?.success) {
        onSuccess && onSuccess(response.data);
      } else {
        setError(response?.data?.message || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload error', err);
      setError(err.response?.data?.message || err.message || 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div style={{ paddingLeft: '42px', marginTop: '12px', maxWidth: '520px' }}>
      <div style={{ background: '#fff', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '14px', padding: '14px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#1f2937', marginBottom: '8px' }}>Upload Documents to Buy This Plan</div>
        <div style={{ fontSize: '12px', color: '#374151', marginBottom: '8px' }}>Attach ID proof, signed forms, KYC documents (PDF/JPEG/PNG, max 10MB each)</div>
        <input type="file" multiple onChange={onFileChange} accept=".pdf,image/*" />
        {files.length ? (
          <div style={{ marginTop: '8px', fontSize: '13px' }}>{files.length} file(s) selected</div>
        ) : null}
        {error && <div style={{ marginTop: '8px', color: 'crimson' }}>{error}</div>}

        {uploading ? (
          <div style={{ marginTop: '10px' }}>
            Uploading... {progress}%
            <div style={{ height: '6px', width: '100%', background: '#e5e7eb', borderRadius: '6px', marginTop: '6px' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: '#4f46e5', borderRadius: '6px' }} />
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button type="button" onClick={handleUpload} style={{ padding: '8px 12px', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Upload</button>
            <button type="button" onClick={() => onCancel && onCancel()} style={{ padding: '8px 12px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentUpload;
