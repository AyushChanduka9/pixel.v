import { useState, useCallback } from 'react';
import { Upload, X, CheckCircle, AlertCircle, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';

interface UploadFile {
  id: string;
  file: File;
  preview: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  title: string;
  caption: string;
  altText: string;
  privacy: 'public' | 'unlisted' | 'private';
  tags: string[];
}

interface BatchUploaderProps {
  onUploadComplete: () => void;
}

export default function BatchUploader({ onUploadComplete }: BatchUploaderProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  const handleFiles = (fileList: File[]) => {
    console.log('📁 [FILE-HANDLER] Processing file selection:', {
      fileCount: fileList.length,
      files: Array.from(fileList).map(file => ({
        name: file.name,
        size: file.size,
        type: file.type,
        sizeMB: (file.size / 1024 / 1024).toFixed(2),
        isImage: file.type.startsWith('image/'),
        lastModified: new Date(file.lastModified).toISOString()
      })),
      timestamp: new Date().toISOString()
    });

    const newFiles: UploadFile[] = [];
    const rejectedFiles: { file: File; reason: string }[] = [];
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    
    fileList.forEach((file) => {
      console.log('🔍 [FILE-HANDLER] Processing individual file:', {
        name: file.name,
        size: file.size,
        type: file.type,
        sizeMB: (file.size / 1024 / 1024).toFixed(2),
        isImage: file.type.startsWith('image/'),
        isUnderSizeLimit: file.size <= maxFileSize
      });

      if (!file.type.startsWith('image/')) {
        console.warn('🚫 [FILE-HANDLER] Rejected non-image file:', {
          name: file.name,
          type: file.type,
          reason: 'Not an image file'
        });
        rejectedFiles.push({ file, reason: 'Not an image file' });
        return;
      }

      if (file.size > maxFileSize) {
        console.warn('🚫 [FILE-HANDLER] Rejected oversized file:', {
          name: file.name,
          sizeMB: (file.size / 1024 / 1024).toFixed(2),
          maxSizeMB: '10',
          reason: 'File too large (max 10MB)'
        });
        rejectedFiles.push({ file, reason: 'File too large (max 10MB)' });
        return;
      }

      try {
        const id = crypto.randomUUID();
        const preview = URL.createObjectURL(file);
        const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9\s-_]/g, '');
        
        console.log('✅ [FILE-HANDLER] File accepted and processed:', {
          id,
          name: file.name,
          cleanTitle,
          preview: preview.substring(0, 50) + '...',
          sizeMB: (file.size / 1024 / 1024).toFixed(2)
        });
        
        newFiles.push({
          id,
          file,
          preview,
          progress: 0,
          status: 'pending',
          title: cleanTitle,
          caption: '',
          altText: '',
          privacy: 'public',
          tags: [],
        });
      } catch (error) {
        console.error('❌ [FILE-HANDLER] Error processing file:', {
          name: file.name,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        rejectedFiles.push({ file, reason: 'Processing error' });
      }
    });

    console.log('📊 [FILE-HANDLER] File processing summary:', {
      totalFiles: fileList.length,
      acceptedFiles: newFiles.length,
      rejectedFiles: rejectedFiles.length,
      rejectedReasons: rejectedFiles.map(rf => ({ name: rf.file.name, reason: rf.reason })),
      acceptedFileDetails: newFiles.map(nf => ({
        id: nf.id,
        name: nf.file.name,
        title: nf.title,
        sizeMB: (nf.file.size / 1024 / 1024).toFixed(2)
      }))
    });

    if (rejectedFiles.length > 0) {
      const rejectedMessage = rejectedFiles.map(rf => `${rf.file.name}: ${rf.reason}`).join('\n');
      console.warn('⚠️ [FILE-HANDLER] Showing rejection alert to user:', rejectedMessage);
      alert(`Some files were rejected:\n${rejectedMessage}`);
    }

    if (newFiles.length > 0) {
      console.log('📝 [FILE-HANDLER] Adding accepted files to state:', {
        newFileCount: newFiles.length,
        currentFileCount: files.length,
        totalAfterAdd: files.length + newFiles.length
      });

      setFiles(prev => {
        const updated = [...prev, ...newFiles];
        console.log('✅ [FILE-HANDLER] Files state updated:', {
          previousCount: prev.length,
          addedCount: newFiles.length,
          newTotalCount: updated.length
        });
        return updated;
      });
    } else {
      console.warn('🚫 [FILE-HANDLER] No files were accepted for processing');
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => {
      const updated = prev.filter(f => f.id !== id);
      const removed = prev.find(f => f.id === id);
      if (removed) {
        URL.revokeObjectURL(removed.preview);
      }
      return updated;
    });
  };

  const moveFile = (id: string, direction: 'up' | 'down') => {
    setFiles(prev => {
      const currentIndex = prev.findIndex(f => f.id === id);
      if (currentIndex === -1) return prev;
      
      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      
      const newFiles = [...prev];
      [newFiles[currentIndex], newFiles[newIndex]] = [newFiles[newIndex], newFiles[currentIndex]];
      return newFiles;
    });
  };

  const updateFile = (id: string, updates: Partial<UploadFile>) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const uploadFile = async (fileUpload: UploadFile): Promise<void> => {
    console.log('📤 [BATCH-UPLOAD] Starting individual file upload:', {
      fileId: fileUpload.id,
      fileName: fileUpload.file.name,
      fileSize: fileUpload.file.size,
      fileType: fileUpload.file.type,
      sizeMB: (fileUpload.file.size / 1024 / 1024).toFixed(2),
      title: fileUpload.title,
      privacy: fileUpload.privacy,
      tagCount: fileUpload.tags.length,
      timestamp: new Date().toISOString()
    });

    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', fileUpload.file);
      formData.append('title', fileUpload.title);
      formData.append('caption', fileUpload.caption);
      formData.append('alt_text', fileUpload.altText);
      formData.append('privacy', fileUpload.privacy);
      formData.append('tags', JSON.stringify(fileUpload.tags));

      console.log('📋 [BATCH-UPLOAD] FormData prepared:', {
        fileId: fileUpload.id,
        formDataEntries: Array.from(formData.entries()).map(([key, value]) => ({
          key,
          valueType: typeof value,
          isFile: value instanceof File,
          size: value instanceof File ? value.size : String(value).length
        }))
      });

      const xhr = new XMLHttpRequest();
      const uploadStartTime = Date.now();

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          console.log('📈 [BATCH-UPLOAD] Upload progress:', {
            fileId: fileUpload.id,
            progress,
            loaded: e.loaded,
            total: e.total,
            loadedMB: (e.loaded / 1024 / 1024).toFixed(2),
            totalMB: (e.total / 1024 / 1024).toFixed(2),
            elapsedMs: Date.now() - uploadStartTime
          });
          updateFile(fileUpload.id, { progress, status: 'uploading' });
        }
      };

      xhr.onload = () => {
        const uploadDuration = Date.now() - uploadStartTime;
        console.log('📡 [BATCH-UPLOAD] Upload response received:', {
          fileId: fileUpload.id,
          status: xhr.status,
          statusText: xhr.statusText,
          responseType: xhr.getResponseHeader('content-type'),
          responseLength: xhr.responseText.length,
          uploadDurationMs: uploadDuration
        });

        if (xhr.status === 200 || xhr.status === 201) {
          let responseData;
          try {
            responseData = JSON.parse(xhr.responseText);
            console.log('✅ [BATCH-UPLOAD] Upload successful:', {
              fileId: fileUpload.id,
              fileName: fileUpload.file.name,
              hasImage: !!responseData.image,
              imageId: responseData.image?.id,
              cloudinaryUrl: responseData.image?.cloudinary_url?.substring(0, 50) + '...',
              uploadDurationMs: uploadDuration
            });
          } catch (parseError) {
            console.error('❌ [BATCH-UPLOAD] Failed to parse success response:', {
              parseError,
              fileId: fileUpload.id,
              responseText: xhr.responseText.substring(0, 200)
            });
          }

          updateFile(fileUpload.id, { progress: 100, status: 'success' });
          resolve();
        } else {
          let errorData = 'Upload failed';
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            errorData = errorResponse.error || 'Upload failed';
            console.error('❌ [BATCH-UPLOAD] Server error response:', {
              fileId: fileUpload.id,
              status: xhr.status,
              statusText: xhr.statusText,
              errorResponse,
              uploadDurationMs: uploadDuration
            });
          } catch (parseError) {
            console.error('❌ [BATCH-UPLOAD] Failed to parse error response:', {
              parseError,
              fileId: fileUpload.id,
              status: xhr.status,
              rawResponse: xhr.responseText.substring(0, 200)
            });
            errorData = `HTTP ${xhr.status}: ${xhr.statusText}`;
          }

          updateFile(fileUpload.id, { status: 'error', error: errorData });
          reject(new Error(errorData));
        }
      };

      xhr.onerror = () => {
        const uploadDuration = Date.now() - uploadStartTime;
        console.error('❌ [BATCH-UPLOAD] Network error occurred:', {
          fileId: fileUpload.id,
          fileName: fileUpload.file.name,
          uploadDurationMs: uploadDuration,
          readyState: xhr.readyState,
          status: xhr.status
        });

        updateFile(fileUpload.id, { status: 'error', error: 'Network error' });
        reject(new Error('Network error'));
      };

      xhr.ontimeout = () => {
        console.error('❌ [BATCH-UPLOAD] Upload timeout occurred:', {
          fileId: fileUpload.id,
          fileName: fileUpload.file.name,
          timeoutMs: xhr.timeout || 'default'
        });

        updateFile(fileUpload.id, { status: 'error', error: 'Upload timeout' });
        reject(new Error('Upload timeout'));
      };

      // Set timeout for large files
      xhr.timeout = 60000; // 60 seconds

      console.log('🌐 [BATCH-UPLOAD] Starting XMLHttpRequest:', {
        fileId: fileUpload.id,
        method: 'POST',
        url: '/api/images/upload',
        timeout: xhr.timeout
      });

      xhr.open('POST', '/api/images/upload');
      xhr.send(formData);
    });
  };

  const handleBatchUpload = async () => {
    if (files.length === 0) {
      console.warn('🚫 [BATCH-UPLOAD] No files to upload');
      return;
    }

    const pendingFiles = files.filter(f => f.status === 'pending');
    
    console.log('🚀 [BATCH-UPLOAD] Starting batch upload process:', {
      totalFiles: files.length,
      pendingFiles: pendingFiles.length,
      successFiles: files.filter(f => f.status === 'success').length,
      errorFiles: files.filter(f => f.status === 'error').length,
      batchSize: 3,
      timestamp: new Date().toISOString()
    });

    if (pendingFiles.length === 0) {
      console.warn('🚫 [BATCH-UPLOAD] No pending files to upload');
      return;
    }

    setUploading(true);
    
    // Upload files in parallel with limited concurrency
    const batchSize = 3;
    const totalBatches = Math.ceil(pendingFiles.length / batchSize);
    
    console.log('📊 [BATCH-UPLOAD] Batch configuration:', {
      batchSize,
      totalBatches,
      pendingFileDetails: pendingFiles.map(f => ({
        id: f.id,
        fileName: f.file.name,
        sizeMB: (f.file.size / 1024 / 1024).toFixed(2),
        privacy: f.privacy
      }))
    });

    const batchStartTime = Date.now();
    let completedBatches = 0;
    let totalSuccessful = 0;
    let totalFailed = 0;

    for (let i = 0; i < pendingFiles.length; i += batchSize) {
      const batchNumber = Math.floor(i / batchSize) + 1;
      const batch = pendingFiles.slice(i, i + batchSize);
      
      console.log(`📦 [BATCH-UPLOAD] Processing batch ${batchNumber}/${totalBatches}:`, {
        batchNumber,
        batchSize: batch.length,
        fileIds: batch.map(f => f.id),
        fileNames: batch.map(f => f.file.name)
      });

      const batchStartTime = Date.now();
      const results = await Promise.allSettled(batch.map(uploadFile));
      const batchDuration = Date.now() - batchStartTime;
      
      const batchSuccessful = results.filter(r => r.status === 'fulfilled').length;
      const batchFailed = results.filter(r => r.status === 'rejected').length;
      
      totalSuccessful += batchSuccessful;
      totalFailed += batchFailed;
      completedBatches++;

      console.log(`✅ [BATCH-UPLOAD] Batch ${batchNumber}/${totalBatches} completed:`, {
        batchNumber,
        successful: batchSuccessful,
        failed: batchFailed,
        batchDurationMs: batchDuration,
        results: results.map((result, index) => ({
          fileId: batch[index].id,
          fileName: batch[index].file.name,
          status: result.status,
          error: result.status === 'rejected' ? result.reason?.message : undefined
        }))
      });

      // Log any failures in this batch
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`❌ [BATCH-UPLOAD] File upload failed in batch ${batchNumber}:`, {
            fileId: batch[index].id,
            fileName: batch[index].file.name,
            error: result.reason?.message || 'Unknown error',
            batchNumber
          });
        }
      });
    }

    const totalBatchDuration = Date.now() - batchStartTime;

    console.log('🏁 [BATCH-UPLOAD] All batches completed:', {
      totalBatches,
      completedBatches,
      totalFiles: pendingFiles.length,
      totalSuccessful,
      totalFailed,
      successRate: ((totalSuccessful / pendingFiles.length) * 100).toFixed(1) + '%',
      totalDurationMs: totalBatchDuration,
      averageBatchDurationMs: Math.round(totalBatchDuration / totalBatches),
      averageFileUploadMs: Math.round(totalBatchDuration / pendingFiles.length)
    });

    setUploading(false);
    
    // Check final status of all files
    const finalStats = {
      total: files.length,
      success: files.filter(f => f.status === 'success').length,
      error: files.filter(f => f.status === 'error').length,
      pending: files.filter(f => f.status === 'pending').length
    };

    console.log('📊 [BATCH-UPLOAD] Final upload statistics:', {
      ...finalStats,
      allSuccess: finalStats.success === files.length && finalStats.error === 0,
      successRate: ((finalStats.success / files.length) * 100).toFixed(1) + '%'
    });
    
    // Check if all uploads completed successfully
    const allSuccess = files.every(f => f.status === 'success');
    
    if (allSuccess) {
      console.log('🎉 [BATCH-UPLOAD] All uploads successful, triggering completion callback');
      onUploadComplete();
      
      // Clear successful uploads after a delay
      console.log('🧹 [BATCH-UPLOAD] Scheduling cleanup of successful uploads');
      setTimeout(() => {
        console.log('🧹 [BATCH-UPLOAD] Cleaning up blob URLs and clearing files');
        files.forEach(f => {
          URL.revokeObjectURL(f.preview);
          console.log('🗑️ [BATCH-UPLOAD] Revoked blob URL for:', f.file.name);
        });
        setFiles([]);
        console.log('✅ [BATCH-UPLOAD] Cleanup completed');
      }, 2000);
    } else {
      console.log('⚠️ [BATCH-UPLOAD] Some uploads failed, keeping files for retry:', {
        successCount: finalStats.success,
        errorCount: finalStats.error,
        pendingCount: finalStats.pending
      });
    }
  };

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const successCount = files.filter(f => f.status === 'success').length;
  const errorCount = files.filter(f => f.status === 'error').length;

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive 
            ? 'border-purple-500 bg-purple-50' 
            : 'border-gray-300 hover:border-purple-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="space-y-4">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-600 to-blue-500 rounded-full flex items-center justify-center">
            <Upload className="w-8 h-8 text-white" />
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Drop images here or click to browse
            </h3>
            <p className="text-gray-500">
              Supports JPG, PNG, GIF, WebP. Max 10MB per file.
            </p>
          </div>

          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
      </div>

      {/* Upload Progress Summary */}
      {files.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4 text-sm">
              <span className="text-gray-600">Total: {files.length}</span>
              {pendingCount > 0 && <span className="text-yellow-600">Pending: {pendingCount}</span>}
              {successCount > 0 && <span className="text-green-600">Success: {successCount}</span>}
              {errorCount > 0 && <span className="text-red-600">Failed: {errorCount}</span>}
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  files.forEach(f => URL.revokeObjectURL(f.preview));
                  setFiles([]);
                }}
                disabled={uploading}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
              >
                Clear All
              </button>
              <button
                onClick={handleBatchUpload}
                disabled={uploading || pendingCount === 0}
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white font-medium rounded-lg hover:from-purple-700 hover:to-blue-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Uploading...' : `Upload ${pendingCount} Images`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-4">
          {files.map((fileUpload, index) => (
            <div key={fileUpload.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex gap-4">
                {/* Reorder Controls */}
                {fileUpload.status === 'pending' && (
                  <div className="flex flex-col justify-center space-y-1">
                    <button
                      onClick={() => moveFile(fileUpload.id, 'up')}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Move up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <GripVertical className="w-4 h-4 text-gray-300" />
                    <button
                      onClick={() => moveFile(fileUpload.id, 'down')}
                      disabled={index === files.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Move down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Preview */}
                <div className="flex-shrink-0 relative">
                  <img
                    src={fileUpload.preview}
                    alt="Preview"
                    className="w-20 h-20 object-cover rounded-lg bg-gray-100"
                  />
                  {getStatusIcon(fileUpload.status) && (
                    <div className="absolute -top-2 -right-2">
                      {getStatusIcon(fileUpload.status)}
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          #{index + 1}
                        </span>
                        <input
                          type="text"
                          value={fileUpload.title}
                          onChange={(e) => updateFile(fileUpload.id, { title: e.target.value })}
                          disabled={fileUpload.status !== 'pending'}
                          className="flex-1 text-sm font-medium text-gray-900 bg-transparent border-none p-0 focus:ring-0 disabled:opacity-60"
                          placeholder="Enter image title..."
                        />
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        {(fileUpload.file.size / 1024 / 1024).toFixed(1)} MB • {fileUpload.file.type}
                      </div>

                      {/* Additional metadata fields for pending files */}
                      {fileUpload.status === 'pending' && (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <input
                            type="text"
                            placeholder="Caption (optional)"
                            value={fileUpload.caption}
                            onChange={(e) => updateFile(fileUpload.id, { caption: e.target.value })}
                            className="text-xs px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-purple-500"
                          />
                          <select
                            value={fileUpload.privacy}
                            onChange={(e) => updateFile(fileUpload.id, { privacy: e.target.value as any })}
                            className="text-xs px-2 py-1 border border-gray-200 rounded focus:ring-1 focus:ring-purple-500"
                          >
                            <option value="public">Public</option>
                            <option value="unlisted">Unlisted</option>
                            <option value="private">Private</option>
                          </select>
                        </div>
                      )}

                      {/* Progress bar */}
                      {fileUpload.status === 'uploading' && (
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-purple-600 to-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${fileUpload.progress}%` }}
                          ></div>
                        </div>
                      )}

                      {fileUpload.status === 'error' && (
                        <p className="text-sm text-red-600">{fileUpload.error}</p>
                      )}
                    </div>

                    {fileUpload.status === 'pending' && (
                      <button
                        onClick={() => removeFile(fileUpload.id)}
                        className="ml-4 p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
