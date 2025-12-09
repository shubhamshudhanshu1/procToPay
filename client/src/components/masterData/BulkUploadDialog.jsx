import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  IconButton,
  Typography,
  Alert,
  LinearProgress,
} from '@mui/material';
import { Close, CloudUpload } from '@mui/icons-material';

const BulkUploadDialog = ({ open, onClose, onSuccess, type, onDownloadTemplate }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const ext = selectedFile.name.split('.').pop().toLowerCase();
      if (!['xlsx', 'xls'].includes(ext)) {
        setError('Please upload an Excel file (.xlsx or .xls)');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const response = await onSuccess(file);
      setResult(response.result || response);
      setFile(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setFile(null);
    setResult(null);
    setError(null);
    onClose();
  };

  const handleDownloadTemplate = async () => {
    try {
      if (!onDownloadTemplate) {
        setError('Download template function not available');
        return;
      }
      setError(null); // Clear any previous errors

      console.log('Calling onDownloadTemplate...');
      let result;
      try {
        result = await onDownloadTemplate();
        console.log('Received result:', {
          result,
          type: typeof result,
          isBlob: result instanceof Blob,
          isArrayBuffer: result instanceof ArrayBuffer,
          isNull: result === null,
          isUndefined: result === undefined,
          hasData: !!result,
          size: result?.size,
          constructor: result?.constructor?.name,
          keys: result && typeof result === 'object' ? Object.keys(result) : null,
        });
      } catch (err) {
        console.error('Error calling onDownloadTemplate:', err);
        throw err; // Re-throw to be caught by outer catch
      }

      // Handle different response formats
      // axios with responseType: 'blob' should return a Blob in response.data
      // The service already extracts response.data, so result should be a Blob
      let downloadBlob = result;

      // If it's already a Blob, use it directly
      if (result instanceof Blob) {
        downloadBlob = result;
      }
      // If it's an ArrayBuffer, convert to Blob
      else if (result instanceof ArrayBuffer) {
        downloadBlob = new Blob([result], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
      }
      // If response has data property (nested response), use that
      else if (result && typeof result === 'object' && result.data) {
        downloadBlob =
          result.data instanceof Blob
            ? result.data
            : new Blob([result.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              });
      }
      // If we have data but it's not a Blob, try to create one
      else if (result) {
        try {
          downloadBlob = new Blob([result], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          });
        } catch (e) {
          // If creating blob fails, but we have data, try to download anyway
          console.warn('Could not validate blob type, attempting download anyway:', e);
          downloadBlob = result;
        }
      } else {
        console.error('No template data received - result is:', result);
        setError('No template data received from server');
        return;
      }

      // Only check size if it's a Blob (has size property)
      if (downloadBlob instanceof Blob && downloadBlob.size === 0) {
        setError('Template file is empty');
        return;
      }

      // Download the file
      const url = window.URL.createObjectURL(downloadBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}s_template.xlsx`;
      document.body.appendChild(a);
      a.click();

      // Small delay before cleanup to ensure download starts
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);

      // Clear error on success
      setError(null);
    } catch (err) {
      console.error('Template download error:', err);
      setError(
        err.response?.data?.error || err.message || 'Failed to download template. Please try again.'
      );
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth disableRestoreFocus>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Bulk Upload {type.charAt(0).toUpperCase() + type.slice(1)}s
          </Typography>
          <IconButton onClick={handleClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {result && (
            <Alert severity={result.failed === 0 ? 'success' : 'warning'}>
              <Typography variant="body2">
                Upload completed: {result.success} succeeded, {result.failed} failed out of{' '}
                {result.total} total.
              </Typography>
              {result.errors && result.errors.length > 0 && (
                <Box sx={{ mt: 1, maxHeight: 200, overflow: 'auto' }}>
                  {result.errors.slice(0, 10).map((err, idx) => (
                    <Typography key={idx} variant="caption" display="block">
                      Row {err.row}: {err.message}
                    </Typography>
                  ))}
                  {result.errors.length > 10 && (
                    <Typography variant="caption" color="text.secondary">
                      ... and {result.errors.length - 10} more errors
                    </Typography>
                  )}
                </Box>
              )}
            </Alert>
          )}

          <Box>
            <Button
              variant="outlined"
              startIcon={<CloudUpload />}
              onClick={handleDownloadTemplate}
              sx={{ mb: 2 }}
            >
              Download Template
            </Button>
          </Box>

          <Box>
            <input
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
              id="file-upload"
              type="file"
              onChange={handleFileChange}
              disabled={uploading}
            />
            <label htmlFor="file-upload">
              <Button variant="outlined" component="span" disabled={uploading} fullWidth>
                {file ? file.name : 'Select Excel File'}
              </Button>
            </label>
          </Box>

          {uploading && <LinearProgress />}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={uploading}>
          {result ? 'Close' : 'Cancel'}
        </Button>
        {!result && (
          <Button onClick={handleUpload} variant="contained" disabled={!file || uploading}>
            Upload
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default BulkUploadDialog;
