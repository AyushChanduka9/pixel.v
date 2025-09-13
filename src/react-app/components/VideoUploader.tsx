import { useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Video, Play } from 'lucide-react';

interface UploadFile {
  id: string;
  file: File;
  preview: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  title: string;
  description: string;
  privacy: 'public' | 'unlisted' | 'private';
  tags: string[];
  thumbnail?: string;
}

interface VideoUploaderProps {
  onUploadComplete: () => void;
}

export default function VideoUploader({ onUploadComplete }: VideoUploaderProps) {
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
    console.log('📁 [VIDEO-HANDLER] Processing video file selection:', {
      fileCount: fileList.length,
      files: Array.from(fileList).map(file => ({
        name: file.name,
        size: file.size,
        type: file.type,
        sizeMB: (file.size / 1024 / 1024).toFixed(2),
        isVideo: file.type.startsWith('video/'),
        lastModified: new Date(file.lastModified).toISOString()
      })),
      timestamp: new Date().toISOString()
    });

    const newFiles: UploadFile[] = [];
    const rejectedFiles: { file: File; reason: string }[] = [];
    const maxFileSize = 500 * 1024 * 1024; // 500MB for videos
    
    fileList.forEach((file) => {
      console.log('🔍 [VIDEO-HANDLER] Processing individual video file:', {
        name: file.name,
        size: file.size,
        type: file.type,
        sizeMB: (file.size / 1024 / 1024).toFixed(2),
        isVideo: file.type.startsWith('video/'),
        isUnderSizeLimit: file.size <= maxFileSize
      });

      if (!file.type.startsWith('video/')) {
        console.warn('🚫 [VIDEO-HANDLER] Rejected non-video file:', {
          name: file.name,
          type: file.type,
          reason: 'Not a video file'
        });
        rejectedFiles.push({ file, reason: 'Not a video file' });
        return;
      }

      if (file.size > maxFileSize) {
        console.warn('🚫 [VIDEO-HANDLER] Rejected oversized file:', {
          name: file.name,
          sizeMB: (file.size / 1024 / 1024).toFixed(2),
          maxSizeMB: '500',
          reason: 'File too large (max 500MB)'
        });
        rejectedFiles.push({ file, reason: 'File too large (max 500MB)' });
        return;
      }

      try {
        const id = crypto.randomUUID();
        const preview = URL.createObjectURL(file);
        const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9\s-_]/g, '');
        
        console.log('✅ [VIDEO-HANDLER] Video file accepted and processed:', {
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
          description: '',
          privacy: 'public',
          tags: [],
        });
      } catch (error) {
        console.error('❌ [VIDEO-HANDLER] Error processing video file:', {
          name: file.name,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        rejectedFiles.push({ file, reason: 'Processing error' });
      }
    });

    console.log('📊 [VIDEO-HANDLER] Video file processing summary:', {
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
      console.warn('⚠️ [VIDEO-HANDLER] Showing rejection alert to user:', rejectedMessage);
      alert(`Some files were rejected:\n${rejectedMessage}`);
    }

    if (newFiles.length > 0) {
      console.log('📝 [VIDEO-HANDLER] Adding accepted video files to state:', {
        newFileCount: newFiles.length,
        currentFileCount: files.length,
        totalAfterAdd: files.length + newFiles.length
      });

      setFiles(prev => {
        const updated = [...prev, ...newFiles];
        console.log('✅ [VIDEO-HANDLER] Video files state updated:', {
          previousCount: prev.length,
          addedCount: newFiles.length,
          newTotalCount: updated.length
        });
        return updated;
      });
    } else {
      console.warn('🚫 [VIDEO-HANDLER] No video files were accepted for processing');
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

  const updateFile = (id: string, updates: Partial<UploadFile>) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const uploadFile = async (fileUpload: UploadFile): Promise<void> => {
    console.log('📤 [VIDEO-UPLOAD] Starting individual video file upload:', {
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
      formData.append('description', fileUpload.description);
      formData.append('privacy', fileUpload.privacy);
      formData.append('tags', JSON.stringify(fileUpload.tags));
      formData.append('type', 'video');

      console.log('📋 [VIDEO-UPLOAD] FormData prepared:', {
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
          console.log('📈 [VIDEO-UPLOAD] Upload progress:', {
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
        console.log('📡 [VIDEO-UPLOAD] Upload response received:', {
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
            console.log('✅ [VIDEO-UPLOAD] Upload successful:', {
              fileId: fileUpload.id,
              fileName: fileUpload.file.name,
              hasVideo: !!responseData.video,
              videoId: responseData.video?.id,
              cloudinaryUrl: responseData.video?.cloudinary_url?.substring(0, 50) + '...',
              uploadDurationMs: uploadDuration
            });
          } catch (parseError) {
            console.error('❌ [VIDEO-UPLOAD] Failed to parse success response:', {
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
            console.error('❌ [VIDEO-UPLOAD] Server error response:', {
              fileId: fileUpload.id,
              status: xhr.status,
              statusText: xhr.statusText,
              errorResponse,
              uploadDurationMs: uploadDuration
            });
          } catch (parseError) {
            console.error('❌ [VIDEO-UPLOAD] Failed to parse error response:', {
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
        console.error('❌ [VIDEO-UPLOAD] Network error occurred:', {
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
        console.error('❌ [VIDEO-UPLOAD] Upload timeout occurred:', {
          fileId: fileUpload.id,
          fileName: fileUpload.file.name,
          timeoutMs: xhr.timeout || 'default'
        });

        updateFile(fileUpload.id, { status: 'error', error: 'Upload timeout' });
        reject(new Error('Upload timeout'));
      };

      // Set longer timeout for videos
      xhr.timeout = 300000; // 5 minutes

      console.log('🌐 [VIDEO-UPLOAD] Starting XMLHttpRequest:', {
        fileId: fileUpload.id,
        method: 'POST',
        url: '/api/videos/upload',
        timeout: xhr.timeout
      });

      xhr.open('POST', '/api/videos/upload');
      xhr.send(formData);
    });
  };

  const handleBatchUpload = async () => {
    if (files.length === 0) {
      console.warn('🚫 [VIDEO-UPLOAD] No files to upload');
      return;
    }

    const pendingFiles = files.filter(f => f.status === 'pending');
    
    console.log('🚀 [VIDEO-UPLOAD] Starting batch video upload process:', {
      totalFiles: files.length,
      pendingFiles: pendingFiles.length,
      successFiles: files.filter(f => f.status === 'success').length,
      errorFiles: files.filter(f => f.status === 'error').length,
      batchSize: 2, // Smaller batch size for videos
      timestamp: new Date().toISOString()
    });

    if (pendingFiles.length === 0) {
      console.warn('🚫 [VIDEO-UPLOAD] No pending files to upload');
      return;
    }

    setUploading(true);
    
    // Upload videos with limited concurrency
    const batchSize = 2; // Smaller batches for videos
    const totalBatches = Math.ceil(pendingFiles.length / batchSize);
    
    console.log('📊 [VIDEO-UPLOAD] Batch configuration:', {
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
      
      console.log(`📦 [VIDEO-UPLOAD] Processing batch ${batchNumber}/${totalBatches}:`, {
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

      console.log(`✅ [VIDEO-UPLOAD] Batch ${batchNumber}/${totalBatches} completed:`, {
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
    }

    const totalBatchDuration = Date.now() - batchStartTime;

    console.log('🏁 [VIDEO-UPLOAD] All batches completed:', {
      totalBatches,
      completedBatches,
      totalFiles: pendingFiles.length,
      totalSuccessful,
      totalFailed,
      successRate: ((totalSuccessful / pendingFiles.length) * 100).toFixed(1) + '%',
      totalDurationMs: totalBatchDuration
    });

    setUploading(false);
    
    const allSuccess = files.every(f => f.status === 'success');
    
    if (allSuccess) {
      console.log('🎉 [VIDEO-UPLOAD] All uploads successful, triggering completion callback');
      onUploadComplete();
      
      setTimeout(() => {
        console.log('🧹 [VIDEO-UPLOAD] Cleaning up blob URLs and clearing files');
        files.forEach(f => {
          URL.revokeObjectURL(f.preview);
          console.log('🗑️ [VIDEO-UPLOAD] Revoked blob URL for:', f.file.name);
        });
        setFiles([]);
        console.log('✅ [VIDEO-UPLOAD] Cleanup completed');
      }, 2000);
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
            <Video className="w-8 h-8 text-white" />
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Drop videos here or click to browse
            </h3>
            <p className="text-gray-500">
              Supports MP4, MOV, AVI, MKV, WebM. Max 500MB per file.
            </p>
          </div>

          <input
            type="file"
            multiple
            accept="video/*"
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
                {uploading ? 'Uploading...' : `Upload ${pendingCount} Videos`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-4">
          {files.map((fileUpload) => (
            <div key={fileUpload.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex gap-4">
                {/* Preview */}
                <div className="flex-shrink-0 relative">
                  <video
                    src={fileUpload.preview}
                    className="w-32 h-20 object-cover rounded-lg bg-gray-100"
                    controls={false}
                    muted
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-lg">
                    <Play className="w-8 h-8 text-white" />
                  </div>
                  {getStatusIcon(fileUpload.status)}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={fileUpload.title}
                        onChange={(e) => updateFile(fileUpload.id, { title: e.target.value })}
                        disabled={fileUpload.status !== 'pending'}
                        placeholder="Video title"
                        className="w-full text-sm font-medium text-gray-900 bg-transparent border-none p-0 focus:ring-0 disabled:opacity-60"
                      />
                      
                      <textarea
                        value={fileUpload.description}
                        onChange={(e) => updateFile(fileUpload.id, { description: e.target.value })}
                        disabled={fileUpload.status !== 'pending'}
                        placeholder="Video description"
                        rows={2}
                        className="w-full text-sm text-gray-600 bg-transparent border-none p-0 focus:ring-0 disabled:opacity-60 resize-none"
                      />
                      
                      <div className="text-xs text-gray-500">
                        {(fileUpload.file.size / 1024 / 1024).toFixed(1)} MB
                      </div>

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
