import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCookieStatus } from '../hooks/useCookieStatus';
import axiosInstance from '../services/apiClient';

interface HeadlessUICookieModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UploadStatus {
  type: 'idle' | 'uploading' | 'success' | 'error';
  message?: string;
  progress?: number;
}

export const HeadlessUICookieModal: React.FC<HeadlessUICookieModalProps> = ({
  isOpen,
  onClose
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({ type: 'idle' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { refetch: refetchCookieStatus } = useCookieStatus();

  // 모달이 열릴 때 상태 초기화
  useEffect(() => {
    if (isOpen) {
      setIsDragOver(false);
      setUploadStatus({ type: 'idle' });
    }
  }, [isOpen]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 실제로 컨테이너를 벗어날 때만 false로 설정
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, []);

  const handleFileUpload = useCallback(async (file: File) => {
    // 파일 검증
    if (!file.name.endsWith('.txt')) {
      setUploadStatus({
        type: 'error',
        message: '.txt 파일만 업로드할 수 있습니다.'
      });
      return;
    }

    if (file.size > 1024 * 1024) { // 1MB
      setUploadStatus({
        type: 'error',
        message: '파일 크기가 너무 큽니다. (최대 1MB)'
      });
      return;
    }

    setUploadStatus({ type: 'uploading', progress: 0 });

    try {
      const formData = new FormData();
      formData.append('cookieFile', file);
      formData.append('source', 'modal-upload');

      // 진행률 시뮬레이션
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 10;
        setUploadStatus({
          type: 'uploading',
          progress: Math.min(progress, 90)
        });
      }, 100);

      const response = await axiosInstance.post('/api/system/upload-cookie-file', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      clearInterval(progressInterval);

      if (response.data.success) {
        setUploadStatus({
          type: 'success',
          message: '쿠키 파일이 성공적으로 업로드되었습니다!'
        });

        // 쿠키 상태 다시 가져오기
        setTimeout(() => {
          refetchCookieStatus();
        }, 500);

        // 3초 후 모달 닫기
        setTimeout(() => {
          onClose();
          setUploadStatus({ type: 'idle' });
        }, 3000);
      } else {
        throw new Error(response.data.error || '업로드 실패');
      }
    } catch (error: any) {
      setUploadStatus({
        type: 'error',
        message: error.response?.data?.error || '업로드 실패: ' + error.message
      });
    }
  }, [refetchCookieStatus, onClose]);

  const handleBrowseFiles = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const resetUploadStatus = useCallback(() => {
    setUploadStatus({ type: 'idle' });
  }, []);

  // 업로드 중일 때는 모달 닫기 방지
  const handleClose = useCallback(() => {
    if (uploadStatus.type !== 'uploading') {
      onClose();
    }
  }, [onClose, uploadStatus.type]);

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={uploadStatus.type === 'uploading' ? () => {} : onClose}
        static={uploadStatus.type === 'uploading'}
        __demoMode={false}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 flex items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md overflow-hidden rounded-2xl bg-white p-0 shadow-xl">
                {/* 헤더 */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <Dialog.Title as="div" className="flex items-center space-x-2">
                    <span className="text-2xl">🍪</span>
                    <h3 className="text-xl font-bold leading-6 text-gray-900">
                      Instagram 쿠키 업로드
                    </h3>
                  </Dialog.Title>
                  <button
                    type="button"
                    className={`transition-colors ${
                      uploadStatus.type === 'uploading'
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-400 hover:text-gray-600 cursor-pointer'
                    }`}
                    onClick={uploadStatus.type === 'uploading' ? undefined : onClose}
                    disabled={uploadStatus.type === 'uploading'}
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* 내용 */}
                <div className="p-6 space-y-6">
                  {/* 드래그앤드롭 영역 */}
                  <div
                    className={`border-3 border-dashed rounded-lg p-8 text-center transition-all duration-300 cursor-pointer ${
                      isDragOver
                        ? 'border-blue-500 bg-blue-50'
                        : uploadStatus.type === 'success'
                        ? 'border-green-500 bg-green-50'
                        : uploadStatus.type === 'error'
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
                    }`}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={uploadStatus.type === 'idle' ? handleBrowseFiles : undefined}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt"
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    <AnimatePresence mode="wait">
                      {uploadStatus.type === 'idle' && (
                        <motion.div
                          key="idle"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="space-y-4"
                        >
                          <div className="text-6xl mb-4">📁</div>
                          <div className="text-lg font-semibold text-gray-700">
                            {isDragOver ? '파일을 여기에 놓으세요' : '쿠키 파일을 드래그하거나 클릭하세요'}
                          </div>
                          <div className="text-sm text-gray-500">
                            .txt 파일만 업로드 가능 (최대 1MB)
                          </div>
                        </motion.div>
                      )}

                      {uploadStatus.type === 'uploading' && (
                        <motion.div
                          key="uploading"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="space-y-4"
                        >
                          <div className="text-4xl mb-4">⏳</div>
                          <div className="text-lg font-semibold text-blue-600">
                            업로드 중...
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                            <motion.div
                              className="h-full bg-gradient-to-r from-blue-500 to-purple-600"
                              initial={{ width: 0 }}
                              animate={{ width: `${uploadStatus.progress || 0}%` }}
                              transition={{ duration: 0.3 }}
                            />
                          </div>
                        </motion.div>
                      )}

                      {uploadStatus.type === 'success' && (
                        <motion.div
                          key="success"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="space-y-4"
                        >
                          <div className="text-6xl mb-4">✅</div>
                          <div className="text-lg font-semibold text-green-600">
                            업로드 완료!
                          </div>
                          <div className="text-sm text-green-700">
                            {uploadStatus.message}
                          </div>
                        </motion.div>
                      )}

                      {uploadStatus.type === 'error' && (
                        <motion.div
                          key="error"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="space-y-4"
                        >
                          <div className="text-6xl mb-4">❌</div>
                          <div className="text-lg font-semibold text-red-600">
                            업로드 실패
                          </div>
                          <div className="text-sm text-red-700">
                            {uploadStatus.message}
                          </div>
                          <button
                            type="button"
                            onClick={resetUploadStatus}
                            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            다시 시도
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* 사용 방법 안내 */}
                  {uploadStatus.type === 'idle' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="font-semibold text-blue-800 mb-2">📖 사용 방법</h3>
                      <div className="text-sm text-blue-700 space-y-1">
                        <div>1. Instagram에 로그인한 브라우저에서 쿠키를 추출하세요</div>
                        <div>2. 추출한 .txt 파일을 위의 영역에 드래그하거나 클릭하여 업로드</div>
                        <div>3. 업로드 후 90일간 Instagram 영상 다운로드가 가능합니다</div>
                      </div>
                    </div>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
};